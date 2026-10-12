import {useState,useEffect,useCallback} from 'react'
import {sb} from './supabase'
const G=['Drama','Comedy','Documentary','Thriller','Horror','Animation','Experimental','Sci-Fi','Romance','Other']
const okLink=u=>{try{const x=new URL(u);return x.protocol==='https:'&&['youtube.com','www.youtube.com','youtu.be','drive.google.com'].includes(x.hostname)}catch{return false}}
const rpc=async(n,a)=>{const{error}=await sb.rpc(n,a);if(error)alert(error.message);return !error}
const useQ=(fn,d=[])=>{const[x,setX]=useState(null);const run=useCallback(()=>fn().then(r=>setX(r.data||[])),d);useEffect(()=>{run()},[run]);return[x,run]}

function Auth(){
 const[up,setUp]=useState(false),[f,setF]=useState({email:'',password:'',kind:'filmmaker'}),[e,setE]=useState('')
 const set=k=>x=>setF({...f,[k]:x.target.value})
 const go=async()=>{const r=up?await sb.auth.signUp({email:f.email,password:f.password,options:{data:{kind:f.kind}}}):await sb.auth.signInWithPassword({email:f.email,password:f.password});setE(r.error?r.error.message:'')}
 return <div className="card auth"><h1>Film Festival Portal</h1><h2>{up?'Sign up':'Login'}</h2>
 <input placeholder="Email" value={f.email} onChange={set('email')}/><input type="password" placeholder="Password" value={f.password} onChange={set('password')}/>
 {up&&<select value={f.kind} onChange={set('kind')}><option value="filmmaker">Filmmaker</option><option value="nonfilmmaker">Non-Filmmaker</option></select>}
 {e&&<p className="err">{e}</p>}<button onClick={go}>{up?'Sign up':'Login'}</button>
 <button className="link" onClick={()=>setUp(!up)}>{up?'Have an account? Login':'New here? Sign up'}</button></div>}

function Nav({go,tick}){
 const[n,setN]=useState(0)
 useEffect(()=>{sb.from('notifications').select('id',{count:'exact',head:true}).eq('read',false).then(r=>setN(r.count||0))},[tick])
 return <nav><b onClick={()=>go('home')}>Film Festival Portal</b><span><button onClick={()=>go('notes')}>Notifications ({n})</button><button onClick={()=>sb.auth.signOut()}>Logout</button></span></nav>}

function FHome({go}){
 const[fs]=useQ(()=>sb.from('festivals').select().eq('phase','open'))
 const[ms]=useQ(()=>sb.from('films').select('*,festivals(name)').order('created_at',{ascending:false}))
 return <><h2>Open festivals</h2>{fs?.length===0&&<p>No festivals are open for submissions.</p>}
 {fs?.map(f=><div className="card" key={f.id}><b>{f.name}</b> <span>Deadline {f.sub_end}, max {f.max_runtime} min</span><br/><button onClick={()=>go('submit',{fest:f})}>Submit a film</button></div>)}
 <h2>My submissions</h2><table><thead><tr><th>Film</th><th>Festival</th><th>Status</th><th>Tracking ID</th><th>Eligibility</th></tr></thead><tbody>
 {ms?.map(m=><tr key={m.id}><td>{m.title}</td><td>{m.festivals?.name}</td><td><span className="badge">{m.status}</span>{m.status==='incomplete'&&<button onClick={()=>go('pay',{id:m.id})}>Pay</button>}</td><td>{m.tracking_id||'-'}</td><td>{m.eligible==null?'-':(m.eligible?'PASS: ':'FAIL: ')+m.reason}</td></tr>)}</tbody></table></>}

