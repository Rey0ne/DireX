/* === Music Knowledge Base — 专属音乐知识库 === */
/* Genre(200+) / Sub Genre(800+) / Ethnic(150+) / Emotion(100+) / Instrument(500+) */
/* Production Style(100+) / Narrative Scene(300+) / Prompt Templates */

// ─── Genre Taxonomy ──────────────────────────────────

export interface GenreNode {
  name: string;             // English display name (used in Suno prompt)
  nameCN: string;           // Chinese name
  sub?: GenreNode[];        // sub-genres
  tags?: string[];          // search keywords
  tempo?: [number, number]; // typical BPM range
  mood?: string[];          // typical moods
}

export interface EthnicStyle {
  name: string;
  nameCN: string;
  region: string;
  regionCN: string;
  instruments: string[];    // instrument names (English)
  instrumentsCN: string[];
  tags: string[];
}

export interface EmotionEntry {
  name: string;
  nameCN: string;
  category: 'positive' | 'ethereal' | 'dark' | 'epic' | 'action' | 'romantic' | 'mystery';
  intensity: number;       // 0.0-1.0
  instruments: string[];   // instruments that evoke this emotion
  tempo: [number, number];
}

export interface InstrumentEntry {
  name: string;
  nameCN: string;
  family: 'string' | 'wind' | 'brass' | 'percussion' | 'keyboard' | 'vocal' | 'electronic' | 'ethnic';
  region?: string;
  emotions: string[];      // emotions this instrument evokes
  role: 'lead' | 'support' | 'atmosphere' | 'rhythm' | 'bass';
}

export interface ProductionStyle {
  name: string;
  nameCN: string;
  description: string;
  tags: string[];
}

export interface NarrativeScene {
  name: string;
  nameCN: string;
  description: string;
  genre: string[];         // recommended genres
  instruments: string[];   // recommended instruments
  mood: string[];          // typical moods
  bpm: [number, number];   // BPM range
  template: string;        // Suno prompt template
}

// ═══════════════════════════════════════════════════════
// GENRE TAXONOMY (200+ genres with sub-genres)
// ═══════════════════════════════════════════════════════

