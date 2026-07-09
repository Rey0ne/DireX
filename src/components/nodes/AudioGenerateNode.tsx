/* === AudioGenerateNode — TapNow-style audio/music generation === */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useStore } from '@xyflow/react';
import { RefStrip } from '../shared/RefStrip';
import { useMention } from '../shared/useMention';

interface DialogueEntry {
  id: string;
  text: string;
  voice: string;
}

interface AudioGenMeta {
  prompt: string; model: string; duration: string; style: string;
  instrumental: boolean; lyrics?: string;
  voice?: string; language?: string; stability?: number;
  dialogue?: DialogueEntry[];
  resultAssetIds: string[];
}

interface AudioGenNodeData {
  audioUrl?: string;
  gen: AudioGenMeta;
  isConnecting?: boolean;
  isConnectTarget?: boolean;
  multiSelect?: boolean;
  isPickMode?: boolean;
  isPickTarget?: boolean;
  hasConnections?: boolean;
  styleImageUrl?: string | null;
  onChange?: (patch: Partial<AudioGenMeta>) => void;
  onGenerate?: () => void;
}

const MODEL_OPTIONS = [
  { name: 'Suno v4', badges: ['音乐'], maxDur: '4min' },
  { name: 'ElevenLabs Dialogue v3', badges: ['语音'], maxDur: '—' },
];

const DURATION_OPTIONS = ['10s', '30s', '60s', '90s', '2min'];

