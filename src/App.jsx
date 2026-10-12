import {useState,useEffect,useCallback,useRef} from 'react'
import {sb} from './supabase'
const G=['Drama','Comedy','Documentary','Thriller','Horror','Animation','Experimental','Sci-Fi','Romance','Other']
const PH=['setup','open','review','voting','tiebreak'],PL=['Setup','Submissions open','Review','Voting','Tie-break']
const okLink=u=>{try{const x=new URL(u);return x.protocol==='https:'&&['youtube.com','www.youtube.com','youtu.be','drive.google.com'].includes(x.hostname)}catch{return false}}
const ini=e=>(e||'?').slice(0,2).toUpperCase()

/* toasts */
const bus=new Set()
const toast=(m,t='ok')=>bus.forEach(f=>f({id:Math.random(),m,t}))
function Toasts(){
 const[l,setL]=useState([])
 useEffect(()=>{const f=x=>{setL(a=>[...a,x]);setTimeout(()=>setL(a=>a.filter(y=>y.id!==x.id)),3500)};bus.add(f);return()=>bus.delete(f)},[])
 return <div className="toasts" role="status">{l.map(x=><div key={x.id} className={'toast '+x.t}>{x.m}</div>)}</div>}

const rpc=async(n,a)=>{const{error}=await sb.rpc(n,a);if(error)toast(error.message,'err');return !error}
const useQ=(fn,d=[])=>{const[x,setX]=useState(null);const run=useCallback(()=>fn().then(r=>setX(r.data||[])),d);useEffect(()=>{run()},[run]);return[x,run]}

/* small ui helpers */
const Sk=({n=3})=>Array.from({length:n},(_,i)=><div key={i} className="sk" style={{animationDelay:i*80+'ms'}}/>)
const Empty=({children})=><div className="empty">{children}</div>
const Back=({go,label='Back to festivals'})=><button className="link" onClick={()=>go('home')}>← {label}</button>
const Busy=({on,children})=>on?<><span className="spin"/>{children}</>:children
const tone=m=>m.eligible===true?'ok':m.eligible===false?'bad':'warn'
function Count({to}){
 const[v,setV]=useState(0)
 useEffect(()=>{let r,t0;const step=t=>{t0??=t;const p=Math.min((t-t0)/700,1);setV(Math.round(to*(1-Math.pow(1-p,3))));if(p<1)r=requestAnimationFrame(step)};r=requestAnimationFrame(step);return()=>cancelAnimationFrame(r)},[to])
 return v}
const Stepper=({p})=>{let i=PH.indexOf(p);if(i<0)i=PH.length
 return <ol className="stepper">{PH.map((x,k)=><li key={x} className={k<i?'done':k===i?'now':''}><span>{k<i?'✓':k+1}</span><em>{PL[k]}</em></li>)}</ol>}

/* auth */
function Auth(){
 const[up,setUp]=useState(false),[f,setF]=useState({email:'',password:'',kind:'filmmaker'}),[e,setE]=useState(''),[b,setB]=useState(false)
 const set=k=>x=>setF({...f,[k]:x.target.value})
 const go=async ev=>{ev?.preventDefault();setB(true)
  const r=up?await sb.auth.signUp({email:f.email,password:f.password,options:{data:{kind:f.kind}}}):await sb.auth.signInWithPassword({email:f.email,password:f.password})
  setE(r.error?r.error.message:'');setB(false)}
 return <div className="hero">
  <div className="page"><span className="badge pill">Film Festival</span><h1>Stories deserve<br/>a thoughtful stage.</h1><p className="lead">Submit films, review remarkable work, and shape the festival together, all in one calm, connected space.</p></div>
  <form className="card auth" onSubmit={go}>
   <div className="eyebrow">{up?'Join us':'Welcome back'}</div><h2>{up?'Create your account':'Sign in to your account'}</h2>
   <label>Email address<input type="email" required placeholder="you@example.com" value={f.email} onChange={set('email')}/></label>
   <label>Password<input type="password" required minLength={8} placeholder="At least 8 characters" value={f.password} onChange={set('password')}/></label>
   {up&&<label>I am a<select value={f.kind} onChange={set('kind')}><option value="filmmaker">Filmmaker</option><option value="nonfilmmaker">Non-Filmmaker</option></select></label>}
   {e&&<small className="fe">{e}</small>}
   <button style={{width:'100%',marginTop:'1rem'}} disabled={b}><Busy on={b}>Please wait</Busy>{!b&&(up?'Create account':'Sign in')}</button>
   <p style={{textAlign:'center',marginTop:'1rem'}}><button type="button" className="link" onClick={()=>{setUp(!up);setE('')}}>{up?'Have an account? Sign in':'New here? Create an account'}</button></p>
  </form></div>}

