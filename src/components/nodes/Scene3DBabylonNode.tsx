/* === Scene3DBabylonNode — Babylon.js full 3D editor === */
import { useState,useCallback,useRef,useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle } from '@xyflow/react';
import '@babylonjs/loaders';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { Vector3,Color3,Color4 } from '@babylonjs/core/Maths/math';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import { GizmoManager } from '@babylonjs/core/Gizmos/gizmoManager';
import { UtilityLayerRenderer } from '@babylonjs/core/Rendering/utilityLayerRenderer';
import { ActionManager } from '@babylonjs/core/Actions/actionManager';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';

// ═══════════════ Types
type Vec3=[number,number,number];
interface SceneObj{id:string;type:'box'|'sphere'|'cylinder'|'plane'|'figure';position:Vec3;rotation:Vec3;scale:Vec3;figurePose?:string;figureSrc?:string;}
type GizmoMode='translate'|'rotate'|'scale';

const NODE_W=500,NODE_H=300;

// ═══════════════ Babylon 3D View
function BabylonView({objects,selectedId,onSelect,gizmoMode,onMoved,fullscreen,onClose}:{
  objects:SceneObj[];selectedId:string|null;onSelect:(id:string|null)=>void;gizmoMode:GizmoMode;
  onMoved:(id:string,pos:Vec3,rot:Vec3,scl:Vec3)=>void;fullscreen:boolean;onClose:()=>void;
}){
  const cRef=useRef<HTMLCanvasElement>(null);
  const sceneRef=useRef<Scene|null>(null);
  const gizmoRef=useRef<GizmoManager|null>(null);
  const meshMap=useRef<Map<string,AbstractMesh>>(new Map());
  const dropModel=useRef<(file:File)=>void>(()=>{});

  // Sync objects
  useEffect(()=>{
    const scene=sceneRef.current;if(!scene)return;
    const existingIds=new Set(objects.map(o=>o.id));
    // Remove deleted
    meshMap.current.forEach((m,id)=>{if(!existingIds.has(id)){m.dispose();meshMap.current.delete(id);}});
    // Add/update
    objects.forEach(obj=>{
      let mesh=meshMap.current.get(obj.id);
      if(!mesh){
        if(obj.type==='figure'){
          const src=obj.figureSrc||`/models/${obj.figurePose||'stand1'}.fbx`;
          const root=new Mesh(obj.id,scene);
          meshMap.current.set(obj.id,root);
          SceneLoader.ImportMesh('','',src,scene,(meshes)=>{meshes.forEach(m=>{if(m!==meshes[0])m.setParent(root);});root.position.set(...obj.position);});
        }else{
          mesh=createPrimitive(obj,scene);
          meshMap.current.set(obj.id,mesh);
        }
      }
      if(mesh){mesh.position.set(...obj.position);mesh.rotation.set(...obj.rotation);mesh.scaling.set(...obj.scale);}
    });
  },[objects]);

  useEffect(()=>{
    const canvas=cRef.current;if(!canvas)return;
    const engine=new Engine(canvas,true,{preserveDrawingBuffer:false,stencil:true,antialias:true});
    const scene=new Scene(engine);
    sceneRef.current=scene;
    scene.clearColor=new Color4(0.5,0.5,0.5,1);
    scene.actionManager=new ActionManager(scene);

    // Camera
    const cam=new ArcRotateCamera('cam',Math.PI/4,Math.PI/3,8,Vector3.Zero(),scene);
    cam.lowerRadiusLimit=2;cam.upperRadiusLimit=25;cam.upperBetaLimit=Math.PI/2+0.2;
    cam.attachControl(canvas,true);

    // Lighting
    const hemi=new HemisphericLight('hemi',new Vector3(0,1,0),scene);
    hemi.intensity=0.5;hemi.diffuse=new Color3(0.8,0.8,0.8);hemi.groundColor=new Color3(0.35,0.35,0.35);hemi.specular=Color3.Black();
    const dir=new DirectionalLight('dir',new Vector3(0.5,-0.8,-0.5),scene);
    dir.intensity=0.4;dir.diffuse=new Color3(0.7,0.7,0.7);dir.specular=Color3.Black();

    // Ground
    const ground=MeshBuilder.CreateGround('ground',{width:20,height:20},scene);
    ground.position.y=-0.01;ground.receiveShadows=true;
    const gMat=new StandardMaterial('gMat',scene);gMat.diffuseColor=new Color3(0.6,0.6,0.6);ground.material=gMat;

    // Gizmo
    new UtilityLayerRenderer(scene);
    const gizmo=new GizmoManager(scene);
    gizmoRef.current=gizmo;
    gizmo.positionGizmoEnabled=true;
    gizmo.rotationGizmoEnabled=false;
    gizmo.scaleGizmoEnabled=false;
    gizmo.usePointerToAttachGizmos=false;
    gizmo.attachableMeshes=null;
    gizmo.clearGizmoOnEmptyPointerEvent=true;

    // Click to select
    scene.onPointerObservable.add(evt=>{
      if(evt.type===3){ // POINTERDOWN (not on gizmo)
        if(evt.pickInfo?.hit&&evt.pickInfo.pickedMesh){
          let m=evt.pickInfo.pickedMesh;
          while(m&&!meshMap.current.has(m.id))m=m.parent as AbstractMesh;
          if(m){onSelect(m.id);}
        }else{onSelect(null);}
      }
    });

    // Drag-drop FBX
    dropModel.current=(file:File)=>{
      const url=URL.createObjectURL(file);
      const name=file.name.replace(/\.fbx$/i,'');
      SceneLoader.ImportMesh('','',url,scene,(meshes)=>{
        const root=new Mesh(name,scene);
        meshes.forEach(m=>{if(m!==meshes[0])m.setParent(root);});
        root.position.set((Math.random()-0.5)*2,0,(Math.random()-0.5)*2);
        onSelect(name);meshMap.current.set(name,root);
        URL.revokeObjectURL(url);
      });
    };

    // Document-level drag-drop (bypasses canvas interception)
    const onDocDr=(e:DragEvent)=>{e.preventDefault();};
    const onDocDp=(e:DragEvent)=>{e.preventDefault();const f=e.dataTransfer?.files[0];if(f?.name.endsWith('.fbx'))dropModel.current(f);};
    document.addEventListener('dragover',onDocDr);document.addEventListener('drop',onDocDp);

    engine.runRenderLoop(()=>scene.render());
    const onR=()=>engine.resize();window.addEventListener('resize',onR);
    return()=>{window.removeEventListener('resize',onR);document.removeEventListener('dragover',onDocDr);document.removeEventListener('drop',onDocDp);engine.dispose();};
  },[]);

  // Gizmo mode
  useEffect(()=>{
    const g=gizmoRef.current;if(!g)return;
    g.positionGizmoEnabled=gizmoMode==='translate';
    g.rotationGizmoEnabled=gizmoMode==='rotate';
    g.scaleGizmoEnabled=gizmoMode==='scale';
    // Attach to selected
    if(selectedId){
      const m=meshMap.current.get(selectedId);
      if(m){g.attachToMesh(m);}
    }
  },[gizmoMode,selectedId]);

  // Track transforms for selected
  useEffect(()=>{
    if(!selectedId)return;
    const m=meshMap.current.get(selectedId);if(!m)return;
    const iv=setInterval(()=>{
      const pos:Vec3=[m.position.x,m.position.y,m.position.z];
      const rot:Vec3=[m.rotation.x,m.rotation.y,m.rotation.z];
      const scl:Vec3=[m.scaling.x,m.scaling.y,m.scaling.z];
      onMoved(selectedId,pos,rot,scl);
    },100);
    return()=>clearInterval(iv);
  },[selectedId,onMoved]);

  const wrapStyle=fullscreen?{width:'100%',height:'100%'}:{width:'100%',height:NODE_H};
  return<div style={{position:'relative',background:'#808080',...wrapStyle}}>
    <canvas ref={cRef} style={{width:'100%',height:'100%',display:'block'}}/>
  </div>;
}