function Submit({me,fest,go}){
 const[f,setF]=useState({title:'',genre:'Drama',duration:'',synopsis:'',trailer:'',full_link:''}),[p,setP]=useState(null),[e,setE]=useState({})
 const set=k=>x=>setF({...f,[k]:x.target.value})
 const send=async()=>{const er={}
  if(!f.title.trim())er.title='Title is required'
  if(!(+f.duration>0))er.duration='Enter the duration in minutes'
  if(!f.synopsis.trim())er.synopsis='Synopsis is required'
  if(!okLink(f.trailer))er.trailer='Use an https youtube.com, youtu.be or drive.google.com link'
  if(!okLink(f.full_link))er.full_link='Use an https youtube.com, youtu.be or drive.google.com link'
  if(!p)er.poster='Poster is required';else if(!['image/jpeg','image/png'].includes(p.type)||p.size>2097152)er.poster='Poster must be JPEG or PNG, max 2 MB'
  setE(er);if(Object.keys(er).length)return
  const path=crypto.randomUUID()+(p.type==='image/png'?'.png':'.jpg')
  const u=await sb.storage.from('posters').upload(path,p);if(u.error)return setE({poster:u.error.message})
  const{data,error}=await sb.from('films').insert({...f,duration:+f.duration,festival_id:fest.id,owner_id:me.id,poster:path}).select().single()
  if(error)return setE({form:error.message});go('pay',{id:data.id})}
 const Er=({k})=>e[k]?<small className="err">{e[k]}</small>:null
 return <div className="card"><h2>Submit a film to {fest.name}</h2>
 <label>Title<input value={f.title} onChange={set('title')}/></label><Er k="title"/>
 <label>Genre<select value={f.genre} onChange={set('genre')}>{G.map(g=><option key={g}>{g}</option>)}</select></label>
 <label>Duration (minutes)<input type="number" value={f.duration} onChange={set('duration')}/></label><Er k="duration"/>
 <label>Synopsis<textarea rows="4" value={f.synopsis} onChange={set('synopsis')}/></label><Er k="synopsis"/>
 <label>Trailer link<input value={f.trailer} onChange={set('trailer')}/></label><Er k="trailer"/>
 <label>Full-film link<input value={f.full_link} onChange={set('full_link')}/></label><Er k="full_link"/>
 <label>Poster (JPEG/PNG, max 2 MB)<input type="file" accept="image/jpeg,image/png" onChange={x=>setP(x.target.files[0])}/></label><Er k="poster"/><Er k="form"/>
 <button onClick={send}>Continue to payment</button></div>}

function Pay({id,go}){
 const[m,setM]=useState(null)
 useEffect(()=>{sb.from('films').select().eq('id',id).single().then(r=>setM(r.data))},[id])
 const act=async ok=>{if(await rpc('pay_film',{fid:id,ok})){const r=await sb.from('films').select().eq('id',id).single();ok?go('done',{m:r.data}):go('home')}}
 return m&&<div className="card"><h2>Mock payment</h2><p>Registration fee for "{m.title}"</p><button onClick={()=>act(true)}>Pay</button><button onClick={()=>act(false)}>Fail</button></div>}
const Done=({m})=><div className="card"><h2>Submission received</h2><p>Tracking ID: <b>{m.tracking_id}</b></p><p className={m.eligible?'ok':'err'}>Eligibility {m.eligible?'PASS':'FAIL'}: {m.reason}</p></div>

function NHome({me,go}){
 const[a]=useQ(()=>sb.from('festivals').select().eq('admin_id',me.id))
 const[j]=useQ(()=>sb.from('jury').select('status,festivals(*)').eq('user_id',me.id))
 const rows=[...(a||[]).map(f=>({f,role:'Admin',ok:true})),...(j||[]).map(x=>({f:x.festivals,role:x.status==='approved'?'Jury':'Jury ('+x.status+')',ok:x.status==='approved'}))]
 return <><div className="row"><h2>My Festivals</h2><button onClick={()=>go('create')}>Create festival</button><button onClick={()=>go('browse')}>Browse festivals</button></div>
 {rows.length===0&&<p>You have no festivals yet. Create one, or browse festivals to request to join as Jury.</p>}
 {rows.map(({f,role,ok})=><div className="card" key={f.id+role}><b>{f.name}</b> <span className="badge">{role}</span> <span className="badge">{f.phase}</span> {ok&&<button onClick={()=>go('fest',{id:f.id})}>Open</button>}</div>)}</>}

function Browse({me}){
 const[fs]=useQ(()=>sb.from('festivals').select().neq('phase','setup').neq('admin_id',me.id))
 const ask=async id=>{const{error}=await sb.from('jury').insert({festival_id:id,user_id:me.id});alert(error?'You have already requested this festival':'Request sent to the festival Admin')}
 return <><h2>Browse festivals</h2>{fs?.length===0&&<p>No festivals are accepting jury requests yet.</p>}
 {fs?.map(f=><div className="card" key={f.id}><b>{f.name}</b> <span className="badge">{f.phase}</span><br/><button onClick={()=>ask(f.id)}>Request to join as Jury</button></div>)}</>}