/* top bar */
function Nav({me,go,tick}){
 const[n,setN]=useState(0)
 useEffect(()=>{sb.from('notifications').select('id',{count:'exact',head:true}).eq('read',false).then(r=>setN(r.count||0))},[tick])
 return <header className="top"><button className="brand" onClick={()=>go('home')}><span className="logo">F</span>Film Festival Portal</button>
  <div className="row"><button className="bell" aria-label={`Notifications (${n})`} onClick={()=>go('notes')}>🔔{n>0&&<i key={n}>{n}</i>}</button>
  <div className="me"><span className="avatar">{ini(me.email)}</span><span>{me.kind==='filmmaker'?'Filmmaker':'Member'}</span></div>
  <button className="ghost" onClick={()=>sb.auth.signOut()}>Log out</button></div></header>}

/* filmmaker */
function FHome({go}){
 const[fs]=useQ(()=>sb.from('festivals').select().eq('phase','open'))
 const[ms]=useQ(()=>sb.from('films').select('*,festivals(name)').order('created_at',{ascending:false}))
 return <div className="page"><div className="eyebrow">Filmmaker workspace</div><h2>Open festivals</h2>
 {fs===null?<Sk n={2}/>:fs.length===0?<Empty>No festivals are open for submissions right now.</Empty>:
 <div className="stag">{fs.map((f,i)=><div className="card lift row between" style={{'--i':i,marginBottom:'.7rem'}} key={f.id}><div><b>{f.name}</b><br/><small>Deadline {f.sub_end} · max {f.max_runtime} min</small></div><button onClick={()=>go('submit',{fest:f})}>Submit a film</button></div>)}</div>}
 <h2 style={{marginTop:'2rem'}}>My submissions</h2>
 {ms===null?<Sk/>:ms.length===0?<Empty>You haven't submitted a film yet.</Empty>:
 <div className="tblw"><table className="tbl"><thead><tr><th>Film</th><th>Festival</th><th>Status</th><th>Tracking ID</th><th>Eligibility</th></tr></thead><tbody>
 {ms.map((m,i)=><tr key={m.id} style={{'--i':i}}><td><b>{m.title}</b></td><td>{m.festivals?.name}</td><td><span className={'badge '+(m.status==='incomplete'?'warn':'ok')}>{m.status}</span>{m.status==='incomplete'&&<button style={{padding:'.25rem .7rem'}} onClick={()=>go('pay',{id:m.id})}>Pay</button>}</td><td>{m.tracking_id||'-'}</td>
 <td>{m.eligible==null?'-':<><span className={'badge '+tone(m)}>{m.eligible?'Pass':'Fail'}</span> <small>{m.reason}</small></>}</td></tr>)}</tbody></table></div>}</div>}