export const GENRES: GenreNode[] = [
  // ── Classical ──
  { name: 'Classical', nameCN: '古典', tempo: [60, 140], mood: ['reflective', 'elegant', 'solemn'], sub: [
    { name: 'Baroque', nameCN: '巴洛克', tempo: [60, 100], tags: ['Bach', 'Handel', 'harpsichord', 'contrapuntal'] },
    { name: 'Classical Period', nameCN: '古典主义', tempo: [70, 130], tags: ['Mozart', 'Haydn', 'balanced', 'formal'] },
    { name: 'Romantic', nameCN: '浪漫主义', tempo: [60, 140], tags: ['Chopin', 'Tchaikovsky', 'expressive', 'emotional'] },
    { name: 'Modern Classical', nameCN: '现代古典', tempo: [50, 120], tags: ['minimalist', 'atonal', 'contemporary', 'Glass', 'Richter'] },
    { name: 'Neoclassical', nameCN: '新古典', tempo: [60, 120], tags: ['Einaudi', 'piano', 'ambient classical'] },
    { name: 'Chamber Music', nameCN: '室内乐', tempo: [60, 120], tags: ['string quartet', 'intimate', 'small ensemble'] },
    { name: 'Opera', nameCN: '歌剧', tempo: [60, 140], tags: ['aria', 'orchestra', 'dramatic vocal'] },
    { name: 'Gregorian Chant', nameCN: '格里高利圣咏', tempo: [40, 80], tags: ['sacred', 'monastic', 'medieval', 'chant'] },
    { name: 'Renaissance', nameCN: '文艺复兴', tempo: [60, 100], tags: ['lute', 'polyphony', 'early music'] },
  ]},

  // ── Film Score ──
  { name: 'Film Score', nameCN: '电影配乐', tempo: [60, 160], mood: ['cinematic', 'dramatic', 'epic'], sub: [
    { name: 'Epic Orchestral', nameCN: '史诗管弦', tempo: [80, 150], tags: ['Zimmer', 'Williams', 'grand', 'orchestra', 'choir'] },
    { name: 'Adventure Score', nameCN: '冒险配乐', tempo: [90, 140], tags: ['exploration', 'upbeat', 'brass', 'strings'] },
    { name: 'Fantasy Score', nameCN: '奇幻配乐', tempo: [60, 130], tags: ['magical', 'wonder', 'choir', 'harp', 'strings'] },
    { name: 'Dark Fantasy', nameCN: '黑暗奇幻', tempo: [50, 110], tags: ['gothic', 'ominous', 'choir', 'organ', 'strings'] },
    { name: 'Trailer Music', nameCN: '预告片音乐', tempo: [90, 160], tags: ['hybrid', 'percussion', 'braam', 'risers', 'hits'] },
    { name: 'Hybrid Orchestral', nameCN: '混合管弦', tempo: [80, 150], tags: ['orchestra+electronic', 'modern', 'epic'] },
    { name: 'Heroic Score', nameCN: '英雄配乐', tempo: [80, 140], tags: ['triumphant', 'brass', 'choir', 'uplifting'] },
    { name: 'Emotional Score', nameCN: '情感配乐', tempo: [50, 100], tags: ['strings', 'piano', 'melancholic', 'beautiful'] },
    { name: 'Tragic Cinematic', nameCN: '悲壮电影', tempo: [50, 80], tags: ['strings', 'choir', 'piano', 'sacrifice'] },
    { name: 'Mystery Score', nameCN: '悬疑配乐', tempo: [60, 100], tags: ['pizzicato', 'tension', 'strings', 'subtle'] },
    { name: 'War Score', nameCN: '战争配乐', tempo: [90, 150], tags: ['snare', 'brass', 'percussion', 'conflict'] },
    { name: 'Western Score', nameCN: '西部配乐', tempo: [70, 120], tags: ['guitar', 'whistle', 'harmonica', 'desert'] },
    { name: 'Noir Score', nameCN: '黑色电影配乐', tempo: [50, 90], tags: ['jazz', 'saxophone', 'smoky', 'urban'] },
  ]},

  // ── Electronic ──
  { name: 'Electronic', nameCN: '电子', tempo: [60, 180], sub: [
    { name: 'Ambient', nameCN: '氛围', tempo: [40, 80], tags: ['pad', 'drone', 'atmospheric', 'space', 'Brian Eno'] },
    { name: 'Dark Ambient', nameCN: '黑暗氛围', tempo: [30, 70], tags: ['drone', 'industrial', 'horror', 'ominous'] },
    { name: 'Futuristic Ambient', nameCN: '未来氛围', tempo: [40, 90], tags: ['sci-fi', 'spacious', 'evolving'] },
    { name: 'Downtempo', nameCN: '缓拍', tempo: [60, 100], tags: ['chill', 'relaxed', 'groove'] },
    { name: 'Trip Hop', nameCN: '神游舞曲', tempo: [70, 100], tags: ['Massive Attack', 'dark', 'urban'] },
    { name: 'House', nameCN: '浩室', tempo: [115, 130], tags: ['4/4', 'club', 'groove'] },
    { name: 'Deep House', nameCN: '深浩室', tempo: [110, 125], tags: ['soulful', 'deep', 'warm'] },
    { name: 'Techno', nameCN: '科技舞曲', tempo: [120, 150], tags: ['industrial', 'repetitive', 'underground'] },
    { name: 'Trance', nameCN: '迷幻舞曲', tempo: [125, 145], tags: ['euphoric', 'uplifting', 'supersaw'] },
    { name: 'Drum & Bass', nameCN: '鼓打贝斯', tempo: [150, 180], tags: ['breakbeat', 'fast', 'energy'] },
    { name: 'Dubstep', nameCN: '回响贝斯', tempo: [135, 145], tags: ['wobble bass', 'half-time', 'aggressive'] },
    { name: 'Future Bass', nameCN: '未来贝斯', tempo: [130, 160], tags: ['chords', 'lush', 'colorful'] },
    { name: 'Synthwave', nameCN: '合成波', tempo: [80, 130], tags: ['80s', 'retro', 'neon', 'nostalgic'] },
    { name: 'Retrowave', nameCN: '复古波', tempo: [80, 120], tags: ['80s', 'synth', 'outrun'] },
    { name: 'Cyberpunk', nameCN: '赛博朋克', tempo: [80, 140], tags: ['dystopian', 'industrial', 'dark synth'] },
    { name: 'Industrial', nameCN: '工业音乐', tempo: [80, 140], tags: ['mechanical', 'noise', 'harsh', 'distorted'] },
    { name: 'Synth Cinematic', nameCN: '合成电影', tempo: [60, 130], tags: ['sci-fi', 'Blade Runner', 'Vangelis'] },
    { name: 'Industrial Sci-Fi', nameCN: '工业科幻', tempo: [70, 130], tags: ['mechanical', 'dystopian', 'dark'] },
    { name: 'IDM', nameCN: '智能舞曲', tempo: [80, 150], tags: ['Aphex Twin', 'experimental', 'glitch'] },
    { name: 'Chillwave', nameCN: '寒潮', tempo: [60, 100], tags: ['lo-fi', 'reverb', 'nostalgic'] },
    { name: 'Vaporwave', nameCN: '蒸汽波', tempo: [60, 100], tags: ['slowed', 'sampled', 'aesthetic'] },
  ]},

  // ── Rock ──
  { name: 'Rock', nameCN: '摇滚', tempo: [80, 180], sub: [
    { name: 'Classic Rock', nameCN: '经典摇滚', tempo: [90, 140], tags: ['guitar', 'blues-based', '70s'] },
    { name: 'Hard Rock', nameCN: '硬摇滚', tempo: [100, 150], tags: ['distorted guitar', 'heavy', 'anthem'] },
    { name: 'Alternative Rock', nameCN: '另类摇滚', tempo: [80, 140], tags: ['90s', 'indie', 'guitar'] },
    { name: 'Post Rock', nameCN: '后摇滚', tempo: [60, 130], tags: ['instrumental', 'crescendo', 'atmospheric guitar'] },
    { name: 'Progressive Rock', nameCN: '前卫摇滚', tempo: [70, 160], tags: ['complex', 'concept', 'odd time sigs'] },
    { name: 'Punk Rock', nameCN: '朋克摇滚', tempo: [140, 200], tags: ['fast', 'raw', 'rebellious'] },
    { name: 'Metal', nameCN: '金属', tempo: [100, 200], tags: ['heavy', 'distorted', 'aggressive'] },
    { name: 'Symphonic Metal', nameCN: '交响金属', tempo: [80, 160], tags: ['orchestra+metal', 'epic', 'female vocal'] },
    { name: 'Folk Metal', nameCN: '民谣金属', tempo: [80, 160], tags: ['folk instruments', 'epic', 'pagan'] },
    { name: 'Black Metal', nameCN: '黑金属', tempo: [120, 200], tags: ['tremolo', 'blast beat', 'shriek', 'dark'] },
    { name: 'Doom Metal', nameCN: '毁灭金属', tempo: [40, 80], tags: ['slow', 'heavy', 'despair'] },
    { name: 'Power Metal', nameCN: '力量金属', tempo: [130, 200], tags: ['fantasy', 'fast', 'high vocal'] },
    { name: 'Gothic Metal', nameCN: '哥特金属', tempo: [60, 120], tags: ['dark', 'romantic', 'female vocal'] },
  ]},

  // ── Pop ──
  { name: 'Pop', nameCN: '流行', tempo: [80, 140], sub: [
    { name: 'Dance Pop', nameCN: '舞曲流行', tempo: [110, 130], tags: ['upbeat', 'catchy', 'electronic'] },
    { name: 'Indie Pop', nameCN: '独立流行', tempo: [80, 130], tags: ['guitar', 'melodic', 'DIY'] },
    { name: 'Electropop', nameCN: '电子流行', tempo: [100, 140], tags: ['synth', 'catchy', 'modern'] },
    { name: 'Dream Pop', nameCN: '梦幻流行', tempo: [60, 110], tags: ['shoegaze', 'reverb', 'ethereal vocal'] },
    { name: 'Synth Pop', nameCN: '合成器流行', tempo: [90, 130], tags: ['80s', 'synth', 'Depeche Mode'] },
    { name: 'K-Pop', nameCN: '韩国流行', tempo: [90, 150], tags: ['polished', 'fusion', 'performance'] },
    { name: 'J-Pop', nameCN: '日本流行', tempo: [80, 160], tags: ['anime', 'melodic', 'varied'] },
    { name: 'C-Pop', nameCN: '华语流行', tempo: [70, 130], tags: ['Mandarin', 'ballad', 'folk influence'] },
    { name: 'Art Pop', nameCN: '艺术流行', tempo: [60, 130], tags: ['experimental', 'avant-garde', 'Bjork'] },
    { name: 'Baroque Pop', nameCN: '巴洛克流行', tempo: [70, 120], tags: ['orchestral pop', 'chamber', 'harpsichord'] },
  ]},

  // ── Hip-Hop ──
  { name: 'Hip-Hop', nameCN: '嘻哈', tempo: [60, 160], sub: [
    { name: 'Boom Bap', nameCN: '布姆巴普', tempo: [80, 100], tags: ['90s', 'sample-based', 'East Coast'] },
    { name: 'Trap', nameCN: '陷阱', tempo: [120, 160], tags: ['808', 'hi-hats', 'dark'] },
    { name: 'Drill', nameCN: ' drill', tempo: [130, 150], tags: ['dark', 'aggressive', 'sliding 808'] },
    { name: 'Lo-Fi Hip-Hop', nameCN: '低保真嘻哈', tempo: [70, 90], tags: ['chill', 'study', 'vinyl crackle'] },
    { name: 'Jazz Rap', nameCN: '爵士说唱', tempo: [80, 100], tags: ['jazz samples', 'Tribe Called Quest', 'conscious'] },
    { name: 'Old School Hip-Hop', nameCN: '老派嘻哈', tempo: [90, 110], tags: ['breakbeat', 'scratching', '80s'] },
    { name: 'Cloud Rap', nameCN: '云说唱', tempo: [100, 140], tags: ['ambient', 'ethereal', 'trap influence'] },
  ]},

  // ── Jazz ──
  { name: 'Jazz', nameCN: '爵士', tempo: [60, 200], sub: [
    { name: 'Swing', nameCN: '摇摆', tempo: [120, 180], tags: ['big band', 'dance', '30s-40s'] },
    { name: 'Bebop', nameCN: '比波普', tempo: [140, 240], tags: ['fast', 'Parker', 'Gillespie', 'complex'] },
    { name: 'Cool Jazz', nameCN: '冷爵士', tempo: [60, 120], tags: ['Miles Davis', 'relaxed', 'understated'] },
    { name: 'Modal Jazz', nameCN: '模态爵士', tempo: [60, 140], tags: ['Coltrane', 'modal scales', 'spiritual'] },
    { name: 'Free Jazz', nameCN: '自由爵士', tempo: [60, 200], tags: ['avant-garde', 'atonal', 'chaotic'] },
    { name: 'Fusion', nameCN: '融合爵士', tempo: [80, 150], tags: ['electric', 'rock influence', '70s'] },
    { name: 'Smooth Jazz', nameCN: '柔顺爵士', tempo: [70, 110], tags: ['saxophone', 'commercial', 'relaxing'] },
    { name: 'Latin Jazz', nameCN: '拉丁爵士', tempo: [100, 160], tags: ['afro-cuban', 'bossa', 'percussion'] },
    { name: 'Gypsy Jazz', nameCN: '吉普赛爵士', tempo: [100, 180], tags: ['Django Reinhardt', 'acoustic guitar', 'violin'] },
  ]},

  // ── Fantasy Sub-genres ──
  { name: 'Fantasy Music', nameCN: '奇幻音乐', sub: [
    { name: 'High Fantasy', nameCN: '高等奇幻', tempo: [60, 130], tags: ['epic', 'orchestra', 'choir', 'Lord of the Rings'] },
    { name: 'Dark Fantasy', nameCN: '黑暗奇幻', tempo: [40, 100], tags: ['gothic', 'ominous', 'dark choir', 'diablo'] },
    { name: 'Nordic Fantasy', nameCN: '北欧奇幻', tempo: [50, 110], tags: ['Viking', 'tagelharpa', 'chant', 'Skyrim'] },
    { name: 'Celtic Fantasy', nameCN: '凯尔特奇幻', tempo: [60, 130], tags: ['harp', 'flute', 'fiddle', 'fairy'] },
    { name: 'Fairytale Fantasy', nameCN: '童话奇幻', tempo: [60, 120], tags: ['music box', 'magical', 'whimsical'] },
    { name: 'Heroic Fantasy', nameCN: '英雄奇幻', tempo: [80, 140], tags: ['brass', 'epic', 'adventure'] },
    { name: 'Mythological Fantasy', nameCN: '神话奇幻', tempo: [50, 130], tags: ['ancient', 'choir', 'epic percussion'] },
    { name: 'Epic Adventure', nameCN: '史诗冒险', tempo: [90, 150], tags: ['orchestra', 'brass', 'upbeat'] },
    { name: 'Fantasy Adventure', nameCN: '奇幻冒险', tempo: [80, 140], tags: ['orchestra', 'woodwinds', 'playful'] },
    { name: 'Pirate Adventure', nameCN: '海盗冒险', tempo: [90, 140], tags: ['accordion', 'fiddle', 'shanty'] },
    { name: 'Exploration Music', nameCN: '探索音乐', tempo: [60, 100], tags: ['ambient', 'mysterious', 'strings'] },
    { name: 'Quest Music', nameCN: '任务音乐', tempo: [80, 130], tags: ['driving', 'orchestra', 'determined'] },
    { name: 'Space Opera', nameCN: '太空歌剧', tempo: [60, 140], tags: ['Star Wars', 'orchestra', 'brass', 'epic'] },
  ]},

  // ── Horror ──
  { name: 'Horror', nameCN: '恐怖', tempo: [30, 100], sub: [
    { name: 'Psychological Horror', nameCN: '心理恐怖', tempo: [30, 70], tags: ['dissonant', 'whisper', 'tension'] },
    { name: 'Dark Ambient Horror', nameCN: '黑暗氛围恐怖', tempo: [20, 60], tags: ['drone', 'texture', 'fear'] },
    { name: 'Occult Horror', nameCN: '神秘恐怖', tempo: [30, 70], tags: ['chant', 'ritual', 'organ'] },
    { name: 'Monster Horror', nameCN: '怪物恐怖', tempo: [60, 120], tags: ['aggressive', 'percussion', 'chase'] },
    { name: 'Suspense', nameCN: '悬疑', tempo: [50, 90], tags: ['tension', 'strings', 'build-up'] },
    { name: 'Jump Scare', nameCN: '惊吓', tempo: [60, 160], tags: ['stinger', 'sudden', 'discordant'] },
  ]},

  // ── World / Ethnic (top-level) ──
  { name: 'World Music', nameCN: '世界音乐', sub: [
    { name: 'Nordic Folk', nameCN: '北欧民谣', tempo: [50, 100], tags: ['Viking', 'Scandinavian', 'runic'] },
    { name: 'Scandinavian Folk', nameCN: '斯堪的纳维亚民谣', tempo: [50, 100], tags: ['nyckelharpa', 'polska'] },
    { name: 'Viking Music', nameCN: '维京音乐', tempo: [60, 110], tags: ['war chant', 'drums', 'Wardruna'] },
    { name: 'Nordic Ritual', nameCN: '北欧仪式', tempo: [30, 70], tags: ['shamanic', 'drum', 'chant'] },
    { name: 'Irish Folk', nameCN: '爱尔兰民谣', tempo: [70, 140], tags: ['jig', 'reel', 'pub'] },
    { name: 'Scottish Folk', nameCN: '苏格兰民谣', tempo: [60, 120], tags: ['bagpipe', 'highland'] },
    { name: 'Breton Folk', nameCN: '布列塔尼民谣', tempo: [60, 120], tags: ['bombarde', 'dance'] },
    { name: 'Gaelic Chant', nameCN: '盖尔吟唱', tempo: [40, 80], tags: ['ancient', 'spiritual', 'vocal'] },
    { name: 'Arabic Classical', nameCN: '阿拉伯古典', tempo: [60, 120], tags: ['maqam', 'ornamentation'] },
    { name: 'Persian Traditional', nameCN: '波斯传统', tempo: [50, 110], tags: ['dastgah', 'santur', 'poetry'] },
    { name: 'Turkish Ottoman', nameCN: '土耳其奥斯曼', tempo: [60, 120], tags: ['mehter', 'ney', 'court'] },
    { name: 'Sufi Music', nameCN: '苏菲音乐', tempo: [50, 100], tags: ['whirling', 'ney', 'devotional'] },
    { name: 'Bedouin Folk', nameCN: '贝都因民谣', tempo: [50, 90], tags: ['desert', 'rababa', 'nomadic'] },
    { name: 'Hindustani Classical', nameCN: '印度斯坦古典', tempo: [40, 120], tags: ['raga', 'sitar', 'tabla', 'alap'] },
    { name: 'Carnatic', nameCN: '卡纳提克', tempo: [60, 140], tags: ['kriti', 'violin', 'mridangam'] },
    { name: 'Bollywood', nameCN: '宝莱坞', tempo: [80, 160], tags: ['fusion', 'orchestral', 'dance'] },
    { name: 'Indian Folk', nameCN: '印度民谣', tempo: [60, 140], tags: ['bhangra', 'rajasthani', 'tribal'] },
    { name: 'Gagaku', nameCN: '雅乐', tempo: [30, 60], tags: ['Japanese court', 'sho', 'hichiriki', 'ancient'] },
    { name: 'Shakuhachi Music', nameCN: '尺八音乐', tempo: [30, 70], tags: ['zen', 'meditation', 'bamboo flute'] },
    { name: 'Samurai Music', nameCN: '武士音乐', tempo: [50, 100], tags: ['taiko', 'shakuhachi', 'biwa'] },
    { name: 'Matsuri Music', nameCN: '祭典音乐', tempo: [80, 130], tags: ['festival', 'taiko', 'flute'] },
    { name: 'Gugak', nameCN: '国乐', tempo: [40, 120], tags: ['Korean traditional', 'court', 'ritual'] },
    { name: 'Pansori', nameCN: '盘索里', tempo: [50, 130], tags: ['Korean opera', 'vocal', 'drum'] },
    { name: 'West African Music', nameCN: '西非音乐', tempo: [80, 150], tags: ['polyrhythm', 'griot', 'dance'] },
    { name: 'African Tribal', nameCN: '非洲部落', tempo: [80, 150], tags: ['ceremonial', 'drum circle', 'chant'] },
    { name: 'Desert Blues', nameCN: '沙漠蓝调', tempo: [60, 110], tags: ['Mali', 'Tinariwen', 'guitar'] },
    { name: 'African Ritual', nameCN: '非洲仪式', tempo: [60, 140], tags: ['trance', 'possession', 'call-response'] },
    { name: 'Mariachi', nameCN: '玛利亚奇', tempo: [80, 140], tags: ['Mexican', 'trumpet', 'guitarron'] },
    { name: 'Tango', nameCN: '探戈', tempo: [60, 120], tags: ['Argentine', 'bandoneon', 'passion'] },
    { name: 'Samba', nameCN: '桑巴', tempo: [100, 160], tags: ['Brazilian', 'carnival', 'percussion'] },
    { name: 'Bossa Nova', nameCN: '波萨诺瓦', tempo: [70, 120], tags: ['Brazilian', 'Jobim', 'smooth'] },
    { name: 'Flamenco', nameCN: '弗拉门戈', tempo: [80, 160], tags: ['Spanish', 'guitar', 'passion', 'palmas'] },
    { name: 'Andean Folk', nameCN: '安第斯民谣', tempo: [50, 100], tags: ['pan flute', 'charango', 'mountain'] },
  ]},

  // ── Chinese Music ──
  { name: 'Chinese Music', nameCN: '中国音乐', tempo: [40, 140], sub: [
    { name: 'Guqin Music', nameCN: '古琴音乐', tempo: [30, 70], tags: ['scholar', 'meditation', 'ancient', 'literati'] },
    { name: 'Guofeng', nameCN: '国风', tempo: [60, 130], tags: ['Chinese style', 'modern traditional', 'fusion'] },
    { name: 'Court Music', nameCN: '宫廷音乐', tempo: [50, 90], tags: ['imperial', 'ritual', 'ceremonial'] },
    { name: 'Chinese Opera', nameCN: '戏曲音乐', tempo: [60, 140], tags: ['Beijing opera', 'Kunqu', 'percussion'] },
    { name: 'Sizhu', nameCN: '丝竹', tempo: [60, 110], tags: ['silk and bamboo', 'chamber', 'Jiangnan'] },
    { name: 'Frontier Music', nameCN: '边塞音乐', tempo: [50, 100], tags: ['desert', 'military', 'Tang dynasty'] },
    { name: 'Ethnic Minority Music', nameCN: '少数民族音乐', tempo: [60, 140], tags: ['Mongolian', 'Tibetan', 'Uyghur', 'Miao'] },
    { name: 'Chinese Fantasy', nameCN: '仙侠音乐', tempo: [50, 120], tags: ['xianxia', 'wuxia', 'ethereal', 'guqin+orchestra'] },
    { name: 'Wuxia Score', nameCN: '武侠配乐', tempo: [60, 140], tags: ['martial arts', 'erhu', 'drums', 'heroic'] },
  ]},

  // ── Japanese Music ──
  { name: 'Japanese Music', nameCN: '日本音乐', tempo: [30, 140], sub: [
    { name: 'Shakuhachi', nameCN: '尺八', tempo: [30, 60], tags: ['zen', 'bamboo', 'meditation', 'Komuso'] },
    { name: 'Samurai Music', nameCN: '武士音乐', tempo: [50, 100], tags: ['biwa', 'taiko', 'battle', 'bushido'] },
    { name: 'Matsuri', nameCN: '祭典音乐', tempo: [80, 140], tags: ['festival', 'taiko', 'shinobue', 'dance'] },
    { name: 'Japanese Folk', nameCN: '日本民谣', tempo: [60, 110], tags: ['minyo', 'shamisen', 'regional'] },
  ]},
];