// Full voice list — ID, Name, 中文描述
const VOICE_LIST: { id: string; name: string; desc: string }[] = [
  { id: 'EkK5I93UQWFDigLMpZcX', name: '詹姆斯', desc: '沙哑、迷人而大胆' },
  { id: 'Z3R5wn05IrDiVCyEkUrK', name: '阿拉贝拉', desc: '神秘而富有情感' },
  { id: 'NNl6r8mD7vthiJatiJt1', name: '布拉德福德', desc: '富有表现力、口齿清晰' },
  { id: 'YOq2y2Up4RgXP2HyXjE5', name: '泽维尔', desc: '支配感、金属质感的播音员' },
  { id: 'B8gJV1IhpuegLxdpXFOE', name: '久远', desc: '开朗、清晰而稳重' },
  { id: '2zRM7PkgwBPiau2jvVXc', name: '莫妮卡·索加姆', desc: '深沉而自然' },
  { id: '1SM7GgM6IMuvQlz2BwM3', name: '马克', desc: '随意、放松而轻松' },
  { id: '5l5f8iK3YPeGga21rQIX', name: '艾德琳', desc: '女性化、对话感强' },
  { id: 'scOwDtmlUjD3prqpp97I', name: '山姆', desc: '客服支持' },
  { id: 'NOpBlnGInO9m6vDvFkFC', name: '斯巴兹·奥克斯利', desc: '睿智而平易近人' },
  { id: 'BZgkqPqms7Kj9ulSkVzn', name: '伊芙', desc: '真实、充满活力和快乐' },
  { id: 'wo6udizrrtpIxWGp2qJk', name: '北方特里', desc: '北方特里' },
  { id: 'gU0LNdkMOQCOrPrwtbee', name: '英式足球解说员', desc: '英式足球解说员' },
  { id: 'DGzg6RaUqxGRTHSBjfgF', name: '布洛克', desc: '威严洪亮的中士' },
  { id: 'x70vRnQBMBu4FAYhjJbO', name: '内森', desc: '虚拟电台主持人' },
  { id: 'Sm1seazb4gs7RSlUVw7c', name: '阿妮卡', desc: '活泼、友好而迷人' },
  { id: 'P1bg08DkjqiVEzOn76yG', name: '维拉杰', desc: '饱满而柔和' },
  { id: 'qDuRKMlYmrm8trt5QyBn', name: '塔克什', desc: '冷静、严肃而流畅' },
  { id: 'qXpMhyvQqiRxWQs4qSSB', name: '霍雷修斯', desc: '充满活力的角色音' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: '利亚姆', desc: '活力四射的社交媒体创作者' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: '卡勒姆', desc: '沙哑的诡计者' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: '劳拉', desc: '热情、古灵精怪' },
  { id: 'kPzsL2i3teMYv0FxEYQ6', name: '布兰妮', desc: '社交媒体音 — 有趣、年轻且信息丰富' },
  { id: 'UgBBYS2sOqTuMpoF3BR0', name: '马克', desc: '自然对话' },
  { id: 'hpp4J3VqNfWAUOO0d1Us', name: '贝拉', desc: '专业、明亮、温暖' },
  { id: 'uYXf8XasLslADfZ2MB4u', name: '霍普', desc: '活泼、八卦且少女' },
  { id: 'gs0tAILXbY5DNrJrsM6F', name: '杰夫', desc: '优雅、共鸣而有力' },
  { id: 'DTKMou8ccj1ZaWGBiotd', name: '贾马尔', desc: '年轻、活力而自然' },
  { id: 'vBKc2FfBKJfcZNyEt1n6', name: '芬恩', desc: '青春、热切而充满活力' },
  { id: 'DYkrAHD8iwork3YSUBbs', name: '汤姆', desc: '对话与书籍' },
  { id: '56AoDkrOh6qfVPDXZ7Pt', name: '卡西迪', desc: '干脆、直接而清晰' },
  { id: 'eR40ATw9ArzDf9h3v7t7', name: '艾迪森', desc: '澳大利亚有声书与播客' },
  { id: 'g6xIsTj2HwM6VR4iXFCw', name: '杰西卡·博加特', desc: '健谈而友好' },
  { id: 'lcMyyd2HUfFzxdCaC4Ta', name: '露西', desc: '清新而随意' },
  { id: '6aDn1KB0hjpdcocrUkmq', name: '蒂芙尼', desc: '自然而热情' },
  { id: 'Sq93GQT4X1lKDXsQcixO', name: '菲利克斯', desc: '温暖、积极、当代RP口音' },
  { id: 'flHkNRp1BlvT73UL6gyz', name: '杰西卡·博加特', desc: '雄辩的反派' },
  { id: '9yzdeviXkFddZ4Oz8Mok', name: '卢茨', desc: '咯咯笑、愉悦而开朗' },
  { id: 'pPdl9cQBQq4p6mRkZy2Z', name: '艾玛', desc: '可爱而乐观' },
  { id: 'zYcjlYFOd3taleS0gkk3', name: '爱德华', desc: '大声、自信而傲慢' },
  { id: 'nzeAacJi50IvxcyDnMXa', name: '马歇尔', desc: '友好、风趣的教授' },
  { id: 'ruirxsoakN0GWmGNIo04', name: '约翰·摩根', desc: '粗犷坚韧的牛仔' },
  { id: 'TC0Zp7WVFzhA8zpTlRqV', name: '阿丽雅', desc: '魅惑的反派' },
  { id: 'ljo9gAlSqKOvF6D8sOsX', name: '维京比约恩', desc: '史诗中世纪掠夺者' },
  { id: 'PPzYpIqttlTYA83688JI', name: '海盗元帅', desc: '海盗元帅' },
  { id: '8JVbfL6oEdmuxKn5DK2C', name: '约翰尼·基德', desc: '严肃冷静的旁白' },
  { id: 'iCrDUkL56s3C8sCRl7wb', name: '霍普', desc: '诗意、浪漫而迷人' },
  { id: 'wJqPPQ618aTW29mptyoc', name: '安娜·丽塔', desc: '流畅、富有表现力且明亮' },
  { id: 'EiNlNiXeDU1pqqOPrYMO', name: '约翰·多伊', desc: '低沉' },
  { id: '4YYIPFl9wE5c4L2eu2Gb', name: '伯特·雷诺兹', desc: '深沉、流畅而清晰' },
  { id: '6F5Zhi321D3Oq7v1oNT4', name: '汉克', desc: '深沉而引人入胜的旁白' },
  { id: 'YXpFCvM1S3JbWEJhoskW', name: '怀亚特', desc: '睿智质朴的牛仔' },
  { id: 'LG95yZDEHg6fCZdQjLqj', name: '菲尔', desc: '爆发力十足、充满激情的播音员' },
  { id: 'CeNX9CMwmxDxUF5Q2Inm', name: '约翰尼·戴纳米特', desc: '复古电台DJ' },
  { id: 'aD6riP1btT197c6dACmy', name: '瑞秋·M', desc: '专业英式电台主持人' },
  { id: 'mtrellq69YZsNwzUSyXh', name: '雷克斯·桑德', desc: '深沉而硬朗' },
  { id: 'dHd5gvgSOzSfduK4CvEg', name: '艾德', desc: '深夜电台播音员' },
  { id: 'eVItLK1UvXctxuaRV2Oq', name: '珍', desc: '诱人而俏皮的蛇蝎美人' },
  { id: 'esy0r39YPLQjOczyOib8', name: '布兰妮', desc: '冷静而工于心计的反派' },
  { id: 'Tsns2HvNFKfGiNjllgqo', name: '斯文', desc: '感性而亲切' },
  { id: '1U02n4nD6AdIZ9CjF053', name: '维拉杰', desc: '流畅而温和' },
  { id: 'AeRdCCKzvd23BpJoofzx', name: '纳撒尼尔', desc: '迷人、英伦而沉稳' },
  { id: 'LruHrtVF6PSyGItzMNHS', name: '本杰明', desc: '深沉、温暖、抚慰' },
  { id: '1wGbFxmAM3Fgw63G1zZJ', name: '艾莉森', desc: '平静、抚慰而冥想' },
  { id: 'hqfrgApggtO1785R4Fsn', name: '西奥多', desc: '宁静而踏实' },
  { id: 'MJ0RnG71ty4LH3dvNfSd', name: '利昂', desc: '抚慰而踏实' },
];

