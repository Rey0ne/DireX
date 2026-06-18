/* Patch Scene3DNode.tsx — complete UI reorganization */
const fs = require('fs');
const path = 'src/components/nodes/Scene3DNode.tsx';
let c = fs.readFileSync(path, 'utf8');
const origLen = c.length;

// ── 0. Add trackDur + rigCamId state ──
// After: const camNames=useRef<Map<string,string>>(new Map());
const camNamesLine = "const camNames=useRef<Map<string,string>>(new Map());";
const addState = "const[trackDur,setTrackDur]=useState(15);const[rigCamId,setRigCamId]=useState('');";
if (!c.includes('setTrackDur=useState')) {
  c = c.replace(camNamesLine, camNamesLine + addState);
  console.log('0. Added trackDur + rigCamId state');
}

// ── 1. Replace PiP conditional → always visible ──
// Old pattern: {showCam&&<div style={{position:'absolute',bottom:timelineH+10...
// New: always render, with inner conditional for no-camera fallback
const oldPiPWrapper = "{showCam&&<div style={{position:'absolute',bottom:timelineH+10,right:16,zIndex:102,width:680,background:'#111',borderRadius:12,overflow:'hidden',border:'2px solid #333',boxShadow:'0 0 20px rgba(0,0,0,0.5)'}}>";
const newPiPWrapper = "<div style={{position:'absolute',bottom:timelineH+10,right:16,zIndex:102,width:680,background:'#111',borderRadius:12,overflow:'hidden',border:'2px solid #333',boxShadow:'0 0 20px rgba(0,0,0,0.5)'}}>";

if (c.includes(oldPiPWrapper)) {
  c = c.replace(oldPiPWrapper, newPiPWrapper);
  console.log('1. PiP always visible');
}

// Close the PiP div — find the closing }
// The PiP ends with: </div>}</div>}   — we need to remove the closing } for showCam
// Pattern: </div>}</div>}  (end of PiP div, then close showCam conditional)
// Actually the PiP section ends with:
//   </div>}</div>}
//     ^end of pipCanvas ^end of PiP wrapper ^end of showCam condition
// After:  </div></div>  (no conditional close)

// The PiP ends at line 187:     </div>}
// Let me find the exact closing pattern
const oldPiPEnd = "        </Canvas>\n        <div style={{position:'absolute',inset:0,pointerEvents:'none',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:'80%',height:'80%',border:'1px solid rgba(255,255,255,0.3)'}}/></div>\n      </div>\n    </div>}";
const newPiPEnd = "        </Canvas>\n        <div style={{position:'absolute',inset:0,pointerEvents:'none',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{width:'80%',height:'80%',border:'1px solid rgba(255,255,255,0.3)'}}/></div>\n      </div>\n      {objects.filter(o=>o.type==='camera').length===0&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'#1a1a1a',pointerEvents:'none'}}><span style={{color:'rgba(255,255,255,0.35)',fontSize:14,fontWeight:500}}>请添加相机</span></div>}\n    </div>";

if (c.includes(oldPiPEnd)) {
  c = c.replace(oldPiPEnd, newPiPEnd);
  console.log('1b. PiP fallback: 请添加相机');
}

// ── 2. Replace left panel track section with camera-track group ──
// Old: ...<div>轨道</div><EBtn label='直线推轨'...
// New: camera selector + track duration + group container
const oldTrackSection = `<div style={{width:'70%',height:1,background:'rgba(255,255,255,0.06)',margin:'6px 0'}}/><div style={{fontSize:9,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:2}}>轨道</div><EBtn label='直线推轨' active={rig?.type==='dolly'} onClick={()=>makeRig('dolly')}/><EBtn label='曲线轨道' active={rig?.type==='curved'} onClick={()=>makeRig('curved')}/><EBtn label='环绕轨道' active={rig?.type==='orbit'} onClick={()=>makeRig('orbit')}/>`;