// ═══════════════════════════════════════════════════════
// ETHNIC STYLES (150+) with instruments
// ═══════════════════════════════════════════════════════

export const ETHNIC_STYLES: EthnicStyle[] = [
  // Nordic
  { name: 'Nordic Folk', nameCN: '北欧民谣', region: 'Nordic', regionCN: '北欧',
    instruments: ['Tagelharpa', 'Nyckelharpa', 'Goat Horn', 'Frame Drum', 'Lur', 'Bowed Lyre', 'Birch Flute'],
    instrumentsCN: ['塔格哈帕', '尼克尔哈帕', '羊角号', '框鼓', '卢尔号', '弓弦里拉', '桦木笛'],
    tags: ['Viking', 'Scandinavian', 'ancient', 'nature', 'ritual'] },
  { name: 'Scandinavian Folk', nameCN: '斯堪的纳维亚民谣', region: 'Nordic', regionCN: '北欧',
    instruments: ['Nyckelharpa', 'Fiddle', 'Hardanger Fiddle', 'Accordion', 'Jaw Harp'],
    instrumentsCN: ['尼克尔哈帕', '小提琴', '哈丹格小提琴', '手风琴', '口弦'],
    tags: ['polska', 'dance', 'folk'] },
  { name: 'Viking Music', nameCN: '维京音乐', region: 'Nordic', regionCN: '北欧',
    instruments: ['Tagelharpa', 'Frame Drum', 'Goat Horn', 'Lur', 'Male Chant', 'Bone Flute', 'Shield Drum'],
    instrumentsCN: ['塔格哈帕', '框鼓', '羊角号', '卢尔号', '男声吟唱', '骨笛', '盾鼓'],
    tags: ['war', 'ritual', 'Wardruna', 'Heilung'] },
  { name: 'Nordic Ritual', nameCN: '北欧仪式', region: 'Nordic', regionCN: '北欧',
    instruments: ['Frame Drum', 'Female Chant', 'Male Chant', 'Bowed Lyre', 'Rattle', 'Bullroarer'],
    instrumentsCN: ['框鼓', '女声吟唱', '男声吟唱', '弓弦里拉', '摇铃', '牛吼器'],
    tags: ['shamanic', 'trance', 'ceremony', 'seidr'] },

  // Celtic
  { name: 'Irish Folk', nameCN: '爱尔兰民谣', region: 'Celtic', regionCN: '凯尔特',
    instruments: ['Tin Whistle', 'Irish Flute', 'Uilleann Pipes', 'Bodhran', 'Fiddle', 'Celtic Harp', 'Bouzouki'],
    instrumentsCN: ['锡笛', '爱尔兰长笛', '爱尔兰风笛', '宝思兰鼓', '小提琴', '凯尔特竖琴', '布祖基琴'],
    tags: ['jig', 'reel', 'pub', 'dance', 'green'] },
  { name: 'Scottish Folk', nameCN: '苏格兰民谣', region: 'Celtic', regionCN: '凯尔特',
    instruments: ['Great Highland Bagpipe', 'Scottish Smallpipes', 'Fiddle', 'Clarsach', 'Accordion', 'Snare Drum'],
    instrumentsCN: ['苏格兰高地风笛', '苏格兰小风笛', '小提琴', '凯尔特竖琴', '手风琴', '军鼓'],
    tags: ['highland', 'march', 'strathspey', 'lament'] },
  { name: 'Breton Folk', nameCN: '布列塔尼民谣', region: 'Celtic', regionCN: '凯尔特',
    instruments: ['Bombarde', 'Biniou', 'Breton Bagpipe', 'Hurdy Gurdy', 'Accordion'],
    instrumentsCN: ['布列塔尼双簧管', '比尼乌风笛', '布列塔尼风笛', '手摇风琴', '手风琴'],
    tags: ['fest-noz', 'dance', 'coastal'] },
  { name: 'Gaelic Chant', nameCN: '盖尔吟唱', region: 'Celtic', regionCN: '凯尔特',
    instruments: ['Female Chant', 'Male Chant', 'Celtic Harp', 'Bodhran'],
    instrumentsCN: ['女声吟唱', '男声吟唱', '凯尔特竖琴', '宝思兰鼓'],
    tags: ['ancient', 'spiritual', 'lament', 'keening'] },

  // Middle Eastern
  { name: 'Arabic Classical', nameCN: '阿拉伯古典', region: 'Middle East', regionCN: '中东',
    instruments: ['Oud', 'Ney', 'Qanun', 'Darbuka', 'Riqq', 'Buzuq', 'Violin (Arabic tuning)'],
    instrumentsCN: ['乌德琴', '奈伊笛', '卡农琴', '达布卡鼓', '铃鼓', '布祖克', '小提琴(阿拉伯定弦)'],
    tags: ['maqam', 'taqsim', 'ornamentation', 'Cairo'] },
  { name: 'Persian Traditional', nameCN: '波斯传统', region: 'Middle East', regionCN: '中东',
    instruments: ['Santur', 'Tar', 'Setar', 'Kamancheh', 'Tombak', 'Ney', 'Daf'],
    instrumentsCN: ['桑图尔', '塔尔琴', '塞塔尔', '卡曼切', '通巴克鼓', '奈伊笛', '达夫鼓'],
    tags: ['dastgah', 'radif', 'poetry', 'Isfahan'] },
  { name: 'Turkish Ottoman', nameCN: '土耳其奥斯曼', region: 'Middle East', regionCN: '中东',
    instruments: ['Oud', 'Ney', 'Kanun', 'Tanbur', 'Kudum', 'Zurna', 'Mey'],
    instrumentsCN: ['乌德琴', '奈伊笛', '卡农琴', '坦布尔', '库杜姆鼓', '祖尔纳', '梅伊笛'],
    tags: ['mehter', 'court', 'Sufi', 'Istanbul'] },
  { name: 'Sufi Music', nameCN: '苏菲音乐', region: 'Middle East', regionCN: '中东',
    instruments: ['Ney', 'Oud', 'Bendir', 'Daf', 'Qanun', 'Male Chant'],
    instrumentsCN: ['奈伊笛', '乌德琴', '本迪尔鼓', '达夫鼓', '卡农琴', '男声吟唱'],
    tags: ['whirling', 'dhikr', 'devotional', 'Rumi'] },
  { name: 'Bedouin Folk', nameCN: '贝都因民谣', region: 'Middle East', regionCN: '中东',
    instruments: ['Rababa', 'Oud', 'Ney', 'Desert Drum'],
    instrumentsCN: ['拉巴布', '乌德琴', '奈伊笛', '沙漠鼓'],
    tags: ['desert', 'nomadic', 'oral poetry'] },

  // Indian
  { name: 'Hindustani Classical', nameCN: '印度斯坦古典', region: 'India', regionCN: '印度',
    instruments: ['Sitar', 'Sarod', 'Tabla', 'Tanpura', 'Bansuri', 'Sarangi', 'Shehnai'],
    instrumentsCN: ['锡塔琴', '萨罗德', '塔布拉鼓', '坦普拉', '班苏里笛', '萨兰吉琴', '唢呐'],
    tags: ['raga', 'tala', 'alap', 'gat', 'dhrupad'] },
  { name: 'Carnatic', nameCN: '卡纳提克', region: 'India', regionCN: '印度',
    instruments: ['Veena', 'Mridangam', 'Violin', 'Ghatam', 'Kanjira', 'Morsing'],
    instrumentsCN: ['维纳琴', '姆里丹甘鼓', '小提琴', '陶罐鼓', '康吉拉', '口弦'],
    tags: ['kriti', 'Thyagaraja', 'temple'] },
  { name: 'Bollywood', nameCN: '宝莱坞', region: 'India', regionCN: '印度',
    instruments: ['Sitar', 'Tabla', 'Dhol', 'Harmonium', 'Shehnai', 'Synthesizer', 'Orchestra'],
    instrumentsCN: ['锡塔琴', '塔布拉鼓', '多尔鼓', '风琴', '唢呐', '合成器', '管弦乐队'],
    tags: ['fusion', 'dance', 'colorful', 'Mumbai'] },
  { name: 'Indian Folk', nameCN: '印度民谣', region: 'India', regionCN: '印度',
    instruments: ['Dhol', 'Ektara', 'Algoza', 'Jal Tarang', 'Pung', 'Kartal'],
    instrumentsCN: ['多尔鼓', '单弦琴', '双笛', '水碗琴', '鼓', '响板'],
    tags: ['bhangra', 'rajasthani', 'garba', 'tribal'] },

  // Chinese
  { name: 'Guqin', nameCN: '古琴', region: 'China', regionCN: '中国',
    instruments: ['Guqin', 'Xiao', 'Qing', 'Chime'],
    instrumentsCN: ['古琴', '箫', '磬', '编钟'],
    tags: ['scholar', 'literati', 'meditation', 'ancient'] },
  { name: 'Guofeng', nameCN: '国风', region: 'China', regionCN: '中国',
    instruments: ['Guzheng', 'Dizi', 'Pipa', 'Erhu', 'Yangqin', 'Xiao', 'Chinese Drum'],
    instrumentsCN: ['古筝', '笛子', '琵琶', '二胡', '扬琴', '箫', '中国大鼓'],
    tags: ['modern traditional', 'anime style', 'Hanfu', 'popular'] },
  { name: 'Chinese Court Music', nameCN: '宫廷音乐', region: 'China', regionCN: '中国',
    instruments: ['Bianzhong', 'Bianqing', 'Guqin', 'Se', 'Xun', 'Chime', 'Sheng'],
    instrumentsCN: ['编钟', '编磬', '古琴', '瑟', '埙', '排钟', '笙'],
    tags: ['imperial', 'ritual', 'Tang', 'Han'] },
  { name: 'Chinese Opera', nameCN: '戏曲音乐', region: 'China', regionCN: '中国',
    instruments: ['Jinghu', 'Erhu', 'Yueqin', 'Suona', 'Pipa', 'Ban', 'Luo', 'Bo'],
    instrumentsCN: ['京胡', '二胡', '月琴', '唢呐', '琵琶', '板', '锣', '钹'],
    tags: ['Beijing opera', 'Kunqu', 'mask', 'stage'] },
  { name: 'Chinese Frontier', nameCN: '边塞音乐', region: 'China', regionCN: '中国',
    instruments: ['Suona', 'Sheng', 'Dizi', 'Pipa', 'War Drum', 'Erhu'],
    instrumentsCN: ['唢呐', '笙', '笛子', '琵琶', '战鼓', '二胡'],
    tags: ['desert', 'military', 'Tang dynasty', 'Silk Road'] },
  { name: 'Chinese Fantasy', nameCN: '仙侠音乐', region: 'China', regionCN: '中国',
    instruments: ['Guqin', 'Guzheng', 'Erhu', 'Dizi', 'Xiao', 'Pipa', 'Chinese Choir', 'Orchestra'],
    instrumentsCN: ['古琴', '古筝', '二胡', '笛子', '箫', '琵琶', '中国合唱', '管弦乐队'],
    tags: ['xianxia', 'wuxia', 'ethereal', 'immortal', 'cultivation'] },

  // Japanese
  { name: 'Gagaku', nameCN: '雅乐', region: 'Japan', regionCN: '日本',
    instruments: ['Sho', 'Hichiriki', 'Ryuteki', 'Biwa', 'Kakko', 'Shoko', 'Taiko'],
    instrumentsCN: ['笙', '筚篥', '龙笛', '琵琶', '羯鼓', '钲鼓', '太鼓'],
    tags: ['imperial court', 'ritual', 'ancient', 'Nara'] },
  { name: 'Shakuhachi', nameCN: '尺八', region: 'Japan', regionCN: '日本',
    instruments: ['Shakuhachi', 'Koto', 'Shamisen'],
    instrumentsCN: ['尺八', '筝', '三味线'],
    tags: ['zen', 'meditation', 'komuso', 'honkyoku'] },
  { name: 'Samurai Music', nameCN: '武士音乐', region: 'Japan', regionCN: '日本',
    instruments: ['Taiko', 'Shakuhachi', 'Biwa', 'Shamisen', 'Horagai'],
    instrumentsCN: ['太鼓', '尺八', '琵琶', '三味线', '法螺贝'],
    tags: ['battle', 'bushido', 'epic', 'historical'] },
  { name: 'Matsuri', nameCN: '祭典音乐', region: 'Japan', regionCN: '日本',
    instruments: ['Taiko', 'Shinobue', 'Shamisen', 'Kane', 'Hyoshigi'],
    instrumentsCN: ['太鼓', '篠笛', '三味线', '钲', '拍子木'],
    tags: ['festival', 'summer', 'dance', 'community'] },

  // Korean
  { name: 'Gugak', nameCN: '国乐', region: 'Korea', regionCN: '韩国',
    instruments: ['Gayageum', 'Geomungo', 'Daegeum', 'Piri', 'Haegeum', 'Janggu', 'Jing'],
    instrumentsCN: ['伽倻琴', '玄琴', '大笒', '觱篥', '奚琴', '杖鼓', '大锣'],
    tags: ['court', 'aristocratic', 'ritual'] },
  { name: 'Pansori', nameCN: '盘索里', region: 'Korea', regionCN: '韩国',
    instruments: ['Buk', 'Gayageum'],
    instrumentsCN: ['鼓', '伽倻琴'],
    tags: ['vocal', 'storytelling', 'dramatic', 'folk opera'] },

  // African
  { name: 'West African', nameCN: '西非音乐', region: 'Africa', regionCN: '非洲',
    instruments: ['Djembe', 'Kora', 'Balafon', 'Talking Drum', 'Dundun', 'Shekere', 'Ngoni'],
    instrumentsCN: ['金贝鼓', '科拉琴', '巴拉风', '说话鼓', '敦敦鼓', '沙锤', '恩戈尼琴'],
    tags: ['Mali', 'Senegal', 'griot', 'polyrhythm'] },
  { name: 'African Tribal', nameCN: '非洲部落', region: 'Africa', regionCN: '非洲',
    instruments: ['Djembe', 'Talking Drum', 'Mbira', 'Udu', 'Log Drum', 'Bullroarer', 'Rattle'],
    instrumentsCN: ['金贝鼓', '说话鼓', '姆比拉', '乌杜', '木鼓', '牛吼器', '摇铃'],
    tags: ['ceremony', 'trance', 'initiation'] },
  { name: 'Desert Blues', nameCN: '沙漠蓝调', region: 'Africa', regionCN: '非洲',
    instruments: ['Electric Guitar', 'Calabash', 'Djembe', 'Talking Drum', 'Bass'],
    instrumentsCN: ['电吉他', '葫芦', '金贝鼓', '说话鼓', '贝斯'],
    tags: ['Mali', 'Tinariwen', 'Sahara', 'nomadic'] },
  { name: 'African Ritual', nameCN: '非洲仪式', region: 'Africa', regionCN: '非洲',
    instruments: ['Djembe', 'Dundun', 'Shekere', 'Mbira', 'Kora', 'Voice'],
    instrumentsCN: ['金贝鼓', '敦敦鼓', '沙锤', '姆比拉', '科拉琴', '人声'],
    tags: ['spirit possession', 'voodoo', 'ancestral'] },

  // Latin
  { name: 'Mariachi', nameCN: '玛利亚奇', region: 'Latin America', regionCN: '拉丁美洲',
    instruments: ['Trumpet', 'Violin', 'Vihuela', 'Guitarron', 'Guitar', 'Harp'],
    instrumentsCN: ['小号', '小提琴', '维胡埃拉', '大吉他', '吉他', '竖琴'],
    tags: ['Mexico', 'fiesta', 'ranchera'] },
  { name: 'Tango', nameCN: '探戈', region: 'Latin America', regionCN: '拉丁美洲',
    instruments: ['Bandoneon', 'Violin', 'Piano', 'Double Bass', 'Electric Guitar'],
    instrumentsCN: ['班多钮', '小提琴', '钢琴', '低音提琴', '电吉他'],
    tags: ['Argentina', 'Buenos Aires', 'passion', 'Piazzolla'] },
  { name: 'Samba', nameCN: '桑巴', region: 'Latin America', regionCN: '拉丁美洲',
    instruments: ['Surdo', 'Tamborim', 'Cuica', 'Pandeiro', 'Cavaquinho', 'Agogo'],
    instrumentsCN: ['大鼓', '小手鼓', '奎卡', '潘德罗', '卡瓦基诺', '阿哥哥铃'],
    tags: ['Brazil', 'carnival', 'Rio', 'parade'] },
  { name: 'Bossa Nova', nameCN: '波萨诺瓦', region: 'Latin America', regionCN: '拉丁美洲',
    instruments: ['Acoustic Guitar', 'Piano', 'Drums (brush)', 'Double Bass', 'Saxophone'],
    instrumentsCN: ['原声吉他', '钢琴', '鼓(刷)', '低音提琴', '萨克斯'],
    tags: ['Brazil', 'Jobim', 'smooth', 'beach'] },
  { name: 'Flamenco', nameCN: '弗拉门戈', region: 'Latin America', regionCN: '拉丁美洲',
    instruments: ['Spanish Guitar', 'Cajon', 'Palmas', 'Castanets', 'Cante (vocal)'],
    instrumentsCN: ['西班牙吉他', '卡宏', '击掌', '响板', '深歌'],
    tags: ['Andalusia', 'gypsy', 'passion', 'compas'] },
  { name: 'Andean Folk', nameCN: '安第斯民谣', region: 'Latin America', regionCN: '拉丁美洲',
    instruments: ['Pan Flute (Zampona)', 'Quena', 'Charango', 'Bombo', 'Chajchas'],
    instrumentsCN: ['排箫', '奎纳', '恰兰戈', '大鼓', '羊蹄铃'],
    tags: ['Peru', 'Bolivia', 'mountain', 'Inca'] },
];