function Create({me,go}){
 const[f,setF]=useState({name:'',sub_start:'',sub_end:'',score_end:'',max_runtime:30,genres:[...G]}),[e,setE]=useState('')
 const[r,setR]=useState([['Story',30],['Direction',25],['Cinematography',20],['Sound & Editing',15],['Originality',10]])
 const set=k=>x=>setF({...f,[k]:x.target.value})
 const save=async()=>{
  if(!f.name.trim()||!f.sub_end||!f.genres.length)return setE('Name, submission deadline and at least one genre are required')
  if(r.reduce((a,x)=>a+ +x[1],0)!==100)return setE('Rubric weights must total 100')
  const{data,error}=await sb.from('festivals').insert({...f,max_runtime:+f.max_runtime,admin_id:me.id,sub_start:f.sub_start||null,score_end:f.score_end||null}).select().single()
  if(error)return setE(error.message)
  const x=await sb.from('criteria').insert(r.map(([name,weight])=>({festival_id:data.id,name,weight:+weight})))
  if(x.error)return setE(x.error.message);go('fest',{id:data.id})}
 return <div className="card"><h2>Create festival</h2>
 <label>Name<input value={f.name} onChange={set('name')}/></label>
 <label>Submissions start<input type="date" value={f.sub_start} onChange={set('sub_start')}/></label>
 <label>Submission deadline<input type="date" value={f.sub_end} onChange={set('sub_end')}/></label>
 <label>Scoring deadline<input type="date" value={f.score_end} onChange={set('score_end')}/></label>
 <label>Max runtime (minutes)<input type="number" value={f.max_runtime} onChange={set('max_runtime')}/></label>
 <p>Allowed genres</p>{G.map(g=><label key={g}><input type="checkbox" style={{display:'inline',width:'auto'}} checked={f.genres.includes(g)} onChange={x=>setF({...f,genres:x.target.checked?[...f.genres,g]:f.genres.filter(y=>y!==g)})}/> {g}</label>)}
 <p>Rubric (weights total 100)</p>{r.map((c,i)=><div className="row" key={i}><input value={c[0]} onChange={x=>setR(r.map((y,k)=>k===i?[x.target.value,y[1]]:y))}/><input type="number" value={c[1]} onChange={x=>setR(r.map((y,k)=>k===i?[y[0],x.target.value]:y))}/></div>)}
 {e&&<p className="err">{e}</p>}<button onClick={save}>Create festival</button></div>}

function Req({id}){
 const[r,re]=useQ(()=>sb.from('jury').select('user_id,status,profiles(email)').eq('festival_id',id),[id])
 const d=async(u,ok)=>{await rpc('decide_jury',{fid:id,uid:u,ok});re()}
 return <><h3>Jury requests</h3>{r?.length===0&&<p>No requests yet.</p>}<table><tbody>{r?.map(x=><tr key={x.user_id}><td>{x.profiles?.email}</td><td>{x.status}</td><td>{x.status==='pending'&&<><button onClick={()=>d(x.user_id,true)}>Approve</button><button onClick={()=>d(x.user_id,false)}>Reject</button></>}</td></tr>)}</tbody></table></>}

function Subs({id}){
 const[s]=useQ(()=>sb.from('films').select().eq('festival_id',id),[id])
 return <><h3>Submissions</h3>{s?.length===0&&<p>No submissions yet.</p>}<table><thead><tr><th>Code</th><th>Title</th><th>Genre</th><th>Min</th><th>Status</th><th>Eligibility</th></tr></thead><tbody>{s?.map(m=><tr key={m.id}><td>{m.code||'-'}</td><td>{m.title}</td><td>{m.genre}</td><td>{m.duration}</td><td>{m.status}</td><td>{m.eligible==null?'-':(m.eligible?'PASS':'FAIL')+': '+m.reason}</td></tr>)}</tbody></table></>}

function Assign({id,phase}){
 const[fl]=useQ(()=>sb.from('films').select('id,code,title').eq('festival_id',id).eq('eligible',true),[id,phase])
 const[ju]=useQ(()=>sb.from('jury').select('user_id,profiles(email)').eq('festival_id',id).eq('status','approved'),[id])
 const[sel,setSel]=useState({})
 if(phase!=='review')return <p>Assignment opens when you start review.</p>
 return <><h3>Assign jury</h3><table><tbody>{fl?.map(m=><tr key={m.id}><td>{m.code} {m.title}</td><td><select value={sel[m.id]||''} onChange={x=>setSel({...sel,[m.id]:x.target.value})}><option value="">Choose juror</option>{ju?.map(j=><option key={j.user_id} value={j.user_id}>{j.profiles?.email}</option>)}</select></td><td><button onClick={()=>sel[m.id]&&rpc('assign',{flm:m.id,juror:sel[m.id]}).then(o=>o&&alert('Assigned'))}>Assign</button></td></tr>)}</tbody></table></>}

function Short({id,phase}){
 const[s]=useQ(()=>sb.rpc('shortlist_view',{fid:id}),[id,phase])
 return <><h3>Shortlist</h3>{s?.length===0&&<p>The shortlist is built when review closes.</p>}<table><tbody>{s?.map(x=><tr key={x.code}><td>{x.code}</td><td>{x.title}</td><td>{(+x.score).toFixed(1)}</td></tr>)}</tbody></table></>}