function createPrimitive(obj:SceneObj,scene:Scene){
  let mesh:Mesh;
  switch(obj.type){
    case'box':mesh=MeshBuilder.CreateBox(obj.id,{size:1},scene);break;
    case'sphere':mesh=MeshBuilder.CreateSphere(obj.id,{diameter:1},scene);break;
    case'cylinder':mesh=MeshBuilder.CreateCylinder(obj.id,{height:1,diameter:1},scene);break;
    case'plane':mesh=MeshBuilder.CreatePlane(obj.id,{size:1},scene);break;
    default:mesh=MeshBuilder.CreateBox(obj.id,{size:1},scene);
  }
  const mat=new StandardMaterial(`mat_${obj.id}`,scene);
  const c=new Color3(0.55,0.6,0.65);mat.diffuseColor=c;mat.specularColor=Color3.Black();mesh.material=mat;
  return mesh;
}

// ═══════════════ Tool button
function Tb({label,active,onClick,style}:{label:string;active?:boolean;onClick:()=>void;style?:React.CSSProperties}){
  return<button onClick={onClick} style={{padding:'8px 10px',borderRadius:8,fontSize:12,cursor:'pointer',fontWeight:500,
    border:active?'1px solid rgba(100,140,255,0.35)':'1px solid rgba(255,255,255,0.12)',
    background:active?'rgba(100,140,255,0.2)':'rgba(255,255,255,0.06)',
    color:active?'#a0c0ff':'rgba(255,255,255,0.75)',whiteSpace:'nowrap',...style}}>{label}</button>;
}