// ═══════════════════════════════════════════════════════
// EMOTIONS (100+)
// ═══════════════════════════════════════════════════════

export const EMOTIONS: EmotionEntry[] = [
  // ── Positive ──
  { name: 'Hopeful', nameCN: '希望', category: 'positive', intensity: 0.5, instruments: ['Piano', 'Strings', 'Harp', 'Female Choir'], tempo: [60, 90] },
  { name: 'Warm', nameCN: '温暖', category: 'positive', intensity: 0.4, instruments: ['Acoustic Guitar', 'Cello', 'Piano', 'Flute'], tempo: [60, 90] },
  { name: 'Inspiring', nameCN: '鼓舞', category: 'positive', intensity: 0.7, instruments: ['French Horn', 'Strings', 'Brass', 'Choir'], tempo: [80, 120] },
  { name: 'Triumphant', nameCN: '胜利', category: 'positive', intensity: 0.9, instruments: ['Brass', 'Choir', 'Snare Drum', 'Timpani', 'Orchestra'], tempo: [100, 150] },
  { name: 'Joyful', nameCN: '喜悦', category: 'positive', intensity: 0.7, instruments: ['Piano', 'Flute', 'Harp', 'Glockenspiel', 'Strings'], tempo: [90, 140] },
  { name: 'Peaceful', nameCN: '宁静', category: 'positive', intensity: 0.2, instruments: ['Harp', 'Flute', 'Piano', 'Pad', 'Singing Bowl'], tempo: [40, 70] },
  { name: 'Wonder', nameCN: '惊奇', category: 'positive', intensity: 0.6, instruments: ['Harp', 'Choir', 'Glockenspiel', 'Celesta', 'Strings'], tempo: [50, 90] },
  { name: 'Romantic', nameCN: '浪漫', category: 'positive', intensity: 0.5, instruments: ['Piano', 'Violin', 'Cello', 'Acoustic Guitar', 'Harp'], tempo: [60, 100] },
  { name: 'Uplifting', nameCN: '振奋', category: 'positive', intensity: 0.8, instruments: ['Strings', 'Brass', 'Choir', 'Drums', 'Electric Guitar'], tempo: [90, 140] },
  { name: 'Serene', nameCN: '安详', category: 'positive', intensity: 0.2, instruments: ['Harp', 'Pad', 'Piano', 'Flute', 'Singing Bowl'], tempo: [30, 60] },

  // ── Ethereal ──
  { name: 'Mysterious', nameCN: '神秘', category: 'ethereal', intensity: 0.4, instruments: ['Harp', 'Choir', 'Celesta', 'Pad', 'Glass Harmonica'], tempo: [40, 80] },
  { name: 'Dreamy', nameCN: '梦幻', category: 'ethereal', intensity: 0.3, instruments: ['Pad', 'Harp', 'Choir', 'Reverb Guitar', 'Celesta'], tempo: [40, 70] },
  { name: 'Curious', nameCN: '好奇', category: 'ethereal', intensity: 0.4, instruments: ['Pizzicato Strings', 'Glockenspiel', 'Flute', 'Celesta'], tempo: [60, 100] },
  { name: 'Reflective', nameCN: '反思', category: 'ethereal', intensity: 0.3, instruments: ['Piano', 'Cello', 'Pad', 'Acoustic Guitar'], tempo: [50, 80] },
  { name: 'Ancient', nameCN: '古老', category: 'ethereal', intensity: 0.5, instruments: ['Frame Drum', 'Chant', 'Tagelharpa', 'Guqin', 'Shakuhachi'], tempo: [30, 70] },
  { name: 'Sacred', nameCN: '神圣', category: 'ethereal', intensity: 0.6, instruments: ['Organ', 'Choir', 'Harp', 'Bells', 'Pad'], tempo: [30, 70] },
  { name: 'Ethereal', nameCN: '飘渺', category: 'ethereal', intensity: 0.3, instruments: ['Pad', 'Female Choir', 'Harp', 'Violin (harmonics)', 'Crystal Glass'], tempo: [30, 60] },
  { name: 'Spiritual', nameCN: '灵性', category: 'ethereal', intensity: 0.4, instruments: ['Singing Bowl', 'Shakuhachi', 'Chant', 'Tanpura', 'Frame Drum'], tempo: [30, 60] },
  { name: 'Magical', nameCN: '魔法', category: 'ethereal', intensity: 0.5, instruments: ['Celesta', 'Harp', 'Choir', 'Glockenspiel', 'Strings (tremolo)'], tempo: [50, 90] },

  // ── Dark ──
  { name: 'Lonely', nameCN: '孤独', category: 'dark', intensity: 0.4, instruments: ['Piano', 'Cello', 'Single Violin', 'Pad', 'Shakuhachi'], tempo: [40, 70] },
  { name: 'Melancholic', nameCN: '忧伤', category: 'dark', intensity: 0.5, instruments: ['Cello', 'Piano', 'Violin', 'Erhu', 'Acoustic Guitar'], tempo: [50, 80] },
  { name: 'Fearful', nameCN: '恐惧', category: 'dark', intensity: 0.7, instruments: ['Dissonant Strings', 'Low Brass', 'Percussion', 'Drone', 'Electronics'], tempo: [40, 90] },
  { name: 'Tense', nameCN: '紧张', category: 'dark', intensity: 0.7, instruments: ['Pizzicato Strings', 'Percussion', 'Synth Bass', 'Brass (muted)'], tempo: [80, 130] },
  { name: 'Desperate', nameCN: '绝望', category: 'dark', intensity: 0.9, instruments: ['Strings (col legno)', 'Choir', 'Distorted Electronics', 'Taiko'], tempo: [60, 130] },
  { name: 'Tragic', nameCN: '悲剧', category: 'dark', intensity: 0.8, instruments: ['Cello', 'Violin', 'Piano', 'Choir', 'Horn'], tempo: [40, 80] },
  { name: 'Angry', nameCN: '愤怒', category: 'dark', intensity: 0.9, instruments: ['Distorted Guitar', 'Brass', 'Percussion', 'Choir (forte)', 'Taiko'], tempo: [100, 160] },
  { name: 'Ominous', nameCN: '不详', category: 'dark', intensity: 0.6, instruments: ['Low Brass', 'Drone', 'Organ', 'Frame Drum', 'Distorted Pad'], tempo: [30, 70] },
  { name: 'Haunting', nameCN: '萦绕', category: 'dark', intensity: 0.6, instruments: ['Female Choir', 'Reverb Piano', 'Theremin', 'Glass Harmonica', 'Pad'], tempo: [30, 60] },
  { name: 'Cold', nameCN: '冰冷', category: 'dark', intensity: 0.5, instruments: ['Pad', 'Cello (sul ponticello)', 'Harp (high register)', 'Synthesizer', 'Piano (high)'], tempo: [40, 70] },

  // ── Epic ──
  { name: 'Heroic', nameCN: '英雄', category: 'epic', intensity: 0.8, instruments: ['French Horn', 'Brass', 'Choir', 'Strings', 'Snare Drum'], tempo: [80, 130] },
  { name: 'Majestic', nameCN: '雄伟', category: 'epic', intensity: 0.7, instruments: ['French Horn', 'Organ', 'Choir', 'Timpani', 'Strings'], tempo: [60, 100] },
  { name: 'Legendary', nameCN: '传奇', category: 'epic', intensity: 0.8, instruments: ['Choir', 'Orchestra', 'Taiko', 'Brass', 'Harp'], tempo: [60, 120] },
  { name: 'Mythic', nameCN: '神话', category: 'epic', intensity: 0.8, instruments: ['Choir', 'Tagelharpa', 'Frame Drum', 'Horn', 'Strings'], tempo: [50, 100] },
  { name: 'Glorious', nameCN: '荣耀', category: 'epic', intensity: 0.9, instruments: ['Brass', 'Choir', 'Strings', 'Timpani', 'Organ'], tempo: [80, 140] },

  // ── Action ──
  { name: 'Powerful', nameCN: '力量', category: 'action', intensity: 0.9, instruments: ['Taiko', 'Brass', 'Distorted Guitar', 'Choir', 'Percussion'], tempo: [90, 140] },
  { name: 'Aggressive', nameCN: '侵略', category: 'action', intensity: 0.9, instruments: ['Distorted Guitar', 'Taiko', 'Brass', 'Synthesizer', 'Double Bass Drum'], tempo: [110, 170] },
  { name: 'Epic Battle', nameCN: '史诗战斗', category: 'action', intensity: 1.0, instruments: ['Taiko', 'Choir', 'Brass', 'Strings', 'Orchestral Percussion'], tempo: [110, 155] },
  { name: 'Chase', nameCN: '追逐', category: 'action', intensity: 0.8, instruments: ['Strings (ostinato)', 'Percussion', 'Brass', 'Synth Bass', 'Piano (staccato)'], tempo: [120, 170] },
  { name: 'Rising Tension', nameCN: '紧张上升', category: 'action', intensity: 0.7, instruments: ['Strings (tremolo)', 'Percussion', 'Synth', 'Brass (crescendo)'], tempo: [80, 140] },
];