function Submit({me,fest,go}){
 const[f,setF]=useState({title:'',genre:'Drama',duration:'',synopsis:'',trailer:'',full_link:''}),[p,setP]=useState(null),[pv,setPv]=useState(null),[e,setE]=useState({}),[b,setB]=useState(false),[over,setOver]=useState(false)
 const set=k=>x=>setF({...f,[k]:x.target.value})
 useEffect(()=>{if(!p){setPv(null);return}const u=URL.createObjectURL(p);setPv(u);return()=>URL.revokeObjectURL(u)},[p])
 const send=async()=>{const er={}
  if(!f.title.trim())er.title='Title is required'
  if(!(+f.duration>0))er.duration='Enter the duration in minutes'
  if(!f.synopsis.trim())er.synopsis='Synopsis is required'
  if(!okLink(f.trailer))er.trailer='Use an https youtube.com, youtu.be or drive.google.com link'
  if(!okLink(f.full_link))er.full_link='Use an https youtube.com, youtu.be or drive.google.com link'
  if(!p)er.poster='Poster is required';else if(!['image/jpeg','image/png'].includes(p.type)||p.size>2097152)er.poster='Poster must be JPEG or PNG, max 2 MB'
  setE(er);if(Object.keys(er).length)return
  setB(true)
  const path=crypto.randomUUID()+(p.type==='image/png'?'.png':'.jpg')
  const u=await sb.storage.from('posters').upload(path,p);if(u.error){setB(false);return setE({poster:u.error.message})}
  const{data,error}=await sb.from('films').insert({...f,duration:+f.duration,festival_id:fest.id,owner_id:me.id,poster:path}).select().single()
  if(error){setB(false);return setE({form:error.message})};go('pay',{id:data.id})}
 const Er=({k})=>e[k]?<small className="fe">{e[k]}</small>:null
 const pick=x=>x&&setP(x)
 return <div className="page" style={{maxWidth:720,margin:'0 auto'}}><Back go={go}/>
 <div className="card" style={{marginTop:'.8rem'}}><div className="eyebrow">New submission</div><h2>Submit a film to {fest.name}</h2>
 <label>Title<input className={e.title?'bad':''} value={f.title} onChange={set('title')}/></label><Er k="title"/>
 <div className="two"><div><label>Genre<select value={f.genre} onChange={set('genre')}>{(fest.genres?.length?fest.genres:G).map(g=><option key={g}>{g}</option>)}</select></label></div>
 <div><label>Duration (minutes)<input type="number" className={e.duration?'bad':''} value={f.duration} onChange={set('duration')}/></label><Er k="duration"/></div></div>
 <label>Synopsis<textarea rows="4" className={e.synopsis?'bad':''} value={f.synopsis} onChange={set('synopsis')}/></label><Er k="synopsis"/>
 <div className="two"><div><label>Trailer link<input className={e.trailer?'bad':''} value={f.trailer} onChange={set('trailer')}/></label><Er k="trailer"/></div>
 <div><label>Full-film link<input className={e.full_link?'bad':''} value={f.full_link} onChange={set('full_link')}/></label><Er k="full_link"/></div></div>
 <label>Poster (JPEG/PNG, max 2 MB)
  <span className={'drop'+(over?' over':'')} onDragOver={x=>{x.preventDefault();setOver(true)}} onDragLeave={()=>setOver(false)} onDrop={x=>{x.preventDefault();setOver(false);pick(x.dataTransfer.files[0])}}>
   {pv&&<img src={pv} alt="Poster preview"/>}<span>{p?p.name:'Click or drop an image here'}</span>
   <input type="file" accept="image/jpeg,image/png" onChange={x=>pick(x.target.files[0])}/></span></label><Er k="poster"/><Er k="form"/>
 <button style={{marginTop:'1rem'}} disabled={b} onClick={send}><Busy on={b}>Uploading</Busy>{!b&&'Continue to payment'}</button></div></div>}

function Pay({id,go}){
 const[m,setM]=useState(null),[b,setB]=useState(false)
 useEffect(()=>{sb.from('films').select().eq('id',id).single().then(r=>setM(r.data))},[id])
 const act=async ok=>{setB(true);if(await rpc('pay_film',{fid:id,ok})){const r=await sb.from('films').select().eq('id',id).single();ok?go('done',{m:r.data}):(toast('Payment failed. You can retry from your submissions.','err'),go('home'))}else setB(false)}
 return m?<div className="card center page"><div className="eyebrow">Step 2 of 2</div><h2>Mock payment</h2><p className="muted">Registration fee for "{m.title}"</p>
 <div className="row" style={{justifyContent:'center',marginTop:'1rem'}}><button disabled={b} onClick={()=>act(true)}><Busy on={b}>Processing</Busy>{!b&&'Pay'}</button><button className="ghost" disabled={b} onClick={()=>act(false)}>Fail</button></div></div>:<Sk n={1}/>}
const Done=({m,go})=><div className="card center page"><svg className="checkcircle" viewBox="0 0 84 84"><circle cx="42" cy="42" r="40"/><path d="M26 43l11 11 21-23"/></svg>
 <h2>Submission received</h2><p>Tracking ID: <b>{m.tracking_id}</b></p><p className={m.eligible?'ok':'err'}>Eligibility {m.eligible?'pass':'fail'}: {m.reason}</p><button style={{marginTop:'1rem'}} onClick={()=>go('home')}>Back to my submissions</button></div>