// ═══════════════ Main Node
export function Scene3DBabylonNode({selected}:{selected?:boolean}){
  const[fs,setFs]=useState(false);
  const[objects,setObjects]=useState<SceneObj[]>([]);
  const[selId,setSelId]=useState<string|null>(null);
  const[gizmo,setGizmo]=useState<GizmoMode>('translate');
  const ctr=useRef(0);
  const selObj=objects.find(o=>o.id===selId);

  const addObj=useCallback((type:SceneObj['type'])=>{
    ctr.current++;const id=`o_${ctr.current}`;const y=type==='figure'||type==='plane'?0:0.5;
    const obj:SceneObj={id,type,position:[0,y,0],rotation:[0,0,0],scale:[1,1,1],figurePose:'stand1',figureSrc:'/models/stand1.fbx'};
    setObjects(p=>[...p,obj]);setSelId(id);
  },[]);

  const handleSnap=useCallback(()=>{
    const c=document.querySelector('canvas');if(!c)return;
    const dataUrl=c.toDataURL('image/png');
    console.log('[Babylon] Snapshot:',dataUrl.slice(0,50)+'...');
  },[]);

  const onMoved=useCallback((id:string,pos:Vec3,rot:Vec3,scl:Vec3)=>{
    setObjects(p=>p.map(o=>o.id===id?{...o,position:pos,rotation:rot,scale:scl}:o));
  },[]);

  return(<>
    {fs&&createPortal(<div style={{position:'fixed',inset:0,zIndex:99999,background:'#333',display:'flex',flexDirection:'column'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 14px',background:'rgba(0,0,0,0.5)',flexShrink:0}}>
        <span style={{fontSize:14,fontWeight:600,color:'#eee'}}>🧪 Babylon.js 3D 编辑器</span>
        <div style={{display:'flex',gap:8}}>
          <Tb label="📸 截图" onClick={handleSnap}/>
          <Tb label="✕ 退出" onClick={()=>setFs(false)}/>
        </div>
      </div>
      <div style={{flex:1,display:'flex',minHeight:0}}>
        <div style={{width:90,display:'flex',flexDirection:'column',gap:6,padding:'10px 8px',borderRight:'1px solid rgba(255,255,255,0.08)',flexShrink:0,background:'rgba(0,0,0,0.35)'}}>
          <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:2}}>几何体</div>
          <Tb label="📦 立方体" onClick={()=>addObj('box')}/>
          <Tb label="🔵 球体" onClick={()=>addObj('sphere')}/>
          <Tb label="🥫 圆柱" onClick={()=>addObj('cylinder')}/>
          <Tb label="◻ 平面" onClick={()=>addObj('plane')}/>
          <div style={{height:1,background:'rgba(255,255,255,0.08)',margin:'6px 0'}}/>
          <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:2}}>人物</div>
          <Tb label="🧍 添加人物" onClick={()=>addObj('figure')}/>
          <div style={{height:1,background:'rgba(255,255,255,0.08)',margin:'6px 0'}}/>
          <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:2}}>工具</div>
          <Tb label="↕ 移动" active={gizmo==='translate'} onClick={()=>setGizmo('translate')}/>
          <Tb label="↻ 旋转" active={gizmo==='rotate'} onClick={()=>setGizmo('rotate')}/>
          <Tb label="⤡ 缩放" active={gizmo==='scale'} onClick={()=>setGizmo('scale')}/>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <BabylonView objects={objects} selectedId={selId} onSelect={setSelId} gizmoMode={gizmo} onMoved={onMoved} fullscreen onClose={()=>setFs(false)}/>
        </div>
        <div style={{width:140,padding:'10px',borderLeft:'1px solid rgba(255,255,255,0.08)',flexShrink:0,background:'rgba(0,0,0,0.2)'}}>
          <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginBottom:8,textTransform:'uppercase',letterSpacing:'0.05em'}}>属性</div>
          {selObj?<div style={{fontSize:12,color:'#ccc'}}>
            类型:{selObj.type==='box'?'立方体':selObj.type==='sphere'?'球体':selObj.type==='cylinder'?'圆柱':selObj.type==='plane'?'平面':'人物'}<br/><br/>
            X:{selObj.position[0].toFixed(1)} Y:{selObj.position[1].toFixed(1)} Z:{selObj.position[2].toFixed(1)}
          </div>:<div style={{fontSize:11,color:'rgba(255,255,255,0.2)',lineHeight:1.6}}>点击物体选中<br/>拖FBX导入模型<br/>右键旋转视角</div>}
        </div>
      </div>
      <div style={{padding:'5px 14px',borderTop:'1px solid rgba(255,255,255,0.08)',flexShrink:0,fontSize:10,color:'rgba(255,255,255,0.2)',textAlign:'center',background:'rgba(0,0,0,0.35)'}}>
        拖FBX文件到此窗口导入模型 | 左键选中物体 | ↕↻⤡ 移动/旋转/缩放
      </div>
    </div>,document.body)}
    <div style={{width:NODE_W,background:'rgba(18,20,24,0.95)',border:selected?'2px solid rgba(100,140,255,0.6)':'1px solid rgba(255,255,255,0.12)',borderRadius:14,overflow:'hidden',boxShadow:selected?'0 0 24px rgba(100,140,255,0.18)':'0 4px 16px rgba(0,0,0,0.3)'}}>
      <div style={{padding:'5px 10px',borderBottom:'1px solid rgba(255,255,255,0.06)',fontSize:11,color:'rgba(255,255,255,0.4)',fontWeight:600,display:'flex',justifyContent:'space-between'}}>
        <span>🧪 Babylon 3D</span>{selected&&<button onClick={()=>setFs(true)} style={{padding:'3px 10px',borderRadius:5,fontSize:10,background:'rgba(100,140,255,0.1)',border:'1px solid rgba(100,140,255,0.2)',color:'rgba(140,170,255,0.8)',cursor:'pointer'}}>⛶ 全屏</button>}
      </div>
      <BabylonView objects={objects} selectedId={selId} onSelect={setSelId} gizmoMode={gizmo} onMoved={onMoved} fullscreen={false} onClose={()=>{}}/>
      <div style={{display:'flex',gap:3,padding:'4px 8px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
        <Tb label="📦" onClick={()=>addObj('box')}/><Tb label="🔵" onClick={()=>addObj('sphere')}/><Tb label="🥫" onClick={()=>addObj('cylinder')}/><Tb label="◻" onClick={()=>addObj('plane')}/><Tb label="🧍" onClick={()=>addObj('figure')}/>
        <span style={{flex:1}}/>
        <Tb label="↕" active={gizmo==='translate'} onClick={()=>setGizmo('translate')}/><Tb label="↻" active={gizmo==='rotate'} onClick={()=>setGizmo('rotate')}/><Tb label="⤡" active={gizmo==='scale'} onClick={()=>setGizmo('scale')}/>
      </div>
      <Handle type="target" position={('left'as any)} id="in" style={{background:'rgba(180,180,200,0.5)',width:10,height:10,border:'none'}}/>
      <Handle type="source" position={('right'as any)} id="out" style={{background:'rgba(180,180,200,0.5)',width:10,height:10,border:'none'}}/>
    </div>
  </>);
}