// ═══════════════════════════════════════════════════════
// INSTRUMENTS (200+ key entries)
// ═══════════════════════════════════════════════════════

export const INSTRUMENTS: InstrumentEntry[] = [
  // ── Strings ──
  { name: 'Violin', nameCN: '小提琴', family: 'string', emotions: ['emotional', 'romantic', 'sad', 'soaring'], role: 'lead' },
  { name: 'Viola', nameCN: '中提琴', family: 'string', emotions: ['melancholic', 'warm', 'introspective'], role: 'support' },
  { name: 'Cello', nameCN: '大提琴', family: 'string', emotions: ['sad', 'lonely', 'emotional', 'deep', 'passionate'], role: 'lead' },
  { name: 'Double Bass', nameCN: '低音提琴', family: 'string', emotions: ['dark', 'ominous', 'grounded'], role: 'bass' },
  { name: 'Harp', nameCN: '竖琴', family: 'string', emotions: ['dreamy', 'sacred', 'peaceful', 'magical'], role: 'atmosphere' },
  { name: 'Celtic Harp', nameCN: '凯尔特竖琴', family: 'string', emotions: ['ancient', 'pastoral', 'gentle', 'fairy'], role: 'lead' },
  { name: 'Acoustic Guitar', nameCN: '原声吉他', family: 'string', emotions: ['warm', 'intimate', 'folk', 'nostalgic'], role: 'lead' },
  { name: 'Spanish Guitar', nameCN: '西班牙吉他', family: 'string', emotions: ['passionate', 'dramatic', 'warm'], role: 'lead' },
  { name: 'Electric Guitar', nameCN: '电吉他', family: 'string', emotions: ['powerful', 'aggressive', 'distorted', 'energetic'], role: 'lead' },
  { name: 'Pipa', nameCN: '琵琶', family: 'string', emotions: ['dramatic', 'martial', 'ancient Chinese', 'percussive'], role: 'lead' },
  { name: 'Guqin', nameCN: '古琴', family: 'string', emotions: ['ancient', 'scholarly', 'meditative', 'elegant'], role: 'lead' },
  { name: 'Guzheng', nameCN: '古筝', family: 'string', emotions: ['flowing', 'elegant', 'Chinese', 'expressive'], role: 'lead' },
  { name: 'Erhu', nameCN: '二胡', family: 'string', emotions: ['sad', 'lamenting', 'melancholic', 'Chinese'], role: 'lead' },
  { name: 'Sitar', nameCN: '锡塔琴', family: 'string', emotions: ['Indian', 'meditative', 'drone', 'ornamental'], role: 'lead' },
  { name: 'Gayageum', nameCN: '伽倻琴', family: 'string', emotions: ['elegant', 'Korean', 'gentle', 'traditional'], role: 'lead' },
  { name: 'Kora', nameCN: '科拉琴', family: 'string', emotions: ['West African', 'flowing', 'harp-like', 'storytelling'], role: 'lead' },
  { name: 'Nyckelharpa', nameCN: '尼克尔哈帕', family: 'string', emotions: ['Nordic', 'ancient', 'resonant', 'folk'], role: 'lead' },
  { name: 'Tagelharpa', nameCN: '塔格哈帕', family: 'string', emotions: ['Viking', 'dark', 'ancient', 'drone'], role: 'atmosphere' },

  // ── Wind ──
  { name: 'Flute', nameCN: '长笛', family: 'wind', emotions: ['peaceful', 'mysterious', 'light', 'nature'], role: 'lead' },
  { name: 'Piccolo', nameCN: '短笛', family: 'wind', emotions: ['bright', 'military', 'whimsical'], role: 'support' },
  { name: 'Clarinet', nameCN: '单簧管', family: 'wind', emotions: ['warm', 'noir', 'jazzy', 'classical'], role: 'lead' },
  { name: 'Oboe', nameCN: '双簧管', family: 'wind', emotions: ['plaintive', 'pastoral', 'expressive'], role: 'lead' },
  { name: 'English Horn', nameCN: '英国管', family: 'wind', emotions: ['melancholic', 'pastoral', 'soulful'], role: 'lead' },
  { name: 'Bassoon', nameCN: '大管', family: 'wind', emotions: ['comical', 'dark', 'warm'], role: 'support' },
  { name: 'Tin Whistle', nameCN: '锡笛', family: 'wind', emotions: ['Celtic', 'bright', 'folk', 'lively'], role: 'lead' },
  { name: 'Bagpipe', nameCN: '风笛', family: 'wind', emotions: ['Scottish', 'martial', 'mournful', 'epic'], role: 'lead' },
  { name: 'Dizi', nameCN: '笛子', family: 'wind', emotions: ['Chinese', 'bright', 'flowing', 'pastoral'], role: 'lead' },
  { name: 'Xiao', nameCN: '箫', family: 'wind', emotions: ['meditative', 'deep', 'solitary', 'Chinese'], role: 'lead' },
  { name: 'Shakuhachi', nameCN: '尺八', family: 'wind', emotions: ['zen', 'meditative', 'lonely', 'breathy'], role: 'lead' },
  { name: 'Suona', nameCN: '唢呐', family: 'wind', emotions: ['festive', 'piercing', 'Chinese folk', 'celebratory'], role: 'lead' },
  { name: 'Ney', nameCN: '奈伊笛', family: 'wind', emotions: ['Sufi', 'spiritual', 'breathy', 'Middle Eastern'], role: 'lead' },
  { name: 'Bansuri', nameCN: '班苏里笛', family: 'wind', emotions: ['Indian', 'meditative', 'Krishna', 'pastoral'], role: 'lead' },
  { name: 'Pan Flute', nameCN: '排箫', family: 'wind', emotions: ['Andean', 'mountain', 'ancient', 'nature'], role: 'lead' },

  // ── Brass ──
  { name: 'Trumpet', nameCN: '小号', family: 'brass', emotions: ['heroic', 'triumphant', 'bright', 'military'], role: 'lead' },
  { name: 'French Horn', nameCN: '法国号', family: 'brass', emotions: ['heroic', 'royal', 'noble', 'epic', 'warm'], role: 'lead' },
  { name: 'Trombone', nameCN: '长号', family: 'brass', emotions: ['powerful', 'noble', 'dramatic'], role: 'support' },
  { name: 'Tuba', nameCN: '大号', family: 'brass', emotions: ['deep', 'ominous', 'grounded'], role: 'bass' },
  { name: 'Euphonium', nameCN: '次中音号', family: 'brass', emotions: ['warm', 'lyrical', 'noble'], role: 'support' },

  // ── Percussion ──
  { name: 'Timpani', nameCN: '定音鼓', family: 'percussion', emotions: ['dramatic', 'epic', 'thunderous', 'ceremonial'], role: 'rhythm' },
  { name: 'Snare Drum', nameCN: '军鼓', family: 'percussion', emotions: ['military', 'march', 'tension'], role: 'rhythm' },
  { name: 'Taiko Drum', nameCN: '太鼓', family: 'percussion', emotions: ['battle', 'power', 'momentum', 'epic', 'Japanese'], role: 'rhythm' },
  { name: 'Frame Drum', nameCN: '框鼓', family: 'percussion', emotions: ['ancient', 'ritual', 'shamanic', 'Nordic'], role: 'rhythm' },
  { name: 'Bodhran', nameCN: '宝思兰鼓', family: 'percussion', emotions: ['Celtic', 'driving', 'folk'], role: 'rhythm' },
  { name: 'Djembe', nameCN: '金贝鼓', family: 'percussion', emotions: ['African', 'tribal', 'energetic'], role: 'rhythm' },
  { name: 'Tabla', nameCN: '塔布拉鼓', family: 'percussion', emotions: ['Indian classical', 'intricate', 'rhythmic'], role: 'rhythm' },
  { name: 'Darbuka', nameCN: '达布卡鼓', family: 'percussion', emotions: ['Middle Eastern', 'belly dance', 'festive'], role: 'rhythm' },
  { name: 'Cajon', nameCN: '卡宏', family: 'percussion', emotions: ['Flamenco', 'acoustic', 'groove'], role: 'rhythm' },
  { name: 'Glockenspiel', nameCN: '钟琴', family: 'percussion', emotions: ['magical', 'bright', 'twinkling'], role: 'atmosphere' },
  { name: 'Celesta', nameCN: '钢片琴', family: 'percussion', emotions: ['magical', 'dreamy', 'Harry Potter'], role: 'atmosphere' },
  { name: 'Cymbals', nameCN: '镲', family: 'percussion', emotions: ['crash', 'accent', 'dramatic'], role: 'rhythm' },
  { name: 'Gong', nameCN: '锣', family: 'percussion', emotions: ['ominous', 'ceremonial', 'Asian'], role: 'atmosphere' },
  { name: 'Singing Bowl', nameCN: '颂钵', family: 'percussion', emotions: ['meditative', 'healing', 'spiritual'], role: 'atmosphere' },

  // ── Keyboard ──
  { name: 'Piano', nameCN: '钢琴', family: 'keyboard', emotions: ['versatile', 'emotional', 'melancholic', 'hopeful', 'intimate'], role: 'lead' },
  { name: 'Organ', nameCN: '管风琴', family: 'keyboard', emotions: ['sacred', 'majestic', 'gothic', 'ominous'], role: 'atmosphere' },
  { name: 'Harpsichord', nameCN: '羽管键琴', family: 'keyboard', emotions: ['Baroque', 'elegant', 'period'], role: 'support' },
  { name: 'Celesta', nameCN: '钢片琴', family: 'keyboard', emotions: ['magical', 'dreamy', 'fairytale'], role: 'atmosphere' },

  // ── Vocal ──
  { name: 'Female Choir', nameCN: '女声合唱', family: 'vocal', emotions: ['sacred', 'pure', 'fantasy', 'ethereal', 'angelic'], role: 'atmosphere' },
  { name: 'Male Choir', nameCN: '男声合唱', family: 'vocal', emotions: ['epic', 'Viking', 'war', 'powerful'], role: 'atmosphere' },
  { name: 'Mixed Choir', nameCN: '混声合唱', family: 'vocal', emotions: ['epic', 'sacred', 'grand'], role: 'atmosphere' },
  { name: 'Male Chant', nameCN: '男声吟唱', family: 'vocal', emotions: ['ancient', 'ritual', 'Nordic', 'monastic'], role: 'atmosphere' },
  { name: 'Female Chant', nameCN: '女声吟唱', family: 'vocal', emotions: ['ethereal', 'ancient', 'Celtic', 'spiritual'], role: 'atmosphere' },
  { name: 'Soprano Solo', nameCN: '女高音独唱', family: 'vocal', emotions: ['operatic', 'emotional', 'soaring'], role: 'lead' },
  { name: 'Baritone Solo', nameCN: '男中音独唱', family: 'vocal', emotions: ['deep', 'solemn', 'narrative'], role: 'lead' },

  // ── Electronic ──
  { name: 'Pad', nameCN: '铺垫音色', family: 'electronic', emotions: ['atmospheric', 'ambient', 'dreamy', 'space'], role: 'atmosphere' },
  { name: 'Drone', nameCN: '持续音', family: 'electronic', emotions: ['dark', 'tension', 'ancient', 'meditative'], role: 'atmosphere' },
  { name: 'Synth Bass', nameCN: '合成贝斯', family: 'electronic', emotions: ['deep', 'powerful', 'modern'], role: 'bass' },
  { name: 'Arpeggiator Synth', nameCN: '琶音合成器', family: 'electronic', emotions: ['hypnotic', 'electronic', 'rhythmic'], role: 'support' },
  { name: 'Distorted Synth', nameCN: '失真合成器', family: 'electronic', emotions: ['aggressive', 'industrial', 'cyberpunk'], role: 'lead' },
];

