/* === Tripo3DNode — AI 3D模型生成节点 === */
/* UI 对齐 VideoGenerateNode / ImageGenerateNode: distant handles, external hanging panel, capsule send button */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useStore } from '@xyflow/react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { TripoModelPreview } from '../TripoModelPreview';

// ─── Types ───────────────────────────────────────
interface TripoNodeData {
  prompt?: string;
  inputImageUrl?: string;
  mode?: 'text-to-model' | 'image-to-model';  // multiview is auto-detected when 2+ images connected
  modelVersion?: string;
  modelSeries?: 'H' | 'P';
  texture?: boolean;
  pbr?: boolean;
  textureQuality?: 'standard' | 'detailed' | 'extreme';
  texResolution?: '512' | '1K' | '2K' | '4K' | '8K';
  geometryQuality?: 'standard' | 'detailed';
  faceLimit?: number;
  autoSize?: boolean;
  compress?: boolean;
  format?: 'glb' | 'fbx' | 'obj' | 'usd' | 'stl' | '3mf';
  isConnecting?: boolean;
  isConnectTarget?: boolean;
  hasConnections?: boolean;
  // Result
  taskId?: string;
  status?: 'idle' | 'generating' | 'done' | 'expired';
  progress?: number;
  modelUrl?: string;
  renderedImageUrl?: string;
  savedPath?: string;
  savedName?: string;
  savedSize?: number;
  creditsConsumed?: number;
  error?: string;
}

const H_MODELS = [
  { value: 'v3.1-20260211', label: 'v3.1 (最新)' },
  { value: 'v3.0-20250812', label: 'v3.0 (稳定)' },
  { value: 'v2.5-20250123', label: 'v2.5 (均衡)' },
];
const P_MODELS = [
  { value: 'P1-20260311', label: 'P1 (低面数)' },
];

const QUALITY_OPTIONS = [
  { value: 'standard', label: '标准' },
  { value: 'detailed', label: '高精度' },
  { value: 'extreme', label: '极致 8K' },
];

// ─── Portal Dropdown (same pattern as VideoGenerateNode PD + ImageGenerateNode PD2) ──
function PD({ children, onClose, anchorRect }: { children: React.ReactNode; onClose: () => void; anchorRect?: DOMRect | null }) {
  const top = anchorRect ? anchorRect.bottom + 4 : '50%';
  const left = anchorRect ? anchorRect.left : '50%';
  return createPortal(
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
      <div style={{
        position: 'fixed', top, left, minWidth: '180px', padding: 'var(--tap-space-2)',
        zIndex: 9999, background: 'var(--tap-panel)',
        border: '1px solid var(--tap-border)', borderRadius: 'var(--tap-r-lg)',
        boxShadow: 'var(--tap-shadow-lg)', backdropFilter: 'blur(var(--tap-blur))',
        animation: 'tap-fade-in 50ms var(--tap-ease)',
      }}>{children}</div>
    </>, document.body);
}

// ─── DropBtn — transparent chip that opens a portal dropdown ──
function DropBtn({ label, open, onClick }: { label: string; open: boolean; onClick: (e: React.MouseEvent) => void }) {
  return (
    <span onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 6px',
        borderRadius: '8px', fontSize: '8px', fontWeight: 500, cursor: 'pointer',
        background: open ? 'rgba(255,255,255,0.07)' : 'transparent',
        color: '#fff', border: 'none', whiteSpace: 'nowrap', transition: 'all 0.2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
      onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
    >{label}</span>
  );
}