/* non-filmmaker */
function NHome({me,go}){
 const[a]=useQ(()=>sb.from('festivals').select().eq('admin_id',me.id))
 const[j]=useQ(()=>sb.from('jury').select('status,festivals(*)').eq('user_id',me.id))
 const rows=[...(a||[]).map(f=>({f,role:'Admin',ok:true})),...(j||[]).map(x=>({f:x.festivals,role:x.status==='approved'?'Jury':'Jury ('+x.status+')',ok:x.status==='approved'}))]
 return <div className="page"><div className="row"><div className="grow"><div className="eyebrow">Workspace</div><h2>My festivals</h2></div><button className="ghost" onClick={()=>go('browse')}>Browse festivals</button><button onClick={()=>go('create')}>Create festival</button></div>
 {a===null||j===null?<Sk/>:rows.length===0?<Empty>You have no festivals yet. Create one, or browse festivals to request to join as Jury.</Empty>:
 <div className="stag" style={{marginTop:'1rem'}}>{rows.map(({f,role,ok},i)=><div className="card lift row between" style={{'--i':i,marginBottom:'.7rem'}} key={f.id+role}>
 <div className="row"><b>{f.name}</b><span className="badge">{role}</span><span className="badge warn">{f.phase}</span></div>{ok&&<button onClick={()=>go('fest',{id:f.id})}>Open</button>}</div>)}</div>}</div>}

function Browse({me,go}){
 const[fs]=useQ(()=>sb.from('festivals').select().neq('phase','setup').neq('admin_id',me.id))
 const[sent,setSent]=useState({})
 const ask=async id=>{const{error}=await sb.from('jury').insert({festival_id:id,user_id:me.id});toast(error?'You have already requested this festival':'Request sent to the festival Admin',error?'err':'ok');setSent({...sent,[id]:true})}
 return <div className="page"><Back go={go} label="Back to my festivals"/><h2 style={{marginTop:'.6rem'}}>Browse festivals</h2>
 {fs===null?<Sk/>:fs.length===0?<Empty>No festivals are accepting jury requests yet.</Empty>:
 <div className="stag">{fs.map((f,i)=><div className="card lift row between" style={{'--i':i,marginBottom:'.7rem'}} key={f.id}><div className="row"><b>{f.name}</b><span className="badge warn">{f.phase}</span></div>
 <button disabled={sent[f.id]} onClick={()=>ask(f.id)}>{sent[f.id]?'Requested ✓':'Request to join as Jury'}</button></div>)}</div>}</div>}

function Create({me,go}){
 const[f,setF]=useState({name:'',sub_start:'',sub_end:'',score_end:'',max_runtime:30,genres:[...G]}),[e,setE]=useState(''),[b,setB]=useState(false)
 const[r,setR]=useState([['Story',30],['Direction',25],['Cinematography',20],['Sound & Editing',15],['Originality',10]])
 const set=k=>x=>setF({...f,[k]:x.target.value})
 const tot=r.reduce((a,x)=>a+ +x[1],0)
 const save=async()=>{
  if(!f.name.trim()||!f.sub_end||!f.genres.length)return setE('Name, submission deadline and at least one genre are required')
  if(tot!==100)return setE('Rubric weights must total 100')
  setB(true)
  const{data,error}=await sb.from('festivals').insert({...f,max_runtime:+f.max_runtime,admin_id:me.id,sub_start:f.sub_start||null,score_end:f.score_end||null}).select().single()
  if(error){setB(false);return setE(error.message)}
  const x=await sb.from('criteria').insert(r.map(([name,weight])=>({festival_id:data.id,name,weight:+weight})))
  if(x.error){setB(false);return setE(x.error.message)};toast('Festival created');go('fest',{id:data.id})}
 return <div className="page" style={{maxWidth:760,margin:'0 auto'}}><Back go={go} label="Back to my festivals"/>
 <div className="card" style={{marginTop:'.8rem'}}><div className="eyebrow">Setup</div><h2>Create festival</h2>
 <label>Name<input value={f.name} onChange={set('name')}/></label>
 <div className="two"><div><label>Submissions start<input type="date" value={f.sub_start} onChange={set('sub_start')}/></label></div><div><label>Submission deadline<input type="date" value={f.sub_end} onChange={set('sub_end')}/></label></div>
 <div><label>Scoring deadline<input type="date" value={f.score_end} onChange={set('score_end')}/></label></div><div><label>Max runtime (minutes)<input type="number" value={f.max_runtime} onChange={set('max_runtime')}/></label></div></div>
 <label>Allowed genres</label><div className="chips" style={{marginTop:'.3rem'}}>{G.map(g=>{const on=f.genres.includes(g);return <button type="button" key={g} className={'chip'+(on?' on':'')} onClick={()=>setF({...f,genres:on?f.genres.filter(y=>y!==g):[...f.genres,g]})}>{g}</button>})}</div>
 <div className="row between" style={{marginTop:'1.2rem'}}><label style={{margin:0}}>Rubric</label><span className={'badge '+(tot===100?'ok':'bad')}>Total {tot} / 100</span></div>
 <div className="bar" style={{margin:'.5rem 0'}}><i style={{'--w':Math.min(tot,100)+'%',animation:'none',width:Math.min(tot,100)+'%',transition:'width .4s var(--ease)',background:tot===100?'var(--ok)':'var(--brown)'}}/></div>
 {r.map((c,i)=><div className="row" key={i}><input style={{flex:1}} value={c[0]} onChange={x=>setR(r.map((y,k)=>k===i?[x.target.value,y[1]]:y))}/><input style={{width:90}} type="number" value={c[1]} onChange={x=>setR(r.map((y,k)=>k===i?[y[0],x.target.value]:y))}/>
 <button type="button" className="ghost" aria-label="Remove criterion" disabled={r.length<2} onClick={()=>setR(r.filter((_,k)=>k!==i))}>✕</button></div>)}
 <button type="button" className="ghost" style={{marginTop:'.4rem'}} onClick={()=>setR([...r,['New criterion',0]])}>+ Add criterion</button>
 {e&&<small className="fe" style={{marginTop:'.6rem'}}>{e}</small>}
 <div><button style={{marginTop:'1rem'}} disabled={b} onClick={save}><Busy on={b}>Creating</Busy>{!b&&'Create festival'}</button></div></div></div>}