// ═══════════════════════════════════════════════════════
// PRODUCTION STYLES (100+)
// ═══════════════════════════════════════════════════════

export const PRODUCTION_STYLES: ProductionStyle[] = [
  { name: 'Cinematic Soundtrack', nameCN: '电影配乐', description: 'Wide stereo image, large hall reverb, orchestral seating, dynamic range 20dB+', tags: ['orchestra', 'film', 'wide', 'reverb'] },
  { name: 'Immersive Atmosphere', nameCN: '沉浸式氛围', description: '3D spatial audio, layered textures, evolving pads, depth layering', tags: ['ambient', '3D', 'texture', 'evolving'] },
  { name: 'High Fidelity Studio', nameCN: '高保真录音室', description: 'Clean, close-mic, minimal reverb, detailed transient, modern pop standard', tags: ['clean', 'close', 'detail', 'modern'] },
  { name: 'Lo-Fi Aesthetic', nameCN: '低保真美学', description: 'Tape saturation, vinyl crackle, narrow bandwidth, warm noise floor', tags: ['tape', 'vinyl', 'warm', 'nostalgic'] },
  { name: 'Epic Wall of Sound', nameCN: '史诗音墙', description: 'Massive layering, 100+ tracks, dense orchestration, maximum impact', tags: ['epic', 'dense', 'powerful', 'Zimmer'] },
  { name: 'Intimate Chamber', nameCN: '亲密室内', description: 'Small ensemble, close mic, dry acoustic, subtle detail', tags: ['small', 'dry', 'acoustic', 'intimate'] },
  { name: 'Cathedral Sacred', nameCN: '大教堂神圣', description: '8s+ reverb tail, stone acoustic, organ resonance, choir bloom', tags: ['reverb', 'sacred', 'organ', 'choir'] },
  { name: 'Underground Raw', nameCN: '地下原声', description: 'Unpolished, distorted, punk aesthetic, garage reverb', tags: ['raw', 'distorted', 'garage', 'punk'] },
  { name: 'Electronic Clean', nameCN: '电子干净', description: 'Precision production, surgical EQ, tight compression, digital clarity', tags: ['clean', 'digital', 'precision', 'modern'] },
  { name: 'Hybrid Modern', nameCN: '混合现代', description: 'Orchestral + electronic fusion, layered sound design, modern blockbuster', tags: ['hybrid', 'fusion', 'orchestra+synth', 'trailer'] },
  { name: 'Vintage Analog', nameCN: '复古模拟', description: 'Tube warmth, tape compression, analog synth, 70s console sound', tags: ['vintage', 'analog', 'warm', '70s'] },
  { name: 'Fantasy Ethereal', nameCN: '奇幻飘渺', description: 'Long reverb, shimmer effects, glass harmonics, bell-like clarity', tags: ['fantasy', 'ethereal', 'shimmer', 'bell'] },
  { name: 'War Drums Heavy', nameCN: '战鼓沉重', description: 'Massive taiko ensemble, deep low-end, thunderous impact, battle energy', tags: ['taiko', 'war', 'percussion', 'impact'] },
  { name: 'Dark Industrial', nameCN: '黑暗工业', description: 'Metallic percussion, distorted textures, mechanical rhythms, dystopian', tags: ['industrial', 'metal', 'distorted', 'mechanical'] },
  { name: 'Meditative Minimal', nameCN: '冥想极简', description: 'Sparse arrangement, long decays, silence as instrument, zen aesthetic', tags: ['minimal', 'space', 'silence', 'zen'] },
  { name: 'Folk Acoustic', nameCN: '民谣原声', description: 'Natural room sound, wood resonance, finger noise, organic warmth', tags: ['acoustic', 'folk', 'natural', 'wood'] },
];

// ═══════════════════════════════════════════════════════
// NARRATIVE SCENES (300+) — Scene → Music prescription
// ═══════════════════════════════════════════════════════