function Card({m,cr,phase,re}){
 const[s,setS]=useState(m.my_scores||{})
 const pub=sb.storage.from('posters').getPublicUrl(m.poster).data.publicUrl
 return <div className="card"><h3>{m.code}: {m.title}</h3><img className="poster" src={pub} alt="Poster"/><p>{m.genre}, {m.duration} min</p><p>{m.synopsis}</p>
 <p><a href={m.trailer} target="_blank" rel="noreferrer">Trailer</a> | <a href={m.full_link} target="_blank" rel="noreferrer">Full film</a></p>
 {cr.map(c=><label key={c.id}>{c.name} ({c.weight}%) 0-10<input type="number" min="0" max="10" disabled={phase!=='review'} value={s[c.id]??''} onChange={x=>setS({...s,[c.id]:x.target.value===''?undefined:+x.target.value})}/></label>)}
 {phase==='review'&&<button onClick={async()=>{await rpc('save_review',{flm:m.id,sc:s})&&re()}}>Save scores</button>}</div>}
function Mine({id,phase}){
 const[fl,re]=useQ(()=>sb.rpc('jury_films',{fid:id}),[id])
 const[cr]=useQ(()=>sb.from('criteria').select().eq('festival_id',id).order('id'),[id])
 return fl?.length===0?<p>No films assigned to you yet.</p>:fl?.map(m=><Card key={m.id} m={m} cr={cr||[]} phase={phase} re={re}/>)}

function Fest({id,me}){
 const[f,reload]=useQ(()=>sb.from('festivals').select().eq('id',id).single(),[id]),[t,setT]=useState(0)
 if(!f||!f.id)return null
 const adm=f.admin_id===me.id,P=f.phase
 const tabs=adm?['Overview','Jury requests','Submissions','Assign jury','Shortlist']:['My assigned films','Shortlist']
 const B={setup:'Open submissions',open:'Start review',review:'Close review',voting:'Close voting',tiebreak:'Close tie-break'}[P]
 const body=adm?[<div className="card" key="o"><p>Phase: <span className="badge">{P}</span></p><p>Submissions {f.sub_start||'-'} to {f.sub_end}. Scoring deadline {f.score_end||'-'}. Max {f.max_runtime} min.</p><p>Genres: {f.genres.join(', ')}</p>{B&&<button onClick={async()=>{await rpc('advance',{fid:id})&&reload()}}>{B}</button>}</div>,<Req key="r" id={id}/>,<Subs key="s" id={id}/>,<Assign key="a" id={id} phase={P}/>,<Short key="h" id={id} phase={P}/>]:[<Mine key="m" id={id} phase={P}/>,<Short key="h" id={id} phase={P}/>]
 return <><h2>{f.name} <span className="badge">{adm?'Admin':'Jury'}</span></h2><div className="tabs">{tabs.map((x,i)=><button key={x} className={i===t?'on':''} onClick={()=>setT(i)}>{x}</button>)}</div>{body[t]}</>}

function Notes({bump}){
 const[n]=useQ(()=>sb.from('notifications').select().order('created_at',{ascending:false}))
 useEffect(()=>{sb.from('notifications').update({read:true}).eq('read',false).then(bump)},[])
 return <><h2>Notifications</h2>{n?.length===0&&<p>No notifications yet.</p>}{n?.map(x=><div className="card" key={x.id}>{x.body}<br/><small>{new Date(x.created_at).toLocaleString()}</small></div>)}</>}

export default function App(){
 const[s,setS]=useState(undefined),[me,setMe]=useState(null),[v,setV]=useState({n:'home'}),[tick,setTick]=useState(0)
 useEffect(()=>{sb.auth.getSession().then(({data})=>setS(data.session));const{data:l}=sb.auth.onAuthStateChange((_,x)=>setS(x));return()=>l.subscription.unsubscribe()},[])
 useEffect(()=>{if(s)sb.from('profiles').select().single().then(({data})=>setMe(data));else{setMe(null);setV({n:'home'})}},[s])
 if(s===undefined)return null
 if(!s)return <Auth/>
 if(!me)return <main><p>Loading...</p></main>
 const go=(n,x)=>{setV({n,...x});setTick(t=>t+1)}
 const page={home:()=>me.kind==='filmmaker'?<FHome go={go}/>:<NHome me={me} go={go}/>,submit:()=><Submit me={me} fest={v.fest} go={go}/>,pay:()=><Pay id={v.id} go={go}/>,done:()=><Done m={v.m}/>,create:()=><Create me={me} go={go}/>,browse:()=><Browse me={me}/>,fest:()=><Fest id={v.id} me={me}/>,notes:()=><Notes bump={()=>setTick(t=>t+1)}/>}[v.n]
 return <><Nav go={go} tick={tick}/><main key={v.n+(v.id||'')}>{page()}</main></>}
