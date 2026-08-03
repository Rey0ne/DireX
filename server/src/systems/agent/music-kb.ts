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
    // ── House 子类补充 ──
    { name: 'Minimal Techno', nameCN: '极简科技舞曲', tempo: [125, 130], tags: ['stripped', 'hypnotic', 'Robert Hood', 'loop'] },
    { name: 'Dub Techno', nameCN: '回声科技', tempo: [120, 130], tags: ['dub chord', 'tape delay', 'Basic Channel', 'deep'] },
    { name: 'Acid House', nameCN: '酸性浩室', tempo: [120, 130], tags: ['TB-303', 'squelch', 'Phuture', 'rave'] },
    { name: 'Tech House', nameCN: '科技浩室', tempo: [125, 128], tags: ['groove', 'minimal', 'underground', 'warehouse'] },
    { name: 'Progressive House', nameCN: '渐进浩室', tempo: [125, 130], tags: ['long build', 'cinematic', 'Sasha', 'atmospheric'] },
    { name: 'Electro House', nameCN: '电气浩室', tempo: [128, 130], tags: ['buzzing bass', 'big room', 'festival', 'Benny Benassi'] },
    { name: 'Bass House', nameCN: '贝斯浩室', tempo: [125, 128], tags: ['wobble bass', 'heavy', 'UK', 'drop'] },
    { name: 'Afro House', nameCN: '非洲浩室', tempo: [118, 125], tags: ['African percussion', 'tribal', 'soulful', 'organic'] },
    { name: 'Lo-Fi House', nameCN: '低保真浩室', tempo: [115, 125], tags: ['dusty', 'degraded', 'tape', 'vintage drum machine'] },
    { name: 'French House', nameCN: '法式浩室', tempo: [120, 128], tags: ['filtered disco', 'Daft Punk', 'sidechain', 'chic'] },
    { name: 'Nu-Disco', nameCN: '新迪斯科', tempo: [115, 125], tags: ['modern disco', 'funky bass', 'chic', 'velvet rope'] },
    { name: 'Electroclash', nameCN: '电子碰撞', tempo: [120, 135], tags: ['electro + punk', 'retro', 'edgy', 'fashion'] },
    // ── UK Bass 体系 ──
    { name: 'UK Garage', nameCN: '英式车库', tempo: [130, 135], tags: ['shuffled 2-step', 'swung hi-hats', 'chopped vocals', 'London'] },
    { name: '2-Step', nameCN: '两步', tempo: [130, 135], tags: ['syncopated kick', 'skipping beat', 'UKG', 'soulful'] },
    { name: 'Grime', nameCN: '污垢', tempo: [140, 140], tags: ['MC-driven', 'aggressive', 'eskibeat', 'Skepta'] },
    { name: 'Jungle', nameCN: '丛林', tempo: [160, 175], tags: ['Amen break', 'reggae sub-bass', 'ragga', 'UK rave'] },
    { name: 'Breakbeat', nameCN: '碎拍', tempo: [120, 140], tags: ['syncopated drums', 'Chemical Brothers', 'Fatboy Slim', 'big beat'] },
    { name: 'Phonk', nameCN: '冯克', tempo: [130, 150], tags: ['Memphis rap', 'distorted bass', 'cowbell', 'drift'] },
    // ── 全球电子 ──
    { name: 'Amapiano', nameCN: '南非钢琴', tempo: [110, 115], tags: ['log drum bass', 'jazzy chords', 'South Africa', 'soulful'] },
    { name: 'Baile Funk', nameCN: '巴西放克', tempo: [130, 140], tags: ['favela', 'Miami bass', 'Portuguese', 'raw'] },
    { name: 'Hardstyle', nameCN: '硬派', tempo: [150, 160], tags: ['distorted kick', 'reverse bass', 'euphoric', 'Defqon'] },
    { name: 'Gabber', nameCN: '加巴', tempo: [160, 200], tags: ['distorted 909', 'Dutch', 'Rotterdam', 'extreme'] },
    // ── 实验电子 ──
    { name: 'Glitch', nameCN: '故障音乐', tempo: [60, 120], tags: ['digital error', 'Oval', 'Alva Noto', 'micro-edit'] },
    { name: 'Deconstructed Club', nameCN: '解构俱乐部', tempo: [60, 160], tags: ['fragmented', 'Arca', 'SOPHIE', 'experimental beats'] },
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
    { name: 'Thrash Metal', nameCN: '鞭击金属', tempo: [120, 180], tags: ['fast', 'aggressive', 'Metallica', 'Slayer', 'riffs'] },
    { name: 'Death Metal', nameCN: '死亡金属', tempo: [120, 200], tags: ['growl vocal', 'blast beat', 'Morbid Angel', 'extreme'] },
    { name: 'Nu Metal', nameCN: '新金属', tempo: [80, 120], tags: ['rap + metal', 'Korn', 'Linkin Park', 'groove'] },
    { name: 'Metalcore', nameCN: '金属核', tempo: [120, 180], tags: ['hardcore + metal', 'breakdown', 'Killswitch Engage', 'screaming'] },
    { name: 'Industrial Metal', nameCN: '工业金属', tempo: [80, 140], tags: ['machine', 'distorted', 'Rammstein', 'mechanical'] },
    { name: 'Stoner Rock', nameCN: '石人摇滚', tempo: [60, 100], tags: ['fuzz', 'desert', 'Kyuss', 'heavy groove', 'psychedelic'] },
    { name: 'Shoegaze', nameCN: '盯鞋', tempo: [80, 120], tags: ['reverb wall', 'My Bloody Valentine', 'ethereal guitar', 'noise'] },
    { name: 'Grunge', nameCN: '垃圾摇滚', tempo: [100, 130], tags: ['Seattle', 'Nirvana', 'distorted', 'angst', '90s'] },
    { name: 'Krautrock', nameCN: '德国泡菜摇滚', tempo: [60, 120], tags: ['motorik beat', 'Neu!', 'Can', 'experimental', 'Kraftwerk'] },
    { name: 'Math Rock', nameCN: '数学摇滚', tempo: [80, 160], tags: ['odd time sigs', 'complex', 'tapping', 'angular'] },
    { name: 'Emo', nameCN: '情绪摇滚', tempo: [120, 180], tags: ['emotional', 'confessional', 'Jimmy Eat World', 'post-hardcore'] },
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
    { name: 'Hyperpop', nameCN: '超流行', tempo: [130, 160], tags: ['maximalist', 'glitchy', 'Charli XCX', '100 gecs', 'distorted'] },
    { name: 'Bedroom Pop', nameCN: '卧室流行', tempo: [60, 100], tags: ['DIY', 'lo-fi', 'intimate', 'home-recorded', 'Clairo'] },
    { name: 'Pop-Punk', nameCN: '流行朋克', tempo: [140, 200], tags: ['punk energy', 'pop melodies', 'Blink-182', 'Paramore'] },
    { name: 'Pop-Rock', nameCN: '流行摇滚', tempo: [80, 140], tags: ['pop melody', 'rock guitars', 'Maroon 5', 'Kelly Clarkson'] },
    { name: 'Country Pop', nameCN: '乡村流行', tempo: [70, 120], tags: ['country + pop', 'Taylor Swift', 'Shania Twain', 'crossover'] },
    { name: 'City Pop', nameCN: '城市流行', tempo: [80, 120], tags: ['Japanese 80s', 'funk/disco', 'Mariya Takeuchi', 'nostalgic'] },
    { name: 'Funk Pop', nameCN: '放克流行', tempo: [90, 120], tags: ['funky grooves', 'Bruno Mars', 'Prince', 'bass-driven'] },
    { name: 'R&B Pop', nameCN: '节奏蓝调流行', tempo: [70, 100], tags: ['R&B + pop', 'Beyoncé', 'The Weeknd', 'smooth'] },
    { name: 'Afro-Pop', nameCN: '非洲流行', tempo: [100, 120], tags: ['African rhythms', 'global', 'Burna Boy', 'upbeat'] },
    { name: 'Noise Pop', nameCN: '噪音流行', tempo: [80, 120], tags: ['melody + distortion', 'shoegaze', 'feedback', 'underground'] },
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
    { name: 'Grime (Hip-Hop)', nameCN: '英式污垢嘻哈', tempo: [140, 140], tags: ['UK MC', 'Stormzy', 'aggressive', 'eskibeat'] },
    { name: 'Gangsta Rap', nameCN: '匪帮说唱', tempo: [80, 100], tags: ['West Coast', 'N.W.A', 'street', 'G-funk'] },
    { name: 'Conscious Rap', nameCN: '意识说唱', tempo: [80, 100], tags: ['social commentary', 'Kendrick', 'Common', 'lyrical'] },
    { name: 'Alternative Hip-Hop', nameCN: '另类嘻哈', tempo: [70, 100], tags: ['experimental', 'Tyler the Creator', 'OutKast', 'genre-bending'] },
    { name: 'Instrumental Hip-Hop', nameCN: '器乐嘻哈', tempo: [80, 100], tags: ['beat tape', 'J Dilla', 'DJ Shadow', 'no vocals'] },
    { name: 'Crunk', nameCN: '旷克', tempo: [80, 100], tags: ['Southern', 'Lil Jon', 'hype', 'club'] },
    { name: 'Mumble Rap', nameCN: '模糊说唱', tempo: [120, 150], tags: ['triplet flow', 'Future', 'migrated', 'ad-libs'] },
    { name: 'Latin Trap', nameCN: '拉丁陷阱', tempo: [120, 140], tags: ['trap + reggaeton', 'Bad Bunny', 'Spanish', 'urban Latin'] },
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
    { name: 'Hard Bop', nameCN: '硬波普', tempo: [100, 160], tags: ['blues/gospel influence', 'Art Blakey', 'soulful', 'Horace Silver'] },
    { name: 'Soul Jazz', nameCN: '灵魂爵士', tempo: [80, 120], tags: ['organ trio', 'Jimmy Smith', 'groove', 'funky'] },
    { name: 'Nu Jazz', nameCN: '新爵士', tempo: [80, 130], tags: ['jazz + electronic', 'St Germain', 'Cinematic Orchestra', 'broken beat'] },
    { name: 'Acid Jazz', nameCN: '酸性爵士', tempo: [90, 110], tags: ['soul/funk + jazz', 'Jamiroquai', 'Brand New Heavies', 'groove'] },
    { name: 'Jazz-Hop', nameCN: '爵士嘻哈', tempo: [80, 100], tags: ['hip-hop beats + jazz', 'Nujabes', 'A Tribe Called Quest', 'lo-fi'] },
    { name: 'Spiritual Jazz', nameCN: '灵性爵士', tempo: [50, 100], tags: ['Coltrane', 'Pharoah Sanders', 'meditative', 'transcendent'] },
    { name: 'Jazz-Funk', nameCN: '爵士放克', tempo: [90, 120], tags: ['Herbie Hancock', 'Head Hunters', 'groove', 'electric'] },
    { name: 'Electro Swing', nameCN: '电子摇摆', tempo: [100, 130], tags: ['swing + EDM', 'Parov Stelar', 'vintage + modern', 'dance'] },
    { name: 'Jazz Noir', nameCN: '黑色爵士', tempo: [40, 70], tags: ['film noir', 'Bohren', 'slow', 'smoky', 'twin peaks'] },
    { name: 'Ethio-Jazz', nameCN: '埃塞俄比亚爵士', tempo: [60, 120], tags: ['Ethiopian scales', 'Mulatu Astatke', 'vibraphone', 'hypnotic'] },
    { name: 'Cape Jazz', nameCN: '开普爵士', tempo: [80, 120], tags: ['South African', 'Cape Town', 'Abdullah Ibrahim', 'township'] },
    { name: 'Post-Bop', nameCN: '后波普', tempo: [60, 160], tags: ['assimilates hard bop+modal+avant-garde', 'Wayne Shorter', '1960s', 'acoustic'] },
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

  // ── Fashion / Runway (TVC+秀场) ──
  { name: 'Fashion Runway', nameCN: '时尚秀场音乐', tempo: [100, 130], mood: ['confident', 'glamorous', 'edgy', 'sleek'], sub: [
    { name: 'Runway Deep House', nameCN: '秀场深浩室', tempo: [120, 124], tags: ['sleek', 'pulsating bass', 'sophisticated', 'Chanel', 'four-on-floor'] },
    { name: 'Runway Techno', nameCN: '秀场科技舞曲', tempo: [126, 130], tags: ['dark', 'industrial', 'Balenciaga', 'metallic', 'warehouse'] },
    { name: 'Runway Hyperpop', nameCN: '秀场超流行', tempo: [130, 160], tags: ['glitchy', 'distorted', 'rebellious', 'brat', 'Charli XCX'] },
    { name: 'Runway Electroclash', nameCN: '秀场电子碰撞', tempo: [120, 135], tags: ['edgy', 'retro-futuristic', 'Versace', 'bold'] },
    { name: 'Runway Afro-House', nameCN: '秀场非洲浩室', tempo: [110, 120], tags: ['tribal', 'global', 'Off-White', 'percussion', 'soulful'] },
    { name: 'Runway Nu-Disco', nameCN: '秀场新迪斯科', tempo: [115, 125], tags: ['chic', 'velvet-rope', 'Saint Laurent', 'filtered bass'] },
    { name: 'Runway Vogue Ballroom', nameCN: '秀场Vogue', tempo: [120, 125], tags: ['ballroom', 'fierce', 'whisper vocal', '90s house'] },
    { name: 'Runway Dark Cinematic', nameCN: '秀场暗黑电影', tempo: [60, 100], tags: ['art pop', 'ambient tension', 'McQueen', 'avant-garde'] },
    { name: 'Runway Minimal Luxury', nameCN: '秀场极简奢华', tempo: [60, 100], tags: ['sparse', 'glassy', 'high-end', 'Jil Sander', 'restraint'] },
    { name: 'Runway Jazz Noir', nameCN: '秀场黑色爵士', tempo: [40, 70], tags: ['smoky', 'noir', 'Dries Van Noten', 'slow burn'] },
  ]},

  // ── Avant-Garde / Experimental ──
  { name: 'Avant-Garde', nameCN: '先锋实验音乐', tempo: [20, 200], mood: ['experimental', 'dark', 'unsettling', 'abstract'], sub: [
    { name: 'Noise Music', nameCN: '噪音音乐', tempo: [30, 120], tags: ['pure noise', 'Merzbow', 'harsh', 'deconstructed beauty', 'Japanese'] },
    { name: 'Drone', nameCN: '持续音', tempo: [20, 60], tags: ['sustained tone', 'Sunn O)))', 'low frequency', 'ritualistic', 'immersive'] },
    { name: 'Musique Concrète', nameCN: '具象音乐', tempo: [20, 100], tags: ['tape collage', 'Pierre Schaeffer', 'found sound', 'acousmatic'] },
    { name: 'Electroacoustic', nameCN: '电声音乐', tempo: [20, 100], tags: ['academic', 'computer music', 'IRCAM', 'spatial'] },
    { name: 'Power Electronics', nameCN: '强电', tempo: [60, 120], tags: ['extreme noise', 'Whitehouse', 'confrontational', 'transgressive'] },
    { name: 'Industrial Noise', nameCN: '工业噪音', tempo: [80, 130], tags: ['Throbbing Gristle', 'machine', 'dystopian', 'metallic'] },
    { name: 'Sound Art', nameCN: '声音艺术', tempo: [10, 100], tags: ['installation', 'gallery', 'site-specific', 'conceptual'] },
    { name: 'Field Recording', nameCN: '田野录音', tempo: [10, 80], tags: ['nature', 'Chris Watson', 'phonography', 'environment'] },
    { name: 'Microsound', nameCN: '微声', tempo: [20, 80], tags: ['granular', 'microscopic', 'glitch particles', 'extreme quiet'] },
    { name: 'Plunderphonics', nameCN: '采样拼贴', tempo: [40, 120], tags: ['radical sampling', 'John Oswald', 'collage', 'copyright'] },
    { name: 'Dark Ambient Drone', nameCN: '黑暗氛围持续音', tempo: [20, 50], tags: ['Lustmord', 'deep space', 'cosmic horror', 'sub-bass'] },
    { name: 'Ritual Industrial', nameCN: '仪式工业', tempo: [50, 90], tags: ['tribal percussion', 'industrial noise', 'ceremony', 'pagan'] },
    { name: 'Lowercase', nameCN: '微小声学', tempo: [10, 50], tags: ['extreme quiet', 'Steve Roden', 'amplified silence', 'fragile'] },
    { name: 'Generative Music', nameCN: '生成音乐', tempo: [20, 120], tags: ['algorithmic', 'Brian Eno', 'autonomous', 'evolving system'] },
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

  // ── Fashion / Runway 情绪 ──
  { name: 'Glamorous', nameCN: '奢华', category: 'positive', intensity: 0.7, instruments: ['Synth Bass', 'String Pad', 'Clean Percussion', 'Whisper Vocal', 'Piano'], tempo: [100, 124] },
  { name: 'Confident', nameCN: '自信', category: 'positive', intensity: 0.8, instruments: ['Four-on-floor Kick', 'Bassline', 'Sharp Claps', 'Brass Stabs', 'Synth Lead'], tempo: [110, 130] },
  { name: 'Edgy', nameCN: '前卫', category: 'dark', intensity: 0.8, instruments: ['Distorted Synth', 'Industrial Percussion', 'Dissonant Pad', 'Metallic Hits', 'Noise'], tempo: [100, 140] },
  { name: 'Sleek', nameCN: '精致', category: 'ethereal', intensity: 0.4, instruments: ['Minimal Piano', 'Filtered Synth', 'Glassy Percussion', 'Soft Pad', 'Clean Bass'], tempo: [60, 100] },
  { name: 'Fierce', nameCN: '强势', category: 'action', intensity: 0.9, instruments: ['Heavy Bass', 'Aggressive Drums', 'Metallic Hits', 'Distorted Synth', 'Chant Vocal'], tempo: [120, 140] },
  { name: 'Seductive', nameCN: '魅惑', category: 'romantic', intensity: 0.6, instruments: ['Deep Bass', 'Breath Vocal', 'Slow Groove', 'Saxophone', 'Rhodes'], tempo: [60, 100] },

  // ── Advertising / TVC 情绪 ──
  { name: 'Upbeat', nameCN: '积极向上', category: 'positive', intensity: 0.7, instruments: ['Acoustic Guitar', 'Piano', 'Drums', 'Hand Claps', 'Glockenspiel'], tempo: [100, 130] },
  { name: 'Inspirational', nameCN: '激励人心', category: 'positive', intensity: 0.8, instruments: ['Strings', 'Piano', 'Brass', 'Choir', 'Drums'], tempo: [80, 120] },
  { name: 'Playful', nameCN: '俏皮趣味', category: 'positive', intensity: 0.5, instruments: ['Ukulele', 'Pizzicato Strings', 'Glockenspiel', 'Whistle', 'Accordion'], tempo: [90, 130] },
  { name: 'Sophisticated', nameCN: '成熟精致', category: 'ethereal', intensity: 0.4, instruments: ['Piano', 'Jazz Guitar', 'Double Bass', 'Brush Drums', 'Vibraphone'], tempo: [70, 100] },
  { name: 'Nostalgic', nameCN: '怀旧', category: 'ethereal', intensity: 0.5, instruments: ['Vintage Synth', 'Tape Piano', 'Vinyl Crackle', 'Lo-Fi Drums', 'Reverb Guitar'], tempo: [60, 90] },
  { name: 'Energetic', nameCN: '高能动感', category: 'action', intensity: 0.9, instruments: ['Distorted Bass', 'Fast Drums', 'Synth Lead', 'Brass', 'Electric Guitar'], tempo: [130, 160] },

  // ── 中国风情绪 (Chinese-style Emotions) ──
  { name: 'Chivalrous', nameCN: '侠义', category: 'epic', intensity: 0.8, instruments: ['Guqin', 'Erhu', 'Pipa', 'Dizi', 'Chinese Drum', 'Brass', 'Strings'], tempo: [70, 120] },
  { name: 'Zen', nameCN: '禅意', category: 'ethereal', intensity: 0.2, instruments: ['Shakuhachi', 'Singing Bowl', 'Guqin', 'Xiao', 'Pad', 'Water Drop FX'], tempo: [20, 50] },
  { name: 'Seductive-Demonic', nameCN: '妖冶', category: 'mystery', intensity: 0.7, instruments: ['Pipa (glissando)', 'Female Chant', 'Erhu', 'Frame Drum', 'Dissonant Synth', 'Middle Eastern Scale'], tempo: [50, 90] },
  { name: 'Homesick', nameCN: '乡愁', category: 'romantic', intensity: 0.5, instruments: ['Erhu', 'Xiao', 'Piano', 'Cello', 'Acoustic Guitar', 'Pad'], tempo: [40, 70] },
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

  // ── Fashion / Runway 制作风格 ──
  { name: 'Runway Ready', nameCN: '秀场标准', description: 'Tight 4/4 kick, deep hypnotic bassline, sharp claps, whispered/spoken vocals, heavy sidechain compression, long DJ-friendly intro/outro for model walking', tags: ['runway', 'four-on-floor', 'sidechain', 'whisper vocal', 'catwalk'] },
  { name: 'Luxury Minimal', nameCN: '极简奢华', description: 'Sparse arrangement with strategic negative space, glassy percussion, high-end algorithmic reverb, sophisticated restraint, every sound intentional', tags: ['minimal', 'luxury', 'glassy', 'reverb', 'high-end'] },
  { name: 'Industrial Catwalk', nameCN: '工业走秀', description: 'Metallic percussion, camera-shutter FX, heel-click rhythms, distorted textures, dark warehouse reverb, mechanical precision', tags: ['industrial', 'catwalk', 'metallic', 'distorted', 'mechanical'] },
  { name: 'Hyperpop Runway', nameCN: '超流行秀场', description: 'Maximalist production, glitchy edits, pitch-shifted vocals, explosive drop sections, internet-age energy, genre collision', tags: ['hyperpop', 'glitchy', 'maximalist', 'pitch-shift', 'internet'] },

  // ── Advertising / TVC 制作风格 ──
  { name: 'Commercial Clean', nameCN: '广告干净', description: 'Polished, radio-ready production, voice-over friendly mid-range, clear frequency separation, edit-friendly structure with 15s/30s/60s cut points', tags: ['clean', 'commercial', 'voice-over', 'polished', 'broadcast'] },
  { name: 'Brand Anthem', nameCN: '品牌颂歌', description: 'Emotional build from intimate to epic, cinematic orchestration, memorable melodic hook, brand identity baked into sonic DNA', tags: ['brand', 'anthem', 'cinematic', 'emotional', 'memorable'] },
  { name: 'Short-Form Social', nameCN: '短视频社交', description: 'Instant hook in first 2 seconds, loop-friendly, vertical-mix optimized, TikTok/Reels energy, trend-aware production', tags: ['short-form', 'TikTok', 'loop', 'hook', 'viral'] },
];

// ═══════════════════════════════════════════════════════
// NARRATIVE SCENES (300+) — Scene → Music prescription
// ═══════════════════════════════════════════════════════

export const NARRATIVE_SCENES: NarrativeScene[] = [
  // ═══════════════════════════════════════════════════
  // TVC / Advertising Scenes (8)
  // ═══════════════════════════════════════════════════
  { name: 'Product Reveal', nameCN: '产品揭幕', description: 'Dramatic product unveiling with building anticipation', genre: ['Cinematic Soundtrack', 'Epic Orchestral', 'Hybrid Orchestral'], instruments: ['Strings (tremolo)', 'Brass (crescendo)', 'Percussion (impact)', 'Synth Bass', 'Piano'], mood: ['Majestic', 'Inspirational'], bpm: [60, 120], template: 'Cinematic product reveal, Building anticipation, Tremolo strings crescendo, Brass fanfare reveal, Impact percussion, Epic but clean, 30-second broadcast mix, voice-over friendly' },
  { name: 'Brand Anthem', nameCN: '品牌大片', description: 'Emotional brand storytelling film, 60-90 seconds', genre: ['Emotional Score', 'Indie Folk', 'Cinematic Pop'], instruments: ['Piano', 'Acoustic Guitar', 'Strings', 'Light Percussion', 'Pad'], mood: ['Inspirational', 'Hopeful', 'Warm'], bpm: [70, 100], template: 'Brand anthem, Emotional storytelling, Piano + Acoustic Guitar intimate, Strings swell, Hopeful uplifting, Warm and human, Clean modern production, 60-second film version' },
  { name: 'Fast Montage', nameCN: '快节奏蒙太奇', description: 'Rapid-cut product montage, 15-30 seconds high energy', genre: ['Electropop', 'Future Bass', 'Dance Pop'], instruments: ['Synth Lead', 'Sharp Drums', 'Bass', 'Percussion', 'Vocal Chop'], mood: ['Energetic', 'Upbeat'], bpm: [120, 140], template: 'High-energy montage, Fast cuts, Electropop beat, Sharp percussion, Vocal chops, Synth lead hook, 15-second social cut, Gen Z energy' },
  { name: 'Lifestyle Showcase', nameCN: '生活方式展示', description: 'Warm, aspirational lifestyle footage with real moments', genre: ['Indie Pop', 'Folk Pop', 'Lo-Fi Hip-Hop'], instruments: ['Acoustic Guitar', 'Piano', 'Ukulele', 'Light Drums', 'Hand Claps'], mood: ['Warm', 'Upbeat', 'Joyful'], bpm: [90, 115], template: 'Lifestyle feel-good, Warm acoustic, Hand claps, Whistling melody, Real moments, Aspirational but relatable, Instagram-friendly, sunshine' },
  { name: 'Luxury Showcase', nameCN: '奢华质感', description: 'High-end product showcase with sophisticated elegance', genre: ['Runway Nu-Disco', 'Smooth Jazz', 'Neoclassical'], instruments: ['Piano', 'String Quartet', 'Clean Bass', 'Jazz Guitar', 'Glassy Percussion'], mood: ['Sophisticated', 'Sleek', 'Glamorous'], bpm: [60, 100], template: 'Luxury showcase, Sophisticated elegance, Piano + String Quartet, Clean minimal bass, Glassy percussion, Negative space, High-end restraint, Vogue editorial' },
  { name: 'Sports Action', nameCN: '运动动感', description: 'High-intensity sports or action product footage', genre: ['Phonk', 'Trap', 'Hybrid Orchestral'], instruments: ['Distorted Bass', 'Heavy Drums', 'Brass Stabs', 'Synth Lead', '808'], mood: ['Energetic', 'Aggressive', 'Fierce'], bpm: [130, 160], template: 'Sports action, High intensity, Phonk distortion, Heavy 808 drums, Brass stabs, Aggressive energy, Stadium-ready, motivational workout' },
  { name: 'Tech Reveal', nameCN: '科技新品', description: 'Futuristic tech product launch or feature demo', genre: ['Futuristic Ambient', 'Cyberpunk', 'Minimal Techno'], instruments: ['Synth Pad', 'Arpeggiator Synth', 'Clean Drums', 'Sub Bass', 'Glitch FX'], mood: ['Sleek', 'Mysterious', 'Confident'], bpm: [90, 120], template: 'Tech reveal, Futuristic clean electronic, Arpeggiator pulse, Glitch details, Minimal precision, Spatial audio feel, Apple-keynote energy, cutting-edge' },
  { name: 'Quirky Fun', nameCN: '趣味广告', description: 'Playful, humorous commercial with whimsical tone', genre: ['Indie Pop', 'Electro Swing', 'Baroque Pop'], instruments: ['Ukulele', 'Pizzicato Strings', 'Glockenspiel', 'Whistle', 'Accordion', 'Music Box'], mood: ['Playful', 'Joyful', 'Curious'], bpm: [90, 130], template: 'Quirky commercial, Playful pizzicato strings, Ukulele strum, Glockenspiel twinkle, Whistling hook, Wes Anderson whimsy, Funny but charming, 30-second spot' },

  // ═══════════════════════════════════════════════════
  // Fashion Runway Scenes (10)
  // ═══════════════════════════════════════════════════
  { name: 'Runway Opening', nameCN: '秀场开场', description: 'First model walks, setting the collection tone', genre: ['Runway Deep House', 'Runway Minimal Luxury'], instruments: ['Four-on-floor Kick', 'Deep Bass', 'Filtered Synth', 'Whisper Vocal', 'Sharp Claps'], mood: ['Sleek', 'Confident', 'Mysterious'], bpm: [118, 124], template: 'Runway opening, Anticipation builds, Deep house pulse, Whispered vocals, Filtered synth wash, First model entrance, Sophisticated tension, fashion week energy' },
  { name: 'Runway Peak', nameCN: '秀场高潮', description: 'Collection climax, statement pieces, finale energy', genre: ['Runway Techno', 'Runway Hyperpop'], instruments: ['Heavy Kick', 'Distorted Bass', 'Industrial Percussion', 'Synth Lead', 'Metallic Hits'], mood: ['Fierce', 'Edgy', 'Energetic'], bpm: [124, 130], template: 'Runway peak energy, Heavy four-on-floor, Distorted industrial bass, Metallic percussion hits, Glitchy synth stabs, Collection climax, Standing ovation moment, high fashion drama' },
  { name: 'Runway Finale', nameCN: '秀场谢幕', description: 'Designer bow, all models walk together, celebration', genre: ['Runway Nu-Disco', 'Runway Vogue Ballroom'], instruments: ['Piano', 'Strings', 'Disco Bass', 'Brass', 'Choir Pad', 'Hand Claps'], mood: ['Glamorous', 'Triumphant', 'Joyful'], bpm: [120, 128], template: 'Runway finale, Designer bow, Triumphant disco-house, String flourish, Brass fanfare, Hand claps, All models walk, Celebration moment, glamorous resolution' },
  { name: 'Avant-Garde Showcase', nameCN: '先锋展示', description: 'Experimental avant-garde collection on runway', genre: ['Noise Music', 'Industrial Noise', 'Deconstructed Club'], instruments: ['Distorted Synth', 'Metallic Percussion', 'Drone', 'Field Recording', 'Glitch'], mood: ['Edgy', 'Ominous', 'Haunting'], bpm: [60, 140], template: 'Avant-garde runway, Deconstructed beauty, Noise textures, Industrial percussion, Drone tension, Comme des Garçons energy, experimental fashion, challenging and bold' },
  { name: 'Romantic Collection', nameCN: '浪漫系列', description: 'Soft, ethereal, romantic collection showcase', genre: ['Dream Pop', 'Ambient', 'Neoclassical'], instruments: ['Harp', 'Strings', 'Piano', 'Female Choir', 'Celesta'], mood: ['Dreamy', 'Romantic', 'Ethereal'], bpm: [50, 80], template: 'Romantic runway, Ethereal dream pop, Harp glissandi, String quartet, Female choir whisper, Celesta sparkle, Valentino elegance, floating fabrics, soft focus beauty' },
  { name: 'Streetwear Drop', nameCN: '潮牌发布', description: 'Hype streetwear collection, urban energy, sneaker culture', genre: ['Trap', 'Phonk', 'Grime'], instruments: ['808 Bass', 'Heavy Drums', 'Vocal Samples', 'Distorted Synth', 'Hi-Hat Rolls'], mood: ['Fierce', 'Aggressive', 'Confident'], bpm: [130, 150], template: 'Streetwear drop, Hype energy, 808 sub-bass, Aggressive trap drums, Vocal sample chops, Sneaker culture, Supreme energy, Off-White attitude, urban runway' },
  { name: 'Resort Collection', nameCN: '度假系列', description: 'Cruise/resort collection, tropical elegance, sunshine', genre: ['Bossa Nova', 'Afro-House', 'Nu-Disco'], instruments: ['Acoustic Guitar', 'Marimba', 'Light Percussion', 'Steel Drums', 'Flute'], mood: ['Warm', 'Peaceful', 'Joyful'], bpm: [100, 118], template: 'Resort runway, Tropical elegance, Bossa nova groove, Marimba melody, Steel drum accents, Ocean breeze, Jacquemus sunshine, Mediterranean glamour, effortless chic' },
  { name: 'Menswear Sharp', nameCN: '男装精裁', description: 'Precision tailoring, sharp silhouettes, masculine elegance', genre: ['Runway Minimal Luxury', 'Jazz Noir', 'Synth Cinematic'], instruments: ['Piano (staccato)', 'Double Bass', 'Snare (crisp)', 'Synth Bass', 'Saxophone'], mood: ['Sophisticated', 'Confident', 'Sleek'], bpm: [90, 115], template: 'Menswear precision, Sharp tailoring, Staccato piano, Crisp snare, Jazz noir cool, Dior Men energy, masculine elegance, Savile Row attitude, refined power' },
  { name: 'Couture Grand', nameCN: '高定大秀', description: 'Haute couture grand presentation, extreme craftsmanship', genre: ['Epic Orchestral', 'Opera', 'Sacred'], instruments: ['Orchestra', 'Organ', 'Choir', 'Harp', 'Strings'], mood: ['Majestic', 'Sacred', 'Glamorous'], bpm: [40, 80], template: 'Haute couture, Grand opera house, Full orchestra, Organ resonance, Choir ethereal, Harp glissandi, Chanel Grand Palais, extreme craftsmanship, once-in-a-lifetime spectacle' },
  { name: 'After Party', nameCN: '秀后派对', description: 'Post-show celebration, DJ set, fashion crowd dancing', genre: ['Tech House', 'French House', 'Disco House'], instruments: ['Four-on-floor Kick', 'Funky Bass', 'Filtered Samples', 'Percussion', 'Vocal Loop'], mood: ['Energetic', 'Upbeat', 'Glamorous'], bpm: [124, 128], template: 'Fashion after-party, Tech house groove, Filtered disco sample, Funky bassline, Vocal loop, DJ energy, Bottega Veneta party, models dancing, champagne celebration' },

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

  // ── 中国风叙事场景 (Chinese-style Narrative Scenes) ──
  { name: 'Wuxia Combat', nameCN: '武侠打斗', description: 'Martial artists duel with fluid, acrobatic choreography', genre: ['Wuxia Score', 'Action', 'Chinese Music'], instruments: ['Pipa (tremolo)', 'Chinese Drum', 'Erhu', 'Dizi (staccato)', 'Gong', 'Suona'], mood: ['Tense', 'Heroic', 'Chivalrous'], bpm: [90, 140], template: 'Chinese Wuxia combat, Pipa tremolo sweep, Chinese Drum battle rhythm, Dizi staccato flight, Erhu intensity, Gong impact, Hu Weili style martial arts, cinematic kung fu' },
  { name: 'Xianxia Flying', nameCN: '仙侠御剑', description: 'Cultivator soaring through clouds on a flying sword', genre: ['Chinese Fantasy', 'Xianxia', 'Guofeng'], instruments: ['Guzheng (glissando)', 'Electronic Pad', 'Female Chant', 'Dizi', 'Harp', 'Celesta'], mood: ['Ethereal', 'Spiritual', 'Zen'], bpm: [40, 70], template: 'Chinese Xianxia flying sword, Guzheng glissando sweep, Electronic pad atmosphere, Female ethereal chant, Dizi floating melody, Celesta sparkle clouds, Sword and Fairy energy, weightless soaring' },
  { name: 'Street Market Life', nameCN: '市井烟火', description: 'Busy street market with vendors, crowds, and everyday warmth', genre: ['Chinese Folk', 'Acoustic', 'World Music'], instruments: ['Sanxian', 'Banhu', 'Erhu', 'Dizi', 'Ambient Crowd FX', 'Cooking Sounds'], mood: ['Warm', 'Playful', 'Nostalgic'], bpm: [80, 110], template: 'Chinese street market life, Sanxian plucked melody, Banhu rustic tone, Ambient crowd chatter, Cooking sizzle FX, Warm and lively, Everyday poetry in chaos, Wong Kar-wai Chungking Express energy' },
  { name: 'Imperial Court Ritual', nameCN: '宫廷仪式', description: 'Grand imperial ceremony — coronation, sacrifice, court assembly', genre: ['Chinese Court Music', 'Epic Orchestral', 'Sacred'], instruments: ['Bianzhong', 'Bianqing', 'Chinese Drum', 'Sheng', 'Guqin', 'Choir', 'Gong'], mood: ['Majestic', 'Sacred', 'Ancient'], bpm: [30, 60], template: 'Imperial Chinese court ritual, Bianzhong bronze bell resonance, Bianqing stone chime, Massive Chinese Drum procession, Sheng chord drone, Gong ceremonial impact, Tang Dynasty majesty, solemn and awe-inspiring' },
  { name: 'Cyber Wuxia', nameCN: '赛博武侠', description: 'Neon-lit dystopian city where ancient martial codes meet cybernetic future', genre: ['Cyberpunk', 'Chinese-style EDM', 'Synth Cinematic'], instruments: ['Guzheng (glitched)', '808 Bass', 'Erhu (distorted)', 'Synth Arp', 'Industrial Percussion', 'Dizi (pitched)'], mood: ['Edgy', 'Mysterious', 'Haunting'], bpm: [80, 130], template: 'Cyber Wuxia dystopia, Glitched Guzheng sample, 808 sub-bass rumble, Distorted Erhu wail, Industrial metallic percussion, Neon-lit ancient rooftops, Ghost in the Shell meets Crouching Tiger, tradition corrupted by technology' },
  { name: 'Rural Pastoral', nameCN: '乡村田园', description: 'Peaceful countryside — rice paddies, water buffalo, bamboo groves', genre: ['Chinese Folk', 'Ambient', 'Neoclassical'], instruments: ['Dizi', 'String Pad', 'Bird Song FX', 'Water Stream FX', 'Guzheng', 'Xiao', 'Piano'], mood: ['Peaceful', 'Serene', 'Homesick'], bpm: [30, 60], template: 'Chinese rural pastoral, Dizi distant melody, String pad horizon, Birdsong morning, Water stream gentle, Guzheng flowing arpeggio, Xiao lonely call, Tan Dun Crouching Tiger energy, timeless countryside, free rhythm' },
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

// ═══════════════════════════════════════════════════════
// 中国传统戏曲音乐 (Chinese Traditional Opera)
// ═══════════════════════════════════════════════════════

export const CHINESE_OPERA_KB = `## 中国传统戏曲音乐

### 戏曲种类表

| 剧种 | 声腔系统 | 年代 | 乐器 | 美学特征 | 适用场景 |
|------|---------|------|------|---------|---------|
| 京剧 | 皮黄腔 (西皮+二黄) | 清中期至今 | 京胡/月琴/三弦/板鼓/锣/钹 | 程式化/写意/脸谱/"三五步走遍天下" | 叙事高潮/冲突/仪式 |
| 昆曲 | 昆山腔 (水磨调) | 明至今 | 曲笛/笙/琵琶/三弦/板鼓 | "无声不歌无动不舞"/文人雅集/细腻缠绵 | 爱情/雅集/文人场景 |
| 秦腔 | 梆子腔 | 明至今 | 板胡/二胡/笛子/梆子/锣鼓 | 高亢激越/"吼秦腔"/粗犷悲壮 | 战场/悲壮/西北场景 |
| 越剧 | 尺调腔/弦下调 | 20世纪初至今 | 越胡/琵琶/扬琴/笛/板鼓 | 婉约/抒情/全女班传统/"中国歌剧" | 爱情/闺怨/江南场景 |
| 黄梅戏 | 黄梅调 | 清至今 | 高胡/二胡/笛/琵琶/锣鼓 | 清新质朴/田园/生活化/"天仙配" | 田园/爱情/乡村喜剧 |
| 豫剧 | 梆子腔(豫东/豫西) | 清至今 | 板胡/二胡/笙/唢呐/梆子 | 豪放/激越/气势磅礴/"谁说女子不如男" | 英雄/战争/中原场景 |
| 川剧 | 高腔/胡琴/弹戏/灯戏/昆腔 | 明清至今 | 盖板子/二胡/唢呐/锣鼓(帮腔) | 变脸/吐火/帮腔/喜剧精神/滚灯 | 喜剧/变脸/四川场景 |
| 评剧 | 落子腔 | 20世纪初至今 | 板胡/二胡/琵琶/笛子 | 俚俗/生活化/"一口叙说千古事" | 市井/平民生活/北方场景 |
| 粤剧 | 梆子+二黄+粤讴 | 清至今 | 高胡/二弦/扬琴/色士风/小提琴 | 文武兼备/华丽服饰/"南国红豆" | 宫廷/武侠/岭南场景 |

### 戏曲情绪配乐表

- 武场 (Battle): 打击乐密集 — 板鼓+大锣+铙钹 — 快速节奏型 — 适合: 战斗/追逐
- 文场 (Civil): 弦管为主 — 京胡/笛子 — 抒情/叙事 — 适合: 对话/独白/回忆
- 过场 (Transition): 小锣/梆子 — 短小过渡 — 适合: 场景切换/时间流逝

### 戏曲配器情感映射

- 京胡: 高亢/尖锐/戏剧性 — 适合紧张/冲突/悲愤
- 板鼓: 节奏控制/"戏曲指挥" — 掌控全剧速度
- 大锣: 震撼/仪式感 — 适合登场/高潮/战斗开场
- 铙钹: 激烈/冲突 — 适合武打/战斗
- 小锣: 轻快/诙谐 — 适合喜剧/过场
- 曲笛: 悠扬/缠绵 — 适合昆曲爱情场景
- 板胡: 激昂/悲壮 — 适合秦腔/豫剧战场`;`;

// ═══════════════════════════════════════════════════════
// 古风·国风电子 (Guofeng / Chinese-style Electronic)
// ═══════════════════════════════════════════════════════

export const GUOFENG_ELECTRONIC_KB = `## 古风·国风电子

### 古风 (Gu Feng — Ancient Wind)

五声音阶(宫商角徵羽)+电子节拍+民乐采样(古筝/笛/琵琶/二胡)。
流行于B站/抖音，是当代中国青年文化的重要组成部分。
代表人物: 银临/音频怪物/河图/小曲儿/双笙/HITA

- 典型配器: 古筝(主旋律)+琵琶(节奏)+笛子(间奏)+二胡(副歌)+电子鼓组+合成器pad
- 典型结构: 前奏(民乐散板)→主歌(电子节拍进入)→副歌(民乐+电子全开)→间奏(民乐solo)→尾声(渐弱)
- 适用: 仙侠/武侠/古装短剧/国风MV/汉服走秀

### 中国风电音 (Chinese-style EDM)

东方旋律+西方舞曲架构。Trap/Dubstep/House 节奏+民乐hook。
代表人物: Howie Lee / Jason Hou / Dirty Class / 3ASiC / Radiax

- Chinese Trap: 808鼓组+二胡采样+京剧唱腔采样 — 暗黑+力量感
- Chinese Future Bass: 古筝lead+明亮和弦+future bass drop — 清新+梦幻
- Chinese House: 笛子loop+4/4 kick+渐进铺陈 — 适合秀场/时尚内容
- 适用: 时装秀/未来东方/赛博武侠/科技产品发布

### 新民族 (Neo-Folk)

原生态采样+电子氛围+世界音乐。彝族/蒙古/藏族/苗族原声+合成器。
代表人物: 山人乐队/杭盖/谭维维/HAYA乐团/二手玫瑰

- 蒙古元素: 呼麦+马头琴+电子节拍 — 辽阔/草原史诗
- 藏族元素: 诵经+法号+电子pad — 神圣/高原/仪式
- 苗族/彝族: 飞歌+芦笙+电子beat — 山野/活力/民族电子
- 适用: 民族题材/自然纪录片/文旅宣传/民族品牌

### 古风配器速查

- 弹拨: 古筝(流水感)/琵琶(颗粒感/扫弦)/古琴(散板/留白)/扬琴(清脆/快速)
- 拉弦: 二胡(如泣如诉)/京胡(高亢)/板胡(激昂)/高胡(明亮)
- 吹奏: 笛子(欢快/嘹亮)/箫(幽深/寂寞)/唢呐(热烈/悲壮)/笙(和声/仪式)
- 打击: 中国大鼓(震撼)/锣(仪式)/钹(冲突)/梆子(节奏)/木鱼(禅意)
- 电子: 808(sub bass)/合成器pad(氛围)/Arp(律动)/Glitch(赛博)`;`;

// ═══════════════════════════════════════════════════════
// 短视频音乐模式 (Short-Form Video Music Patterns)
// ═══════════════════════════════════════════════════════

export const SHORT_VIDEO_PATTERNS_KB = `## 短视频音乐模式 (Short-Form Video Music Patterns)

### Hook-First (15秒前奏→8秒高潮)

前15秒建立氛围→第16秒hook(高潮)→第24秒结束。典型: 副歌截取/loop循环。
- 结构: [0-15s 氛围铺垫] → [16-24s Hook高潮] → [结束]
- 适用: 抖音/Reels/Shorts 标准格式
- 制作要点: Hook必须在1.5秒内抓耳，旋律简单易记，低频突出(手机外放友好)

### Genre Switch (曲风突变)

A段抒情→B段突然Trap/Dubstep/808 — 反差制造记忆点。
- 典型: 钢琴抒情前20秒 → 突然808 Drop → 视觉反差配合
- 适用: 转场/反差/态度表达
- 制作要点: 过渡处用riser/filter sweep衔接，避免生硬

### Vocal Chop (人声切片)

采样人声→切片→重新编排节奏→作为hook。
- 来源: 经典台词/网络热梗/对话片段
- 处理: 切片+pitch shift+节奏量化+效果器(reverb/delay/bit crush)
- 适用: 潮流/态度/网感内容

### Speed Shift (变速)

原速→1.5x/2x加速→突然减速→反差。
- 典型: 正常→Nightcore加速→突然减至0.5x→恢复正常
- 适用: 教程/对比/时间流逝/情绪转换
- 制作要点: 保持音高or变速变调二选一

### Bass Drop (低音轰炸)

极简前奏→突然808 bass+失真 — 适合转场/高潮/视觉冲击。
- 结构: [极简铺垫(8s)] → [Bass Drop(4-8s)] → [能量持续(8s)]
- 制作要点: Drop前2秒做无声/极简留白增强冲击力
- 适用: 产品展示/视觉冲击/态度表达

### Emotional Swell (情绪爬升)

钢琴/弦乐单音→渐强→高潮→突然静默→标题卡。
- 结构: [单音起(2-4s)] → [爬升(6-8s)] → [高潮(4s)] → [静默(2s)] → [落版]
- 适用: 品牌大片/情感叙事/故事结尾
- 制作要点: 静默段的时长要刚好够观众读标题

### 短视频配乐黄金法则

- 前3秒决定留存 — Hook必须在3秒内出现
- 手机外放友好 — 混音时用手机检查低频和高频
- 循环无缝 — 15秒/30秒版本做完美循环
- 多版本输出 — 同一首做15s/30s/60s三个版本
- 视觉同步 — BPM与剪辑节奏对应：120BPM=0.5秒/拍，适合快剪`;`;