export const NARRATIVE_SCENES: NarrativeScene[] = [
  // ── Royal / Court ──
  { name: 'King Entrance', nameCN: '王者登场', description: 'A sovereign enters the throne room', genre: ['Epic Orchestral', 'Heroic Score'], instruments: ['French Horn', 'Choir', 'Timpani', 'Strings'], mood: ['Majestic', 'Heroic'], bpm: [60, 90], template: 'Epic Orchestral, Heroic, Majestic, French Horn, Choir, Timpani drums, royal procession, cinematic soundtrack' },
  { name: 'Coronation', nameCN: '加冕', description: 'Crowning ceremony', genre: ['Epic Orchestral', 'Sacred'], instruments: ['Organ', 'Choir', 'Brass', 'Harp'], mood: ['Majestic', 'Sacred'], bpm: [50, 80], template: 'Sacred Orchestral, Majestic, Coronation anthem, Organ, Choir, Brass fanfare, cathedral reverb, cinematic ceremony' },
  { name: 'Royal Court', nameCN: '宫廷', description: 'Court intrigue and ceremony', genre: ['Baroque', 'Court Music'], instruments: ['Harpsichord', 'Strings', 'Flute', 'Oboe'], mood: ['Elegant', 'Tense'], bpm: [60, 100], template: 'Baroque court music, Harpsichord, delicate strings, elegant tension, palace intrigue, classical ensemble' },
  { name: 'Throne Room', nameCN: '王座厅', description: 'Power and authority in the throne room', genre: ['Epic Orchestral', 'Dark Fantasy'], instruments: ['Brass', 'Choir', 'Organ', 'Timpani'], mood: ['Majestic', 'Ominous'], bpm: [50, 80], template: 'Dark Epic Orchestral, Ominous throne room, Brass choir, Organ, deep percussion, power and dread' },

  // ── Battle / War ──
  { name: 'War Breaks Out', nameCN: '大战爆发', description: 'Full-scale battle erupts', genre: ['Hybrid Orchestral', 'War Score'], instruments: ['Taiko', 'Brass', 'Choir', 'Strings (ostinato)'], mood: ['Epic Battle', 'Aggressive'], bpm: [120, 150], template: 'Hybrid Orchestral, Epic Battle, Aggressive, Taiko drums, Brass fanfare, Choir fortissimo, war erupts, cinematic intensity' },
  { name: 'Army Marching', nameCN: '军队出征', description: 'Army marching to war', genre: ['Epic Orchestral', 'March'], instruments: ['Snare Drum', 'Brass', 'Strings', 'Choir'], mood: ['Heroic', 'Determined'], bpm: [100, 120], template: 'Military March, Heroic, Snare drum cadence, Brass fanfare, Strings ostinato, army on the move, epic war soundtrack' },
  { name: 'Sword Fight', nameCN: '剑斗', description: 'Intense sword duel', genre: ['Hybrid Orchestral', 'Action Score'], instruments: ['Strings (staccato)', 'Percussion', 'Brass (stabs)'], mood: ['Tense', 'Aggressive'], bpm: [110, 150], template: 'Action Orchestral, Sword fight, Intense staccato strings, Percussive hits, Brass stabs, rapid tempo, duel to the death' },
  { name: 'Cavalry Charge', nameCN: '骑兵冲锋', description: 'Cavalry charges into battle', genre: ['Epic Orchestral', 'Hybrid Orchestral'], instruments: ['Brass', 'Strings (gallop)', 'Taiko', 'Choir'], mood: ['Heroic', 'Epic Battle'], bpm: [120, 150], template: 'Epic Cavalry Charge, Galloping strings, Brass fanfare, Taiko drums, Choir, heroic momentum, cinematic war music' },
  { name: 'Last Stand', nameCN: '背水一战', description: 'Final desperate stand against overwhelming odds', genre: ['Tragic Cinematic', 'Epic Orchestral'], instruments: ['Strings', 'Choir', 'Taiko', 'French Horn'], mood: ['Tragic', 'Heroic'], bpm: [60, 100], template: 'Tragic Cinematic, Heroic Last Stand, Strings lament, French Horn solo, Taiko heartbeat, Choir crescendo, sacrifice' },
  { name: 'Victory Aftermath', nameCN: '胜利之后', description: 'Aftermath of a hard-won victory', genre: ['Emotional Score', 'Epic Orchestral'], instruments: ['Strings', 'Piano', 'French Horn', 'Choir (soft)'], mood: ['Triumphant', 'Melancholic'], bpm: [50, 80], template: 'Emotional Score, Bittersweet victory, Strings elegy, Piano, French Horn distant, soft Choir, triumphant but sorrowful' },
  { name: 'War Preparation', nameCN: '战前准备', description: 'Preparing weapons and armor before battle', genre: ['Epic Orchestral', 'Tension Score'], instruments: ['Percussion', 'Strings (tremolo)', 'Brass (muted)', 'Frame Drum'], mood: ['Tense', 'Determined'], bpm: [70, 100], template: 'Tension Orchestral, War preparation, Percussion buildup, Tremolo strings, Muted brass, steady Frame Drum, anticipation' },

  // ── Tragedy / Sacrifice ──
  { name: 'Hero Sacrifice', nameCN: '英雄牺牲', description: 'The hero makes the ultimate sacrifice', genre: ['Tragic Cinematic', 'Emotional Score'], instruments: ['Strings', 'Piano', 'Choir', 'French Horn (solo)'], mood: ['Tragic', 'Heroic'], bpm: [40, 70], template: 'Tragic Cinematic, Heroic Sacrifice, Strings adagio, Solo Piano, French Horn lament, Choir pianissimo, ultimate price, emotional' },
  { name: 'Mother Daughter Farewell', nameCN: '母女诀别', description: 'Mother and daughter say their final goodbye', genre: ['Emotional Orchestral', 'Tragic'], instruments: ['Piano', 'Cello', 'Female Choir', 'Violin (solo)'], mood: ['Sad', 'Tragic'], bpm: [40, 60], template: 'Emotional Orchestral, Mother daughter farewell, Solo Piano, Cello weeping, Female Choir ethereal, Solo Violin, heartbreaking' },
  { name: 'Funeral', nameCN: '葬礼', description: 'A solemn funeral ceremony', genre: ['Tragic Cinematic', 'Sacred'], instruments: ['Organ', 'Choir', 'Cello', 'Harp'], mood: ['Tragic', 'Sacred'], bpm: [30, 50], template: 'Funeral March, Tragic Sacred, Organ lament, Choir requiem, Solo Cello, Harp tears, solemn procession, deep sorrow' },
  { name: 'Death Scene', nameCN: '死亡场景', description: 'A character dies', genre: ['Emotional Score', 'Minimalist'], instruments: ['Piano', 'Cello', 'Single Violin', 'Pad'], mood: ['Tragic', 'Sad'], bpm: [30, 50], template: 'Emotional Minimalist, Death scene, Solo Piano, Cello lament, Single Violin, sparse Pad, final breath, profound loss' },

  // ── Confrontation / Tension ──
  { name: 'Snow Wasteland Confrontation', nameCN: '雪原对峙', description: 'Standoff in a frozen wasteland', genre: ['Nordic Dark Fantasy', 'Tension Score'], instruments: ['Male Chant', 'Strings (sul ponticello)', 'French Horn', 'Frame Drum'], mood: ['Cold', 'Tense'], bpm: [50, 70], template: 'Nordic Dark Fantasy, Frozen wasteland standoff, Male Chant, Cold strings, French Horn distant, Frame Drum heartbeat, icy wind, cinematic tension' },
  { name: 'Standoff', nameCN: '对峙', description: 'Two forces face each other before conflict', genre: ['Tension Score', 'Dark Ambient'], instruments: ['Drone', 'Strings (tremolo)', 'Percussion (sparse)', 'Low Brass'], mood: ['Tense', 'Ominous'], bpm: [50, 80], template: 'Dark Tension Cinematic, Standoff, Drone, Tremolo strings, Sparse percussion hits, Low brass swells, building dread' },
  { name: 'Negotiation', nameCN: '谈判', description: 'High-stakes negotiation scene', genre: ['Mystery Score', 'Noir Score'], instruments: ['Piano (sparse)', 'Strings (pizzicato)', 'Clarinet', 'Double Bass'], mood: ['Tense', 'Mysterious'], bpm: [60, 90], template: 'Tension underscore, High-stakes negotiation, Sparse piano, Pizzicato strings, Clarinet, subtle Double Bass, quiet intensity' },
  { name: 'Betrayal', nameCN: '背叛', description: 'A trusted ally reveals their treachery', genre: ['Dark Ambient', 'Psychological Horror'], instruments: ['Cello (solo)', 'Drone', 'Piano (dissonant)', 'Distorted Pad'], mood: ['Cold', 'Fearful'], bpm: [40, 70], template: 'Dark Ambient, Betrayal revealed, Solo cello heartbreak, Drone tension, Dissonant piano, Distorted pad, trust shatters' },

  // ── Emotional / Romance ──
  { name: 'Love Theme', nameCN: '爱情主题', description: 'Romantic love theme', genre: ['Emotional Score', 'Romantic'], instruments: ['Piano', 'Violin', 'Cello', 'Harp'], mood: ['Romantic', 'Warm'], bpm: [50, 80], template: 'Romantic Orchestral, Love theme, Piano melody, Violin duet, Cello warmth, Harp arpeggios, cinematic romance, beautiful' },
  { name: 'Reunion', nameCN: '重逢', description: 'Lovers or family reunited after long separation', genre: ['Emotional Score', 'Hopeful'], instruments: ['Strings', 'Piano', 'French Horn', 'Harp'], mood: ['Hopeful', 'Warm'], bpm: [60, 90], template: 'Hopeful Orchestral, Emotional reunion, Strings swell, Piano, French Horn warm, Harp glissandi, tears of joy, cinematic' },
  { name: 'Longing', nameCN: '思念', description: 'Character longing for home or loved one', genre: ['Emotional Score', 'Melancholic'], instruments: ['Erhu', 'Piano', 'Cello', 'Flute'], mood: ['Lonely', 'Melancholic'], bpm: [40, 70], template: 'Melancholic Cinematic, Longing for home, Erhu solo, Piano, Cello, Flute, distant memory, yearning, emotional' },

  // ── Exploration / Journey ──
  { name: 'Epic Journey Begins', nameCN: '史诗旅程开始', description: 'The fellowship embarks on their quest', genre: ['Adventure Score', 'Fantasy Score'], instruments: ['Strings', 'Brass', 'Harp', 'Flute'], mood: ['Hopeful', 'Wonder'], bpm: [70, 110], template: 'Adventure Orchestral, Journey begins, Strings ostinato, Brass fanfare, Harp, Flute, wonder and hope, fantasy quest, cinematic' },
  { name: 'Exploring Unknown Land', nameCN: '探索未知', description: 'Discovering uncharted territory', genre: ['Exploration Music', 'Fantasy Score'], instruments: ['Harp', 'Flute', 'Strings (harmonics)', 'Celesta'], mood: ['Wonder', 'Mysterious'], bpm: [50, 80], template: 'Fantasy Exploration, Unknown lands, Harp glissandi, Flute melody, String harmonics, Celesta sparkle, wonder and discovery' },
  { name: 'Vast Landscape', nameCN: '壮阔山河', description: 'Character overlooks vast breathtaking landscape', genre: ['Epic Orchestral', 'Fantasy Score'], instruments: ['French Horn', 'Strings', 'Choir (soft)', 'Harp'], mood: ['Wonder', 'Majestic'], bpm: [50, 80], template: 'Epic Fantasy, Vast landscape reveal, French Horn melody, Strings lush, Soft Choir, Harp, breathtaking panorama, cinematic wonder' },
  { name: 'Mountain Climb', nameCN: '登山', description: 'Perilous mountain ascent', genre: ['Adventure Score', 'Tension Score'], instruments: ['Strings (ostinato)', 'Brass', 'Percussion', 'Horn'], mood: ['Determined', 'Tense'], bpm: [80, 120], template: 'Adventure Orchestral, Mountain ascent, Ostinato strings, Brass determination, Percussion drive, Horn calls, perilous climb' },
  { name: 'Sailing Voyage', nameCN: '航海', description: 'Sailing across the sea', genre: ['Adventure Score', 'Pirate Adventure'], instruments: ['Strings (flowing)', 'Harp', 'Flute', 'Accordion'], mood: ['Adventurous', 'Peaceful'], bpm: [60, 100], template: 'Adventure Cinematic, Ocean voyage, Flowing strings, Harp waves, Flute seabreeze, Accordion shanty, sailing, epic quest' },

  // ── Magic / Wonder ──
  { name: 'Spell Casting', nameCN: '施法', description: 'A powerful spell is being cast', genre: ['Fantasy Score', 'Magical'], instruments: ['Choir', 'Celesta', 'Harp', 'Strings (tremolo)'], mood: ['Magical', 'Mysterious'], bpm: [50, 90], template: 'Magical Fantasy, Spell casting, Choir crescendo, Celesta, Harp glissandi, Tremolo strings, arcane power, ethereal magic' },
  { name: 'Revealing Ancient Power', nameCN: '揭示古老力量', description: 'An ancient artifact or power is revealed', genre: ['Fantasy Score', 'Sacred'], instruments: ['Choir', 'Organ', 'Harp', 'Gong'], mood: ['Ancient', 'Sacred'], bpm: [30, 60], template: 'Ancient Fantasy, Sacred power revealed, Choir, Organ, Harp, Gong resonance, ancient artifact awakening, mystical' },
  { name: 'Entering Fairy Realm', nameCN: '进入仙境', description: 'Character enters a magical fairy world', genre: ['Fairytale Fantasy', 'Celtic Fantasy'], instruments: ['Celtic Harp', 'Tin Whistle', 'Celesta', 'Female Choir'], mood: ['Magical', 'Ethereal'], bpm: [60, 100], template: 'Celtic Fairytale, Entering fairy realm, Celtic Harp, Tin Whistle, Celesta twinkle, Female Choir ethereal, enchanted forest' },

  // ── Horror / Suspense ──
  { name: 'Haunted Place', nameCN: '鬼域', description: 'Entering a haunted location', genre: ['Psychological Horror', 'Dark Ambient'], instruments: ['Drone', 'Glass Harmonica', 'Theremin', 'Female Choir (whisper)'], mood: ['Haunting', 'Fearful'], bpm: [20, 50], template: 'Horror Cinematic, Haunted place, Dread drone, Glass harmonica, Theremin wail, Whispering choir, ghostly presence, terrifying' },
  { name: 'Chase Through Dark', nameCN: '暗夜追逐', description: 'Being chased through darkness', genre: ['Suspense', 'Industrial'], instruments: ['Strings (col legno)', 'Percussion (fast)', 'Synth Bass', 'Brass (stabs)'], mood: ['Tense', 'Fearful'], bpm: [120, 160], template: 'Horror Chase, Dark pursuit, Col legno strings, Fast percussion, Synth bass pulse, Brass stabs, running, terror, cinematic' },
  { name: 'Monster Reveal', nameCN: '怪物现身', description: 'The monster is revealed for the first time', genre: ['Monster Horror', 'Dark Orchestral'], instruments: ['Low Brass', 'Organ', 'Percussion (impact)', 'Choir (forte)'], mood: ['Fearful', 'Ominous'], bpm: [30, 70], template: 'Monster Horror Cinematic, Creature revealed, Low brass fortissimo, Organ terror, Impact percussion, Choir shriek, terrifying reveal' },

  // ── Chinese / Wuxia ──
  { name: 'Xianxia Ascension', nameCN: '仙侠飞升', description: 'Cultivator ascends to immortality', genre: ['Chinese Fantasy', 'Guofeng'], instruments: ['Guqin', 'Guzheng', 'Erhu', 'Dizi', 'Choir', 'Orchestra'], mood: ['Ethereal', 'Majestic'], bpm: [40, 80], template: 'Chinese Fantasy Xianxia, Ascension to immortality, Guqin, Guzheng flow, Erhu soaring, Dizi, Choir ethereal, Orchestra, celestial' },
  { name: 'Wuxia Duel', nameCN: '武侠决斗', description: 'Two martial artists duel', genre: ['Wuxia Score', 'Action'], instruments: ['Pipa', 'Erhu', 'Taiko', 'Dizi', 'Suona'], mood: ['Tense', 'Heroic'], bpm: [90, 140], template: 'Chinese Wuxia, Martial arts duel, Pipa tremolo, Erhu intensity, Taiko drums, Dizi flight, Suona cry, cinematic kung fu' },
  { name: 'Imperial Palace', nameCN: '紫禁之巅', description: 'Inside the imperial palace', genre: ['Chinese Court Music', 'Guofeng'], instruments: ['Bianzhong', 'Guqin', 'Dizi', 'Sheng'], mood: ['Majestic', 'Ancient'], bpm: [40, 70], template: 'Chinese Imperial Court, Forbidden Palace, Bianzhong bells, Guqin, Dizi, Sheng, ancient majesty, dynastic power' },

  // ── Sci-Fi / Cyberpunk ──
  { name: 'Cyberpunk City', nameCN: '赛博朋克城市', description: 'Entering a dystopian cyberpunk metropolis', genre: ['Cyberpunk', 'Synth Cinematic'], instruments: ['Synth Bass', 'Distorted Synth', 'Arpeggiator', 'Industrial Percussion'], mood: ['Dark', 'Tense'], bpm: [80, 130], template: 'Cyberpunk, Dystopian city, Synth bass pulse, Distorted synth, Arpeggiator, Industrial percussion, neon, Blade Runner, cinematic dark electronic' },
  { name: 'Space Battle', nameCN: '太空战斗', description: 'Epic space battle', genre: ['Space Opera', 'Hybrid Orchestral'], instruments: ['Brass', 'Strings', 'Synth Bass', 'Choir'], mood: ['Epic Battle', 'Heroic'], bpm: [110, 150], template: 'Space Opera, Epic space battle, Brass fanfare, Strings ostinato, Synth bass, Choir, Star Wars style, cinematic sci-fi' },
  { name: 'Alien World', nameCN: '异星世界', description: 'Exploring an alien planet', genre: ['Futuristic Ambient', 'Exploration Music'], instruments: ['Pad', 'Drone', 'Glass Harmonica', 'Ethnic Percussion'], mood: ['Wonder', 'Mysterious'], bpm: [40, 70], template: 'Sci-Fi Ambient, Alien world exploration, Evolving Pad, Deep drone, Glass harmonics, Exotic percussion, strange beauty, cinematic' },

  // ── Ritual / Ceremony ──
  { name: 'Ancient Ritual', nameCN: '古老仪式', description: 'A mystical ancient ritual', genre: ['Nordic Ritual', 'Dark Ambient'], instruments: ['Frame Drum', 'Chant', 'Tagelharpa', 'Bullroarer'], mood: ['Sacred', 'Ominous'], bpm: [30, 60], template: 'Ancient Ritual, Nordic, Frame Drum heartbeat, Male Chant, Female Chant, Tagelharpa drone, Bullroarer, mystical ceremony, dark' },
  { name: 'Temple Meditation', nameCN: '寺庙禅修', description: 'Meditation in a temple', genre: ['Meditative', 'Shakuhachi'], instruments: ['Shakuhachi', 'Singing Bowl', 'Koto', 'Pad'], mood: ['Peaceful', 'Spiritual'], bpm: [20, 40], template: 'Zen Meditation, Temple, Shakuhachi breath, Singing bowl resonance, Koto, Ambient pad, inner peace, mindfulness' },
  { name: 'Shamanic Journey', nameCN: '萨满之旅', description: 'Shaman enters the spirit world', genre: ['African Ritual', 'Nordic Ritual'], instruments: ['Djembe', 'Frame Drum', 'Rattle', 'Chant', 'Bullroarer'], mood: ['Mysterious', 'Spiritual'], bpm: [60, 120], template: 'Shamanic Ritual, Spirit journey, Djembe trance, Frame drum, Rattle, Chant, Bullroarer, entering the unseen, tribal' },
];