// Language options — user-facing label → ISO code
const LANGUAGE_OPTIONS = [
  { label: '自动', code: '' },
  { label: '南非荷兰语', code: 'af' }, { label: '阿拉伯语', code: 'ar' }, { label: '亚美尼亚语', code: 'hy' },
  { label: '阿萨姆语', code: 'as' }, { label: '阿塞拜疆语', code: 'az' }, { label: '孟加拉语', code: 'bn' },
  { label: '波斯尼亚语', code: 'bs' }, { label: '保加利亚语', code: 'bg' }, { label: '加泰罗尼亚语', code: 'ca' },
  { label: '宿务语', code: 'ceb' }, { label: '克罗地亚语', code: 'hr' }, { label: '捷克语', code: 'cs' },
  { label: '丹麦语', code: 'da' }, { label: '荷兰语', code: 'nl' }, { label: '英语', code: 'en' },
  { label: '爱沙尼亚语', code: 'et' }, { label: '菲律宾语', code: 'fil' }, { label: '芬兰语', code: 'fi' },
  { label: '法语', code: 'fr' }, { label: '加利西亚语', code: 'gl' }, { label: '德语', code: 'de' },
  { label: '希腊语', code: 'el' }, { label: '古吉拉特语', code: 'gu' }, { label: '豪萨语', code: 'ha' },
  { label: '希伯来语', code: 'he' }, { label: '印地语', code: 'hi' }, { label: '匈牙利语', code: 'hu' },
  { label: '印尼语', code: 'id' }, { label: '爱尔兰语', code: 'ga' }, { label: '意大利语', code: 'it' },
  { label: '日语', code: 'ja' }, { label: '爪哇语', code: 'jv' }, { label: '卡纳达语', code: 'kn' },
  { label: '哈萨克语', code: 'kk' }, { label: '朝鲜语', code: 'ko' }, { label: '拉脱维亚语', code: 'lv' },
  { label: '立陶宛语', code: 'lt' }, { label: '马其顿语', code: 'mk' }, { label: '马来语', code: 'ms' },
  { label: '马拉雅拉姆语', code: 'ml' }, { label: '马拉地语', code: 'mr' }, { label: '尼泊尔语', code: 'ne' },
  { label: '挪威语', code: 'no' }, { label: '普什图语', code: 'ps' }, { label: '波斯语', code: 'fa' },
  { label: '波兰语', code: 'pl' }, { label: '葡萄牙语', code: 'pt' }, { label: '旁遮普语', code: 'pa' },
  { label: '罗马尼亚语', code: 'ro' }, { label: '俄语', code: 'ru' }, { label: '塞尔维亚语', code: 'sr' },
  { label: '信德语', code: 'sd' }, { label: '斯洛伐克语', code: 'sk' }, { label: '斯洛文尼亚语', code: 'sl' },
  { label: '索马里语', code: 'so' }, { label: '西班牙语', code: 'es' }, { label: '斯瓦西里语', code: 'sw' },
  { label: '瑞典语', code: 'sv' }, { label: '泰米尔语', code: 'ta' }, { label: '泰卢固语', code: 'te' },
  { label: '泰语', code: 'th' }, { label: '土耳其语', code: 'tr' }, { label: '乌克兰语', code: 'uk' },
  { label: '乌尔都语', code: 'ur' }, { label: '越南语', code: 'vi' }, { label: '威尔士语', code: 'cy' },
];

const STABILITY_STOPS = [0, 0.5, 1] as const;

const DEFAULT_VOICE_ID = ''; // No default — user must pick

let _dialogueIdCounter = 0;
function nextDlgId(): string { return `dlg_${Date.now()}_${_dialogueIdCounter++}`; }