const newTrackSection = `<div style={{width:'70%',height:1,background:'rgba(255,255,255,0.06)',margin:'6px 0'}}/><div style={{fontSize:9,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4,display:'flex',alignItems:'center'}}>轨道 · 时长<input type="number" value={trackDur} onChange={e=>setTrackDur(Math.max(1,Number(e.target.value)))} style={{width:36,marginLeft:4,background:'rgba(0,0,0,0.2)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:4,color:'#fff',fontSize:10,padding:'1px 4px',textAlign:'center'}}/>秒</div><div style={{border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:6,display:'flex',flexDirection:'column',gap:4,background:'rgba(255,255,255,0.02)',width:'100%'}}><select value={rigCamId} onChange={e=>setRigCamId(e.target.value)} style={{width:'100%',padding:4,background:'rgba(0,0,0,0.3)',border:'none',borderRadius:6,color:'#fff',fontSize:10}}><option value="">选择机位…</option>{objects.filter(o=>o.type==='camera').map((o,i)=><option key={o.id} value={o.id}>{camNames.current.get(o.id)||'机位'+(i+1)}</option>)}</select><div style={{display:'flex',gap:3,flexWrap:'wrap'}}><EBtn label='直线' active={rig?.type==='dolly'} onClick={()=>makeRig('dolly')}/><EBtn label='曲线' active={rig?.type==='curved'} onClick={()=>makeRig('curved')}/><EBtn label='环绕' active={rig?.type==='orbit'} onClick={()=>makeRig('orbit')}/></div></div>`;

if (c.includes(oldTrackSection)) {
  c = c.replace(oldTrackSection, newTrackSection);
  console.log('2. Camera-track group');
}

// ── 3. Close track group div before +控制点 ──
// The +控制点 button and 清除轨道 button need to be after the </div> that closes the group
// Find:  {rig&&(rig.type==='curved'||rig.type==='orbit')&&<EBtn label='+控制点'
// Replace with: </div>{rig&&(rig.type==='curved'||rig.type==='orbit')&&<EBtn label='+控制点'
const controlPointPattern = "{rig&&(rig.type==='curved'||rig.type==='orbit')&&<EBtn label='+控制点'";
if (c.includes(controlPointPattern) && !c.includes("</div>" + controlPointPattern)) {
  c = c.replace(controlPointPattern, "</div>" + controlPointPattern);
  console.log('3. Close track group before control points');
}

// ── 4. Update makeRig to use rigCamId ──
// Old: const cam=objects.find(o=>o.type==='camera');
// New: const cam=rigCamId?objects.find(o=>o.id===rigCamId):objects.find(o=>o.type==='camera');
const oldMakeRigCam = "const cam=objects.find(o=>o.type==='camera');";
const newMakeRigCam = "const cam=rigCamId?objects.find(o=>o.id===rigCamId):objects.find(o=>o.type==='camera');";
if (c.includes(oldMakeRigCam)) {
  c = c.replace(oldMakeRigCam, newMakeRigCam);
  console.log('4. makeRig uses rigCamId');
}

// ── 5. Update addCamera to include camNames ──
// After pushUndo, set camNames
const addCamPattern = "const addCamera=useCallback(()=>{_oid++;const obj:SceneObject={id:`o_${_oid}`,type:'camera',position:[8,2,5],rotation:[0,0,0],scale:[1,1,1]};pushUndo(objects);setObjects(prev=>[...prev,obj]);setSelectedId(obj.id);},[setObjects,setSelectedId,objects,pushUndo]);";
const newAddCam = "const addCamera=useCallback(()=>{_oid++;const camIdx=objects.filter(o=>o.type==='camera').length;if(camIdx>=8)return;const name=`机位${camIdx+1}`;const obj:SceneObject={id:`o_${_oid}`,type:'camera',position:[8,2,5],rotation:[0,0,0],scale:[1,1,1]};pushUndo(objects);setObjects(prev=>[...prev,obj]);setSelectedId(obj.id);setTimeout(()=>camNames.current.set(obj.id,name),0);},[setObjects,setSelectedId,objects,pushUndo]);";

if (c.includes(addCamPattern)) {
  c = c.replace(addCamPattern, newAddCam);
  console.log('5. addCamera with camNames (max 8)');
}

// ── 6. Add info bar above PiP ──
// Find the PiP wrapper div and add info bar before it
// PiP wrapper: <div style={{position:'absolute',bottom:timelineH+10,right:16,zIndex:102,width:680...
const pipWrapper = "<div style={{position:'absolute',bottom:timelineH+10,right:16,zIndex:102,width:680,background:'#111',borderRadius:12,overflow:'hidden',border:'2px solid #333',boxShadow:'0 0 20px rgba(0,0,0,0.5)'}}>";
const infoBar = "{selObj&&<div style={{position:'absolute',bottom:timelineH+10+380+44,right:16,zIndex:102,width:680,display:'flex',alignItems:'center',gap:14,padding:'4px 12px',background:'rgba(255,255,255,0.88)',borderRadius:'8px 8px 0 0',fontSize:11,color:'#222',fontWeight:500,pointerEvents:'all'}}><span>{selObj.type==='box'?'立方体':selObj.type==='sphere'?'球体':selObj.type==='cylinder'?'圆柱':selObj.type==='plane'?'平面':selObj.type==='camera'?camNames.current.get(selObj.id)||'摄像机':'人物'}</span><span style={{display:'flex',alignItems:'center',gap:4}}>颜色 <div style={{width:12,height:12,borderRadius:2,background:selObj.color||'#8899aa',border:'1px solid rgba(0,0,0,0.2)'}}/></span><span>X:{selObj.position[0].toFixed(1)} Y:{selObj.position[1].toFixed(1)} Z:{selObj.position[2].toFixed(1)}</span><span style={{flex:1}}/><button onClick={()=>{pushUndo(objects);setObjects(prev=>prev.map(o=>o.id===selectedId?{...o,position:[0,o.type==='figure'||o.type==='plane'?0:0.5,0],rotation:[0,0,0]}:o));}} style={{padding:'2px 8px',borderRadius:4,fontSize:10,background:'rgba(0,0,0,0.06)',border:'1px solid rgba(0,0,0,0.15)',color:'#444',cursor:'pointer'}}>复位</button></div>}";

