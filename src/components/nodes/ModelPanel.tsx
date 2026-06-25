/* === ModelPanel — 底部模型区 === */
import React, { useState } from 'react';
import { poseRegistry } from './Scene3DNode';

interface Props {
  objects: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onImport: (file: File) => void;
  onDeleteSelected: () => void;
  onAddPrimitive: (type: string) => void;
}

export function ModelPanel({ objects, selectedId, onSelect, onImport, onDeleteSelected, onAddPrimitive }: Props) {
  const [baseExp, setBaseExp] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  return (
    <div style={{ width:260, height:'100%',
      display:'flex', flexDirection:'column', pointerEvents:'all', background:'#141416', flexShrink:0 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', flexShrink:0 }}>
        <span style={{ fontSize:14, color:'#fff', fontWeight:700 }}>模型</span>
        <div style={{ display:'flex', gap:6 }}>
          <span onClick={()=>fileRef.current?.click()} style={{ cursor:'pointer', color:'#5EEAD4', fontSize:16, fontWeight:700 }}>+</span>
          <span onClick={onDeleteSelected} style={{ cursor:'pointer', color:'rgba(255,80,80,0.6)', fontSize:16, fontWeight:700 }}>−</span>
          <input ref={fileRef} type="file" accept=".glb,.fbx" style={{ display:'none' }}
            onChange={e=>{ const f=e.target.files?.[0]; if(f){ onImport(f); e.target.value=''; } }} />
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:4 }}>
        <div onClick={()=>setBaseExp(!baseExp)} style={{ fontSize:12, color:'#fff', padding:'4px 6px', cursor:'pointer', display:'flex', justifyContent:'space-between', fontWeight:600 }}>
          <span>基础模型</span><span style={{ fontSize:14 }}>{baseExp?'▾':'▸'}</span>
        </div>
        {baseExp && <div style={{ display:'flex', flexWrap:'wrap', gap:3, padding:'0 4px' }}>
          {['box','sphere','cylinder','plane'].map(t=>
            <div key={t} onClick={()=>onAddPrimitive(t)} style={{ padding:'3px 8px', borderRadius:4, cursor:'pointer', fontSize:9, border:'1px solid rgba(255,255,255,0.06)', color:'#fff' }}>
              {t==='box'?'立方体':t==='sphere'?'球体':t==='cylinder'?'圆柱':'平面'}
            </div>
          )}
        </div>}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:4, alignContent:'start', flex:1, marginTop:4 }}>
          {objects.filter((o:any)=>o.type!=='camera').length===0
            ? <div style={{ gridColumn:'1/5', textAlign:'center', padding:20, fontSize:11, color:'#fff' }}>拖入模型或点+</div>
            : objects.filter((o:any)=>o.type!=='camera').map((o:any)=>
              <div key={o.id} onClick={()=>onSelect(o.id)} style={{
                aspectRatio:'1', borderRadius:8, cursor:'pointer',
                border: selectedId===o.id?'1px solid rgba(94,234,212,0.3)':'1px solid rgba(255,255,255,0.05)',
                background: selectedId===o.id?'rgba(94,234,212,0.06)':'rgba(255,255,255,0.02)',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6, padding:8 }}>
                <div style={{ width:16, height:16, borderRadius:3, background:o.color||'#8899aa', flexShrink:0 }}/>
                <span style={{ fontSize:11, color: selectedId===o.id?'#5EEAD4':'#fff', textAlign:'center', lineHeight:1.2, overflow:'hidden', wordBreak:'break-word', maxHeight:28 }}>
                  {o.type==='figure'?o.figureName||(o.figureSrc||'').split('/').pop()||'人物':o.type==='box'?'立方体':o.type==='sphere'?'球体':o.type==='cylinder'?'圆柱':'平面'}
                </span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