export function AudioGenerateNode({ id, data, selected }: { id: string; data: AudioGenNodeData; selected?: boolean }) {
  const gen = data.gen || {};
  const panelRef = useRef<HTMLDivElement>(null);
  const { showMention, setShowMention, mentionList, detectMention, insertMention } = useMention((data as any).refUrls, data.styleImageUrl);
  const [hovered, setHovered] = useState(false);
  const [prompt, setPrompt] = useState(gen.prompt || '');
  const [currentModel, setCurrentModel] = useState(gen.model || 'Suno v4');
  const [currentDuration, setCurrentDuration] = useState(gen.duration || '60s');
  const [instrumental, setInstrumental] = useState(gen.instrumental !== false);
  const [lyrics, setLyrics] = useState(gen.lyrics || '');
  const [genRunning, setGenRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // ElevenLabs state
  const [dialogueEntries, setDialogueEntries] = useState<DialogueEntry[]>(
    gen.dialogue || [{ id: nextDlgId(), text: gen.prompt || '', voice: gen.voice || DEFAULT_VOICE_ID }]
  );
  const [activeDialogueIdx, setActiveDialogueIdx] = useState(0);
  const [currentLanguage, setCurrentLanguage] = useState(gen.language || '');
  const [currentStability, setCurrentStability] = useState<number>(gen.stability ?? 0.5);

  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const zoom = useStore(s => s.transform[2]);

  const modelTriggerRef = useRef<HTMLSpanElement>(null);
  const durTriggerRef = useRef<HTMLSpanElement>(null);
  const langTriggerRef = useRef<HTMLSpanElement>(null);
  const voiceTriggerRef = useRef<HTMLSpanElement>(null);

  const isElevenLabs = currentModel === 'ElevenLabs Dialogue v3';

  const patch = useCallback((k: string, v: unknown) => {
    data.onChange?.({ [k]: v });
  }, [data]);

  const activeDialogue = dialogueEntries[activeDialogueIdx] || dialogueEntries[0];

  const selectVoice = useCallback((voiceId: string) => {
    setDialogueEntries(prev => prev.map((d, i) => i === activeDialogueIdx ? { ...d, voice: voiceId } : d));
    patch('voice', voiceId);
  }, [activeDialogueIdx, patch]);

  const addDialogueEntry = useCallback(() => {
    const entry: DialogueEntry = { id: nextDlgId(), text: '', voice: DEFAULT_VOICE_ID };
    setDialogueEntries(prev => [...prev, entry]);
    setActiveDialogueIdx(dialogueEntries.length);
  }, [dialogueEntries.length]);

  const removeDialogueEntry = useCallback((idx: number) => {
    if (dialogueEntries.length <= 1) return;
    setDialogueEntries(prev => prev.filter((_, i) => i !== idx));
    if (activeDialogueIdx >= idx) setActiveDialogueIdx(Math.max(0, activeDialogueIdx - 1));
  }, [dialogueEntries.length, activeDialogueIdx]);

  const handleGenerate = () => {
    const dialogs = isElevenLabs ? dialogueEntries.filter(d => d.text.trim()) : [];
    const mainText = isElevenLabs ? dialogs.map(d => d.text).join('\n') : prompt;
    if (!mainText.trim() || genRunning) return;
    setGenRunning(true);
    patch('prompt', mainText);
    patch('instrumental', isElevenLabs ? false : instrumental);
    patch('lyrics', isElevenLabs ? '' : (instrumental ? '' : lyrics));
    if (isElevenLabs) {
      patch('voice', dialogs[0]?.voice || DEFAULT_VOICE_ID);
      patch('language', currentLanguage);
      patch('stability', currentStability);
      patch('dialogue', dialogs as any);
    } else {
      patch('voice', undefined);
      patch('language', undefined);
      patch('stability', undefined);
      patch('dialogue', undefined as any);
    }
    Promise.resolve(data.onGenerate?.()).finally(() => {
      setGenRunning(false);
    });
  };

  const stabilityPct = (currentStability / 1) * 100;
  const stabilityRef = useRef<HTMLDivElement>(null);
  const [stabDragging, setStabDragging] = useState(false);

  const currentStabilityRef = useRef(currentStability);
  currentStabilityRef.current = currentStability;

  const getStabilityFromClientX = useCallback((clientX: number): number => {
    if (!stabilityRef.current) return currentStabilityRef.current;
    const r = stabilityRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const snapped = STABILITY_STOPS.reduce((prev, curr) =>
      Math.abs(ratio - curr) < Math.abs(ratio - prev) ? curr : prev
    );
    return snapped;
  }, []);

  // Stability drag handlers — all pointer events (unified mouse+touch)
  const onStabPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setStabDragging(true);
    const v = getStabilityFromClientX(e.clientX);
    setCurrentStability(v);
  }, [getStabilityFromClientX]);

  const onStabPointerMove = useCallback((e: React.PointerEvent) => {
    if (!stabDragging) return;
    const v = getStabilityFromClientX(e.clientX);
    setCurrentStability(v);
  }, [stabDragging, getStabilityFromClientX]);

  const onStabPointerUp = useCallback((e: React.PointerEvent) => {
    if (!stabDragging) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setStabDragging(false);
  }, [stabDragging]);

  // Persist stability when dragging stops
  useEffect(() => {
    if (!stabDragging) patch('stability', currentStability);
  }, [stabDragging]); // eslint-disable-line

  return (
    <>
      <style>{`
        @keyframes direx-light-rim {
          0%   { box-shadow: 0 0 12px 6px rgba(255,114,255,0.10), 0 0 32px rgba(255,114,255,0.05); }
          50%  { box-shadow: 0 0 20px 10px rgba(255,114,255,0.22), 0 0 52px rgba(255,114,255,0.10); }
          100% { box-shadow: 0 0 12px 6px rgba(255,114,255,0.10), 0 0 32px rgba(255,114,255,0.05); }
        }
      `}</style>
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-20px', left: '8px', zIndex: 10, fontSize: '10px', fontWeight: 500, color: 'var(--tap-text-4)', letterSpacing: '0.05em' }}>AUDIO</div>
        <Handle type="target" position={Position.Left} id="audio-in"
          style={{
            width: '20px', height: '20px', background: 'var(--tap-panel)',
            border: '2px solid #41CCFA', borderRadius: '50%',
            left: '-20px', top: '50%', opacity: selected || hovered || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: '#41CCFA',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>
        <Handle type="source" position={Position.Right} id="audio-out"
          style={{
            width: '20px', height: '20px', background: 'var(--tap-panel)',
            border: '2px solid #41CCFA', borderRadius: '50%',
            right: '-20px', top: '50%', opacity: selected || hovered || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: '#41CCFA',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>

        <div style={{
          width: '340px', borderRadius: 'var(--tap-r-xl)', overflow: 'hidden',
          border: data.isPickTarget ? '2px solid rgba(180,180,185,0.55)'
            : data.isPickMode ? '1px dashed rgba(180,180,185,0.3)'
            : data.isConnectTarget ? '1px solid rgba(180,180,185,0.5)'
            : selected ? '2px solid rgba(255,255,255,0.28)' : '1px solid var(--tap-border)',
          background: 'var(--tap-panel)',
          boxShadow: data.isPickTarget ? '0 0 32px rgba(180,180,185,0.25)'
            : data.isConnectTarget ? '0 0 32px rgba(180,180,185,0.2)'
            : selected ? 'var(--tap-shadow-md)' : 'var(--tap-shadow-sm)',
          transition: `border var(--tap-dur-fast) var(--tap-ease), box-shadow var(--tap-dur-fast) var(--tap-ease)`,
          animation: selected ? 'direx-light-rim 5s ease-in-out infinite' : undefined,
          willChange: selected ? 'box-shadow' : undefined,
        }}>
          <div style={{
            width: '100%', minHeight: '140px',
            background: 'linear-gradient(135deg, rgba(180,180,185,0.05) 0%, rgba(180,180,185,0.01) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          }}>
            {(() => {
              const assets = (data.gen?.resultAssetIds?.length ? data.gen.resultAssetIds : data.audioUrl ? [data.audioUrl] : []) as string[];
              if (assets.length > 0) {
                return (
                  <div style={{ width: '90%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {assets.map((url, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: 'var(--tap-text-3)', fontSize: '10px', flexShrink: 0, minWidth: '28px', textAlign: 'center' }}>
                          {assets.length > 1 ? `#${i + 1}` : '♪'}
                        </span>
                        <audio src={url} controls style={{ flex: 1, height: '32px' }} onError={() => console.warn('[AudioGen] Audio load failed:', url?.slice(0, 60))} />
                      </div>
                    ))}
                  </div>
                );
              }
              return (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px', opacity: 0.2 }}>🎵</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '30px', justifyContent: 'center' }}>
                    {[0.6, 0.9, 0.4, 1, 0.7, 0.3, 0.8, 0.5, 0.9, 0.4, 0.7, 0.6].map((h, i) => (
                      <div key={i} style={{ width: '3px', height: `${h * 28}px`, background: 'rgba(180,180,185,0.15)', borderRadius: '2px' }} />
                    ))}
                  </div>
                  <div style={{ color: 'var(--tap-text-3)', fontSize: 'var(--tap-fs-meta)', marginTop: '8px' }}>音频将在此处生成</div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      {selected && !data.multiSelect && (
        <div ref={panelRef} style={{ position: 'absolute', top: '100%', left: '50%', transform: `translateX(-50%) scale(${1.5/zoom})`, transformOrigin: 'top center', width: 'var(--tap-node-width)', marginTop: `${10/zoom}px`, zIndex: 50, animation: 'tap-fade-in 50ms var(--tap-ease)' }}>
        <div style={{ background: '#fff', borderRadius: 'var(--tap-r-xl)', pointerEvents: 'auto', boxShadow: 'inset 0 0 0 1px rgba(0,207,255,0.06), inset 0 0 10px rgba(0,207,255,0.03), 0 0 0 3px rgba(0,207,255,0.04), 0 0 0 8px rgba(0,207,255,0.02), 0 2px 12px rgba(0,0,0,0.03)' }}>
          <div style={{display:'flex',alignItems:'center',padding:'8px 12px 0',justifyContent:'space-between'}}>
            <RefStrip nodeId={id} refUrls={(data as any).refUrls} />
            <span onClick={() => setExpanded(!expanded)}
              style={{ fontSize: '10px', color: 'var(--tap-text-4)', cursor: 'pointer', padding: '1px 4px', flexShrink: 0 }}
            >{expanded ? '∧' : '∨'}</span>
          </div>

          {/* === SUNO: Prompt textarea === */}
          {!isElevenLabs && (
            <textarea className="no-wheel" value={prompt} onChange={e => { const v=e.target.value; setPrompt(v); detectMention(v, e.target.selectionStart||0); }}
              onPointerDownCapture={e => { e.stopPropagation() }} onMouseDownCapture={e => { e.stopPropagation() }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
              placeholder="描述你想要生成的内容"
              maxLength={1000} rows={expanded ? 12 : 4}
              style={{ width: '100%', background: '#fff', border: 'none', padding: '10px 14px', fontSize: '8px', color: '#333', resize: 'none', outline: 'none', lineHeight: 1.5 }} />
          )}

          {/* === SUNO: Lyrics === */}
          {!isElevenLabs && !instrumental && (
            <>
              <div style={{ margin: '0 14px', borderTop: '1px solid rgba(0,0,0,0.06)' }} />
              <textarea className="no-wheel" value={lyrics} onChange={e => { setLyrics(e.target.value); patch('lyrics', e.target.value); }}
                placeholder="输入或粘贴歌词…"
                maxLength={3000} rows={expanded ? 8 : 3}
                style={{ width: '100%', background: '#fff', border: 'none', padding: '10px 14px', fontSize: '8px', color: '#333', resize: 'none', outline: 'none', lineHeight: 1.5, fontFamily: 'inherit' }} />
            </>
          )}

          {/* === ELEVENLABS: 每个会话 = 台词区 + 声音选择，堆叠 === */}
          {isElevenLabs && (
            <>
              {dialogueEntries.map((d, i) => (
                <div key={d.id}>
                  {i > 0 && <div style={{ margin: '0 14px', borderTop: '1px solid rgba(0,0,0,0.06)' }} />}
                  {/* Textarea */}
                  <textarea className="no-wheel" value={d.text}
                    onChange={e => {
                      setDialogueEntries(prev => prev.map((de, idx) => idx === i ? { ...de, text: e.target.value } : de));
                    }}
                    placeholder="输入台词…"
                    maxLength={5000} rows={expanded ? 8 : 2}
                    style={{ width: '100%', background: '#fff', border: 'none', padding: '6px 12px 8px', fontSize: '8px', color: '#333', resize: 'none', outline: 'none', lineHeight: 1.5 }} />
                  {/* Voice chip + remove — below divider */}
                  <div style={{ margin: '0 14px', borderTop: '1px solid rgba(0,0,0,0.06)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 12px' }}>
                    <span ref={i === 0 ? voiceTriggerRef : undefined}>
                      <InlineChip
                        label={VOICE_LIST.find(v => v.id === d.voice)?.name || '声音选择'}
                        active={showVoicePicker && activeDialogueIdx === i}
                        onClick={() => { setActiveDialogueIdx(i); setShowVoicePicker(!showVoicePicker); }}
                      />
                    </span>
                    {dialogueEntries.length > 1 && (
                      <span onClick={() => removeDialogueEntry(i)}
                        style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--tap-text-4)', cursor: 'pointer', padding: '2px 4px' }}
                      >×</span>
                    )}
                  </div>
                </div>
              ))}

              <div style={{ margin: '0 14px', borderTop: '1px solid rgba(0,0,0,0.06)' }} />

              {/* 添加会话 — dashed box */}
              <div style={{ padding: '6px 12px' }}>
                <div onClick={addDialogueEntry}
                  style={{
                    border: '1px dashed rgba(255,255,255,0.15)',
                    borderRadius: 'var(--tap-r-md)',
                    padding: '8px', textAlign: 'center',
                    cursor: 'pointer', userSelect: 'none',
                    fontSize: '10px', color: 'var(--tap-text-4)',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'var(--tap-text-2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'var(--tap-text-4)'; }}
                >
                  + 添加会话
                </div>
              </div>

              <div style={{ margin: '0 14px', borderTop: '1px solid var(--tap-divider)' }} />

              {/* Stability slider */}
              <div style={{ padding: '6px 12px 4px' }}>
                <div style={{ fontSize: '10px', color: 'var(--tap-text-1)', fontWeight: 500, marginBottom: '2px' }}>稳定性</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <div ref={stabilityRef}
                      onPointerDown={onStabPointerDown}
                      onPointerMove={onStabPointerMove}
                      onPointerUp={onStabPointerUp}
                      style={{ position: 'relative', width: '100%', height: '26px', cursor: 'pointer', userSelect: 'none', touchAction: 'none' }}>
                      <div style={{ position: 'absolute', left: '4px', right: '4px', top: '50%', transform: 'translateY(-50%)', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.10)' }} />
                      <div style={{ position: 'absolute', left: '4px', top: '50%', transform: 'translateY(-50%)', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.35)', width: `calc((100% - 8px) * ${stabilityPct / 100})` }} />
                      <div style={{ position: 'absolute', left: `calc(4px + (100% - 8px) * ${stabilityPct / 100} - 6px)`, top: '50%', transform: 'translateY(-50%)', width: '12px', height: '12px', borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', zIndex: 1 }} />
                    </div>
                  </div>
                  <div style={{
                    width: '32px', height: '22px', borderRadius: 'var(--tap-r-sm)',
                    background: 'rgba(0,0,0,0.06)', border: '1px solid rgba(255,255,255,0.10)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 600, color: 'var(--tap-text-2)',
                    flexShrink: 0,
                  }}>
                    {currentStability === 0 ? '0' : currentStability === 0.5 ? '0.5' : '1'}
                  </div>
                </div>
                <div style={{ fontSize: '9px', color: 'var(--tap-text-4)', marginTop: '2px' }}>决定声音的稳定性以及每次生成之间的随机性。</div>
              </div>
            </>
          )}

          {/* Bottom bar — model + controls + send */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderTop: '1px solid var(--tap-divider)', flexWrap: 'wrap' }}>
            <span ref={modelTriggerRef}>
              <InlineChip label={currentModel} active={showModelPicker} onClick={() => setShowModelPicker(!showModelPicker)} />
            </span>
            {isElevenLabs ? (
              <>
                <span style={{ color: 'var(--tap-text-4)', fontSize: '10px', flexShrink: 0 }}>|</span>
                <span ref={langTriggerRef}>
                  <InlineChip label="语言选择" active={showLanguagePicker} onClick={() => setShowLanguagePicker(!showLanguagePicker)} />
                </span>
              </>
            ) : (
              <>
                <span style={{ color: 'var(--tap-text-4)', fontSize: '10px', flexShrink: 0 }}>|</span>
                <span ref={durTriggerRef}>
                  <InlineChip label={currentDuration} active={showDurationPicker} onClick={() => setShowDurationPicker(!showDurationPicker)} />
                </span>
                <span style={{ color: 'var(--tap-text-4)', fontSize: '10px', flexShrink: 0 }}>|</span>
                <span onClick={() => { setInstrumental(!instrumental); patch('instrumental', !instrumental); }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer', userSelect: 'none', flexShrink: 0 }}>
                  <span style={{ width: '28px', height: '16px', borderRadius: '8px', background: instrumental ? 'rgba(255,255,255,0.12)' : 'var(--tap-accent)', display: 'flex', alignItems: 'center', padding: '0 2px', transition: 'background 0.2s', border: instrumental ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fff', transform: `translateX(${instrumental ? 0 : 12}px)`, transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
                  </span>
                  <span style={{ fontSize: '10px', color: !instrumental ? '#fff' : 'var(--tap-text-4)', fontWeight: !instrumental ? 600 : 400, transition: 'color 0.2s' }}>人声</span>
                </span>
              </>
            )}
            {showMention && mentionList.length > 0 && createPortal(<div onMouseDown={e=>e.preventDefault()} style={{position:'fixed',bottom:panelRef.current?window.innerHeight-panelRef.current.getBoundingClientRect().top+4:200,left:panelRef.current?panelRef.current.getBoundingClientRect().left:'25vw',width:360,background:'var(--tap-panel)',border:'1px solid var(--tap-border)',borderRadius:'var(--tap-r-lg)',padding:'8px',zIndex:99999,maxHeight:'180px',overflowY:'auto',boxShadow:'var(--tap-shadow-lg)'}}><div style={{fontSize:10,color:'var(--tap-text-4)',padding:'2px 6px'}}>选择参考图</div>{mentionList.map((m,i)=>(<div key={i} onClick={()=>{setPrompt(insertMention(m,prompt));setShowMention(false)}} onMouseEnter={e=>e.currentTarget.style.background='rgba(0,207,255,0.10)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{display:'flex',alignItems:'center',gap:10,padding:6,borderRadius:'var(--tap-r-sm)',cursor:'pointer',background:'transparent'}}><img src={m.url} style={{width:36,height:36,borderRadius:4,objectFit:'cover'}}/><div><div style={{fontSize:'var(--tap-fs-body)',color:'var(--tap-text-1)',fontWeight:500}}>{m.name}</div></div></div>))}</div>,document.body)}
            <div style={{ flex: 1 }} />
            <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',width:'50px',height:'20px',borderRadius:'10px',background:'linear-gradient(135deg,rgba(0,0,0,0.03) 0%,rgba(0,0,0,0.01) 50%,rgba(0,0,0,0.03) 100%)',border:'1px solid var(--tap-divider)',boxShadow:'0 0 10px rgba(0,0,0,0.02),inset 0 1px 0 rgba(0,0,0,0.03)',flexShrink:0,paddingRight:'2px'}}>
              <button onClick={handleGenerate} disabled={genRunning}
                style={{width:'16px',height:'16px',borderRadius:'50%',background:genRunning?'var(--tap-warning)':'#FFF65D',color:genRunning?'#fff':'#333',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:genRunning?'8px':'9px',cursor:genRunning?'wait':'pointer',border:'none',boxShadow:'0 1.5px 4px rgba(0,0,0,0.2),0 1px 1.5px rgba(0,0,0,0.12)',transition:'transform 0.15s,box-shadow 0.15s'}}
                onMouseEnter={e=>{if(!genRunning){e.currentTarget.style.transform='scale(1.06)';e.currentTarget.style.boxShadow='0 2px 6px rgba(0,0,0,0.22)'}}}
                onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='0 1.5px 4px rgba(0,0,0,0.2),0 1px 1.5px rgba(0,0,0,0.12)'}}>
                {genRunning?'⏳':'↑'}
              </button>
            </div>
          </div>

          {/* Portals */}
          {showModelPicker && createPortal(
            <>
              <div onClick={() => setShowModelPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
              <div style={{
                position: 'fixed', zIndex: 201,
                top: modelTriggerRef.current ? modelTriggerRef.current.getBoundingClientRect().bottom + 4 : 0,
                left: modelTriggerRef.current ? modelTriggerRef.current.getBoundingClientRect().left : 0,
                minWidth: '200px', background: 'var(--tap-panel)',
                border: '1px solid var(--tap-border)', borderRadius: 'var(--tap-r-xl)',
                boxShadow: 'var(--tap-shadow-lg)', padding: '6px',
                display: 'flex', flexDirection: 'column',
              }}>
                {MODEL_OPTIONS.map(m => (
                  <div key={m.name} onClick={() => { setCurrentModel(m.name); patch('model', m.name); setShowModelPicker(false); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '36px', padding: '0 12px', borderRadius: 'var(--tap-r-md)', cursor: 'pointer', color: 'var(--tap-text-1)', background: currentModel === m.name ? 'rgba(0,207,255,0.10)' : 'transparent' }}
                    onMouseEnter={e => { if (currentModel !== m.name) e.currentTarget.style.background = 'rgba(0,207,255,0.10)'; }}
                    onMouseLeave={e => { if (currentModel !== m.name) e.currentTarget.style.background = 'transparent'; }}>
                    <span>{m.name}</span><span style={{ fontSize: '10px', color: 'var(--tap-text-3)' }}>{m.maxDur}</span>
                  </div>
                ))}
              </div>
            </>, document.body)}
          {showDurationPicker && createPortal(
            <>
              <div onClick={() => setShowDurationPicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
              <div style={{
                position: 'fixed', zIndex: 201,
                top: durTriggerRef.current ? durTriggerRef.current.getBoundingClientRect().bottom + 4 : 0,
                left: durTriggerRef.current ? durTriggerRef.current.getBoundingClientRect().left : 0,
                minWidth: '120px', background: 'var(--tap-panel)',
                border: '1px solid var(--tap-border)', borderRadius: 'var(--tap-r-xl)',
                boxShadow: 'var(--tap-shadow-lg)', padding: '6px',
                display: 'flex', flexDirection: 'column',
              }}>
                {DURATION_OPTIONS.map(d => (
                  <div key={d} onClick={() => { setCurrentDuration(d); patch('duration', d); setShowDurationPicker(false); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '34px', padding: '0 12px', borderRadius: 'var(--tap-r-md)', cursor: 'pointer', color: 'var(--tap-text-1)', background: currentDuration === d ? 'rgba(0,207,255,0.10)' : 'transparent' }}
                    onMouseEnter={e => { if (currentDuration !== d) e.currentTarget.style.background = 'rgba(0,207,255,0.10)'; }}
                    onMouseLeave={e => { if (currentDuration !== d) e.currentTarget.style.background = 'transparent'; }}>
                    <span>{d}</span>
                    {currentDuration === d && <span style={{ fontSize: '10px', color: 'var(--tap-accent)' }}>✓</span>}
                  </div>
                ))}
              </div>
            </>, document.body)}
          {showLanguagePicker && createPortal(
            <>
              <div onClick={() => setShowLanguagePicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
              <div style={{
                position: 'fixed', zIndex: 201,
                top: langTriggerRef.current ? Math.min(langTriggerRef.current.getBoundingClientRect().bottom + 4, window.innerHeight - 420) : 200,
                left: langTriggerRef.current ? Math.min(langTriggerRef.current.getBoundingClientRect().left, window.innerWidth - 220) : 200,
                minWidth: '180px', maxHeight: '400px', overflowY: 'auto',
                background: 'var(--tap-panel)',
                border: '1px solid var(--tap-border)', borderRadius: 'var(--tap-r-xl)',
                boxShadow: 'var(--tap-shadow-lg)', padding: '6px',
                display: 'flex', flexDirection: 'column',
              }}>
                {LANGUAGE_OPTIONS.map(l => (
                  <div key={l.code || '_auto'} onClick={() => { setCurrentLanguage(l.code); patch('language', l.code); setShowLanguagePicker(false); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '34px', padding: '0 10px', borderRadius: 'var(--tap-r-md)', cursor: 'pointer', color: 'var(--tap-text-1)', background: currentLanguage === l.code ? 'rgba(0,207,255,0.10)' : 'transparent', fontSize: '13px' }}
                    onMouseEnter={e => { if (currentLanguage !== l.code) e.currentTarget.style.background = 'rgba(0,207,255,0.10)'; }}
                    onMouseLeave={e => { if (currentLanguage !== l.code) e.currentTarget.style.background = 'transparent'; }}>
                    <span>{l.label}</span>
                    {currentLanguage === l.code && <span style={{ fontSize: '10px', color: 'var(--tap-accent)' }}>✓</span>}
                  </div>
                ))}
              </div>
            </>, document.body)}
          {/* Voice picker portal */}
          {showVoicePicker && createPortal(
            <>
              <div onClick={() => setShowVoicePicker(false)} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
              <div style={{
                position: 'fixed', zIndex: 201,
                top: voiceTriggerRef.current ? Math.min(voiceTriggerRef.current.getBoundingClientRect().bottom + 4, window.innerHeight - 420) : 200,
                left: voiceTriggerRef.current ? Math.min(voiceTriggerRef.current.getBoundingClientRect().left, window.innerWidth - 280) : 200,
                minWidth: '260px', maxHeight: '420px', overflowY: 'auto',
                background: 'var(--tap-panel)',
                border: '1px solid var(--tap-border)', borderRadius: 'var(--tap-r-xl)',
                boxShadow: 'var(--tap-shadow-lg)', padding: '6px',
                display: 'flex', flexDirection: 'column',
              }}>
                {VOICE_LIST.map(v => (
                  <div key={v.id} onClick={() => { selectVoice(v.id); setShowVoicePicker(false); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '34px', padding: '0 10px', borderRadius: 'var(--tap-r-md)', cursor: 'pointer', color: 'var(--tap-text-1)', background: activeDialogue?.voice === v.id ? 'rgba(0,207,255,0.10)' : 'transparent' }}
                    onMouseEnter={e => { if (activeDialogue?.voice !== v.id) e.currentTarget.style.background = 'rgba(0,207,255,0.10)'; }}
                    onMouseLeave={e => { if (activeDialogue?.voice !== v.id) e.currentTarget.style.background = 'transparent'; }}>
                    <span style={{ fontSize: '13px', fontWeight: activeDialogue?.voice === v.id ? 600 : 400 }}>{v.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--tap-text-4)' }}>{v.desc}</span>
                  </div>
                ))}
              </div>
            </>, document.body)}
        </div>
        </div>
      )}
    </div>
  </>
  );
}

function InlineChip({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return <span onClick={(e) => { e.stopPropagation(); onClick(); }}
    style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '4px 8px', borderRadius: 'var(--tap-r-sm)', fontSize: '10px', color: 'var(--tap-text-1)', background: active ? 'rgba(0,207,255,0.10)' : 'transparent', cursor: 'pointer', border: 'none', transition: `all var(--tap-dur-fast) var(--tap-ease)`, userSelect: 'none', whiteSpace: 'nowrap' }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,207,255,0.10)'; }}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; } }}>{label}</span>;
}