/* festival: admin */
function Overview({f,reload}){
 const[fl]=useQ(()=>sb.from('films').select('id,status,eligible').eq('festival_id',f.id),[f.id,f.phase])
 const[ju]=useQ(()=>sb.from('jury').select('status').eq('festival_id',f.id),[f.id])
 const[b,setB]=useState(false)
 const P=f.phase,B={setup:'Open submissions',open:'Start review',review:'Close review',voting:'Close voting',tiebreak:'Close tie-break'}[P]
 const total=fl?.length||0,paid=(fl||[]).filter(m=>m.status!=='incomplete').length,elig=(fl||[]).filter(m=>m.eligible===true).length
 const appr=(ju||[]).filter(x=>x.status==='approved').length,pend=(ju||[]).filter(x=>x.status==='pending').length
 const S=[['Total submissions',total,`${paid} payments confirmed`],['Eligible films',elig,`${(fl||[]).filter(m=>m.eligible===false).length} ineligible`],['Approved jurors',appr,`${pend} request${pend===1?'':'s'} pending`]]
 const adv=async()=>{if(!confirm(`${B}? This moves the festival to the next phase and cannot be undone.`))return;setB(true);if(await rpc('advance',{fid:f.id})){toast('Phase updated');reload()};setB(false)}
 return <><div className="card"><div className="row between"><div><div className="eyebrow">Festival progress</div><h3>{PL[PH.indexOf(P)]||'Complete'}</h3></div>{B&&<button disabled={b} onClick={adv}><Busy on={b}>Working</Busy>{!b&&B}</button>}</div><Stepper p={P}/></div>
 <div className="stats stag">{S.map(([l,v,s],i)=><div className="card stat lift" style={{'--i':i}} key={l}><small>{l}</small><b><Count to={v}/></b><small>{s}</small></div>)}</div>
 <div className="card"><div className="eyebrow">Key dates</div><p>Submissions {f.sub_start||'-'} to <b>{f.sub_end}</b></p><p>Scoring deadline <b>{f.score_end||'-'}</b> · Max {f.max_runtime} min</p><p className="muted">Genres: {f.genres.join(', ')}</p></div></>}