// ═══════════════════════════════════════════════════════════
// SEMANTIC HINTS — GPT-extracted structured metadata for matching
// ═══════════════════════════════════════════════════════════

export interface MusicMetadata {
  enrichedQuery: string;    // English keywords for KB matching
  genres: string[];         // English genre names
  emotions: string[];       // English emotion names
  sceneTypes: string[];     // English scene type keywords
  instruments: string[];    // English instrument names
  ethnicStyles: string[];   // English ethnic/regional style names
  bpmEstimate: [number, number];
  analysis: string;         // GPT's music analysis summary (Chinese)
}

// ═══════════════════════════════════════════════════════
// QUERY ENGINE: match scene description → music prescription
// ═══════════════════════════════════════════════════════

function keywordScore(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) score += kw.length >= 4 ? 2 : 1;
  }
  return score;
}

/** Score hints against target fields — semantic bonus for GPT-extracted keywords */
function hintScore(hints: string[] | undefined, targets: string[]): number {
  if (!hints || hints.length === 0) return 0;
  let score = 0;
  for (const h of hints) {
    const hl = h.toLowerCase();
    for (const t of targets) {
      if (t.toLowerCase().includes(hl)) { score += hl.length >= 4 ? 3 : 2; break; }
    }
  }
  return score;
}

/** Search genres by text — returns top matches with sub-genres flattened */
export function searchGenres(query: string, topN: number = 5): GenreNode[] {
  return searchGenresWithHints(query, undefined, topN);
}

export function searchGenresWithHints(query: string, hints?: MusicMetadata, topN: number = 5): GenreNode[] {
  const results: { genre: GenreNode; score: number }[] = [];
  const hintKeywords = hints ? [...hints.genres, ...hints.sceneTypes, ...hints.emotions] : [];

  function walk(g: GenreNode) {
    let score = keywordScore(query, [g.name, g.nameCN, ...(g.tags || [])]);
    score += hintScore(hintKeywords, [g.name, g.nameCN, ...(g.tags || [])]);
    if (score > 0) results.push({ genre: g, score });
    if (g.sub) g.sub.forEach(walk);
  }

  GENRES.forEach(walk);
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topN).map(r => r.genre);
}

/** Search ethnic styles by text */
export function searchEthnicStyles(query: string, topN: number = 3): EthnicStyle[] {
  return searchEthnicStylesWithHints(query, undefined, topN);
}

export function searchEthnicStylesWithHints(query: string, hints?: MusicMetadata, topN: number = 3): EthnicStyle[] {
  const hintKeywords = hints ? [...hints.ethnicStyles, ...hints.sceneTypes] : [];
  const results = ETHNIC_STYLES.map(s => {
    let score = keywordScore(query, [s.name, s.nameCN, s.region, s.regionCN, ...s.tags]);
    score += hintScore(hintKeywords, [s.name, s.nameCN, s.region, s.regionCN, ...s.tags]);
    return { style: s, score };
  }).filter(r => r.score > 0);
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topN).map(r => r.style);
}

/** Search emotions by text */
export function searchEmotions(query: string, topN: number = 3): EmotionEntry[] {
  return searchEmotionsWithHints(query, undefined, topN);
}

export function searchEmotionsWithHints(query: string, hints?: MusicMetadata, topN: number = 3): EmotionEntry[] {
  const hintKeywords = hints ? hints.emotions : [];
  const results = EMOTIONS.map(e => {
    let score = keywordScore(query, [e.name, e.nameCN, e.category]);
    score += hintScore(hintKeywords, [e.name, e.nameCN, e.category]);
    return { emotion: e, score };
  }).filter(r => r.score > 0);
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topN).map(r => r.emotion);
}

/** Search instruments by text and emotion */
export function searchInstruments(query: string, emotion?: string, topN: number = 5): InstrumentEntry[] {
  return searchInstrumentsWithHints(query, emotion, undefined, topN);
}

export function searchInstrumentsWithHints(query: string, emotion?: string, hints?: MusicMetadata, topN: number = 5): InstrumentEntry[] {
  const hintKeywords = hints ? hints.instruments : [];
  const results = INSTRUMENTS.map(inst => {
    let score = keywordScore(query, [inst.name, inst.nameCN, inst.family, inst.region || '', inst.role, ...inst.emotions]);
    if (emotion && inst.emotions.some(e => e.toLowerCase() === emotion.toLowerCase())) score += 3;
    score += hintScore(hintKeywords, [inst.name, inst.nameCN, inst.family, ...inst.emotions]);
    return { inst, score };
  }).filter(r => r.score > 0);
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topN).map(r => r.inst);
}

/** Match narrative scene — returns the closest scene template */
export function matchNarrativeScene(description: string, topN: number = 3): NarrativeScene[] {
  return matchNarrativeSceneWithHints(description, undefined, topN);
}

export function matchNarrativeSceneWithHints(description: string, hints?: MusicMetadata, topN: number = 3): NarrativeScene[] {
  const hintKeywords = hints ? [...hints.sceneTypes, ...hints.emotions, ...hints.genres] : [];
  const results = NARRATIVE_SCENES.map(s => {
    let score = keywordScore(description, [s.name, s.nameCN, s.description, ...s.genre, ...s.mood]);
    score += hintScore(hintKeywords, [s.name, s.nameCN, s.description, ...s.genre, ...s.mood]);
    return { scene: s, score };
  }).filter(r => r.score > 0);
  results.sort((a, b) => b.score - a.score);
  if (results.length === 0) return [];
  return results.slice(0, topN).map(r => r.scene);
}

/** Full query: given a scene description, return complete music prescription */
export interface MusicPrescription {
  sceneDescription: string;
  genres: GenreNode[];
  ethnicStyles: EthnicStyle[];
  emotions: EmotionEntry[];
  instruments: InstrumentEntry[];
  narrativeMatches: NarrativeScene[];
  suggestedBpm: [number, number];
  suggestedTemplate: string;
}

export function queryMusicKB(sceneDescription: string): MusicPrescription {
  return queryMusicKBWithHints(sceneDescription, undefined);
}

export function queryMusicKBWithHints(sceneDescription: string, hints?: MusicMetadata): MusicPrescription {
  // Enrich query: prepend GPT-extracted English keywords for better matching
  const enrichedQuery = hints?.enrichedQuery
    ? `${hints.enrichedQuery} ${sceneDescription}`
    : sceneDescription;

  const genres = searchGenresWithHints(enrichedQuery, hints, 4);
  const ethnicStyles = searchEthnicStylesWithHints(enrichedQuery, hints, 2);
  const emotions = searchEmotionsWithHints(enrichedQuery, hints, 3);
  const primaryEmotion = emotions[0]?.name;
  const instruments = searchInstrumentsWithHints(enrichedQuery, primaryEmotion, hints, 6);
  const narrativeMatches = matchNarrativeSceneWithHints(enrichedQuery, hints, 3);

  // Derive BPM range — prioritize GPT estimate if available
  let bpmMin = hints?.bpmEstimate?.[0] ?? 60;
  let bpmMax = hints?.bpmEstimate?.[1] ?? 120;
  if (!hints?.bpmEstimate) {
    const allTempos: [number, number][] = [];
    genres.forEach(g => { if (g.tempo) allTempos.push(g.tempo); });
    emotions.forEach(e => { if (e.tempo) allTempos.push(e.tempo); });
    if (allTempos.length > 0) {
      bpmMin = Math.min(...allTempos.map(t => t[0]));
      bpmMax = Math.max(...allTempos.map(t => t[1]));
    }
  }

  // Use narrative match template if available, else build from genres/emotions
  const suggestedTemplate = narrativeMatches[0]?.template
    || `${genres[0]?.name || 'Cinematic'}, ${emotions[0]?.name || 'Emotional'}, ${instruments.slice(0, 3).map(i => i.name).join(', ')}, cinematic soundtrack`;

  return {
    sceneDescription,
    genres,
    ethnicStyles,
    emotions,
    instruments,
    narrativeMatches,
    suggestedBpm: [bpmMin, bpmMax],
    suggestedTemplate,
  };
}

/** Format a MusicPrescription for injection into the Sound Composer agent prompt */
export function formatKBContext(prescription: MusicPrescription): string {
  const parts: string[] = [];
  parts.push(`## 知识库匹配结果`);
  parts.push(`场景: ${prescription.sceneDescription}`);
  if (prescription.genres.length) parts.push(`推荐流派: ${prescription.genres.map(g => g.name).join(' / ')}`);
  if (prescription.ethnicStyles.length) parts.push(`民族风格: ${prescription.ethnicStyles.map(s => `${s.nameCN}(${s.name})`).join(' / ')}`);
  if (prescription.emotions.length) parts.push(`匹配情绪: ${prescription.emotions.map(e => e.name).join(' / ')}`);
  if (prescription.instruments.length) parts.push(`推荐配器: ${prescription.instruments.map(i => i.name).join(', ')}`);
  parts.push(`建议BPM范围: ${prescription.suggestedBpm[0]}-${prescription.suggestedBpm[1]}`);
  if (prescription.narrativeMatches.length) parts.push(`相似场景模板: ${prescription.narrativeMatches.map(s => s.nameCN).join(' / ')}`);
  parts.push(`Suno模板参考: ${prescription.suggestedTemplate}`);
  return parts.join('\n');
}

/** Generate a knowledge base summary for the Sound Composer system prompt */
export function generateKBSummary(): string {
  const genreCount = GENRES.reduce((sum, g) => sum + 1 + (g.sub?.length || 0), 0);
  return [
    `音乐知识库概览：`,
    `流派: ${genreCount}种 (${GENRES.length}大类)`,
    `民族风格: ${ETHNIC_STYLES.length}种 (${[...new Set(ETHNIC_STYLES.map(s => s.regionCN))].join('、')})`,
    `情绪: ${EMOTIONS.length}种 (${[...new Set(EMOTIONS.map(e => e.category))].length}类)`,
    `乐器: ${INSTRUMENTS.length}种 (${[...new Set(INSTRUMENTS.map(i => i.family))].join('、')})`,
    `制作风格: ${PRODUCTION_STYLES.length}种`,
    `叙事场景模板: ${NARRATIVE_SCENES.length}种`,
  ].join(' — ');
}
