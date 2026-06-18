/* Replace dropdown with per-camera track buttons */
const fs = require('fs');
let c = fs.readFileSync('src/components/nodes/Scene3DNode.tsx', 'utf8');

// ── Update makeRig to accept optional camId ──
const oldMakeRig = `const makeRig=(type:TrackType)=>{let cam=rigCamId?objects.find(o=>o.id===rigCamId):null;if(!cam){cam=objects.find(o=>o.type==='camera');}if(!cam)return;const cid=cam.id;if(!rigCamId)setRigCamId(cid);`;
const newMakeRig = `const makeRig=(type:TrackType,camId?:string)=>{const cam=camId?objects.find(o=>o.id===camId):(rigCamId?objects.find(o=>o.id===rigCamId):objects.find(o=>o.type==='camera'));if(!cam)return;const cid=cam.id;if(!rigCamId||rigCamId!==cid)setRigCamId(cid);`;
c = c.replace(oldMakeRig, newMakeRig);
console.log('1. makeRig accepts optional camId');

// ── Replace track section ──
// Find the track area between 光照 and the closing </div> of left panel
const lightingEnd = `<span style={{fontSize:8,color:'rgba(255,255,255,0.5)',width:24}}>{sunElevation}°</span></div>`;
const leftPanelClose = `</div>\n      <div style={{flex:1,minWidth:0,position:'relative'}}`;

// Find the exact content between lighting and left panel close
const lightIdx = c.indexOf(lightingEnd);
const closeIdx = c.indexOf(leftPanelClose, lightIdx);
if (lightIdx < 0 || closeIdx < 0) { console.log('ERROR: markers not found'); process.exit(1); }

const oldTrackSection = c.slice(lightIdx + lightingEnd.length, closeIdx);

// Build the new per-camera track section
const newTrackSection = `
        <div style={{width:'70%',height:1,background:'rgba(255,255,255,0.06)',margin:'6px 0'}}/><div style={{fontSize:9,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4,display:'flex',alignItems:'center'}}>轨道 · 时长<input type="number" value={trackDur} onChange={e=>setTrackDur(Math.max(1,Number(e.target.value)))} style={{width:36,marginLeft:4,background:'rgba(0,0,0,0.2)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:4,color:'#fff',fontSize:10,padding:'1px 4px',textAlign:'center'}}/>秒</div>{objects.filter(o=>o.type==='camera').length===0?<div style={{fontSize:9,color:'rgba(255,255,255,0.2)',textAlign:'center',padding:4}}>尚未添加相机</div>:objects.filter(o=>o.type==='camera').map((o,i)=><div key={o.id} style={{width:'100%',border:'1px solid rgba(255,255,255,0.06)',borderRadius:8,padding:5,display:'flex',flexDirection:'column',gap:3,background:rigCamId===o.id?'rgba(94,234,212,0.06)':'rgba(255,255,255,0.01)'}}><div onClick={()=>setRigCamId(o.id)} style={{fontSize:9,color:rigCamId===o.id?'#5EEAD4':'rgba(255,255,255,0.4)',cursor:'pointer',fontWeight:rigCamId===o.id?600:400,display:'flex',justifyContent:'space-between',alignItems:'center'}}><span>{camNames.current.get(o.id)||'机位'+(i+1)}</span>{allRigs.has(o.id)&&<span style={{fontSize:7,color:'rgba(255,255,255,0.2)'}}>●</span>}</div><div style={{display:'flex',gap:3}}><EBtn label='直线' active={rigCamId===o.id&&rig?.type==='dolly'} onClick={()=>makeRig('dolly',o.id)}/><EBtn label='曲线' active={rigCamId===o.id&&rig?.type==='curved'} onClick={()=>makeRig('curved',o.id)}/><EBtn label='环绕' active={rigCamId===o.id&&rig?.type==='orbit'} onClick={()=>makeRig('orbit',o.id)}/></div></div>)}{rig&&<div style={{display:'flex',gap:3,width:'100%',marginTop:2}}>{(rig.type==='curved'||rig.type==='orbit')&&<EBtn label='+控制点' onClick={()=>{setRig(prev=>{if(!prev)return prev;const getCPs=()=>{if(prev.type==='curved'&&prev.curved)return prev.curved.controlPoints;if(prev.type==='orbit'&&prev.orbit){const{center,radius,height,startAngle,endAngle}=prev.orbit;const angle=startAngle+(endAngle-startAngle)*0.5;return[{id:'cp_'+Date.now(),position:[center[0]+Math.cos(angle)*radius,center[1]+height,center[2]+Math.sin(angle)*radius]as Vec3}];}return[];};const cps=getCPs();if(prev.type==='curved'&&prev.curved&&prev.curved.controlPoints.length>=2){const last=prev.curved.controlPoints[prev.curved.controlPoints.length-1];const mid:Vec3=[(last.position[0]+prev.curved.controlPoints[0].position[0])/2,last.position[1],(last.position[2]+prev.curved.controlPoints[0].position[2])/2];const newCp={id:'cp_'+Date.now(),position:mid};return{...prev,curved:{...prev.curved,controlPoints:[...prev.curved.controlPoints.slice(0,-1),newCp,last]}};}return prev;});}}/>}<EBtn label='清除' onClick={()=>setRig(null)}/></div>}
`;

c = c.slice(0, lightIdx + lightingEnd.length) + newTrackSection + c.slice(closeIdx);
console.log('2. Track section replaced with per-camera buttons');

fs.writeFileSync('src/components/nodes/Scene3DNode.tsx', c);
console.log('Done');