function Req({id}){
 const[r,re]=useQ(()=>sb.from('jury').select('user_id,status,profiles(email)').eq('festival_id',id),[id])
 const d=async(u,ok)=>{if(await rpc('decide_jury',{fid:id,uid:u,ok}))toast(ok?'Juror approved':'Request rejected');re()}
 return <><div className="eyebrow">People</div><h3>Jury requests</h3><p className="muted">Approve or reject requests to join the jury.</p>
 {r===null?<Sk/>:r.length===0?<Empty>No requests yet.</Empty>:<div className="stag">{r.map((x,i)=><div className="card row" style={{'--i':i,marginBottom:'.6rem',padding:'.8rem 1rem'}} key={x.user_id}><span className="avatar">{ini(x.profiles?.email)}</span><b className="grow">{x.profiles?.email}</b>
 <span className={'badge '+(x.status==='approved'?'ok':x.status==='pending'?'warn':'bad')}>{x.status}</span>
 {x.status==='pending'&&<><button onClick={()=>d(x.user_id,true)}>Approve</button><button className="danger" onClick={()=>d(x.user_id,false)}>Reject</button></>}</div>)}</div>}</>}

function Subs({id}){
 const[s]=useQ(()=>sb.from('films').select().eq('festival_id',id),[id]),[q,setQ]=useState('')
 const v=(s||[]).filter(m=>(m.title+m.code+m.genre).toLowerCase().includes(q.toLowerCase()))
 return <><div className="row between"><div><div className="eyebrow">Festival</div><h3>Submissions</h3><p className="muted">Review payment and eligibility for every entry.</p></div><input style={{maxWidth:240}} placeholder="Search films…" value={q} onChange={x=>setQ(x.target.value)}/></div>
 {s===null?<Sk/>:v.length===0?<Empty>{s.length?'No films match your search.':'No submissions yet.'}</Empty>:
 <div className="tblw"><table className="tbl"><thead><tr><th>Film</th><th>Genre</th><th>Min</th><th>Status</th><th>Eligibility</th></tr></thead><tbody>
 {v.map((m,i)=><tr key={m.id} style={{'--i':i}}><td><span className="code">{m.code||'–'}</span><b>{m.title}</b></td><td>{m.genre}</td><td>{m.duration}</td><td><span className="badge">{m.status}</span></td><td>{m.eligible==null?'-':<><span className={'badge '+tone(m)}>{m.eligible?'Eligible':'Ineligible'}</span> <small>{m.reason}</small></>}</td></tr>)}</tbody></table></div>}</>}

function Assign({id,phase}){
 const[fl]=useQ(()=>sb.from('films').select('id,code,title').eq('festival_id',id).eq('eligible',true),[id,phase])
 const[ju]=useQ(()=>sb.from('jury').select('user_id,profiles(email)').eq('festival_id',id).eq('status','approved'),[id])
 const[sel,setSel]=useState({}),[done,setDone]=useState({})
 if(phase!=='review')return <><div className="eyebrow">Admin workspace</div><h3>Assign jury</h3><Empty>Assignment opens when you start review.</Empty></>
 return <><div className="eyebrow">Admin workspace</div><h3>Assign jury</h3><p className="muted">Pick a juror for each eligible film.</p>
 {fl===null?<Sk/>:fl.length===0?<Empty>No eligible films to assign.</Empty>:
 <div className="tblw"><table className="tbl"><tbody>{fl.map((m,i)=><tr key={m.id} style={{'--i':i}}><td><span className="code">{m.code}</span><b>{m.title}</b></td>
 <td><select style={{margin:0}} value={sel[m.id]||''} onChange={x=>setSel({...sel,[m.id]:x.target.value})}><option value="">Choose juror</option>{ju?.map(j=><option key={j.user_id} value={j.user_id}>{j.profiles?.email}</option>)}</select></td>
 <td><button disabled={!sel[m.id]} onClick={()=>rpc('assign',{flm:m.id,juror:sel[m.id]}).then(o=>{if(o){toast('Assigned');setDone({...done,[m.id]:true})}})}>{done[m.id]?'Assigned ✓':'Assign'}</button></td></tr>)}</tbody></table></div>}</>}

function Short({id,phase}){
 const[s]=useQ(()=>sb.rpc('shortlist_view',{fid:id}),[id,phase])
 return <><div className="eyebrow">Results</div><h3>Official shortlist</h3><p className="muted">Top films by aggregate score.</p>
 {s===null?<Sk/>:s.length===0?<Empty>The shortlist is built when review closes.</Empty>:
 <div className="tblw"><table className="tbl"><thead><tr><th>Film</th><th>Aggregate</th><th></th></tr></thead><tbody>{s.map((x,i)=><tr key={x.code} style={{'--i':i}}><td><span className="code">{x.code}</span><b>{x.title}</b></td><td style={{width:'45%'}}><div className="bar" style={{'--w':Math.min(+x.score,100)+'%'}}><i style={{animationDelay:i*90+'ms'}}/></div></td><td><b>{(+x.score).toFixed(1)}</b></td></tr>)}</tbody></table></div>}</>}