// ─── Component ────────────────────────────────────
export function Tripo3DNode({ id, data, selected }: { id: string; data: TripoNodeData; selected?: boolean }) {
  const [showPreview, setShowPreview] = useState(false);
  const [paramsOpen, setParamsOpen] = useState(false);
  const [textExpanded, setTextExpanded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [prompt, setPrompt] = useState(data.prompt || '');
  const [mode, setMode] = useState<'text-to-model' | 'image-to-model'>(data.mode || 'text-to-model');
  const [series, setSeries] = useState<'H' | 'P'>(data.modelSeries || 'P');
  const [modelVer, setModelVer] = useState(data.modelVersion || 'P1-20260311');
  const [texture, setTexture] = useState(data.texture !== false);
  const [pbr, setPbr] = useState(data.pbr !== false);
  const [texQuality, setTexQuality] = useState(data.textureQuality || 'standard');
  const [faceLimit, setFaceLimit] = useState(data.faceLimit || 20000);
  const [autoSize, setAutoSize] = useState(data.autoSize || false);
  const [compress, setCompress] = useState(data.compress || false);
  const [format, setFormat] = useState<'glb' | 'fbx' | 'obj' | 'usd' | 'stl' | '3mf'>(data.format || 'glb');
  const [texResolution, setTexResolution] = useState<'512' | '1K' | '2K' | '4K' | '8K'>(data.texResolution || '2K');
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [status, setStatus] = useState(data.status || 'idle');
  const [progress, setProgress] = useState(data.progress || 0);
  const [taskId, setTaskId] = useState(data.taskId || '');
  const [modelUrl, setModelUrl] = useState(data.modelUrl || '');
  const [renderedUrl, setRenderedUrl] = useState(data.renderedImageUrl || '');
  const [savedPath, setSavedPath] = useState(data.savedPath || '');
  const [savedName, setSavedName] = useState(data.savedName || '');
  const [savedSize, setSavedSize] = useState(data.savedSize || 0);
  const [credits, setCredits] = useState(data.creditsConsumed || 0);
  const [error, setError] = useState(data.error || '');
  const [inputImage, setInputImage] = useState(data.inputImageUrl || '');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Rig & Animation state ────────────────────
  const [rigStatus, setRigStatus] = useState<'idle' | 'checking' | 'checked' | 'rigging' | 'rigged' | 'animating' | 'done'>('idle');
  const [rigTaskId, setRigTaskId] = useState('');
  const [riggable, setRiggable] = useState(false);
  const [rigType, setRigType] = useState<string>('biped');
  const [rigSpec, setRigSpec] = useState<'tripo' | 'mixamo'>('tripo');
  const [rigModelVer, setRigModelVer] = useState('v2.5-20260210');
  const [selectedAnim, setSelectedAnim] = useState('preset:idle');
  const rigPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showRigPanel, setShowRigPanel] = useState(false);

  const RIG_TYPES = ['biped', 'quadruped', 'hexapod', 'octopod', 'avian', 'serpentine', 'aquatic'] as const;
  const RIG_TYPE_LABELS: Record<string, string> = {
    biped: '双足人形', quadruped: '四足动物', hexapod: '六足生物',
    octopod: '八足生物', avian: '鸟类/有翼', serpentine: '蛇形', aquatic: '鱼类/水生',
  };
  const ANIM_PRESETS: Record<string, string[]> = {
    'v2.5-20260210': ['preset:idle','preset:walk','preset:run','preset:dive','preset:climb','preset:jump','preset:slash','preset:shoot','preset:hurt','preset:fall','preset:turn','preset:quadruped:walk','preset:hexapod:walk','preset:octopod:walk','preset:serpentine:march','preset:aquatic:march'],
    'v1.0-20240301': [
      'preset:biped:afraid','preset:biped:agree','preset:biped:angry_01','preset:biped:angry_02','preset:biped:angry_03',
      'preset:biped:basketball_shot','preset:biped:bow','preset:biped:box_01','preset:biped:box_02','preset:biped:box_03',
      'preset:biped:cast_a_spell','preset:biped:cheer','preset:biped:chop','preset:biped:clap','preset:biped:climb',
      'preset:biped:complain_01','preset:biped:complain_02','preset:biped:cross_body_crunch','preset:biped:crossover_dribble',
      'preset:biped:cry','preset:biped:dance_01','preset:biped:dance_02','preset:biped:dance_03','preset:biped:dance_04',
      'preset:biped:dance_05','preset:biped:dance_06','preset:biped:defeat_02','preset:biped:defeat_03','preset:biped:depressed',
      'preset:biped:dig','preset:biped:dive','preset:biped:dribble','preset:biped:fall','preset:biped:fire',
      'preset:biped:flee_01','preset:biped:flee_02','preset:biped:flip','preset:biped:fold_arms','preset:biped:football_catch',
      'preset:biped:football_save','preset:biped:football_pass','preset:biped:freaky','preset:biped:frightened',
      'preset:biped:front_kick_01','preset:biped:front_kick_02','preset:biped:frustrated_01','preset:biped:frustrated_02',
      'preset:biped:golf','preset:biped:greet_01','preset:biped:greet_02','preset:biped:greet_03','preset:biped:greet_04',
      'preset:biped:heart_pose','preset:biped:hit_to_body_01','preset:biped:hit_to_body_02','preset:biped:hit_to_head',
      'preset:biped:hit_to_side','preset:biped:hit_to_stomach','preset:biped:hug','preset:biped:hurt','preset:biped:idle',
      'preset:biped:jump','preset:biped:jump_down','preset:biped:jump_rope_01','preset:biped:jump_rope_02',
      'preset:biped:laugh_01','preset:biped:laugh_02','preset:biped:lift_heavy','preset:biped:look_around',
      'preset:biped:make_a_call_01','preset:biped:make_a_call_02','preset:biped:pitch_baseball','preset:biped:play_mobile_game',
      'preset:biped:play_video_game','preset:biped:press-up','preset:biped:run','preset:biped:run_upstairs',
      'preset:biped:scared_01','preset:biped:scared_02','preset:biped:scratch','preset:biped:shoot','preset:biped:shovel',
      'preset:biped:sing_01','preset:biped:sing_02','preset:biped:sing_03','preset:biped:sing_04','preset:biped:sit',
      'preset:biped:slash','preset:biped:sob','preset:biped:standing_relax','preset:biped:surf','preset:biped:swagger',
      'preset:biped:swim','preset:biped:turn','preset:biped:victory_celebration','preset:biped:volleyball','preset:biped:wait',
      'preset:biped:walk','preset:biped:warm_up','preset:biped:wave_goodbye_01','preset:biped:wave_goodbye_02',
    ],
  };
  const animList = ANIM_PRESETS[rigModelVer] || ANIM_PRESETS['v2.5-20260210'];

  // ─── Rig Check ────────────────────────────────
  const handleRigCheck = useCallback(async () => {
    if (rigStatus !== 'idle' && rigStatus !== 'checked') return;
    const src = taskId || modelUrl;
    if (!src) { setError('需要先生成3D模型'); return; }
    setRigStatus('checking'); setError('');
    try {
      const resp = await fetch('/api/tripo/rig-check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: src }),
      });
      const json = await resp.json();
      if (!json.success) { setRigStatus('idle'); setError(json.error); return; }
      setRigTaskId(json.task_id);
      // Clear any previous rig polling before starting new
      if (rigPollingRef.current) { clearInterval(rigPollingRef.current); rigPollingRef.current = null; }
      // Poll for result
      const pollStart = Date.now();
      const POLL_TIMEOUT = 300_000; // 5 min
      const iv = setInterval(async () => {
        try {
          if (Date.now() - pollStart > POLL_TIMEOUT) { clearInterval(iv); setRigStatus('idle'); setError('Rig-check 超时'); return; }
          const pr = await fetch(`/api/tripo/task/${json.task_id}`);
          if (!pr.ok) { clearInterval(iv); setRigStatus('idle'); setError('Rig-check 过期'); return; }
          const pj = await pr.json();
          if (pj.status === 'success') {
            clearInterval(iv);
            setRiggable(pj.output?.riggable || false);
            if (pj.output?.rig_type) setRigType(pj.output.rig_type);
            setRigStatus('checked');
          } else if (['failed','cancelled','expired'].includes(pj.status)) {
            clearInterval(iv); setRigStatus('idle'); setError('Rig-check 失败: ' + pj.status);
          }
        } catch { /* retry */ }
      }, 2000);
      rigPollingRef.current = iv;
    } catch (e: any) { setRigStatus('idle'); setError(String(e).slice(0, 200)); }
  }, [rigStatus, taskId, modelUrl]);

  // ─── Auto Rig ─────────────────────────────────
  const handleAutoRig = useCallback(async () => {
    if (rigStatus !== 'checked' || !riggable) return;
    setRigStatus('rigging'); setError('');
    try {
      const resp = await fetch('/api/tripo/rig', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: taskId, model: rigModelVer, rig_type: rigType, spec: rigSpec, out_format: 'glb' }),
      });
      const json = await resp.json();
      if (!json.success) { setRigStatus('checked'); setError(json.error); return; }
      setRigTaskId(json.task_id);
      // Clear any previous rig polling before starting new
      if (rigPollingRef.current) { clearInterval(rigPollingRef.current); rigPollingRef.current = null; }
      const pollStart = Date.now();
      const POLL_TIMEOUT = 300_000; // 5 min
      const iv = setInterval(async () => {
        try {
          if (Date.now() - pollStart > POLL_TIMEOUT) { clearInterval(iv); setRigStatus('checked'); setError('绑骨超时'); return; }
          const pr = await fetch(`/api/tripo/task/${json.task_id}`);
          if (!pr.ok) { clearInterval(iv); setRigStatus('checked'); setError('绑骨任务过期'); return; }
          const pj = await pr.json();
          if (pj.status === 'success') {
            clearInterval(iv);
            if (pj.output?.model_url) setModelUrl(pj.output.model_url);
            if (pj.output?.rendered_image_url) setRenderedUrl(pj.output.rendered_image_url);
            setRigStatus('rigged');
          } else if (['failed','cancelled','expired'].includes(pj.status)) {
            clearInterval(iv); setRigStatus('checked'); setError('绑骨失败: ' + pj.status);
          }
        } catch { /* retry */ }
      }, 2000);
      rigPollingRef.current = iv;
    } catch (e: any) { setRigStatus('checked'); setError(String(e).slice(0, 200)); }
  }, [rigStatus, riggable, taskId, rigModelVer, rigType, rigSpec]);

  // ─── Apply Animation ───────────────────────────
  const handleRetarget = useCallback(async () => {
    if (rigStatus !== 'rigged' || !rigTaskId) return;
    setRigStatus('animating'); setError('');
    try {
      const resp = await fetch('/api/tripo/retarget', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: rigTaskId, animation: selectedAnim, out_format: 'glb', bake_animation: true, export_with_geometry: true }),
      });
      const json = await resp.json();
      if (!json.success) { setRigStatus('rigged'); setError(json.error); return; }
      const animTaskId = json.task_id;
      // Clear any previous rig polling before starting new
      if (rigPollingRef.current) { clearInterval(rigPollingRef.current); rigPollingRef.current = null; }
      const pollStart = Date.now();
      const POLL_TIMEOUT = 300_000; // 5 min
      const iv = setInterval(async () => {
        try {
          if (Date.now() - pollStart > POLL_TIMEOUT) { clearInterval(iv); setRigStatus('rigged'); setError('动画重定向超时'); return; }
          const pr = await fetch(`/api/tripo/task/${animTaskId}`);
          if (!pr.ok) { clearInterval(iv); setRigStatus('rigged'); setError('动画任务过期'); return; }
          const pj = await pr.json();
          if (pj.status === 'success') {
            clearInterval(iv);
            if (pj.output?.model_url) { setModelUrl(pj.output.model_url); }
            if (pj.output?.rendered_image_url) setRenderedUrl(pj.output.rendered_image_url);
            setRigStatus('done');
          } else if (['failed','cancelled','expired'].includes(pj.status)) {
            clearInterval(iv); setRigStatus('rigged'); setError('动画失败: ' + pj.status);
          }
        } catch { /* retry */ }
      }, 2000);
      rigPollingRef.current = iv;
    } catch (e: any) { setRigStatus('rigged'); setError(String(e).slice(0, 200)); }
  }, [rigStatus, rigTaskId, selectedAnim]);

  // Cleanup rig polling on unmount
  useEffect(() => () => { if (rigPollingRef.current) { clearInterval(rigPollingRef.current); rigPollingRef.current = null; } }, []);

  // Dropdown state
  const [open, setOpen] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const zoom = useStore(s => s.transform[2]);
  const genRunning = status === 'generating';

  const VIEW_LABELS = ['front', 'left', 'back', 'right'] as const;

  // Read ALL incoming edges from tripo-in handle (multiview support: 1-4 images)
  const connectedData = useStore((s) => {
    const store = useCanvasStore.getState();
    const images: { url: string; view: string }[] = [];
    let connPrompt = '';
    for (const e of s.edges) {
      if (e.target === id && e.targetHandle === 'tripo-in') {
        const sourceNode = store.nodes.get(e.source);
        const m = sourceNode?.meta as any;
        const url = m?.gen?.imageUrl || m?.imageUrl || '';
        if (url) images.push({ url, view: VIEW_LABELS[images.length] || 'ref' });
        if (!connPrompt) connPrompt = m?.shot?.intent_cn || m?.gen?.prompt || '';
      }
    }
    return { images, prompt: connPrompt };
  });

  useEffect(() => {
    if (connectedData.images.length && !inputImage) setInputImage(connectedData.images[0].url);
    if (connectedData.prompt && !prompt) setPrompt(connectedData.prompt);
  }, [connectedData.images, connectedData.prompt]);

  // Build effective image list: local upload first, then connected (deduped)
  const effectiveImages = (() => {
    const seen = new Set<string>();
    const list: { url: string; view: string }[] = [];
    if (inputImage) { list.push({ url: inputImage, view: 'front' }); seen.add(inputImage); }
    for (const img of connectedData.images) {
      if (!seen.has(img.url)) { list.push(img); seen.add(img.url); }
    }
    return list;
  })();
  const effectiveInput = effectiveImages[0]?.url || '';
  const effectivePrompt = prompt || connectedData.prompt;

  // Auto-switch from text→3D to image→3D when images connect
  useEffect(() => {
    if (effectiveInput && mode === 'text-to-model') setMode('image-to-model');
  }, [effectiveImages.length, effectiveInput]);

  // Cleanup
  useEffect(() => () => { if (pollingRef.current) clearInterval(pollingRef.current); }, []);

  // ─── Generate ────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (genRunning) return;
    setStatus('generating'); setProgress(0); setError(''); setSavedPath(''); setSavedName('');

    try {
      const isMultiview = effectiveImages.length >= 4;
      const body: Record<string, unknown> = {
        mode: isMultiview ? 'multiview-to-model' : mode,
        model: modelVer, texture, pbr, texture_quality: texQuality,
        face_limit: faceLimit, auto_size: autoSize,
      };
      if (effectivePrompt) body.prompt = effectivePrompt;
      if (isMultiview) {
        body.inputs = effectiveImages.map(img => img.url);
      } else if (effectiveInput) {
        body.input = effectiveInput;
      }
      if (compress) body.compress = 'geometry';

      const resp = await fetch('/api/tripo/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      if (!json.success) { setStatus('idle'); setError(json.error || 'Failed'); return; }

      const tid = json.task_id;
      setTaskId(tid);
      setProgress(5);

      const pollStart = Date.now();
      const POLL_TIMEOUT = 600_000; // 10 min
      pollingRef.current = setInterval(async () => {
        try {
          // Timeout guard — stop polling if exceeded
          if (Date.now() - pollStart > POLL_TIMEOUT) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setStatus('idle'); setError('生成超时（10分钟）');
            return;
          }
          const pr = await fetch(`/api/tripo/task/${tid}`);
          if (!pr.ok) { // 400/404 → task expired, stop
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setStatus('idle'); setError('任务已过期');
            return;
          }
          const pj = await pr.json();
          setProgress(pj.progress || 0);
          if (pj.status === 'success') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setModelUrl(pj.output?.model_url || '');
            setRenderedUrl(pj.output?.rendered_image_url || '');
            setCredits(pj.credits_consumed || 0);
            setStatus('done'); setProgress(100);
          } else if (pj.success === false || ['failed', 'cancelled', 'banned', 'expired'].includes(pj.status)) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = null;
            setStatus('idle');
            setError(pj.error || `任务${pj.status || '失败'}`);
          }
        } catch { /* retry next poll */ }
      }, 2000);
    } catch (e: any) {
      setStatus('idle');
      setError(String(e).slice(0, 200));
    }
  }, [genRunning, effectivePrompt, effectiveInput, modelVer, texture, pbr, texQuality, faceLimit, autoSize, compress]);

  // ─── Download model to local disk (save + download with selected format/texResolution) ───
  const handleDownload = useCallback(async () => {
    if (!modelUrl) return;
    try {
      // Step 1: Save to server with chosen format + texture resolution
      const name = effectivePrompt?.slice(0, 30).replace(/[^a-zA-Z0-9一-鿿_-]/g, '_') || 'tripo_model';
      const saveResp = await fetch('/api/tripo/save-model', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_url: modelUrl, name, format, texResolution }),
      });
      const saveJson = await saveResp.json();
      if (!saveJson.success) { setError(saveJson.error || 'Save failed'); return; }
      setSavedPath(saveJson.path); setSavedName(saveJson.name); setSavedSize(saveJson.size);

      // Step 2: Download the saved file
      const resp = await fetch(saveJson.path);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = saveJson.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) { setError(String(e).slice(0, 200)); }
  }, [modelUrl, effectivePrompt, format, texResolution]);

  const downloadUrl = savedPath || modelUrl;

  // ─── Save to library (no download) ────────────
  const handleSave = useCallback(async () => {
    if (!modelUrl) return;
    try {
      const name = effectivePrompt?.slice(0, 30).replace(/[^a-zA-Z0-9一-鿿_-]/g, '_') || 'tripo_model';
      const resp = await fetch('/api/tripo/save-model', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_url: modelUrl, name, format, texResolution }),
      });
      const json = await resp.json();
      if (json.success) { setSavedPath(json.path); setSavedName(json.name); setSavedSize(json.size); }
      else { setError(json.error || 'Save failed'); }
    } catch (e: any) { setError(String(e).slice(0, 200)); }
  }, [modelUrl, effectivePrompt, format, texResolution]);

  // ─── Upload image ────────────────────────────
  const handleImageUpload = useCallback(async (file: File) => {
    const fd = new FormData(); fd.append('model', file);
    try {
      const resp = await fetch('/api/models/upload', { method: 'POST', body: fd });
      const json = await resp.json();
      if (json.success) { setInputImage(json.path); setMode('image-to-model'); }
    } catch { setError('上传失败'); }
  }, []);

  // ─── Persist to canvas store ─────────────────
  useEffect(() => {
    const store = useCanvasStore.getState();
    const node = store.nodes.get(id);
    if (node) {
      store.updateNode(id, {
        meta: {
          prompt: effectivePrompt, inputImageUrl: inputImage,
          mode, modelVersion: modelVer, modelSeries: series,
          texture, pbr, textureQuality: texQuality, faceLimit, autoSize, compress,
          taskId, status, progress, modelUrl, renderedImageUrl: renderedUrl,
          savedPath, savedName, savedSize, creditsConsumed: credits, error,
        },
      });
    }
  }, [effectivePrompt, inputImage, mode, modelVer, series, texture, pbr, texQuality, faceLimit, autoSize, compress, taskId, status, progress, modelUrl, renderedUrl, savedName, savedPath, credits]);

  // ─── Countdown ───────────────────────────────
  const [remaining, setRemaining] = useState(300);
  useEffect(() => {
    if (status !== 'done' || savedPath) return;
    const start = Date.now();
    const iv = setInterval(() => {
      const left = Math.max(0, 300 - Math.floor((Date.now() - start) / 1000));
      setRemaining(left);
      if (left <= 0) { setStatus('expired'); clearInterval(iv); }
    }, 1000);
    return () => clearInterval(iv);
  }, [status, savedPath, modelUrl]);

  const isSaved = !!savedPath;
  const outputLocked = !isSaved && status === 'done';
  const outputActive = isSaved;

  const modeLabel = mode === 'image-to-model' ? '图片→3D' : '文本→3D';
  const seriesLabel = series === 'H' ? 'H 系列' : 'P 系列';
  const verLabel = (series === 'P' ? P_MODELS : H_MODELS).find(m => m.value === modelVer)?.label || modelVer;

  return (
    <>
      <style>{`
        @keyframes direx-light-wash {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes direx-light-rim {
          0%   { box-shadow: 0 0 12px 6px rgba(94,234,212,0.10), 0 0 32px rgba(94,234,212,0.05); }
          50%  { box-shadow: 0 0 20px 10px rgba(94,234,212,0.22), 0 0 52px rgba(94,234,212,0.10); }
          100% { box-shadow: 0 0 12px 6px rgba(94,234,212,0.10), 0 0 32px rgba(94,234,212,0.05); }
        }
      `}</style>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative' }}>
          {/* ── Node label ── */}
          <div style={{
            position: 'absolute', top: '-20px', left: '8px', zIndex: 10,
            fontSize: '10px', fontWeight: 500, color: 'var(--tap-text-4)', letterSpacing: '0.05em',
          }}>TRIPO 3D</div>

          {/* ── Ports — same style as VideoGenerateNode / ImageGenerateNode ── */}
          <Handle type="target" position={Position.Left} id="tripo-in"
            style={{
              width: '19px', height: '19px', background: 'var(--tap-panel)',
              border: '2px solid rgba(180,180,185,0.5)', borderRadius: '50%',
              left: '-20px', top: '50%',
              opacity: selected || data.isConnecting || data.hasConnections ? 1 : 0,
              pointerEvents: 'all', transition: 'opacity 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, lineHeight: 1, color: 'rgba(180,180,185,0.7)',
            }}
          ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5" /><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5" /></svg></Handle>
          <Handle type="source" position={Position.Right} id="model-out"
            style={{
              width: '19px', height: '19px', background: 'var(--tap-panel)',
              border: `2px solid ${outputActive ? 'rgba(34,197,94,0.7)' : outputLocked ? 'rgba(239,68,68,0.5)' : 'rgba(180,180,185,0.3)'}`,
              borderRadius: '50%',
              right: '-20px', top: '50%',
              opacity: selected || data.isConnecting || data.hasConnections ? 1 : 0,
              pointerEvents: 'all', transition: 'opacity 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, lineHeight: 1,
              color: outputActive ? 'rgba(34,197,94,0.8)' : outputLocked ? 'rgba(239,68,68,0.5)' : 'rgba(180,180,185,0.4)',
              cursor: outputLocked ? 'not-allowed' : 'pointer',
            }}
          ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5" /><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5" /></svg></Handle>

          {/* ── Floating ⛶ button (inline absolute, no measurement, no flash) ── */}
          {selected && (
            <div style={{
              position: 'absolute', bottom: 'calc(100% + 24px)', left: '50%',
              transform: `translateX(-50%) scale(${1.5/zoom})`,
              transformOrigin: 'bottom center', zIndex: 50,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '4px', background: 'rgba(22,26,34,0.92)',
                borderRadius: '12px', backdropFilter: 'blur(16px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                animation: 'tap-fade-down var(--tap-dur-fast) var(--tap-ease)',
              }}>
                <span onClick={() => setShowPreview(true)} title="全屏"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '28px', height: '28px', borderRadius: '8px', cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(255,255,255)" strokeWidth="2">
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                </span>
                <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
                <span onClick={e => { if (!downloadUrl) return; setAnchorRect((e.target as HTMLElement).getBoundingClientRect()); setDownloadOpen(!downloadOpen); }}
                  title="导出模型"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '28px', height: '28px', borderRadius: '8px',
                    cursor: downloadUrl ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s', opacity: downloadUrl ? 1 : 0.35,
                  }}
                  onMouseEnter={e => { if (downloadUrl) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={e => { if (downloadUrl) e.currentTarget.style.background = 'transparent'; }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgb(255,255,255)" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                </span>
                {downloadOpen && (
                  <PD onClose={() => setDownloadOpen(false)} anchorRect={anchorRect}>
                    <div style={{ padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 150 }}>
                      <div style={{ fontSize: 9, color: 'var(--tap-text-3)', padding: '0 4px', fontWeight: 600 }}>导出设置</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
                        <span style={{ fontSize: 8, color: 'var(--tap-text-4)', flexShrink: 0 }}>格式</span>
                        <select value={format} onChange={e => setFormat(e.target.value as any)}
                          style={{ flex: 1, background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 4px', fontSize: 9, outline: 'none' }}>
                          {['glb','fbx','obj','usd','stl','3mf'].map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
                        <span style={{ fontSize: 8, color: 'var(--tap-text-4)', flexShrink: 0 }}>贴图</span>
                        <select value={texResolution} onChange={e => setTexResolution(e.target.value as any)}
                          style={{ flex: 1, background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 4px', fontSize: 9, outline: 'none' }}>
                          {['512','1K','2K','4K','8K'].map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </div>
                      <div onClick={e => { e.stopPropagation(); setDownloadOpen(false); handleDownload(); }}
                        style={{ margin: '0 4px', padding: '4px 0', background: 'rgba(94,234,212,0.12)', color: '#5EEAD4', borderRadius: 6, textAlign: 'center', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}
                      >下载 {format.toUpperCase()} · {texResolution}</div>
                    </div>
                  </PD>
                )}
              </div>
            </div>
          )}

          {/* ── Main card ── */}
          <div ref={cardRef}
            style={{
              width: 'var(--tap-node-width)',
              borderRadius: 'var(--tap-node-radius)',
              overflow: 'hidden',
              border: selected
                ? '2px solid rgba(255,255,255,0.28)'
                : '1px solid var(--tap-border)',
              background: selected
                ? 'linear-gradient(115deg, rgba(94,234,212,0.07) 0%, rgba(94,234,212,0.03) 25%, var(--tap-panel) 50%, var(--tap-panel) 100%)'
                : 'var(--tap-panel)',
              backgroundSize: selected ? '250% 250%' : undefined,
              animation: selected ? 'direx-light-wash 6s ease-in-out infinite, direx-light-rim 5s ease-in-out infinite' : undefined,
              willChange: selected ? 'box-shadow' : undefined,
              boxShadow: selected ? 'var(--tap-shadow-md)' : 'var(--tap-shadow-sm)',
              transition: 'all var(--tap-dur-fast) var(--tap-ease)',
            }}>
            {/* Preview area */}
            <div style={{
              width: '100%', height: '200px',
              background: renderedUrl ? '#0a0a10' : 'linear-gradient(135deg, rgba(180,180,185,0.05), rgba(180,180,185,0.01))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              {renderedUrl ? (
                <img src={renderedUrl} alt="preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', opacity: 0.25 }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  <div style={{ fontSize: '11px', color: 'var(--tap-text-4)', marginTop: '8px' }}>3D 模型将在此预览</div>
                </div>
              )}

              {/* Progress overlay */}
              {status === 'generating' && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', gap: 8 }}>
                  <div style={{ width: '60%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #5EEAD4, #3b82f6)', borderRadius: 2, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--tap-text-3)' }}>{progress}%</span>
                </div>
              )}

              {/* Status badge */}
              {status === 'done' && !isSaved && (
                <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, color: '#ef4444', background: 'rgba(239,68,68,0.12)', padding: '2px 8px', borderRadius: 4 }}>
                  ⚠ {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
                </div>
              )}
              {isSaved && (
                <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 9, color: '#22c55e', background: 'rgba(34,197,94,0.12)', padding: '2px 8px', borderRadius: 4 }}>
                  ✅ 已保存
                </div>
              )}

              {/* Save / Preview buttons on card */}
              {status === 'done' && (
                <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, display: 'flex', gap: 4 }}>
                  {!isSaved ? (
                    <button onClick={handleSave}
                      style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 10, fontWeight: 700 }}>
                      💾 保存到模型库
                    </button>
                  ) : (
                    <button onClick={() => setShowPreview(true)}
                      style={{ flex: 1, padding: '5px 0', borderRadius: 6, border: '1px solid rgba(94,234,212,0.2)', background: 'rgba(94,234,212,0.08)', color: '#5EEAD4', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>
                      🔍 3D 预览
                    </button>
                  )}
                </div>
              )}

              {error && (
                <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, fontSize: 9, color: '#ef4444', textAlign: 'center' }}>{error}</div>
              )}
            </div>
          </div>
        </div>

        {/* ── External hanging bottom panel (sibling of cardWrapper, scale-counteract like VideoGenerateNode) ── */}
        {selected && (
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: `translateX(-50%) scale(${1.5 / zoom})`,
            transformOrigin: 'top center',
            width: 'var(--tap-node-width)',
            marginTop: `${4 / zoom}px`,
            zIndex: 50,
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 'var(--tap-r-xl)',
              overflow: 'hidden',
            }}>
                {/* Ref row: always visible (text mode shows + to switch, image modes show thumbnails) */}
                <div style={{ padding: '6px 8px 0', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                  {effectiveImages.map((img, i) => (
                    <div key={i} style={{ width: 28, height: 28, borderRadius: 4, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                      <img src={img.url} alt={img.view} style={{ width: '100%', height: '100%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }} />
                      <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.8)', fontSize: '5px', textAlign: 'center', lineHeight: '9px' }}>{img.view}</span>
                      <span onClick={e => {
                        e.stopPropagation(); e.preventDefault();
                        if (i === 0 && inputImage) {
                          setInputImage('');
                        } else {
                          const store = useCanvasStore.getState();
                          const targetUrl = img.url;
                          store.edges.forEach(edge => {
                            if (edge.to.nodeId === id && edge.to.portId === 'tripo-in') {
                              const src = store.nodes.get(edge.from.nodeId);
                              const srcUrl = (src?.meta?.gen as any)?.imageUrl || (src?.meta as any)?.imageUrl || '';
                              if (srcUrl === targetUrl) store.removeEdge(edge.id);
                            }
                          });
                          if (i === 0 && inputImage) setInputImage('');
                        }
                      }}
                        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
                        onPointerDown={e => { e.stopPropagation(); e.preventDefault(); }}
                        style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: 'rgba(0,0,0,0.75)', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, cursor: 'pointer', lineHeight: 1 }}
                      >✕</span>
                    </div>
                  ))}
                  {/* + to add references (max 4). Always visible so user can switch from text→3D to image mode */}
                  {effectiveImages.length < 4 && (
                    <div onClick={e => { e.stopPropagation(); e.preventDefault(); useCanvasStore.getState().setPendingConnection(id); }}
                      title={effectiveImages.length === 0 ? '从画布选取参考图' : '添加更多视角 (' + effectiveImages.length + '/4)'}
                      style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: '12px', color: 'var(--tap-text-4)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--tap-text-2)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--tap-text-4)'; }}
                    >＋</div>
                  )}
                </div>

                {/* Prompt textarea — text-to-model only */}
                {mode === 'text-to-model' && (
                <div style={{ position: 'relative' }}>
                  <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                    onPointerDownCapture={e => e.stopPropagation()}
                    onMouseDownCapture={e => e.stopPropagation()}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                    placeholder={connectedData.prompt ? '提示词已从连线接收' : '描述你想要的 3D 模型...'}
                    maxLength={2500}
                    rows={textExpanded ? 12 : 2}
                    ref={el => { if (el) el.onwheel = e => e.stopPropagation(); }}
                    style={{
                      width: '100%', background: 'transparent', border: 'none',
                      padding: textExpanded ? '12px 28px 12px 12px' : '8px 28px 8px 12px',
                      fontSize: '8px', color: 'var(--tap-text-1)',
                      resize: 'none', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box',
                      overflow: 'auto',
                    }} />
                  <span onClick={() => setTextExpanded(!textExpanded)}
                    style={{
                      position: 'absolute', top: textExpanded ? '8px' : '4px', right: '8px',
                      fontSize: '10px', color: 'var(--tap-text-4)', cursor: 'pointer',
                      width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '4px', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--tap-text-1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-4)'; }}>
                    {textExpanded ? '∧' : '∨'}
                  </span>
                </div>
                )}

                {/* Advanced params (expanded) */}
                {paramsOpen && (
                  <div style={{ padding: '0 12px 4px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 9, color: 'var(--tap-text-4)', flexWrap: 'wrap' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}><input type="checkbox" checked={texture} onChange={e => setTexture(e.target.checked)} style={{ accentColor: '#5EEAD4' }} />贴图</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}><input type="checkbox" checked={pbr} onChange={e => setPbr(e.target.checked)} disabled={!texture} style={{ accentColor: '#5EEAD4' }} />PBR</label>
                      <select value={texQuality} onChange={e => setTexQuality(e.target.value as any)}
                        style={{ background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 4px', fontSize: 9, outline: 'none' }}>
                        {QUALITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 9, color: 'var(--tap-text-4)', flexWrap: 'wrap' }}>
                      <span>面数:</span>
                      <input type="number" value={faceLimit} onChange={e => setFaceLimit(Number(e.target.value))}
                        style={{ width: 60, background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 4px', fontSize: 9, outline: 'none' }} />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}><input type="checkbox" checked={autoSize} onChange={e => setAutoSize(e.target.checked)} style={{ accentColor: '#5EEAD4' }} />自动尺寸</label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer' }}><input type="checkbox" checked={compress} onChange={e => setCompress(e.target.checked)} style={{ accentColor: '#5EEAD4' }} />压缩</label>
                    </div>
                    {series === 'H' && (
                      <div style={{ fontSize: 8, color: '#f59e0b', background: 'rgba(245,158,11,0.06)', padding: '3px 6px', borderRadius: 4 }}>
                        ⚠ H系列面数较高(150万)，3D世界暂不支持直接导入
                      </div>
                    )}
                    {credits > 0 && <div style={{ fontSize: 9, color: 'var(--tap-text-5)', textAlign: 'right' }}>消耗 {credits} 积分</div>}
                  </div>
                )}

                {/* ── Controls row: Mode | Series | Version | [flex] | Send ── */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '2px', padding: '4px 6px 8px',
                }}>
                  {/* Mode */}
                  <div style={{ position: 'relative' }}>
                    <DropBtn label={modeLabel} open={open === 'mode'}
                      onClick={e => { setAnchorRect((e.target as HTMLElement).getBoundingClientRect()); setOpen(open === 'mode' ? null : 'mode'); }} />
                    {open === 'mode' && (
                      <PD onClose={() => setOpen(null)} anchorRect={anchorRect}>
                        {[{ id: 'text-to-model', label: '文本→3D' }, { id: 'image-to-model', label: '图片→3D' }].map(m => (
                          <div key={m.id} onClick={() => { setMode(m.id as any); setOpen(null); }}
                            style={{
                              height: '30px', padding: '0 10px', borderRadius: 'var(--tap-r-md)',
                              cursor: 'pointer',
                              color: 'var(--tap-text-1)',
                              background: mode === m.id ? 'var(--tap-hover)' : 'transparent',
                              display: 'flex', alignItems: 'center', fontSize: '11px',
                            }}
                            onMouseEnter={e => { if (mode !== m.id) e.currentTarget.style.background = 'var(--tap-hover)'; }}
                            onMouseLeave={e => { if (mode !== m.id) e.currentTarget.style.background = 'transparent'; }}>
                            {m.label}
                          </div>
                        ))}
                      </PD>
                    )}
                  </div>

                  <span style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.10)', flexShrink: 0 }} />

                  {/* Series */}
                  <div style={{ position: 'relative' }}>
                    <DropBtn label={seriesLabel} open={open === 'series'}
                      onClick={e => { setAnchorRect((e.target as HTMLElement).getBoundingClientRect()); setOpen(open === 'series' ? null : 'series'); }} />
                    {open === 'series' && (
                      <PD onClose={() => setOpen(null)} anchorRect={anchorRect}>
                        {[{ id: 'P', label: 'P 系列 (低面数)' }, { id: 'H', label: 'H 系列 (高精度)' }].map(s => (
                          <div key={s.id} onClick={() => { setSeries(s.id as 'H' | 'P'); setModelVer(s.id === 'P' ? 'P1-20260311' : 'v3.1-20260211'); setOpen(null); }}
                            style={{
                              height: '30px', padding: '0 10px', borderRadius: 'var(--tap-r-md)',
                              cursor: 'pointer', color: 'var(--tap-text-1)',
                              background: series === s.id ? 'var(--tap-hover)' : 'transparent',
                              display: 'flex', alignItems: 'center', fontSize: '11px',
                            }}
                            onMouseEnter={e => { if (series !== s.id) e.currentTarget.style.background = 'var(--tap-hover)'; }}
                            onMouseLeave={e => { if (series !== s.id) e.currentTarget.style.background = 'transparent'; }}>
                            {s.label}
                          </div>
                        ))}
                      </PD>
                    )}
                  </div>

                  <span style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.10)', flexShrink: 0 }} />

                  {/* Version */}
                  <div style={{ position: 'relative' }}>
                    <DropBtn label={verLabel} open={open === 'ver'}
                      onClick={e => { setAnchorRect((e.target as HTMLElement).getBoundingClientRect()); setOpen(open === 'ver' ? null : 'ver'); }} />
                    {open === 'ver' && (
                      <PD onClose={() => setOpen(null)} anchorRect={anchorRect}>
                        {(series === 'P' ? P_MODELS : H_MODELS).map(m => (
                          <div key={m.value} onClick={() => { setModelVer(m.value); setOpen(null); }}
                            style={{
                              height: '30px', padding: '0 10px', borderRadius: 'var(--tap-r-md)',
                              cursor: 'pointer', color: 'var(--tap-text-1)',
                              background: modelVer === m.value ? 'var(--tap-hover)' : 'transparent',
                              display: 'flex', alignItems: 'center', fontSize: '11px',
                            }}
                            onMouseEnter={e => { if (modelVer !== m.value) e.currentTarget.style.background = 'var(--tap-hover)'; }}
                            onMouseLeave={e => { if (modelVer !== m.value) e.currentTarget.style.background = 'transparent'; }}>
                            {m.label}
                          </div>
                        ))}
                      </PD>
                    )}
                  </div>

                  <span style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.10)', flexShrink: 0 }} />

                  {/* Advanced params toggle */}
                  <span onClick={() => setParamsOpen(!paramsOpen)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 6px',
                      borderRadius: '8px', fontSize: '8px', fontWeight: 500, cursor: 'pointer',
                      background: paramsOpen ? 'rgba(255,255,255,0.07)' : 'transparent',
                      color: '#fff', border: 'none',
                      whiteSpace: 'nowrap', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
                    onMouseLeave={e => { if (!paramsOpen) e.currentTarget.style.background = 'transparent'; }}>
                    高级参数
                  </span>

                  <div style={{ flex: 1 }} />

                  <span style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.10)', flexShrink: 0 }} />

                  {/* Send — glass pill + circle arrow, matching VideoGenerateNode/ImageGenerateNode */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                    width: '50px', height: '20px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.05) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 0 10px rgba(255,255,255,0.02), inset 0 1px 0 rgba(255,255,255,0.03)',
                    flexShrink: 0, paddingRight: '2px',
                  }}>
                    <button onClick={handleGenerate} disabled={genRunning}
                      style={{
                        width: '16px', height: '16px', borderRadius: '50%',
                        background: genRunning ? 'var(--tap-warning)' : '#fff',
                        color: genRunning ? '#fff' : '#1a1a1a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: genRunning ? '8px' : '9px',
                        cursor: genRunning ? 'wait' : 'pointer',
                        border: 'none',
                        boxShadow: '0 1.5px 4px rgba(0,0,0,0.2), 0 1px 1.5px rgba(0,0,0,0.12)',
                        transition: 'transform 0.15s, box-shadow 0.15s',
                      }}
                      onMouseEnter={e => { if (!genRunning) { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.22)'; } }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1.5px 4px rgba(0,0,0,0.2), 0 1px 1.5px rgba(0,0,0,0.12)'; }}>
                      {genRunning ? '⏳' : '↑'}
                    </button>
                  </div>
                </div>

                {/* ── Rig & Animation panel (only when 3D model is done) ── */}
                {status === 'done' && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '4px 8px 6px' }}>
                    <div onClick={() => setShowRigPanel(!showRigPanel)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', padding: '2px 0', fontSize: 9, color: 'var(--tap-text-3)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--tap-text-1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--tap-text-3)'; }}>
                      <span style={{ fontSize: 10 }}>{showRigPanel ? '▾' : '▸'}</span> 骨骼动画
                      {rigStatus === 'done' && <span style={{ fontSize: 8, color: '#22c55e' }}>✅</span>}
                      {(rigStatus === 'checking' || rigStatus === 'rigging' || rigStatus === 'animating') && <span style={{ fontSize: 8, color: '#f59e0b' }}>⏳</span>}
                    </div>

                    {showRigPanel && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 2 }}>
                        {/* Step 1: Rig Check */}
                        {rigStatus === 'idle' && (
                          <button onClick={handleRigCheck}
                            style={{ padding: '4px 0', borderRadius: 6, border: '1px solid rgba(94,234,212,0.2)', background: 'rgba(94,234,212,0.08)', color: '#5EEAD4', cursor: 'pointer', fontSize: 9, fontWeight: 600 }}>
                            🔍 检查绑骨兼容性
                          </button>
                        )}
                        {rigStatus === 'checking' && <span style={{ fontSize: 9, color: 'var(--tap-text-3)' }}>⏳ 检查中...</span>}

                        {/* Step 2: Rig Check result */}
                        {rigStatus === 'checked' && (
                          <>
                            <div style={{ fontSize: 9, color: riggable ? '#22c55e' : '#ef4444', padding: '2px 4px', borderRadius: 4, background: riggable ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)' }}>
                              {riggable ? `✅ 可绑骨 — 推荐: ${RIG_TYPE_LABELS[rigType] || rigType}` : '❌ 该模型不支持绑骨'}
                            </div>
                            {riggable && (
                              <>
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center', fontSize: 9, flexWrap: 'wrap' }}>
                                  <span style={{ color: 'var(--tap-text-4)' }}>骨骼:</span>
                                  <select value={rigType} onChange={e => setRigType(e.target.value)}
                                    style={{ background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 4px', fontSize: 9, outline: 'none' }}>
                                    {RIG_TYPES.map(t => <option key={t} value={t}>{RIG_TYPE_LABELS[t]}</option>)}
                                  </select>
                                  <span style={{ color: 'var(--tap-text-4)' }}>规范:</span>
                                  <select value={rigSpec} onChange={e => setRigSpec(e.target.value as any)}
                                    style={{ background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 4px', fontSize: 9, outline: 'none' }}>
                                    <option value="tripo">Tripo</option><option value="mixamo">Mixamo</option>
                                  </select>
                                  <span style={{ color: 'var(--tap-text-4)' }}>版本:</span>
                                  <select value={rigModelVer} onChange={e => setRigModelVer(e.target.value)}
                                    style={{ background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '1px 4px', fontSize: 9, outline: 'none' }}>
                                    <option value="v2.5-20260210">v2.5 (全类型)</option><option value="v1.0-20240301">v1.0 (双足)</option>
                                  </select>
                                </div>
                                <button onClick={handleAutoRig}
                                  style={{ padding: '4px 0', borderRadius: 6, border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.1)', color: '#a855f7', cursor: 'pointer', fontSize: 9, fontWeight: 600 }}>
                                  🦴 自动绑骨
                                </button>
                              </>
                            )}
                            <button onClick={() => setRigStatus('idle')}
                              style={{ padding: '2px 0', borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--tap-text-5)', cursor: 'pointer', fontSize: 8 }}>重置</button>
                          </>
                        )}
                        {rigStatus === 'rigging' && <span style={{ fontSize: 9, color: 'var(--tap-text-3)' }}>⏳ 绑骨中...</span>}

                        {/* Step 3: Animation selection (after rigged) */}
                        {(rigStatus === 'rigged' || rigStatus === 'animating' || rigStatus === 'done') && (
                          <>
                            {rigStatus === 'rigged' && <span style={{ fontSize: 9, color: '#22c55e', padding: '2px 4px', borderRadius: 4, background: 'rgba(34,197,94,0.08)' }}>✅ 骨骼已绑定</span>}
                            {rigStatus === 'done' && <span style={{ fontSize: 9, color: '#22c55e', padding: '2px 4px', borderRadius: 4, background: 'rgba(34,197,94,0.08)' }}>✅ 动画已应用</span>}
                            {rigStatus === 'animating' && <span style={{ fontSize: 9, color: 'var(--tap-text-3)' }}>⏳ 生成动画...</span>}

                            {rigStatus !== 'animating' && (
                              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                <select value={selectedAnim} onChange={e => setSelectedAnim(e.target.value)}
                                  style={{ flex: 1, background: 'rgba(255,255,255,0.04)', color: '#fff', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 4, padding: '2px 4px', fontSize: 9, outline: 'none' }}>
                                  {animList.map(a => <option key={a} value={a}>{a.replace('preset:', '').replace('quadruped:','').replace('hexapod:','').replace('octopod:','').replace('serpentine:','').replace('aquatic:','')}</option>)}
                                </select>
                                <button onClick={handleRetarget}
                                  style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid rgba(250,204,21,0.3)', background: 'rgba(250,204,21,0.1)', color: '#facc15', cursor: 'pointer', fontSize: 8, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                  ▶ 应用
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) { handleImageUpload(f); e.target.value = ''; } }} />
              </div>
            </div>
          )}
      </div>

      {/* Fullscreen 3D preview */}
      {showPreview && (modelUrl || savedPath) && (
        <TripoModelPreview
          modelUrl={savedPath || modelUrl}
          modelName={savedName || effectivePrompt?.slice(0, 20) || '模型'}
          onClose={() => setShowPreview(false)} />
      )}
    </>
  );
}