// Insert info bar + pip wrapper (they need to be consecutive)
if (c.includes(infoBar + pipWrapper)) {
  console.log('6. Info bar already present');
} else if (c.includes(pipWrapper)) {
  c = c.replace(pipWrapper, infoBar + pipWrapper);
  console.log('6. Info bar added');
}

// ── 7. Add color section to left panel ──
// After the camera section (加摄像机 / 开取景器 buttons), add a color section
// Find: <EBtn label={showCam?'关取景器':'开取景器'} onClick={()=>setShowCam(!showCam)} active={showCam}/>
const camSection = "<EBtn label={showCam?'关取景器':'开取景器'} onClick={()=>setShowCam(!showCam)} active={showCam}/>";
const colorSection = "<div style={{width:'70%',height:1,background:'rgba(255,255,255,0.06)',margin:'6px 0'}}/><div style={{fontSize:9,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:2}}>颜色</div><div style={{display:'flex',gap:3,flexWrap:'wrap',justifyContent:'center'}}>{['#8899aa','#99aabb','#aabbcc','#778899','#b0bec5','#ffccaa','#aaccaa','#ccaacc','#ffaa88','#aaccff'].map(clr=><div key={clr} onClick={()=>{if(selObj){pushUndo(objects);setObjects(prev=>prev.map(o=>o.id===selectedId?{...o,color:clr}:o));}}} style={{width:18,height:18,borderRadius:4,background:clr,cursor:'pointer',border:selObj?.color===clr?'2px solid #fff':'1px solid rgba(255,255,255,0.15)'}}/>)}</div>";

if (c.includes(camSection) && !c.includes('颜色</div><div')) {
  c = c.replace(camSection, camSection + colorSection);
  console.log('7. Color section added to left panel');
}

// ── 8. Restructure bottom bar: shared background for ModelPanel + Timeline + PiP ──
// Replace the old timeline wrapper and ModelPanel with a unified bottom bar
// Old timeline wraps in: {rig&&<div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:101...
// We want to replace that entire block AND the ModelPanel with a unified layout

// The timeline block starts at line 188: {rig&&<div style={{position:'absolute',bottom:0...
// ModelPanel is at line 223

// This is the trickiest part. Let me identify the exact patterns.
// Old:         {rig&&<div style={{position:'absolute',bottom:0...timeline...}}</div>}
//      <ModelPanel .../>
// New: A unified bottom container

// Let me find the exact text between timeline end and ModelPanel
// The timeline section ends with: </div>}  (close timeline div, close rig condition)
// Then: \n    <ModelPanel

// Let me find and replace the rig-conditional wrapper on the timeline
const oldTimelineStart = "        {rig&&<div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:101,background:'rgba(0,0,0,0.85)',borderTop:'1px solid rgba(255,255,255,0.1)',padding:'6px 14px',height:Math.max(timelineH,80+rig.animTracks.length*24),overflow:'hidden'}}>";

// New: remove the conditional, wrap timeline in a shared bottom bar
const newBottomBar = "        <div style={{position:'absolute',bottom:0,left:0,right:0,zIndex:101,display:'flex',height:408,background:'#141416',borderTop:'1px solid rgba(255,255,255,0.06)'}}>\n      <ModelPanel objects={objects} selectedId={selectedId} onSelect={setSelectedId} onImport={f=>{importFile(f,(entry,poseId)=>{_oid++;const obj:SceneObject={id:`o_${_oid}`,type:'figure',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],color:pickColor(),figurePose:poseId,figureSrc:entry.src,figureFmt:entry.format};pushUndo(objects);setObjects(prev=>[...prev,obj]);setSelectedId(obj.id);});}} onDeleteSelected={()=>{if(!selectedId)return;pushUndo(objects);setObjects(prev=>prev.filter(x=>x.id!==selectedId));setSelectedId(null);}} onAddPrimitive={addObj}/>\n      <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,borderLeft:'1px solid rgba(255,255,255,0.04)'}}>";