/* festival: jury */
function Card({m,cr,phase,re,close}){
 const[s,setS]=useState(m.my_scores||{}),[b,setB]=useState(false)
 const pub=sb.storage.from('posters').getPublicUrl(m.poster).data.publicUrl,rev=phase==='review'
 const tot=cr.reduce((a,c)=>a+(s[c.id]??0)*c.weight/10,0),all=cr.every(c=>s[c.id]!=null)
 useEffect(()=>{const k=e=>e.key==='Escape'&&close();window.addEventListener('keydown',k);return()=>window.removeEventListener('keydown',k)},[close])
 const save=async()=>{setB(true);if(await rpc('save_review',{flm:m.id,sc:s})){toast('Scores saved');re();close()};setB(false)}
 return <><div className="scrim" onClick={close}/><aside className="drawer" role="dialog" aria-label={m.title}>
 <div className="row between"><span className="code">{m.code}</span><button className="ghost" onClick={close}>Close ✕</button></div>
 <h2>{m.title}</h2><p className="muted">{m.genre} · {m.duration} min</p>
 <img className="poster" src={pub} alt="Poster" onError={x=>x.target.style.display='none'}/>
 <p>{m.synopsis}</p><p><a href={m.trailer} target="_blank" rel="noreferrer">Watch trailer ↗</a> &nbsp;·&nbsp; <a href={m.full_link} target="_blank" rel="noreferrer">Full film ↗</a></p>
 <div className="eyebrow" style={{marginTop:'1.2rem'}}>Scoring (0–10)</div>
 {cr.map(c=><div key={c.id} style={{marginTop:'.7rem'}}><b style={{fontSize:'.88rem'}}>{c.name}</b> <small>({c.weight}%)</small>
 <div className="score">{Array.from({length:11},(_,n)=><button key={n} disabled={!rev} className={s[c.id]===n?'on':''} onClick={()=>setS({...s,[c.id]:n})}>{n}</button>)}</div></div>)}
 <div className="total"><div className="row between"><b>Weighted total</b><b>{tot.toFixed(1)} / 100</b></div><div className="bar" style={{margin:'.4rem 0'}}><i style={{'--w':tot+'%',animation:'none',width:tot+'%',transition:'width .4s var(--ease)'}}/></div>
 {rev&&<button style={{width:'100%'}} disabled={b} onClick={save}><Busy on={b}>Saving</Busy>{!b&&(all?'Save scores':'Save progress')}</button>}</div></aside></>}
function Mine({id,phase}){
 const[fl,re]=useQ(()=>sb.rpc('jury_films',{fid:id}),[id])
 const[cr]=useQ(()=>sb.from('criteria').select().eq('festival_id',id).order('id'),[id])
 const[open,setOpen]=useState(null)
 const status=m=>{const n=Object.values(m.my_scores||{}).filter(v=>v!=null).length;return !n?['Not scored','warn']:n<(cr?.length||0)?['In progress','warn']:['Scored','ok']}
 const done=(fl||[]).filter(m=>status(m)[1]==='ok').length
 return <><div className="eyebrow">Jury workspace</div><h3>My assigned films</h3><p className="muted">Score every film before the review window closes.</p>
 {fl===null?<Sk/>:fl.length===0?<Empty>No films assigned to you yet.</Empty>:<>
 <div className="stats"><div className="card stat"><small>Assigned to you</small><b><Count to={fl.length}/></b></div><div className="card stat"><small>Reviews submitted</small><b><Count to={done}/></b><small>{fl.length-done} remaining</small></div></div>
 <div className="grid stag">{fl.map((m,i)=>{const[t,c]=status(m);return <div className="card film lift" style={{'--i':i}} key={m.id}>
 <div className="ph"><img src={sb.storage.from('posters').getPublicUrl(m.poster).data.publicUrl} alt="" onError={x=>x.target.style.display='none'}/><span className="code">{m.code}</span></div>
 <div className="bd"><div className="row between"><b>{m.title}</b><span className={'badge '+c}>{t}</span></div><small>{m.genre} · {m.duration} min</small><button onClick={()=>setOpen(m)}>{phase==='review'?'Review film →':'View film →'}</button></div></div>})}</div></>}
 {open&&cr&&<Card m={open} cr={cr} phase={phase} re={re} close={()=>setOpen(null)}/>}</>}

