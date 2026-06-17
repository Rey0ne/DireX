/* === AutoRigButton — Blender auto-rig integration === */
import { useState, useEffect, useCallback } from 'react';
import { addPoseEntry } from './Scene3DNode';

interface AutoRigButtonProps {
  figureSrc: string;
  figureFmt: string;
  figurePose: string;
  onRigged: (glbUrl: string) => void;
}

export function AutoRigButton({ figureSrc, figureFmt, figurePose, onRigged }: AutoRigButtonProps) {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done' | 'error'>('idle');
  const [boneCount, setBoneCount] = useState(0);

  useEffect(() => {
    if (!jobId || status !== 'processing') return;
    const timer = setInterval(async () => {
      try {
        const r = await fetch(`/api/blender/job/${jobId}`, {
          headers: { Authorization: 'Bearer tapnow-dev-key' }
        });
        const j = await r.json();
        if (j.status === 'done') {
          setStatus('done');
          setBoneCount(j.boneCount || 0);
          const bin = atob(j.outputModel);
          const buf = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
          const blob = new Blob([buf], { type: 'model/gltf+json' });
          const url = URL.createObjectURL(blob);
          addPoseEntry(figurePose, '', url, 'glb');
          onRigged(url);
        } else if (j.status === 'error') {
          setStatus('error');
        }
      } catch {}
    }, 3000);
    return () => clearInterval(timer);
  }, [jobId, status, onRigged]);

  const handleClick = useCallback(async () => {
    setStatus('processing');
    try {
      const resp = await fetch(figureSrc);
      const buf = await resp.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let b64 = '';
      for (let i = 0; i < bytes.length; i++) b64 += String.fromCharCode(bytes[i]);
      b64 = btoa(b64);
      const r = await fetch('/api/blender/auto-rig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tapnow-dev-key' },
        body: JSON.stringify({ modelBase64: b64, format: figureFmt || 'glb' }),
      });
      const j = await r.json();
      if (j.success) { setJobId(j.jobId); }
      else { setStatus('error'); }
    } catch { setStatus('error'); }
  }, [figureSrc, figureFmt]);

  return (
    <button onClick={handleClick}
      disabled={status === 'processing'}
      style={{
        marginTop: 4, width: '100%', padding: 4, borderRadius: 6,
        border: '1px solid rgba(94,234,212,0.3)',
        background: status === 'processing' ? 'rgba(94,234,212,0.1)' : 'transparent',
        color: status === 'done' ? '#5EEAD4' : status === 'error' ? '#f66' : 'rgba(94,234,212,0.7)',
        fontSize: 10, cursor: status === 'processing' ? 'wait' : 'pointer',
      }}
    >
      {status === 'processing' ? '绑骨中…' :
       status === 'done' ? `✓ ${boneCount}骨骼` :
       status === 'error' ? '绑骨失败' :
       '🦴 自动绑骨'}
    </button>
  );
}