// Replace the old timeline start with the new bottom bar
if (c.includes(oldTimelineStart)) {
  c = c.replace(oldTimelineStart, newBottomBar);
  console.log('8a. Bottom bar start replaced');
}

// Now find the closing of the timeline div (before ModelPanel)
// The timeline ends with:   </div>}\n    <ModelPanel
// We need to close the flex container and remove standalone ModelPanel
const oldTimelineEnd = "    </div>}\n    <ModelPanel objects={objects} selectedId={selectedId} onSelect={setSelectedId} onImport={f=>{importFile(f,(entry,poseId)=>{_oid++;const obj:SceneObject={id:`o_${_oid}`,type:'figure',position:[0,0,0],rotation:[0,0,0],scale:[1,1,1],color:pickColor(),figurePose:poseId,figureSrc:entry.src,figureFmt:entry.format};pushUndo(objects);setObjects(prev=>[...prev,obj]);setSelectedId(obj.id);});}} onDeleteSelected={()=>{if(!selectedId)return;pushUndo(objects);setObjects(prev=>prev.filter(x=>x.id!==selectedId));setSelectedId(null);}} onAddPrimitive={addObj}/>";

// The PiP is already positioned absolutely, so the bottom bar only contains ModelPanel + Timeline
// But the PiP positioning is `bottom:timelineH+10` which won't work well anymore.
// Let me keep the PiP absolutely positioned inside the bottom bar area.
// Actually this is getting really complex. Let me simplify:

// Instead of a full restructure, let me make the timeline non-conditional and shared background
const newTimelineClose = "      </div>\n    </div>";

if (c.includes(oldTimelineEnd)) {
  c = c.replace(oldTimelineEnd, newTimelineClose);
  console.log('8b. Bottom bar end replaced');
}

// Also need to make the timeline div NOT conditional on rig
// The timeline now starts inside the bottom bar flex container.
// We need to show timeline always, even without rig.
// Replace rig-conditional inner content to always show
// Find the rig condition inside the timeline:  (the timeline inner content starts with the resize handle)

// Actually, let me check if the timeline was already changed...

// ── 9. Fix PiP position ──
// PiP was at bottom:timelineH+10, now it should be inside the bottom bar area
// Change PiP position to be right-side within the 408px bottom bar
const oldPiPPosition = "bottom:timelineH+10,right:16,zIndex:102,width:680";
const newPiPPosition = "bottom:408,right:16,zIndex:102,width:680";
if (c.includes(oldPiPPosition)) {
  c = c.replace(oldPiPPosition, newPiPPosition);
  console.log('9. PiP position adjusted');
}

// Also fix info bar position
const oldInfoBarPos = "bottom:timelineH+10+380+44,right:16,zIndex:102,width:680";
const newInfoBarPos = "bottom:836,right:16,zIndex:102,width:680";
if (c.includes(oldInfoBarPos)) {
  c = c.replace(oldInfoBarPos, newInfoBarPos);
  console.log('9b. Info bar position adjusted');
}

// ── 10. Add rig null guard for timeline content ──
// Wrap the timeline inner content with {rig&&<>...</>} so it doesn't crash when rig is null
const timelineFlexDiv = "<div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,borderLeft:'1px solid rgba(255,255,255,0.04)'}}>";
const guardedFlexDiv = "<div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,borderLeft:'1px solid rgba(255,255,255,0.04)'}}>{rig&&<>";
if (c.includes(guardedFlexDiv)) {
  console.log('10. Rig guard already present');
} else if (c.includes(timelineFlexDiv)) {
  c = c.replace(timelineFlexDiv, guardedFlexDiv);
  console.log('10a. Rig guard open added');
}

// Close guard before the flex div closes
const animTracksEnd = "</div>)}      </div>";
const guardedEnd = "</div>)}</>}      </div>";
if (c.includes(guardedEnd)) {
  console.log('10b. Rig guard close already present');
} else if (c.includes(animTracksEnd)) {
  c = c.replace(animTracksEnd, guardedEnd);
  console.log('10b. Rig guard close added');
}

// ── Write ──
if (c.length !== origLen) {
  fs.writeFileSync(path, c);
  console.log(`\nDone! ${origLen} → ${c.length} chars (${c.length - origLen} diff)`);
} else {
  console.log('\nWARNING: No changes made! Check string matching.');
}