function Fest({id,me,go}){
 const[f,reload]=useQ(()=>sb.from('festivals').select().eq('id',id).single(),[id]),[t,setT]=useState(0)
 if(f===null)return <Sk/>
 if(!f.id)return null
 const adm=f.admin_id===me.id,P=f.phase
 const tabs=adm?[['⌂','Overview'],['♟','Jury requests'],['▤','Submissions'],['⌘','Assign jury'],['★','Shortlist']]:[['▤','My assigned films'],['★','Shortlist']]
 const body=adm?[<Overview key="o" f={f} reload={reload}/>,<Req key="r" id={id}/>,<Subs key="s" id={id}/>,<Assign key="a" id={id} phase={P}/>,<Short key="h" id={id} phase={P}/>]:[<Mine key="m" id={id} phase={P}/>,<Short key="h" id={id} phase={P}/>]
 return <div className="page"><Back go={go} label="My festivals"/><div className="shell" style={{marginTop:'.8rem'}}>
 <nav className="side"><div className="fname"><div className="eyebrow">Current festival</div><b>{f.name}</b><div><span className="badge warn" style={{marginTop:'.3rem'}}>{adm?'Admin · ':'Jury · '}{P}</span></div></div>
 {tabs.map(([ic,x],i)=><button key={x} className={'nav'+(i===t?' on':'')} onClick={()=>setT(i)}><span>{ic}</span>{x}</button>)}</nav>
 <section key={t} className="page" style={{minWidth:0}}>{body[t]}</section></div></div>}

function Notes({bump}){
 const[n]=useQ(()=>sb.from('notifications').select().order('created_at',{ascending:false}))
 const seen=useRef(null)
 useEffect(()=>{if(n&&!seen.current){seen.current=new Set(n.filter(x=>!x.read).map(x=>x.id))}},[n])
 useEffect(()=>{sb.from('notifications').update({read:true}).eq('read',false).then(bump)},[])
 return <div className="page" style={{maxWidth:720,margin:'0 auto'}}><div className="eyebrow">Inbox</div><h2>Notifications</h2>
 {n===null?<Sk/>:n.length===0?<Empty>No notifications yet.</Empty>:<div className="stag">{n.map((x,i)=><div className={'card'+(seen.current?.has(x.id)||(!seen.current&&!x.read)?' unread':'')} style={{'--i':i,marginBottom:'.6rem',padding:'.9rem 1.1rem'}} key={x.id}>{x.body}<br/><small>{new Date(x.created_at).toLocaleString()}</small></div>)}</div>}</div>}

export default function App(){
 const[s,setS]=useState(undefined),[me,setMe]=useState(null),[v,setV]=useState({n:'home'}),[tick,setTick]=useState(0)
 useEffect(()=>{sb.auth.getSession().then(({data})=>setS(data.session));const{data:l}=sb.auth.onAuthStateChange((_,x)=>setS(x));return()=>l.subscription.unsubscribe()},[])
 useEffect(()=>{if(s)sb.from('profiles').select().single().then(({data})=>setMe(data));else{setMe(null);setV({n:'home'})}},[s])
 if(s===undefined)return null
 if(!s)return <><Auth/><Toasts/></>
 if(!me)return <main><Sk n={2}/></main>
 const go=(n,x)=>{setV({n,...x});setTick(t=>t+1);window.scrollTo({top:0,behavior:'smooth'})}
 const page={home:()=>me.kind==='filmmaker'?<FHome go={go}/>:<NHome me={me} go={go}/>,submit:()=><Submit me={me} fest={v.fest} go={go}/>,pay:()=><Pay id={v.id} go={go}/>,done:()=><Done m={v.m} go={go}/>,create:()=><Create me={me} go={go}/>,browse:()=><Browse me={me} go={go}/>,fest:()=><Fest id={v.id} me={me} go={go}/>,notes:()=><Notes bump={()=>setTick(t=>t+1)}/>}[v.n]
 return <><Nav me={me} go={go} tick={tick}/><main key={v.n+(v.id||'')}>{page()}</main><Toasts/></>}
