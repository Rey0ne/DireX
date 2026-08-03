/* === Agent Pipeline — 4-Agent Orchestrator === */
/* Creative Producer → Art Director → Storyboard Director → Prompt Architect */

import { geminiChat, gpt5Chat, visionAnalyze } from '../ai/gemini.js';
import { analyzeScriptContext } from '../q/q-template-advisor.js';
import {
  CREATIVE_PRODUCER, ART_DIRECTOR, STORYBOARD_DIRECTOR, PROMPT_ARCHITECT, PROMPT_ANALYST,
  type AgentProfile,
} from './profiles.js';
import { FASHION_STYLE_DB, INTERIOR_STYLE_DB, STYLE_DECISION_RULES, FASHION_COORDINATION_DB, decideStyle, type DimensionInput, type StyleDecision } from './style-db.js';
import { planMusic, formatMusicPlanForPrompt } from './music-planner.js';
import { searchWritersKB, WRITERS_KB_CATALOG, KB_RETRIEVAL_PROMPT_SCRIPT } from './writers-kb.js';
import { VISUAL_KB_CATALOG } from './cinematography-kb.js';
import { INTERIOR_DESIGNERS_DB } from './spatial-kb.js';
import { getHistoricalKBForEra, buildEraAnachronismGuard } from './history-kb.js';
import { buildPhotorealismPrefix } from './photorealism-kb.js';

const MAX_PREV_OUTPUT_CHARS = 600; // tight summary of each previous agent output

// ─── 负面提示词（硬注入 userMessage，不经过系统提示词模板）───
// 目的：在剧本送到 GPT-5.4 之前就明确禁止廉价/工业感/低质服装
const NEGATIVE_CLOTHING = `## ⚠️ 角色服装品质红线（必须在输出中严格遵守）
所有角色的服装设计必须以「设计师品牌质感」为最低标准。以下元素在输出中绝对禁止出现，违者视为不合格：
- 廉价面料：涤纶反光感、化纤网纱、塑料纽扣、廉价蕾丝、尼龙、腈纶、劣质PU革
- 工装/劳动服：工装裤/工装夹克、劳保服、厂服、食堂围裙、快递/外卖制服、迷彩/军装元素
- 快时尚/超市服装：普通圆领T恤+牛仔裤组合、卫衣/帽衫、运动服/校服、POLO衫
- 低质视觉：荧光色/高饱和撞色、卡通印花/热转印图案、廉价水钻/塑料珠串、掉色金属配饰
- 邋遢/松垮：不修边幅、松垮无形、起球/褪色/缩水面料、不合身剪裁
- 暴发户式堆砌：同时出现3种以上高亮金属配饰、大面积亮片/烫钻、窗帘布质感印花
- 过时老气：中年商务西装套装（银行/保险/房产中介式）、厚底松糕鞋、廉价运动鞋、过于保守的及膝A字裙配肉色丝袜

✅ 替换原则（必须执行）：
涤纶→醋酸/铜氨丝/三醋酸 | 普通棉→丝光棉/长绒棉/有机棉/皮马棉 | 工装→机能剪裁/结构主义外套/工装风时装化处理 | 牛仔裤→垂感西裤/阔腿羊毛裤/修身皮裤/时装牛仔 | T恤→真丝衬衫/羊绒打底/雕塑感上衣/机能内搭 | 卫衣→精纺羊毛针织衫/开司米圆领衫 | PU革→植鞣革/小羊皮/麂皮 | 塑料纽扣→贝母扣/牛角扣/金属暗扣 | 廉价运动鞋/普通跑鞋/普通球鞋→老爹鞋/厚底运动鞋/复古跑鞋/时装球鞋/德训鞋/切尔西靴/乐福鞋/厚底德比鞋（优先选符合角色风格的鞋款，街头/潮流角色选老爹鞋或厚底运动鞋，精致/正式角色选皮鞋或靴类）

当代都市剧角色默认 = 独立设计师品牌 / 轻奢级别审美。非都市剧按时代和世界观匹配对应级别的最优面料与工艺。`;

// ─── 场景空间负面提示词 ──
const NEGATIVE_INTERIOR = `## ⚠️ 场景空间品质红线
所有场景空间设计必须以「设计感空间」为最低标准。以下元素绝对禁止：
- 裸露混凝土/锈蚀金属/未经处理的工业风（除非剧本明确要求废弃工厂/地下室）
- 廉价瓷砖/塑料地板革/劣质复合板
- 荧光灯管直射/惨白冷光/无层次平面光
- 空旷无物的房间/无窗帘裸窗/无装饰白墙
- 宜家基础款/廉租公寓质感/学生宿舍式布局
- 昏暗场景/弱自然光/过度依赖人工光源/无窗或小窗空间
- 除录音棚和摄影棚外，任何办公/工作室/起居空间不得昏暗封闭

## ☀️ 光线参考 — 阿尔瓦·阿尔托工作室 (Alvar Aalto Studio)
所有场景的光线处理必须参考阿尔瓦·阿尔托工作室的视觉特征：天窗+高侧窗引入间接自然光，白色墙面和浅木材质将光线漫反射至整个空间，通透明亮、温润均匀、无暗角。光不是"打"进来的，是"浸泡"在空间里的。

✅ 替换：混凝土→微水泥/艺术涂料/天然石材 | 大白墙→白色漫反射面 | 深色材质→浅木/浅灰保持光线反弹 | 昏暗场景→阿尔托式通透明亮浸泡光

【分时段】
- 清晨/上午：天光从高窗涌入，白色墙面漫反射让室内明亮均匀，可见所有细节
- 正午/午后：阳光强烈但不刺眼——天窗+百叶将直射光转化为柔和的大面积散射光，室内光照充沛
- 黄昏：金色低角度暖光，长投影增加层次但不降低整体亮度
- 夜间：仅此时人工光（暗藏灯带/暖色间接照明）成为主光源，仍保持北欧式温暖舒适可见度

【唯一例外】录音棚、摄影棚、暗房等专业空间可按需降光。其余一律通透。

✅ 替换：混凝土→微水泥/艺术涂料/天然石材 | 大白墙→白色艺术涂料漫反射面 | 深色材质→浅木/浅灰/白色保持光线反弹 | 昏暗场景→阿尔托式通透明亮浸泡光`;

// ─── KB 搜索引擎（纯代码，0ms）───
function searchFashionKB(query: string): string {
  const kws = query.toLowerCase().split(/[\s,，、]+/).filter(k => k.length > 1);
  if (!kws.length) return '';

  const dbs = [FASHION_STYLE_DB, FASHION_COORDINATION_DB];
  const scored: { text: string; score: number }[] = [];

  for (const db of dbs) {
    const sections = db.split(/\n(?=#{1,3}\s)/);
    for (const sec of sections) {
      const lower = sec.toLowerCase();
      let score = 0;
      for (const kw of kws) {
        if (lower.includes(kw)) score += kw.length; // longer match = higher score
        // Partial match bonus
        for (let i = 0; i <= kw.length - 2; i++) {
          if (lower.includes(kw.substring(i, i + 2))) score += 0.5;
        }
      }
      if (score > 0) scored.push({ text: sec.trim().slice(0, 800), score });
    }
  }

  // Deduplicate & sort
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const unique = scored.filter(s => {
    const key = s.text.slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique.slice(0, 6).map(s => s.text).join('\n\n---\n\n');
}

function searchInteriorKB(query: string): string {
  const kws = query.toLowerCase().split(/[\s,，、]+/).filter(k => k.length > 1);
  if (!kws.length) return '';

  const scored: { text: string; score: number }[] = [];
  const sections = INTERIOR_STYLE_DB.split(/\n(?=#{1,3}\s)/);
  for (const sec of sections) {
    const lower = sec.toLowerCase();
    let score = 0;
    for (const kw of kws) if (lower.includes(kw)) score += kw.length;
    if (score > 0) scored.push({ text: sec.trim().slice(0, 800), score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 4).map(s => s.text).join('\n\n---\n\n');
}

function searchSpatialKB(query: string): string {
  const kws = query.toLowerCase().split(/[\s,，、]+/).filter(k => k.length > 1);
  if (!kws.length) return '';

  const scored: { text: string; score: number }[] = [];
  // Split by table rows (## headings or | table rows)
  const sections = INTERIOR_DESIGNERS_DB.split(/\n(?=#{2,3}\s|\| )/);
  for (const sec of sections) {
    const lower = sec.toLowerCase();
    let score = 0;
    for (const kw of kws) if (lower.includes(kw)) score += kw.length;
    if (score > 0) scored.push({ text: sec.trim().slice(0, 800), score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 4).map(s => s.text).join('\n\n---\n\n');
}

// ─── KB 目录（给 GPT-5.4 看的"书架标签"）───
const KB_CATALOG = `## 📚 风格知识库目录（选择你需要检索的内容）

### 服装风格表（25种）
Classic / Minimalist / Streetwear / High Street / Baggy / Wide-Leg / Bohemian / Romantic / Grunge / Punk / Gothic / Preppy / Y2K / K-Pop / 新中式Guochao / Harajuku / Mori / Dark Academia / Cottagecore / Gorpcore / Cyberpunk / Gender-fluid / Balletcore / Contemporary Chic / Quiet Luxury / Eclectic Artist / French Chic / Italian Sprezzatura
→ 每种风格含：廓形 / 关键面料 / 配色 / 标志单品

### 设计师品牌深度关键词
- 欧洲：Hermès / Margiela / Dior / Saint Laurent / Celine / Schiaparelli / Jacquemus / Bottega Veneta / Jil Sander / Prada / Gucci / McQueen / Vivienne Westwood / Simone Rocha / Dries Van Noten
- 日本：Yohji / Rei Kawakubo / Issey Miyake / Junya Watanabe / Sacai / Undercover
- 韩国：Low Classic / Recto / EENK / Andersson Bell
- 北欧：Acne Studios / Totême
- 街头/潮牌：Fear of God / Off-White / Balenciaga / A-Cold-Wall* / CLOT / SACAI
- 高级质感：Hermès级安静奢华 / Margiela级解构 / Dries级诗意色彩 / Miu Miu级故意不完美 / Jil Sander级雕塑极简 / Lemaire级松弛优雅 / Bottega级Trompe l'œil

### 搭配核心法则
- 廓形黄金法则（一松一紧/内紧外松）
- 叠穿四级结构（Base→Mid→Outer→Detail）
- 面料轻重搭配（0轻/1中/2重，禁止2+2+2）
- 2026配色体系（低饱和柔雅/高饱和情绪/暖中性基底）
- 2026春夏软结构趋势（柔雾轻纱/垂坠上衣/软雕塑廓形）
- 日韩搭配法则（日式空气感层次/韩式素朴感）
- 艺术家反模式（禁止机能风/重工风/全身运动装/制服感）
- 季节默认（春夏轻量/秋冬中量/禁止默认冬装）

### 12时代×16地域×17场景×10氛围×15身份风格默认
每个维度有预设的服装风格、配色、面料、灯光方向

### 室内/建筑设计风格（38种）
Traditional / Modern / Mid-Century Modern / Minimalist / Scandinavian / Japandi / Industrial / Bohemian / Farmhouse / Coastal / French Country / Art Deco / Mediterranean / Organic Modern / Neo-Traditional / Warm Post-Minimalism / 新中式 / 日式传统 / 侘寂Wabi-Sabi / 韩式 / Afrohemian / Color Drenching / Bauhaus / Space Age / Brutalism / Gothic / Cyberpunk / Memphis / Streamline Moderne / Googie / 隈研吾(木格柵·粒子化) / 藤本壮介(内外消融·平台叠加) / 石上纯也(极致轻盈·柱林) / 西泽立卫(地形空间·无墙) / 坂茂(纸管建筑·材料诚实) / 西扎(白色混凝土·诗意现代) / 莫内欧(砖的叙事·考古层叠) / Mario Bellini(家具=建筑地形·意大利现代)
→ 每种风格含：空间特征 / 关键材质 / 配色 / 灯光氛围
→ 建筑光线大师参考：阿尔瓦·阿尔托工作室(天窗+高侧窗/漫反射) / SANAA金泽21世纪(极致透明·光溶解边界) / 伦佐·皮亚诺贝耶勒基金会(玻璃天花·百叶光控·天空碎片) / 卡洛·斯卡帕(天窗分级·水光折射·光如细节) / 路易斯·康(光与结构·神圣感) / 安藤忠雄(极简光影·狭缝光) / 彼得·卒姆托(氛围光·感官) / 路易斯·巴拉甘(色彩光线·厚墙深窗) / 大卫·奇普菲尔德(安静匀光·光井柱廊) / 隈研吾(木格柵滤光·粒子化光) / 石上纯也KAIT工房(305根细白钢柱·光穿透) / 妹岛和世劳力士学习中心(起伏地形·光漫游) / 文森特·范·杜伊森(光即建筑材料·玻璃幕墙漫射·温暖本质主义) / 雨果·托罗(暖色多层戏剧光·定制雕塑灯具·电影场景感) / 约里奥·库卡波罗(光改变情绪·模组化照明·功能主义诚实美学) / 北欧现代办公(全落地玻璃+暗藏灯带)
→ 另有：灯光设计速查(三层法则+灯具匹配+2026趋势)、材质速查(木材/石材/金属/织物)、空间配色心理学

### 🏛️ 建筑大师+室内设计师（150+事务所，按国家索引）← NEW
→ 室内设计师(按国家)：法国(21家) — Christian Liaigre / Jean-Louis Deniot / Gilles & Boissier / RDAI / Hugo Toro / India Mahdavi / Pierre Yovanovitch / Philippe Starck / Mathieu Lehanneur 等
→ 室内设计师(按国家)：意大利 — Studiopepe / Piero Lissoni
→ 室内设计师(按国家)：北欧/哥本哈根(8家) — Norm Architects / Space Copenhagen / Oliver Gustav Studio 等
→ 室内设计师(按国家)：荷兰(7家) — Studio Modijefsky / Piet Hein Eek / Studio Piet Boon 等
→ 室内设计师(按国家)：比利时 — Vincent Van Duysen / Nicolas Schuybroek
→ 室内设计师(按国家)：美国(5家) — Kelly Wearstler / Peter Marino / Charles & Ray Eames 等
→ 室内设计师(按国家)：英国(9家) — Ilse Crawford / Child Studio / Daytrip Studio / John Pawson 等
→ 室内设计师(按国家)：澳洲 — March Studio
→ 建筑大师(按国家)：日本(35位，含丹下健三/安藤忠雄/矶崎新/伊东丰雄/妹岛和世/隈研吾/藤本壮介/石上纯也 等) — 代际覆盖20世纪至今，含视觉签名+关键材质+空间特征
→ 建筑大师(按国家)：法国(7位) — Le Corbusier / Jean Nouvel / Lacaton & Vassal / Renzo Piano 等
→ 建筑大师(按国家)：瑞士(5位) — Herzog & de Meuron / Peter Zumthor / Valerio Olgiati / Christian Kerez
→ 建筑大师(按国家)：德国(8位) — Gropius / Mies van der Rohe / Frei Otto / David Chipperfield / GMP 等
→ 建筑大师(按国家)：英国(8位) — Norman Foster / Richard Rogers / Zaha Hadid / John Pawson / David Adjaye 等
→ 建筑大师(按国家)：西班牙(5位) — Gaudí / Calatrava / RCR / Frank Gehry / Ricardo Bofill
→ 建筑大师(按国家)：意大利(5位) — Renzo Piano / Aldo Rossi / Carlo Scarpa / Stefano Boeri / Fuksas
→ 建筑大师(按国家)：丹麦(5位) — Utzon / Bjarke Ingels(BIG) / Jan Gehl / Olafur Eliasson / Poul Henningsen
→ 建筑大师(按国家)：荷兰(4位) — Rem Koolhaas(OMA) / MVRDV / Wiel Arets / UNStudio
→ 建筑大师(按国家)：葡萄牙(2位) — Álvaro Siza / Souto de Moura
→ 建筑大师(按国家)：芬兰(2位) — Alvar Aalto / Juha Leiviskä
→ 建筑大师(按国家)：奥地利(4位) — Adolf Loos / Otto Wagner / Coop Himmelb(l)au
→ 建筑大师(按国家)：爱尔兰 — Grafton Architects(Yvonne Farrell & Shelley McNamara)
→ 建筑大师(按国家)：比利时(4位) — Victor Horta / Vincent Van Duysen / Axel Vervoordt / Philippe Samyn
→ 搜索方式：按国家名(日本/法国/北欧/丹麦/意大利...)、设计师名、风格关键词(极简/温暖/粗野/有机/侘寂...)检索
→ 每个设计师/事务所含：视觉签名 / 核心材质 / 配色倾向 / 空间特征

### 音乐/配乐知识库
→ 音乐流派(Genre)图谱：Epic Orchestral / Dark Ambient / Synthwave / Lo-Fi / Jazz Noir / Chinese Folk / Nordic Folk / Industrial / Classical / Post-Rock / Hyperpop / Phonk / Amapiano 等200+流派
→ 时尚秀场流派：Runway Deep House / Runway Techno / Runway Hyperpop / Runway Nu-Disco / Vogue Ballroom / Avant-Garde Noise 等
→ 先锋实验流派：Noise Music / Drone / Musique Concrète / Electroacoustic / Power Electronics / Glitch / Generative Music 等
→ 情绪词(Color)映射：Heroic / Melancholic / Tense / Romantic / Serene / Mysterious / Energetic / Glamorous / Confident / Edgy / Sleek / Sophisticated
→ 配器(Instrument)推荐：Strings / Brass / Woodwinds / Percussion / Synth / Ethnic Instruments / Electronic Textures
→ 民族风格(Ethnic)：Chinese Folk / Japanese Gagaku / Indian Classical / Middle Eastern / Celtic / Nordic / African
→ 电影作曲家风格参考库(95+位)：Hans Zimmer / John Williams / Ennio Morricone / 久石让 / 坂本龙一 / Max Richter / Ólafur Arnalds / Alexandre Desplat 等(SSS/SS/S/A 四级)
→ Hip-Hop/Rap制作人(20位)：J Dilla / Madlib / The Alchemist / DJ Premier / Pete Rock / RZA / Dr. Dre / Metro Boomin / Flying Lotus 等
→ K-Pop/C-Pop/J-Pop制作人(20位)：Teddy Park / Pdogg / 3RACHA / JJ Lin / Jay Chou / Cornelius / Yoko Kanno 等
→ 中国传统/戏曲作曲家(15位)：冼星海 / 贺绿汀 / 阿炳 / 谭盾 / 赵季平 / 陈其钢 / 黄霑 / 顾嘉辉 / 胡伟立 / 金复载 等
→ 中国独立/摇滚/电子(10位)：万能青年旅店 / 新裤子 / 痛仰 / 重塑雕像的权利 / 惘闻 等
→ 游戏配乐作曲家(16+位)：植松伸夫 / 近藤浩治 / 下村陽子 / 岡部啓一 / 祖堅正慶 / Mick Gordon / Austin Wintory 等
→ 当代实验/先锋作曲家(16+位)：Aphex Twin / William Basinski / Tim Hecker / Ryoji Ikeda / Arca / SOPHIE / Oneohtrix Point Never 等
→ 叙事场景→音乐映射：影视(Battle→Epic / Chase→Tension / Romance→Lush / Horror→Dissonance) + TVC(Product Reveal→Cinematic Build / Brand Anthem→Emotional / Sports→Phonk/Trap / Tech→Futuristic Minimal / Luxury→Sophisticated) + Runway(Opening→Deep House / Peak→Techno / Finale→Nu-Disco / Avant-Garde→Noise)
→ 中国传统戏曲音乐：京剧(皮黄腔)/昆曲(水磨调)/秦腔(梆子腔)/越剧/黄梅戏/豫剧/川剧/评剧/粤剧 — 各剧种声腔系统+乐器+美学特征+适用场景 + 武场(战斗)/文场(叙事)/过场(过渡)情绪配乐表
→ 古风·国风电子：古风(五声音阶+民乐采样+电子节拍) / 中国风电音(Chinese Trap/Future Bass/House) / 新民族(Neo-Folk·蒙古呼麦/藏族诵经/苗彝飞歌) — 配器速查(弹拨/拉弦/吹奏/打击/电子)
→ 短视频音乐模式：Hook-First(15s前奏→8s高潮) / Genre Switch(曲风突变) / Vocal Chop(人声切片) / Speed Shift(变速) / Bass Drop(低音轰炸) / Emotional Swell(情绪爬升) + 手机外放混音建议
→ 中国风情绪扩展：侠义(宫商调式·铜管齐奏) / 禅意(尺八·留白) / 妖冶(琵琶滑音·女声吟唱) / 乡愁(二胡·箫·慢板)
→ 中国风叙事场景扩展：武侠打斗(Pipa扫弦+战鼓) / 仙侠御剑(古筝滑音+电子pad) / 市井烟火(三弦+吆喝采样) / 宫廷仪式(编钟+大鼓) / 赛博武侠(古筝glitch+808) / 乡村田园(竹笛+鸟鸣) — 每个场景含完整Suno模板

${WRITERS_KB_CATALOG}

${VISUAL_KB_CATALOG}`;

// ─── KB 检索引导 prompt（服装/角色）───
const KB_RETRIEVAL_PROMPT = `你是一位顶级角色概念设计师。在分析剧本设计角色之前，上面是一个风格知识库的目录。
请先思考：这个剧本的时代/地域/场景/氛围/身份是什么样的？然后从知识库中选择你需要检索的 5-8 个具体方向。

输出格式（每行一个）：
关键词：简短说明用途

例如对于一部当代上海都市职场剧：
当代都市男装极简主义面料与廓形
新中式Guochao现代改良元素
Quiet Luxury配色与材质
French Chic不费力优雅搭配
意大利Sprezzatura松弛精裁
2026春夏软结构趋势
日韩东亚现代商务风格
轻奢配饰方向

请先给出你对剧本的简要风格判断（1-2句话），然后列出你需要检索的关键词。`;

// ─── KB 检索引导 prompt（室内/场景）───
const KB_RETRIEVAL_PROMPT_SCENE = `你是一位顶级场景概念设计师和室内建筑师。在分析剧本站设计场景之前，上面是一个风格知识库的目录。
请先思考：这个剧本的时代/地域/场景功能/氛围/角色身份是什么样的？然后从知识库中选择你需要检索的 5-8 个具体方向。

你需要重点考虑的维度：
- 时代背景（古代/近代/当代/未来？）→ 匹配对应时代建筑风格
- 地域文化（哪个国家/城市？）→ 匹配地域建筑传统 → 可直接查该国建筑大师/室内设计师表
- 场景类型（宫廷/办公/居住/街头/工业/自然？）→ 匹配场景功能风格
- 角色身份（富人/平民/艺术家/权力者？）→ 空间反映身份 → 可查对应定位的设计师（如奢侈旗舰→Peter Marino, 极简住宅→John Pawson）
- 灯光氛围（自然光/烛光/霓虹/荧光？）→ 匹配灯光设计
- 材质语言（木/石/金属/混凝土/玻璃？）→ 匹配材质速查

⚠️ 强烈建议：如果剧本地域明确（日本/法国/北欧/意大利...），优先查 🏛️ 建筑大师+室内设计师表，按国家检索该国最具代表性的建筑师/设计师——他们的视觉签名+材质+空间特征比抽象风格描述有用得多。

输出格式（每行一个）：
关键词：简短说明用途

例如对于一部 2049 年东京近未来都市剧：
Cyberpunk霓虹都市室内外
Space Age复古未来主义胶囊空间
隈研吾木格柵粒子化当代日式
石上纯也极致轻盈柱林开放空间
Warm Post-Minimalism温暖极简居住
灯光设计三层法则+2026趋势
空间配色心理学蓝绿色系
材质速查混凝土+微水泥+和紙

请先给出你对剧本空间场景的简要风格判断（1-2句话），然后列出你需要检索的关键词。`;

// ─── KB 检索引导 prompt（音乐/配乐）───
const KB_RETRIEVAL_PROMPT_MUSIC = `你是一位世界级音乐总监，精通全品类内容配乐——从TVC广告到时尚秀场，从品牌大片到影视剧。上面是一个音乐知识库的目录。
请先判断这个项目的内容类型（影视剧/TVC广告/时尚秀场/品牌大片/其他？），然后选择你需要检索的 5-8 个方向。

⚠️ 重要：大部分项目不是影视剧。请根据实际内容选择匹配的音乐方向，不要默认使用电影配乐。

关键维度：
- 内容类型：TVC(15s/30s/60s) / 秀场Runway / 品牌大片 / 影视剧 / 短视频(抖音/TikTok/Reels) / 其他 → 决定音乐框架
- 情绪基调：奢华/自信/前卫/强势/诱惑/冷酷/中性/松弛/能量/梦幻/宁静/神秘/侠义/禅意/妖冶/乡愁？
- 秀场方向：Runway Deep House / Runway Techno / Runway Hyperpop / Vogue Ballroom / Runway Nu-Disco / Luxury Minimal？
- TVC方向：Commercial Clean / 产品揭幕 / 生活方式 / 品牌调性 → voice-over友好？
- 短视频方向：Hook-First(15s前奏→8s高潮) / Genre Switch(曲风突变) / Vocal Chop(人声切片) / Speed Shift(变速) / Bass Drop / Emotional Swell？
- 中国风方向：中国传统戏曲(京剧/昆曲/秦腔/越剧...) / 古风(五声音阶+民乐) / 中国风电音(Chinese Trap/Future Bass/House) / 新民族(蒙古/藏族/苗彝)？
- 中国风情绪：侠义(英雄) / 禅意(冥想) / 妖冶(魅惑) / 乡愁(思乡)？
- 节奏：秀场120-128 BPM / TVC 100-120 BPM / 品牌大片90-120 BPM / 影视60-155 BPM / 短视频100-150 BPM(快节奏)或60-90 BPM(情感向)
- 配器：电子/合成器/真实乐器/实验噪音/混合/中国民乐(古筝/二胡/笛子/琵琶/京剧打击乐)？
- 先锋程度：商业/先锋/解构/噪音/极简？

输出格式（每行一个）：
关键词：简短说明用途

例如对于一个奢侈品牌TVC(30秒)：
Runway Nu-Disco秀场新迪斯科奢基调
Luxury Minimal极简奢华制作风格
Glamorous奢华+Sophisticated精致
Commercial Clean广告干净后期(voice-over友好)
Piano+String Quartet极简精致配器
BPM 108舒适节奏30秒快剪

例如对于一个先锋设计师秀场：
Runway Techno秀场科技舞曲工业能量
Industrial Catwalk工业走秀金属质感
Noise Music噪音音乐解构美学
Edgy前卫+Fierce强势情绪
Distorted Synth失真合成器+Metallic Percussion
BPM 124走秀黄金区

例如对于一个品牌大片(创意内容)：
Luxury Minimal极简奢华+Nu Jazz爵士温暖
Runway Deep House秀场深浩室奢华基调
Glamorous奢华+Confident自信+Sophisticated精致
Piano+Synth Bass+String Pad高级感配置
Balenciaga式暗黑极简or Maison Margiela式解构优雅

例如对于一部影视剧（仅限确实是影视内容时）：
Epic Orchestral史诗管弦战斗场景
Chinese Folk民族器乐宫廷仪式
Hans Zimmer式渐进层叠

例如对于一个古装仙侠短剧：
古风Gu Feng五声音阶+民乐采样侠义氛围
中国风电音Chinese Trap 808+二胡hook仙魔对抗
戏曲武场打击乐战斗场景
仙侠御剑古筝滑音+电子pad漂浮感
BPM 90-130仙侠动作节奏

例如对于一个抖音/TikTok短视频(30秒)：
短视频Hook-First模式前3秒抓耳
Genre Switch曲风突变钢琴转Trap制造反差
Bass Drop低音轰炸产品冲击力
Emotional Swell情绪爬升品牌结尾
手机外放友好混音+15/30秒双版本

例如对于一部京剧/戏曲题材微电影：
京剧皮黄腔西皮二黄京胡板鼓仪式感
戏曲武场打击乐战斗追逐冲突
戏曲文场弦管叙事独白回忆
昆曲水磨调曲笛缠绵文人雅集爱情
传统戏曲+现代电影配乐跨界融合

请先给出你对内容类型的判断（1-2句话），然后列出关键词。`;

// ─── Global Image Analysis Cache ─────────────────
// Avoids re-fetching + re-analyzing the same image URL across all pipelines
const imageFetchCache = new Map<string, { mimeType: string; base64: string } | null>();
const imageAnalysisCache = new Map<string, string>(); // url → analysis text
const MAX_CACHE_SIZE = 200; // prevent unbounded growth

export interface PipelineContext {
  userInput: string;
  model: string;
  mode?: string;
  referenceUrls?: string[];
  referencePrompts?: string[]; // original prompts of the referenced images
  referenceAnalysis?: string[]; // vision analysis results (Gemini 3.1 Pro)
  aspect?: string;
  resolution?: string;
}

export interface AgentResult {
  agentId: string;
  agentName: string;
  output: string;
  durationMs: number;
}

export interface PipelineResult {
  creativeBrief: string;
  visualBible: string;
  storyboard: string;
  modelPrompt: string;
  fullPromptOutput: string;
  trace: AgentResult[];
  totalDurationMs: number;
}

/** Optional callback fired after a pipeline completes. Fire-and-forget — exceptions are caught. */
export type PipelineOnComplete = (result: Record<string, unknown>) => void | Promise<void>;

const VISION_ANALYSIS_PROMPT = `Analyze this image as a cinematography reference. Be thorough and objective — describe EXACTLY what you see, don't interpret or beautify.

Describe in detail:
1. CAMERA: angle (low/high/eye-level, specify degrees if apparent), shot size (extreme close-up to extreme wide), lens feel (wide, normal, telephoto compression), depth of field (shallow/deep, what's in focus)
2. COMPOSITION: subject placement (rule of thirds, center, off-center), leading lines, framing elements, negative space, symmetry/asymmetry
3. LIGHTING: key light direction & quality (hard/soft), fill light, rim/backlight, contrast ratio (high-key/low-key), practical lights visible
4. COLOR: color temperature (warm/cool/neutral), dominant colors, color contrast, saturation level, any notable color grading
5. SUBJECT: what/who is the main subject, their pose/stance, where they're looking, their relative size in frame
6. ENVIRONMENT: setting description, foreground/midground/background elements, atmospheric conditions (fog, haze, dust, rain, snow)
7. MOOD & STYLE: visual tone, genre references, any distinctive stylistic choices

Output as structured paragraphs. Do NOT summarize in 2-3 sentences — include ALL observable details.`;

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  // Cache hit — skip re-fetch
  const cached = imageFetchCache.get(url);
  if (cached !== undefined) {
    if (cached) console.log('[vision] Fetch cache hit: ' + url.slice(0, 60));
    return cached;
  }
  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const result = { mimeType: match[1], base64: match[2] };
      if (imageFetchCache.size < MAX_CACHE_SIZE) imageFetchCache.set(url, result);
      console.log('[vision] Extracted data URL, length=' + match[2].length);
      return result;
    }
    console.log('[vision] Invalid data URL format');
    imageFetchCache.set(url, null);
    return null;
  }
  try {
    // Resolve relative URLs (e.g. /api/output/uploads/hash.png) to absolute.
    // Node.js fetch() requires an absolute URL; local paths would throw.
    if (url.startsWith('/')) {
      const port = process.env.PORT || '3001';
      url = `http://localhost:${port}${url}`;
    }
    console.log('[vision] Fetching image: ' + url.slice(0, 80));
    const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    const opts: any = {
      headers: { 'User-Agent': 'TapNow/1.0' },
    };
    if (proxy) {
      const { ProxyAgent } = await import('undici');
      opts.dispatcher = new ProxyAgent(proxy);
    }
    const resp = await fetch(url, opts);
    if (!resp.ok) { console.log('[vision] Fetch failed: HTTP ' + resp.status); return null; }
    const buffer = Buffer.from(await resp.arrayBuffer());
    const contentType = resp.headers.get('content-type') || 'image/png';
    console.log('[vision] Fetched image, size=' + buffer.length + ' type=' + contentType);
    const result = { mimeType: contentType, base64: buffer.toString('base64') };
    if (imageFetchCache.size < MAX_CACHE_SIZE) imageFetchCache.set(url, result);
    return result;
  } catch (err) {
    console.log('[vision] Fetch error: ' + String(err).slice(0, 100));
    if (imageFetchCache.size < MAX_CACHE_SIZE) imageFetchCache.set(url, null);
    return null;
  }
}

export async function analyzeReferenceImages(urls: string[]): Promise<string[]> {
  // Deduplicate — same URL in one batch only analyzed once
  const uniqueUrls = [...new Set(urls)];
  const results: string[] = [];
  for (let i = 0; i < uniqueUrls.length; i++) {
    const url = uniqueUrls[i];
    // Check analysis cache first
    if (imageAnalysisCache.has(url)) {
      console.log('[vision] Analysis cache hit: ' + url.slice(0, 60));
      results.push(imageAnalysisCache.get(url)!);
      continue;
    }
    console.log('[vision] Analyzing reference image ' + (i + 1) + '/' + uniqueUrls.length);
    const img = await fetchImageAsBase64(url);
    if (!img) { results.push('[Unable to fetch image]'); continue; }
    const analysis = await visionAnalyze(VISION_ANALYSIS_PROMPT, img.base64, img.mimeType);
    const result = analysis || '[Vision analysis failed]';
    if (imageAnalysisCache.size < MAX_CACHE_SIZE) imageAnalysisCache.set(url, result);
    results.push(result);
  }
  return results;
}

// ─── Direct GPT-5.6 Image → Prompt Reverse Engineering ───
// Single GPT-5.6 call: sees image → outputs reconstructed generation prompt.
// Replaces the old two-step approach (vision analysis → text → agent pipeline).
// GPT-5.6 Sol multimodal natively supports input_image, so the model
// directly "sees" the image rather than reading a text description of it.

const REVERSE_PROMPT_SYSTEM = `你是图像提示词反推专家。看到一张 AI 生成图或摄影作品，还原其原始生成提示词。

输出仅包含还原的中文提示词——自然语言画面描述，非关键词堆砌。必须覆盖：
- 主体外观与姿态（年龄/人种/发型/服装/配饰/表情/动作）
- 场景与环境细节（地点/时间/天气/氛围物质）
- 光线与影调（光源方向/色温/软硬/对比度）
- 色彩基调（主色调/辅助色/饱和度/色彩对比）
- 构图与视角（景别/角度/焦段/画面层次）
- 风格与质感（艺术风格/材质感/后期风格）

禁止输出：画质技术词(超高清/8K/4K/HDR/杰作/大师级等)、开场白、解释、英文关键词。
如果用户提供了额外上下文（如风格方向/角色名），融入上下文。直接输出提示词正文。`;

export async function reversePromptFromImages(
  imageUrls: string[],
  userContext?: string,
): Promise<string | null> {
  if (!imageUrls || imageUrls.length === 0) return null;

  // Download first image as base64 (GPT-5.6 multimodal needs data URL)
  const img = await fetchImageAsBase64(imageUrls[0]);
  if (!img) {
    console.log('[reverse-prompt] Failed to fetch image: ' + imageUrls[0].slice(0, 60));
    return null;
  }

  const dataUrl = `data:${img.mimeType};base64,${img.base64}`;
  const userMsg = userContext
    ? '根据这张图片和以下用户上下文，反推其生成提示词：\n' + userContext
    : '根据这张图片，反推其生成提示词';

  console.log('[reverse-prompt] Calling GPT-5.6 Sol for direct image→prompt...');
  const result = await gpt5Chat([
    { role: 'system', content: [{ type: 'input_text', text: REVERSE_PROMPT_SYSTEM }] },
    { role: 'user', content: [
      { type: 'input_text', text: userMsg },
      { type: 'input_image', image_url: dataUrl },
    ]},
  ], { effort: 'medium', timeoutMs: 120000, maxOutputTokens: 2000 });

  if (result) {
    console.log('[reverse-prompt] Result ' + result.length + ' chars: ' + result.slice(0, 120));
  } else {
    console.log('[reverse-prompt] No result from GPT-5.6');
  }
  return result;
}

// ─── Character Profile Extraction (I2I) ─────────
const CHARACTER_EXTRACT_PROMPT = `Analyze the person in this image with forensic detail. Be OBJECTIVE — describe what you actually see, not what you assume. If uncertain about any feature, say "unclear" rather than guessing.

FACE & HEAD:
- Face shape (oval, round, square, rectangular, heart, diamond, triangle) — describe the actual bone structure
- Forehead (high/low, wide/narrow, smooth/lined)
- Jawline (sharp/soft/angular/rounded, width)
- Cheekbones (prominent/flat, high/low)
- Brow ridge (prominent/subtle)
- Chin (pointed/rounded/square/cleft, projection)

EYES:
- Shape (almond/round/hooded/monolid/deep-set/protruding)
- Size relative to face
- Distance apart (close-set/wide-set/average)
- Color (blue/green/brown/hazel/grey — be specific)
- Eyelashes (long/short, thick/sparse)
- Eyebrows (thick/thin, straight/arched, color, distance from eyes)

NOSE:
- Bridge (high/low, wide/narrow, straight/hooked)
- Tip (pointed/rounded/bulbous/upturned)
- Nostrils (wide/narrow, visible/not)
- Overall size relative to face

MOUTH:
- Lip thickness (thin/medium/full — upper vs lower)
- Width (wide/narrow/average)
- Cupid's bow (defined/subtle)
- Corners (upturned/downturned/neutral)

SKIN:
- Tone (very pale/pale/fair/light tan/medium tan/olive/brown/dark — be specific)
- Undertones (cool/pink, warm/golden, neutral, olive)
- Texture (smooth/rough, visible pores, freckles, acne, scars)
- Any distinguishing marks (moles, beauty marks, scars, birthmarks) — explicit location on face
- Wrinkles or aging signs (forehead lines, crow's feet, nasolabial folds)

HAIR:
- Color (black/brown/blonde/red/grey/white — specify shade)
- Length (buzz cut/short/medium/long — approximate in cm)
- Texture (straight/wavy/curly/coily)
- Style (describe the actual style seen)
- Volume (thin/medium/thick)
- Hairline (straight/receding/widow's peak)
- Facial hair (clean shaven/stubble/light beard/full beard/mustache — describe exactly)

AGE: approximate range (e.g., 25-30, 40-45, 60-65) based on visible indicators

ETHNICITY/ANCESTRY: Describe the actual facial features you observe (e.g., "fair skin, high nasal bridge, deep-set round eyes, angular jaw, light brown wavy hair" rather than just labeling). Focus on the combination of features visible.

BODY (if visible):
- Build (slim/athletic/average/heavy — describe proportions)
- Shoulders (broad/narrow/average)
- Height appearance (short/average/tall — relative impression)
- Posture (erect/slouched/relaxed/tense)

CLOTHING (each visible garment, top to bottom):
- Type (jacket, shirt, dress, etc.)
- Color & pattern (be specific)
- Fabric & texture
- Fit (tight/regular/loose/oversized)
- Neckline or collar style
- Sleeves (long/short/none)
- Any visible logos, text, graphics, badges, patches — describe exactly
- Accessories (glasses, jewelry, watch, hat, scarf, belt, bag)

If there is NO person in the image, reply ONLY "NO_PERSON".
If there are MULTIPLE people, describe the most prominent/foreground person.`;

export interface CharacterProfile {
  hasPerson: boolean;
  description: string; // structured character description, or empty if no person
}

export async function extractCharacterProfile(url: string): Promise<CharacterProfile> {
  // Check analysis cache (prefixed to separate from reference analysis)
  const cacheKey = 'char:' + url;
  if (imageAnalysisCache.has(cacheKey)) {
    const cached = imageAnalysisCache.get(cacheKey)!;
    console.log('[char] Analysis cache hit');
    if (cached === 'NO_PERSON') return { hasPerson: false, description: '' };
    return { hasPerson: true, description: cached };
  }
  console.log('[char] Extracting character profile: ' + url.slice(0, 80));
  const img = await fetchImageAsBase64(url);
  if (!img) { imageAnalysisCache.set(cacheKey, 'NO_PERSON'); return { hasPerson: false, description: '' }; }
  const result = await visionAnalyze(CHARACTER_EXTRACT_PROMPT, img.base64, img.mimeType);
  if (!result || result.includes('NO_PERSON') || result.includes('[Vision analysis failed]')) {
    console.log('[char] No person detected or analysis failed');
    if (imageAnalysisCache.size < MAX_CACHE_SIZE) imageAnalysisCache.set(cacheKey, 'NO_PERSON');
    return { hasPerson: false, description: '' };
  }
  console.log('[char] Profile extracted: ' + result.slice(0, 100));
  if (imageAnalysisCache.size < MAX_CACHE_SIZE) imageAnalysisCache.set(cacheKey, result);
  return { hasPerson: true, description: result };
}

// ─── I2I Prompt Compiler — Reference Hierarchy ──

const I2I_SYSTEM_PROMPT = `你是 I2I (Image-to-Image) 提示词编译专家。收到多张参考图的视觉分析后，你必须：

## ⚠️ CRITICAL RULE — 文本 vs 图片权重
图像生成模型中，文本 Prompt 的权重大于参考图片。如果文本中描述了角色外貌，模型会优先采信文本而忽略参考图。
因此：FINAL PROMPT 中禁止描述角色五官/发型/体型/肤色/种族。角色身份100%由参考图片承载，文本只描述动作、表情、场景、光影、构图。

## ⚠️ CRITICAL RULE — 角色特征铁律
[CHARACTER PROFILE] 标记的内容来自 Gemini Vision 对参考图的直接分析，是 GROUND TRUTH。
- CHARACTER IDENTITY 和 LOCKED ELEMENTS 章节用于文档记录和约束声明
- 但在 FINAL PROMPT 中，角色外貌特征不通过文本描述，而是用 "Character identity — see Reference Images" 引用
- 禁止根据你的训练数据或常识去"修正"、"补充"、"美化"角色特征
- [CHARACTER PROFILE] 没提到的特征（如胡须、眼镜、痣、纹身） = 不存在，禁止添加
- 如果你不确定某个特征是否存在，默认 = 不存在

## 1. 参考图职责分类
根据视觉分析，将每张参考图分配唯一职责（一张图只承担一个职责）：

- PRIMARY REFERENCE (Identity Source): 包含角色面部/五官/发型/体型的图
- SECONDARY REFERENCE (Wardrobe Source): 包含服装/配饰细节的图
- TERTIARY REFERENCE (Composition Source): 包含构图/镜头角度/机位的图
- QUATERNARY REFERENCE (Environment Source): 包含场景/背景/环境的图
- STYLE REFERENCE (Lighting and Color Source): 包含光影/色调/氛围的图

如果某张图同时包含多个元素，选择它最突出的特征作为唯一职责。
如果某类职责没有对应参考图，标注为 "None — use prompt description"。

## 2. 角色身份隔离
Character identity is exclusively derived from PRIMARY REFERENCE.
从 PRIMARY REFERENCE 中提取并锁定以下属性：
facial proportions, face shape, eye shape, nose structure, mouth structure, hair style, hair color, age, gender, ethnicity, skin tone, body type

明确告诉模型：Do NOT inherit composition, background, lighting, camera angle, or environment from the PRIMARY REFERENCE.

## 3. 锁定元素（100% preserve）
Face: 100% preserve | Hair: 100% preserve | Facial proportions: 100% preserve
Eye shape: 100% preserve | Nose structure: 100% preserve | Jawline: 100% preserve
Clothing: 100% preserve (from SECONDARY REFERENCE if available)
Logo: 100% preserve | Text: 100% preserve

## 4. 可编辑元素
Pose: replace | Background: replace | Camera angle: replace
Environment: replace | Lighting: adjust

## 5. 一致性等级
根据用户需求自动判定：
- Level 1 Visual Reference: 参考即可，允许变化（灵感图）
- Level 2 Strong Match: 保持80%以上一致性（产品图）
- Level 3 Identity Lock: 保持95%以上身份一致性（角色/人物）

默认使用 Level 3 Identity Lock，除非用户明确要求更宽松。

## 6. 禁止优化与禁止添加
PROHIBITED — 禁止模型自行"美化"或"丰富"画面：
- 禁止美化外貌：更漂亮、更年轻、更精致、更瘦、更白、更对称
- 禁止添加元素：禁止添加参考图中不存在的道具、武器、配饰、装饰、物体、人物、动物
- 禁止修改场景：禁止自行添加或替换场景中的物体
- 核心原则：只能生成用户指令中明确要求的元素，不要"补充"或"丰富"画面
Maintain the EXACT appearance. No beautification. No adding. No enriching.

## 输出格式（必须严格遵循）

REFERENCE HIERARCHY
PRIMARY REFERENCE (Identity Source): [Image #N 或 "None"]
SECONDARY REFERENCE (Wardrobe Source): [Image #N 或 "None"]
TERTIARY REFERENCE (Composition Source): [Image #N 或 "None"]
QUATERNARY REFERENCE (Environment Source): [Image #N 或 "None"]
STYLE REFERENCE (Lighting and Color Source): [Image #N 或 "None"]

--------------------------------

LOCKED ELEMENTS
Face: 100% preserve
Hair: 100% preserve
Facial proportions: 100% preserve
Eye shape: 100% preserve
Nose structure: 100% preserve
Jawline: 100% preserve
Clothing: 100% preserve
[其他锁定元素]

--------------------------------

EDITABLE ELEMENTS
Pose: replace
Background: replace
Camera angle: replace
Environment: replace
Lighting: adjust

--------------------------------

CONSISTENCY LEVEL
Level [1/2/3] — [Visual Reference / Strong Match / Identity Lock]

--------------------------------

PROHIBITED CHANGES
DO NOT make the character: 更漂亮、更年轻、更精致、更瘦、更白、更对称
DO NOT add: 参考图中不存在的道具、武器、配饰、物体、人物、动物
DO NOT modify: 场景中不应出现的元素
角色五官/体型/肤色/年龄/道具必须与 PRIMARY REFERENCE 完全一致
只生成用户明确要求的元素，禁止自行"丰富"画面

--------------------------------

CHARACTER IDENTITY (from PRIMARY REFERENCE only — VERBATIM)
[将 PRIMARY REFERENCE 的 [CHARACTER PROFILE] 内容原样复制到此处，一字不改]
⚠️ CRITICAL: 角色特征必须从 [CHARACTER PROFILE] 中原样提取，禁止改写、禁止推断、禁止"优化"。
如果 [CHARACTER PROFILE] 中没有描述胡须，就绝对不能添加胡须。
如果 [CHARACTER PROFILE] 中描述的是特定种族/体型特征，就绝对不能改变。
DO NOT infer, embellish, or "improve" character features.
Character identity is exclusively derived from [Image #N].
Do NOT inherit composition, background, lighting, camera angle, or environment from [Image #N].

--------------------------------

FINAL PROMPT (EN)
[编译为英文生成提示词。关键规则：
- ❌ 禁止在 FINAL PROMPT 中描述角色的五官、发型、体型、肤色、种族 — 这些100%来自参考图
- ✅ 只描述可编辑元素：动作/表情、背景/场景、光影/色调、构图/机位
- ✅ 用 "Character identity, facial features, hair, body type, clothing — see Reference Images" 来引用角色
- 示例正确写法: "The character (exactly as shown in reference images) stands in a winter Nordic forest, looking forward with a mocking expression, not looking at camera. Heavy snow falls. Cold, bleak atmosphere. Midday winter light."
- 示例错误写法: "A tall Nordic man with blonde hair, blue eyes, sharp jawline..." ← 禁止！这会让模型忽略参考图]`;

export async function compileI2IPrompt(
  userInput: string,
  referenceUrls: string[],
  referenceAnalyses: string[],
  characterProfiles: CharacterProfile[] = [],
  referencePrompts: string[] = [],
): Promise<string> {
  // Extract @mention tags from user prompt to map names → image indices
  const mentionTags: string[] = [];
  const mentionRe = /@(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = mentionRe.exec(userInput)) !== null) {
    if (!mentionTags.includes(m[1])) mentionTags.push(m[1]);
  }

  // Build vision analysis summary with @mention name context
  // CRITICAL: Character profiles are marked as GROUND TRUTH — use VERBATIM
  const refSummaries = referenceUrls.map((_url, i) => {
    const tag = mentionTags[i] ? ` (@${mentionTags[i]})` : '';
    const sceneInfo = referenceAnalyses[i] || '[No analysis]';
    const charInfo = characterProfiles[i];
    const refPrompt = referencePrompts[i] || '';
    let block = `Image #${i + 1}${tag}:\n`;
    if (charInfo?.hasPerson && charInfo.description) {
      block += `[CHARACTER PROFILE — GROUND TRUTH, USE VERBATIM]\n${charInfo.description}\n`;
    }
    block += `[SCENE CONTEXT]: ${sceneInfo.slice(0, 200)}`;
    if (refPrompt) {
      block += `\n[ORIGINAL PROMPT]: ${refPrompt.slice(0, 200)}`;
    }
    return block;
  }).join('\n\n');

  const userContent = `参考图视觉分析:
${refSummaries}

用户指令: ${userInput}

请按照 REFERENCE HIERARCHY 格式编译输出。`;

  console.log('[i2i-compile] Starting compilation, ' + referenceUrls.length + ' refs');
  const result = await geminiChat(I2I_SYSTEM_PROMPT, userContent, 2000);
  if (!result) {
    console.log('[i2i-compile] Compilation failed, falling back to user input');
    return userInput;
  }
  console.log('[i2i-compile] Compiled ' + result.length + ' chars');
  return result;
}

// ─── I2I GPT-5 Compiler (reasoning.effort = high) ──
const I2I_GPT5_SYSTEM = `你是 I2I 提示词编译专家。根据参考图的视觉分析，为图像生成模型编写精准的生成提示词。

参考图有两种类型：
- 角色参考图(CHARACTER)：锁定人物身份 — 五官、发型、体型、肤色、种族、服装
- 构图参考图(SCENE/COMPOSITION)：提取场景空间、镜头角度、景别、姿态、光线、氛围

⚠️ 核心原则：参考图是 Source of Truth。用户指令中可能包含文字描述，但文字可能与参考图不一致。当冲突时，以参考图为准。

规则：
1. 角色五官、发型、体型、肤色、种族 → 100% 从角色参考图提取，不在文本中描述
2. 服装 → 从角色参考图提取，不在文本中描述
3. 场景空间结构、建筑风格、材质 → 从场景参考图提取，不在文本中描述
4. 镜头角度、景别、姿态、构图 → 从构图参考图提取，写入 prompt
5. 光影、色调、氛围 → 从构图参考图提取，写入 prompt
6. 背景/场景/环境 → 优先从构图参考图提取，配合用户指令补充
7. 用 "Character identity, facial features, hair, body type, skin tone, and clothing — see reference images exactly as shown." 来引用角色
8. 用 "Scene layout, architecture, materials, and props — see reference images exactly as shown." 来引用场景
9. 禁止添加参考图中不存在的道具、武器、配饰、胡须、眼镜
10. 禁止美化：不要更漂亮、更年轻、更精致
11. 输出为一段连贯的英文提示词，不要格式标记`;

// GPT-5.4 I2I prompt compiler — sends reference images DIRECTLY to GPT-5.4 for vision analysis + prompt compilation.
// No separate Gemini Vision step needed; GPT-5.4 sees the actual images.
export async function compileI2IWithGPT5(
  userInput: string,
  referenceUrls: string[],
): Promise<string | null> {
  if (!referenceUrls.length) return null;

  // Convert data: URLs to public HTTP URLs (GPT-5.4 needs accessible URLs)
  const { uploadDataUrl } = await import('../ai/kie-provider.js');
  const publicUrls: string[] = [];
  for (const url of referenceUrls) {
    if (url.startsWith('data:')) {
      const uploaded = await uploadDataUrl(url);
      if (uploaded) publicUrls.push(uploaded);
      else console.log('[i2i-gpt5] Failed to upload data URL, skipping ref');
    } else {
      publicUrls.push(url);
    }
  }
  if (!publicUrls.length) { console.log('[i2i-gpt5] No public URLs available'); return null; }

  // Extract @mention tags from user prompt to label images
  const mentionTags: string[] = [];
  const mentionRe = /@(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = mentionRe.exec(userInput)) !== null) {
    if (!mentionTags.includes(m[1])) mentionTags.push(m[1]);
  }

  // Build user message: text instruction + reference images
  const userContent: any[] = [];
  userContent.push({ type: 'input_text', text: '参考图说明：' });
  publicUrls.forEach((url, i) => {
    const tag = mentionTags[i] ? ` (@${mentionTags[i]})` : '';
    userContent.push({ type: 'input_text', text: `[参考图 #${i + 1}${tag}]` });
    userContent.push({ type: 'input_image', image_url: url });
  });
  userContent.push({ type: 'input_text', text: `
用户指令: ${userInput}

⚠️ 关键原则：参考图是角色身份和场景的唯一真相源（Source of Truth）。
用户指令中可能包含角色/场景的文字描述，但这些文字描述可能与参考图不一致。
当文字描述与参考图冲突时 → 以参考图为准，忽略冲突的文字描述。
用户指令应该只用其构图/光影/镜头/动作/氛围/背景指示，而非用于覆盖参考图中的角色或场景。

请按照以下规则编译英文生成提示词：
1. 角色五官、发型、体型、肤色、种族、服装 → 不在文本中描述。用 "Character identity, facial features, hair, body type, skin tone, and clothing — see reference images exactly as shown." 来引用角色。
2. 场景空间结构、建筑风格、材质、道具 → 优先从场景参考图提取。用户指令中的场景文字描述仅作补充参考，不与参考图冲突。
3. 镜头角度(仰拍/俯拍/平视)、景别(特写/中景/全景)、构图方式、主体站位 → 从构图参考图提取，写入 prompt。
4. 光影、色调、氛围 → 从构图参考图提取并写入 prompt。
5. 背景/场景/环境 → 优先从构图参考图提取，配合用户指令补充。
6. 禁止添加参考图中不存在的道具、配饰、武器、装饰物。
7. 禁止美化：不要更漂亮、更年轻、更精致、更瘦、更白、更对称。
8. 保持角色参考图中人物的原始五官、发型、服装不变 — 不要改变或替换。
9. 输出为一段连贯的英文提示词，不要格式标记。` });

  const messages = [
    { role: 'system' as const, content: [{ type: 'input_text' as const, text: I2I_GPT5_SYSTEM }] },
    { role: 'user' as const, content: userContent },
  ];

  console.log('[i2i-gpt5] GPT-5.4 analyzing ' + publicUrls.length + ' ref images directly');
  const result = await gpt5Chat(messages, { effort: 'high' });
  if (result) {
    console.log('[i2i-gpt5] Compiled ' + result.length + ' chars');
    return result;
  }
  return null;
}

async function runAgent(
  profile: AgentProfile,
  context: PipelineContext,
  previousOutputs: Record<string, string>
): Promise<AgentResult> {
  const t0 = Date.now();

  let contextBlock = '';
  for (const dep of profile.dependencies) {
    if (previousOutputs[dep]) {
      const prev = previousOutputs[dep];
      const truncated = prev.length > MAX_PREV_OUTPUT_CHARS
        ? prev.slice(0, MAX_PREV_OUTPUT_CHARS) + '\n...[truncated]'
        : prev;
      contextBlock += '\n\n--- ' + dep + ' 的输出 ---\n' + truncated;
    }
  }

  // Reference image analysis — prefer Gemini Vision, fallback to original prompts
  // Truncate each analysis to keep context lean; only include first 8 refs if > 8
  let refBlock = '';
  const MAX_REF_ANALYSIS_CHARS = 200;
  const MAX_REFS_IN_CONTEXT = 8;
  if (context.referenceUrls && context.referenceUrls.length > 0) {
    const refsToShow = context.referenceUrls.slice(0, MAX_REFS_IN_CONTEXT);
    if (context.referenceAnalysis && context.referenceAnalysis.length > 0) {
      const truncated = context.referenceAnalysis.slice(0, MAX_REFS_IN_CONTEXT).map(a =>
        a.length > MAX_REF_ANALYSIS_CHARS ? a.slice(0, MAX_REF_ANALYSIS_CHARS) + '...' : a
      );
      refBlock = '\n\n[参考图摘要]\n' + refsToShow.map((_, i) =>
        '图' + (i + 1) + ': ' + (truncated[i] || '-')
      ).join('\n');
      if (context.referenceUrls.length > MAX_REFS_IN_CONTEXT) {
        refBlock += '\n... (+' + (context.referenceUrls.length - MAX_REFS_IN_CONTEXT) + ' more)';
      }
    } else {
      refBlock = '\n\n[参考图原始Prompt]\n' + refsToShow.map((_, i) => {
        const p = context.referencePrompts?.[i] || '';
        return '图' + (i + 1) + ': ' + (p ? p.slice(0, 200) : '-');
      }).join('\n');
    }
  }

  const userMessage = profile.systemPrompt + '\n\n用户需求: ' + context.userInput +
    '\n目标模型: ' + context.model +
    '\n模式: ' + (context.mode || 'text-to-image') +
    (context.referenceUrls?.length ? '\n参考图片数量: ' + context.referenceUrls.length : '') +
    contextBlock +
    refBlock +
    '\n\n请按照你的角色职责输出。';

  // Try GPT-5 (reasoning=high) first, fall back to Gemini/DeepSeek
  const gptMsgs = [
    { role: 'user', content: [{ type: 'input_text', text: userMessage }] },
  ];
  let output = await gpt5Chat(gptMsgs, { effort: 'high' });
  if (!output) { await new Promise(r => setTimeout(r, 2000)); output = await gpt5Chat(gptMsgs, { effort: 'high' }); }
  return {
    agentId: profile.id,
    agentName: profile.name,
    output: output || '[' + profile.name + ' 未能生成输出]',
    durationMs: Date.now() - t0,
  };
}

export async function runAgentPipeline(context: PipelineContext): Promise<PipelineResult> {
  const t0 = Date.now();
  const trace: AgentResult[] = [];
  const outputs: Record<string, string> = {};

  console.log('[pipeline] Starting for: "' + context.userInput.slice(0, 60) + '..."');

  // Pre-process: analyze reference images with Gemini Vision
  if (context.referenceUrls && context.referenceUrls.length > 0 && !context.referenceAnalysis) {
    console.log('[pipeline] Analyzing ' + context.referenceUrls.length + ' reference image(s) with Vision...');
    context.referenceAnalysis = await analyzeReferenceImages(context.referenceUrls);
    console.log('[pipeline] Vision analysis complete');
  }

  try {
    console.log('[pipeline] Step 1: Creative Producer');
    const cp = await runAgent(CREATIVE_PRODUCER, context, outputs);
    outputs['creative-producer'] = cp.output; trace.push(cp);

    console.log('[pipeline] Step 2: Art Director');
    const ad = await runAgent(ART_DIRECTOR, context, outputs);
    outputs['art-director'] = ad.output; trace.push(ad);

    console.log('[pipeline] Step 3: Storyboard Director');
    const sd = await runAgent(STORYBOARD_DIRECTOR, context, outputs);
    outputs['storyboard-director'] = sd.output; trace.push(sd);

    console.log('[pipeline] Step 4: Prompt Architect');
    const pa = await runAgent(PROMPT_ARCHITECT, context, outputs);
    outputs['prompt-architect'] = pa.output; trace.push(pa);

    console.log('[pipeline] Complete in ' + (Date.now() - t0) + 'ms');

    return {
      creativeBrief: cp.output,
      visualBible: ad.output,
      storyboard: sd.output,
      modelPrompt: extractModelPrompt(pa.output),
      fullPromptOutput: pa.output,
      trace,
      totalDurationMs: Date.now() - t0,
    };
  } catch (err) {
    console.error('[pipeline] Error:', err);
    return {
      creativeBrief: '', visualBible: '', storyboard: '',
      modelPrompt: context.userInput,
      trace, totalDurationMs: Date.now() - t0,
    };
  }
}

function extractModelPrompt(output: string): string {
  const m = output.match(/\*\*主Prompt \(EN\)\*\*:?\s*\n([\s\S]*?)(?:\n\*\*|$)/i);
  if (m) return m[1].trim();
  const lines = output.split('\n').filter(l => l.trim().length > 20);
  return lines.length > 0 ? lines[lines.length - 1].trim() : output.slice(-500).trim();
}

// ─── Script Analysis Pipeline (two-phase: character extraction → storyboard) ──
import { CHARACTER_EXTRACTION, SCENE_EXTRACTION, SCRIPT_ANALYSIS, SCENE_ARCHITECT, PROP_DESIGNER, SOUND_COMPOSER } from './profiles.js';

export interface ScriptAnalysisResult {
  shots: Array<{
    shotNumber: number;
    shotFunction: string;       // 镜头功能 (钩子/揭示/蓄力/释放/留白/余味)
    scene: string;
    shotType: string;           // 景别
    shotSide: string;           // 拍摄面 (正面/侧面/背面/过肩/纯环境/局部)
    angle: string;              // 机位垂直 (平视/仰拍/俯拍/鸟瞰)
    lens: string;               // 焦段
    composition: string;        // 构图
    depthLayers: string;        // 深度层次
    // Character (empty when no character in shot)
    characterPosition: string;  // 人物位置
    characterFacing: string;    // 人物朝向
    characterAction: string;    // 人物动作 (左手/右手/身体/头部)
    characterExpression: string;// 人物表情
    characterProps: string;     // 手持/接触物
    // Space layers
    foreground: string;
    midground: string;
    background: string;
    // Lighting
    lightSources: string;       // 场景光源
    keyLight: string;           // 主光
    fillLight: string;          // 辅光
    rimLight: string;           // 轮廓光
    specialLight: string;       // 特殊光效
    // Color & Material
    color: string;
    material: string;
    atmosphere: string;
    // Prompts
    visualPrompt: string;       // full structured display template (all fields)
    contentCN: string;          // alias for visualPrompt
    genPrompt: string;          // clean image-gen prompt
  }>;
  characters: Record<string, string>;
  rawOutput: string;
  durationMs: number;
}

// ── Layer 1: Script Trigger Extraction (轻量 LLM → 5维结构化信号) ──
async function extractScriptTriggers(scriptText: string): Promise<DimensionInput | null> {
  const prompt = `从剧本提取5个风格维度。只输出一行JSON，不要解释。

剧本：
${scriptText.slice(0, 3000)}

输出格式：{"era":"","region":"","sceneFunction":"","mood":"","identity":""}

可选值：
era: 远古|古典文明|中世|近古|近代|现代早期|当代|近未来|远未来|架空奇幻|末日
region: 东亚·中国|东亚·日本|东亚·韩国|东南亚|南亚|中东|北欧|西欧|南欧|东欧|非洲北|非洲南|北美|拉美|大洋洲|极地
sceneFunction: 宫廷|宗教|军事|学术|商业|街头|地下|乡村|自然|工业|娱乐|运动|医疗|餐饮|居住|交通|废墟
mood: 浪漫|压抑|活力|肃穆|诡异|荒凉|奢华|简约|温暖|科技
identity: 统治者|贵族|将领|学者|商人|艺术家|工人|农民|街头|青少年|舞者|黑客|侦探|医生|僧侣|间谍|外星

不确定的用空字符串。只输出JSON一行。`;

  try {
    const msgs = [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: prompt }] }];
    const raw = await gpt5Chat(msgs, { effort: 'low', maxOutputTokens: 300, timeoutMs: 30000 });
    if (!raw) return null;
    const jsonStr = raw.replace(/```json\s*|\s*```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    const dims: DimensionInput = {
      era: parsed.era || '',
      region: parsed.region || '',
      sceneFunction: parsed.sceneFunction || '',
      mood: parsed.mood || '',
      identity: parsed.identity || '',
    };
    console.log('[trigger-extract]', JSON.stringify(dims));
    return dims;
  } catch (err: any) {
    console.log('[trigger-extract] Failed:', String(err).slice(0, 100));
    return null;
  }
}

// ── Layer 2: Style Guidance Builder (触发词 → 结构化引导，不屏蔽任何KB内容) ──
// 设计原则：触发词是"聚光灯"而非"过滤器"——LLM 看到全部知识库，但知道该聚焦哪里。
// 不同用户的审美不同，系统只提供基准方向，最终选择权在 LLM。
function buildStyleGuidance(dimensions: DimensionInput, decision: StyleDecision): string {
  const confPct = Math.round(decision.confidence * 100);

  let guidance = `## 🎯 系统风格引导（由剧本触发词+5维决策引擎生成，作为聚焦参考，非硬性排除）

### 剧本基准
- 时代：${dimensions.era || '未确定（从剧本上下文自行推断）'}
- 地域：${dimensions.region || '未确定'}
- 场景类型：${dimensions.sceneFunction || '未确定'}
- 氛围：${dimensions.mood || '未确定'}
- 角色身份：${dimensions.identity || '未确定'}

### 系统推荐方向（置信度 ${confPct}%，作为起点参考，可根据实际审美调整）
- 🥇 主导(70%)：**${decision.primary || '未匹配'}**
- 🥈 辅助(20%)：**${decision.secondary || '未匹配'}**
- 🥉 点缀(10%)：**${decision.accent || '未匹配'}**
- 配色方向：${decision.colorDirection || '未匹配'}
- 灯光方向：${decision.lightingDirection || '未匹配'}
- 材质方向：${decision.materialDirection || '未匹配'}
${decision.interiorStyles?.length ? `- 🏛️ 匹配的室内/建筑风格：${decision.interiorStyles.join('、')}` : ''}
${decision.fashionStyles?.length ? `- 👗 匹配的服装风格：${decision.fashionStyles.join('、')}` : ''}

### 🔑 知识库检索提示
以下提供**完整**风格知识库。请根据剧本基准和用户反馈，主动检索最匹配的章节。
- 优先阅读与系统推荐方向一致的章节
- 但如果你判断其他风格方向更符合用户审美 → 可以推翻系统推荐，引用知识库中的其他章节
- 关键：给出推翻的理由
`;

  if (confPct < 30) {
    guidance += `\n⚠️ 系统置信度较低（${confPct}%），请更多依赖剧本上下文自行判断，知识库全部可用。\n`;
  }

  return guidance;
}

// ── Style Card (紧凑版，专用于 userMessage 直接注入，不经过系统提示词) ──
function buildStyleCard(dimensions: DimensionInput, decision: StyleDecision): string {
  const eraNote = dimensions.era ? `**${dimensions.era}**${decision.fashionStyles[0] ? ' → ' + decision.fashionStyles.slice(0, 3).join(' / ') : ''}` : '未确定';
  const regionNote = dimensions.region ? `**${dimensions.region}**` : '未确定';
  const funcNote = dimensions.sceneFunction ? `**${dimensions.sceneFunction}**` : '未确定';
  const moodNote = dimensions.mood ? `**${dimensions.mood}**` : '未确定';
  const identityNote = dimensions.identity ? `**${dimensions.identity}**` : '未确定';
  const confPct = Math.round(decision.confidence * 100);

  return `## 🎯 风格知识库 — 根据剧本自动匹配（以下方向必须体现在角色服装设计中）

### 剧本基准
- 时代：${eraNote}
- 地域：${regionNote}
- 场景类型：${funcNote}
- 氛围：${moodNote}
- 角色身份：${identityNote}

### 推荐风格方向（${confPct}%置信度，70/20/10混搭）
🥇 主导(70%)：**${decision.primary || 'Contemporary'}** | 🥈 辅助(20%)：**${decision.secondary || 'Minimalist'}** | 🥉 点缀(10%)：**${decision.accent || 'Streetwear'}**

### 方向指引
- 🎨 配色：${decision.colorDirection || '当代默认配色'}
- 💡 灯光：${decision.lightingDirection || '层次化现代灯光'}
- 🧵 面料/材质：${decision.materialDirection || '当代默认材质'}
${decision.fashionStyles?.length ? `- 👗 匹配风格标签：${decision.fashionStyles.join(' / ')}` : ''}

### ⚠️ 关键指令
请严格参照以上风格方向设计所有角色服装。每个角色的面料、廓形、配色必须与匹配的风格标签一致。不要凭空编造偏离方向的服装描述。`;
}

// ── Layer 3: Constraint Compiler (完整KB + 结构化引导 → 具体设计约束) ──
async function compileRegenerationConstraint(
  userFeedback: string,
  section: string,
  dimensions: DimensionInput,
  styleDecision: StyleDecision | null,
  existingContent?: string,
): Promise<string> {
  const sectionLabel =
    section === 'characters' ? '角色服装设计' :
    section === 'scenes' ? '场景空间设计' :
    section === 'storyboard' ? '分镜视觉设计' : '音乐设计';

  const guidance = styleDecision
    ? buildStyleGuidance(dimensions, styleDecision)
    : `## 🎯 系统风格引导\n（触发词提取失败，请完全依赖剧本上下文自行判断。完整知识库如下。）\n`;

  const constraintSysPrompt = `你是视觉风格约束编译器。你的任务是根据系统风格引导 + 用户反馈，输出具体可执行的设计约束。

${guidance}

## 完整风格知识库（全部可用，系统引导只是参考方向）

${FASHION_STYLE_DB}

${FASHION_COORDINATION_DB}

${section === 'scenes' || section === 'storyboard' ? INTERIOR_STYLE_DB + '\n\n' : ''}${STYLE_DECISION_RULES}

## 任务
用户对「${sectionLabel}」不满意。

**关键原则**：
- 系统引导是"聚光灯"——指出最可能匹配的方向，但不排除其他可能性
- 如果你判断系统推荐方向不合适 → 可以推翻，但要说明理由
- 如果知识库中有比系统推荐更好的选择 → 大胆引用
- **不要因为系统推荐了某个风格就盲目跟随**
${section === 'scenes' ? '\n- 🏛️ 你正在设计场景/空间——重点关注**室内设计风格、灯光设计、材质速查、空间配色心理学**章节。不要只给服装建议。' : ''}
${section === 'storyboard' ? '\n- 🎬 你正在设计分镜——需要同时考虑**角色服装**和**场景空间**两个维度。服装参考FASHION_STYLE_DB，场景参考INTERIOR_STYLE_DB。' : ''}

**第一步：判断系统引导是否合理** — 结合剧本和用户反馈，确认或推翻系统推荐的风格方向。

**第二步：在知识库中主动检索** — 找到最匹配的品牌、面料、廓形、配色${section === 'scenes' ? '、空间特征、灯光氛围、材质' : ''}。如果推翻系统推荐，说明新方向的理由。

**第三步：明确排除不兼容的风格** — 基于剧本基调，列出绝对不应出现的风格方向。每条说明原因。

## 输出格式
### 系统引导评估
[确认/推翻，以及理由]

### 风格兼容性判断
- ✅ 推荐方向：
- ❌ 绝对不兼容（与剧本基调冲突的）：

### 具体设计约束
${section === 'scenes' ? `1. **空间特征/建筑风格**：
2. **材质/材料**：
3. **配色方向**：
4. **灯光氛围**：
5. **风格参考**（引用知识库中的风格名称+空间特征）：` : section === 'storyboard' ? `1. **角色服装约束**（面料/廓形/风格）：
2. **场景空间约束**（建筑风格/材质/灯光）：
3. **配色方向**（服装与场景的配色关系）：
4. **整体风格参考**：` : `1. **面料/材质**：
2. **廓形/剪裁**：
3. **配色方向**：
4. **风格参考**（引用知识库中的品牌+季度）：
5. **搭配法则**：`}

## 关键规则
- 所有约束必须引用知识库中的真实内容
- 控制在500字以内
- 输出直接注入GPT-5.4系统提示词，必须具体、可执行`;

  const userMsg = `用户反馈：${userFeedback}
重新生成板块：${sectionLabel}
${existingContent ? `\n上一版输出（找出不符合剧本和用户期望之处）：\n${existingContent.slice(0, 2000)}` : ''}

请基于系统引导+完整知识库+用户反馈，输出约束分析。`;

  try {
    const msgs = [
      { role: 'user' as const, content: [{ type: 'input_text' as const, text: constraintSysPrompt + '\n\n---\n\n' + userMsg }] },
    ];
    const result = await gpt5Chat(msgs, { effort: 'low', maxOutputTokens: 1200, timeoutMs: 90000 });
    if (result && result.length > 20) {
      console.log('[constraint-compiler] section=' + section + ' dims=' + dimensions.era + '/' + dimensions.region + ' compiled ' + result.length + ' chars → ' + result.slice(0, 150).replace(/\n/g, ' '));
      return result;
    }
    console.log('[constraint-compiler] Empty/short result, fallback to raw feedback');
  } catch (err: any) {
    console.log('[constraint-compiler] Failed:', String(err).slice(0, 120));
  }
  return `### 用户需求诊断\n用户对当前${sectionLabel}不满意。\n\n### 具体设计约束\n${userFeedback}`;
}

// ── Feedback injection helper (3层管线：触发→引导→约束) ──
async function injectFeedback(
  systemPrompt: string,
  userFeedback?: string,
  existingContent?: string,
  section?: string,
  scriptExcerpt?: string,
): Promise<string> {
  // Layer 1+2: Always run trigger extraction + style decision (even on first run)
  const dimensions = scriptExcerpt ? (await extractScriptTriggers(scriptExcerpt)) : null;
  const styleDecision = decideStyle(dimensions || {});
  const styleCard = buildStyleCard(dimensions || {}, styleDecision);

  let result = styleCard + '\n\n';

  // Layer 3: Only compile detailed constraints when user provides feedback
  if (userFeedback) {
    const constraints = await compileRegenerationConstraint(
      userFeedback,
      section || 'characters',
      dimensions || {},
      styleDecision,
      existingContent,
    );
    result += `## ⚠️ 用户修改要求 — 以下为Agent根据风格知识库+剧本触发词编译的具体设计约束（最高优先级，覆盖一切冲突指令）\n${constraints}\n\n`;
  }

  if (existingContent) {
    result += `## 上一版输出（仅用于对比参考，你必须产出明显不同的新版本，不得重复或微调）\n${existingContent.slice(0, 2000)}\n\n`;
  }

  result += `## 原始指令\n${systemPrompt}`;
  return result;
}

// ─── Phase 1: Character Extraction (详尽角色设计，输出长) ──
export async function runCharacterExtraction(scriptText: string, visualStyle?: string, userFeedback?: string, existingContent?: string): Promise<Record<string, string>> {
  const t0 = Date.now();
  console.log('[char-extract] Starting, script length=' + scriptText.length + ' feedback=' + !!userFeedback);

  // ─── Regeneration path: use existing injectFeedback with constraint compilation ───
  if (userFeedback) {
    const styleHint = visualStyle ? `\n用户指定风格：${visualStyle}。请在角色外观设计中体现此风格。` : '';
    const basePrompt = await injectFeedback(CHARACTER_EXTRACTION.systemPrompt, userFeedback, existingContent, 'characters', scriptText);
    // Regen path also needs era-aware historical KB
    const dims = await extractScriptTriggers(scriptText);
    const historyKBR = getHistoricalKBForEra(dims?.era || '', dims?.region || '');
    const anachronismR = buildEraAnachronismGuard(dims?.era || '');
    const userMessage = (historyKBR ? historyKBR + '\n\n' : '') + (anachronismR ? anachronismR + '\n\n' : '') + basePrompt + `\n\n${styleHint}\n\n${NEGATIVE_CLOTHING}\n\n剧本内容：\n${scriptText}\n\n请严格按格式为每个角色输出完整设计方案。`;
    const gptMsgs = [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: userMessage }] }];
    let rawOutput: string | null = null;
    try { rawOutput = await gpt5Chat(gptMsgs, { effort: 'medium', timeoutMs: 600000 }); } catch (err: any) { console.log('[char-extract] Failed:', String(err).slice(0, 100)); return {}; }
    if (!rawOutput) { console.log('[char-extract] No output'); return {}; }
    console.log('[char-extract] Regeneration output ' + rawOutput.length + ' chars in ' + (Date.now() - t0) + 'ms');
    return parseCharacterBlocks(rawOutput);
  }

  // ═══════════════════════════════════════════
  // ─── First-run: Two-round KB retrieval ───
  // ═══════════════════════════════════════════

  // ── Round 1: Ask GPT-5.4 what KB sections it needs ──
  const round1Msg = KB_CATALOG + '\n\n' + KB_RETRIEVAL_PROMPT + '\n\n剧本内容：\n' + scriptText;
  console.log('[char-extract] Round 1: asking GPT-5.4 what to retrieve...');

  let keywords: string | null = null;
  try {
    keywords = await gpt5Chat(
      [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: round1Msg }] }],
      { effort: 'low', maxOutputTokens: 500, timeoutMs: 30000 },
    );
  } catch (err: any) { console.log('[char-extract] Round 1 failed:', String(err).slice(0, 100)); }

  // ── Agent: Search KB for each keyword ──
  let searchResults = '';
  if (keywords && keywords.length > 20) {
    console.log('[char-extract] Round 1 response: ' + keywords.slice(0, 200).replace(/\n/g, ' | '));
    // Parse keywords: each line starting with a Chinese/non-space char
    const queries = keywords
      .split('\n')
      .map(l => l.replace(/^[-•*\d.]+\s*/, '').trim())
      .filter(l => l.length > 3 && l.length < 80);

    const allResults: string[] = [];
    for (const q of queries.slice(0, 8)) {
      const r = searchFashionKB(q);
      if (r) allResults.push(`### 🔍 检索："${q}"\n${r}`);
      // Also search for supplementary material from other KBs
      const w = searchWritersKB(q);
      if (w) allResults.push(`### 🔍 编剧检索："${q}"\n${w}`);
    }
    searchResults = allResults.join('\n\n');
    console.log('[char-extract] KB search: ' + queries.length + ' queries → ' + allResults.length + ' results, ' + searchResults.length + ' chars');
  }

  // ── Era detection: always run (lightweight, ~300 tokens) ──
  const dimensions = await extractScriptTriggers(scriptText);
  const decision = decideStyle(dimensions || {});

  if (!searchResults) {
    // Fallback: use style card approach
    console.log('[char-extract] KB retrieval returned empty, falling back to style card');
    searchResults = buildStyleCard(dimensions || {}, decision);
  }

  // ── Historical KB injection: era-aware reference data ──
  const era = dimensions?.era || '';
  const region = dimensions?.region || '';
  const historyKB = getHistoricalKBForEra(era, region);
  const anachronismGuard = buildEraAnachronismGuard(era);
  if (historyKB) {
    console.log('[char-extract] Injecting historical KB for era=' + era + ' region=' + region + ' (' + historyKB.length + ' chars)');
  }

  // ── Round 2: Feed KB results + script → design characters ──
  const round2Msg = searchResults
    + (historyKB ? '\n\n' + historyKB : '')
    + (anachronismGuard ? '\n\n' + anachronismGuard : '')
    + '\n\n' + NEGATIVE_CLOTHING
    + '\n\n' + CHARACTER_EXTRACTION.systemPrompt
    + '\n\n## 剧本内容\n' + scriptText
    + (visualStyle ? '\n\n用户指定风格：' + visualStyle : '')
    + '\n\n请严格按格式为每个角色输出完整设计方案。';

  console.log('[char-extract] Round 2: designing characters (' + round2Msg.length + ' chars)...');
  let rawOutput: string | null = null;
  try {
    rawOutput = await gpt5Chat(
      [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: round2Msg }] }],
      { effort: 'medium', timeoutMs: 600000 },
    );
  } catch (err: any) { console.log('[char-extract] Round 2 failed:', String(err).slice(0, 100)); return {}; }

  if (!rawOutput) { console.log('[char-extract] No output'); return {}; }

  console.log('[char-extract] Got output ' + rawOutput.length + ' chars in ' + (Date.now() - t0) + 'ms');
  return parseCharacterBlocks(rawOutput);
}

function parseCharacterBlocks(rawOutput: string): Record<string, string> {
  const characters: Record<string, string> = {};
  const blocks = rawOutput.split(/===+/).map(b => b.trim()).filter(b => b.length > 30);
  for (const block of blocks) {
    const headerMatch = block.match(/^##\s+(.+)/m);
    if (!headerMatch) continue;
    const name = headerMatch[1].trim();
    if (!name || name.length > 30 || /无明确角色/i.test(name)) continue;
    characters[name] = block;
  }
  console.log('[char-extract] Parsed ' + Object.keys(characters).length + ' characters');
  return characters;
}

// ─── Scene Extraction (独立场景提取，GPT-5.4) ──
export async function runSceneExtraction(scriptText: string, userFeedback?: string, existingContent?: string): Promise<Record<string, string>> {
  const t0 = Date.now();
  console.log('[scene-extract] Starting, script length=' + scriptText.length + ' feedback=' + !!userFeedback);

  // ─── Regeneration path: use existing injectFeedback with constraint compilation ───
  if (userFeedback) {
    const basePrompt = await injectFeedback(SCENE_EXTRACTION.systemPrompt, userFeedback, existingContent, 'scenes', scriptText);
    // Scene regen also needs era-aware historical architecture KB
    const dims = await extractScriptTriggers(scriptText);
    const historyKBR = getHistoricalKBForEra(dims?.era || '', dims?.region || '');
    const anachronismR = buildEraAnachronismGuard(dims?.era || '');
    const userMessage = (historyKBR ? historyKBR + '\n\n' : '') + (anachronismR ? anachronismR + '\n\n' : '') + basePrompt + `\n\n${NEGATIVE_INTERIOR}\n\n剧本内容：\n${scriptText}\n\n请严格按格式为每个场景输出完整设计方案。`;
    const gptMsgs = [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: userMessage }] }];
    let rawOutput: string | null = null;
    try { rawOutput = await gpt5Chat(gptMsgs, { effort: 'medium', timeoutMs: 600000 }); } catch (err: any) { console.log('[scene-extract] Failed:', String(err).slice(0, 100)); return {}; }
    if (!rawOutput) { console.log('[scene-extract] No output'); return {}; }
    console.log('[scene-extract] Regeneration output ' + rawOutput.length + ' chars in ' + (Date.now() - t0) + 'ms');
    return parseSceneBlocks(rawOutput);
  }

  // ═══════════════════════════════════════════
  // ─── First-run: Two-round KB retrieval ───
  // ═══════════════════════════════════════════

  // ── Round 1: Ask GPT-5.4 what interior/architecture KB sections it needs ──
  const round1Msg = KB_CATALOG + '\n\n' + KB_RETRIEVAL_PROMPT_SCENE + '\n\n剧本内容：\n' + scriptText;
  console.log('[scene-extract] Round 1: asking GPT-5.4 what to retrieve...');

  let keywords: string | null = null;
  try {
    keywords = await gpt5Chat(
      [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: round1Msg }] }],
      { effort: 'low', maxOutputTokens: 500, timeoutMs: 30000 },
    );
  } catch (err: any) { console.log('[scene-extract] Round 1 failed:', String(err).slice(0, 100)); }

  // ── Agent: Search interior KB for each keyword ──
  let searchResults = '';
  if (keywords && keywords.length > 20) {
    console.log('[scene-extract] Round 1 response: ' + keywords.slice(0, 200).replace(/\n/g, ' | '));
    const queries = keywords
      .split('\n')
      .map(l => l.replace(/^[-•*\d.]+\s*/, '').trim())
      .filter(l => l.length > 3 && l.length < 80);

    const allResults: string[] = [];
    for (const q of queries.slice(0, 8)) {
      const r = searchInteriorKB(q);
      if (r) allResults.push(`### 🔍 风格检索："${q}"\n${r}`);
      const s = searchSpatialKB(q);
      if (s) allResults.push(`### 🏛️ 设计师检索："${q}"\n${s}`);
      // Also search writers KB for scene mood / narrative context
      const w = searchWritersKB(q);
      if (w) allResults.push(`### 🔍 编剧检索："${q}"\n${w}`);
    }
    searchResults = allResults.join('\n\n');
    console.log('[scene-extract] KB search: ' + queries.length + ' queries → ' + allResults.length + ' results, ' + searchResults.length + ' chars');
  }

  // ── Era detection: always run (lightweight) for scene extraction too ──
  const dimensions = await extractScriptTriggers(scriptText);
  const decision = decideStyle(dimensions || {});

  if (!searchResults) {
    // Fallback: use style card approach
    console.log('[scene-extract] KB retrieval returned empty, falling back to style card');
    searchResults = buildStyleCard(dimensions || {}, decision);
  }

  // ── Historical architecture KB injection ──
  const era = dimensions?.era || '';
  const region = dimensions?.region || '';
  const historyKB = getHistoricalKBForEra(era, region);
  const anachronismGuard = buildEraAnachronismGuard(era);

  // ── Round 2: Feed KB results + script → design scenes ──
  const round2Msg = searchResults
    + (historyKB ? '\n\n' + historyKB : '')
    + (anachronismGuard ? '\n\n' + anachronismGuard : '')
    + '\n\n' + NEGATIVE_INTERIOR
    + '\n\n' + SCENE_EXTRACTION.systemPrompt
    + '\n\n## 剧本内容\n' + scriptText
    + '\n\n请严格按格式为每个场景输出完整设计方案。';

  console.log('[scene-extract] Round 2: designing scenes (' + round2Msg.length + ' chars)...');
  let rawOutput: string | null = null;
  try {
    rawOutput = await gpt5Chat(
      [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: round2Msg }] }],
      { effort: 'medium', timeoutMs: 600000 },
    );
  } catch (err: any) { console.log('[scene-extract] Round 2 failed:', String(err).slice(0, 100)); return {}; }

  if (!rawOutput) { console.log('[scene-extract] No output'); return {}; }

  console.log('[scene-extract] Got output ' + rawOutput.length + ' chars in ' + (Date.now() - t0) + 'ms');
  return parseSceneBlocks(rawOutput);
}

function parseSceneBlocks(rawOutput: string): Record<string, string> {
  const scenes: Record<string, string> = {};
  const blocks = rawOutput.split(/===+/).map(b => b.trim()).filter(b => b.length > 30);
  for (const block of blocks) {
    const headerMatch = block.match(/^##\s+(.+)/m);
    if (!headerMatch) continue;
    const name = headerMatch[1].trim();
    if (!name || name.length > 30 || /无明确场景/i.test(name)) continue;
    scenes[name] = block;
  }
  return scenes;
}

// ─── Scene Architect (场景空间设计，GPT-5.4) ──
export async function runSceneArchitect(scriptText: string, userFeedback?: string, existingContent?: string): Promise<Record<string, string>> {
  const t0 = Date.now();
  console.log('[scene-architect] Starting, script length=' + scriptText.length + ' feedback=' + !!userFeedback);

  // ─── Regeneration path ───
  if (userFeedback) {
    const basePrompt = await injectFeedback(SCENE_ARCHITECT.systemPrompt, userFeedback, existingContent, 'scenes', scriptText);
    const dims = await extractScriptTriggers(scriptText);
    const historyKBR = getHistoricalKBForEra(dims?.era || '', dims?.region || '');
    const anachronismR = buildEraAnachronismGuard(dims?.era || '');
    const userMessage = (historyKBR ? historyKBR + '\n\n' : '') + (anachronismR ? anachronismR + '\n\n' : '') + basePrompt + `\n\n${NEGATIVE_INTERIOR}\n\n剧本内容：\n${scriptText}\n\n请为每个场景输出完整的空间设计方案（建筑风格/空间结构/材质语言/光照氛围/色彩体系/叙事功能）。`;
    const gptMsgs = [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: userMessage }] }];
    let rawOutput: string | null = null;
    try { rawOutput = await gpt5Chat(gptMsgs, { effort: 'medium', timeoutMs: 600000 }); } catch (err: any) { console.log('[scene-architect] Failed:', String(err).slice(0, 100)); return {}; }
    if (!rawOutput) { console.log('[scene-architect] No output'); return {}; }
    console.log('[scene-architect] Regeneration output ' + rawOutput.length + ' chars in ' + (Date.now() - t0) + 'ms');
    return parseArchitectBlocks(rawOutput);
  }

  // ═══════════════════════════════════════════
  // ─── First-run: Two-round KB retrieval ───
  // ═══════════════════════════════════════════

  // ── Round 1: Ask GPT-5.4 what interior/architecture KB sections it needs ──
  const round1Msg = KB_CATALOG + '\n\n' + KB_RETRIEVAL_PROMPT_SCENE + '\n\n剧本内容：\n' + scriptText;
  console.log('[scene-architect] Round 1: asking GPT-5.4 what to retrieve...');

  let keywords: string | null = null;
  try {
    keywords = await gpt5Chat(
      [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: round1Msg }] }],
      { effort: 'low', maxOutputTokens: 500, timeoutMs: 30000 },
    );
  } catch (err: any) { console.log('[scene-architect] Round 1 failed:', String(err).slice(0, 100)); }

  // ── Agent: Search interior KB ──
  let searchResults = '';
  if (keywords && keywords.length > 20) {
    console.log('[scene-architect] Round 1 response: ' + keywords.slice(0, 200).replace(/\n/g, ' | '));
    const queries = keywords
      .split('\n')
      .map(l => l.replace(/^[-•*\d.]+\s*/, '').trim())
      .filter(l => l.length > 3 && l.length < 80);

    const allResults: string[] = [];
    for (const q of queries.slice(0, 8)) {
      const r = searchInteriorKB(q);
      if (r) allResults.push(`### 🔍 风格检索："${q}"\n${r}`);
      const s = searchSpatialKB(q);
      if (s) allResults.push(`### 🏛️ 设计师检索："${q}"\n${s}`);
      // Also search writers KB for scene mood / narrative context
      const w = searchWritersKB(q);
      if (w) allResults.push(`### 🔍 编剧检索："${q}"\n${w}`);
    }
    searchResults = allResults.join('\n\n');
    console.log('[scene-architect] KB search: ' + queries.length + ' queries → ' + allResults.length + ' results, ' + searchResults.length + ' chars');
  }

  // ── Era detection: always run for scene architect ──
  const dimsArch = await extractScriptTriggers(scriptText);
  const decisionArch = decideStyle(dimsArch || {});
  const eraArch = dimsArch?.era || '';
  const regionArch = dimsArch?.region || '';

  if (!searchResults) {
    console.log('[scene-architect] KB retrieval returned empty, falling back to style card');
    searchResults = buildStyleCard(dimsArch || {}, decisionArch);
  }

  const historyKBArch = getHistoricalKBForEra(eraArch, regionArch);
  const anachronismArch = buildEraAnachronismGuard(eraArch);

  // ── Round 2: Feed KB results + script → design spatial architecture ──
  const round2Msg = searchResults
    + (historyKBArch ? '\n\n' + historyKBArch : '')
    + (anachronismArch ? '\n\n' + anachronismArch : '')
    + '\n\n' + NEGATIVE_INTERIOR
    + '\n\n' + SCENE_ARCHITECT.systemPrompt
    + '\n\n## 剧本内容\n' + scriptText
    + '\n\n请为每个场景输出完整的空间设计方案（建筑风格/空间结构/材质语言/光照氛围/色彩体系/叙事功能）。';

  console.log('[scene-architect] Round 2: designing spaces (' + round2Msg.length + ' chars)...');
  let rawOutput: string | null = null;
  try {
    rawOutput = await gpt5Chat(
      [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: round2Msg }] }],
      { effort: 'medium', timeoutMs: 600000 },
    );
  } catch (err: any) { console.log('[scene-architect] Round 2 failed:', String(err).slice(0, 100)); return {}; }

  if (!rawOutput) { console.log('[scene-architect] No output'); return {}; }

  console.log('[scene-architect] Got output ' + rawOutput.length + ' chars in ' + (Date.now() - t0) + 'ms');
  return parseArchitectBlocks(rawOutput);
}

function parseArchitectBlocks(rawOutput: string): Record<string, string> {
  const designs: Record<string, string> = {};
  const blocks = rawOutput.split(/===+/).map(b => b.trim()).filter(b => b.length > 30);
  for (const block of blocks) {
    const headerMatch = block.match(/【场景名称】\s*\n?\s*(.+)/);
    if (!headerMatch) continue;
    const name = headerMatch[1].trim();
    if (!name || name.length > 50) continue;
    designs[name] = block;
  }
  return designs;
}

// ─── Prop Designer (道具设计，GPT-5.4) ──
export async function runPropDesigner(scriptText: string): Promise<Record<string, string>> {
  const t0 = Date.now();
  console.log('[prop-designer] Starting, script length=' + scriptText.length);

  // Era-aware historical weapons/props injection
  const dims = await extractScriptTriggers(scriptText);
  const historyKB = getHistoricalKBForEra(dims?.era || '', dims?.region || '');
  const anachronismGuard = buildEraAnachronismGuard(dims?.era || '');

  const userMessage = (historyKB ? historyKB + '\n\n' : '') + (anachronismGuard ? anachronismGuard + '\n\n' : '') + PROP_DESIGNER.systemPrompt + `\n\n剧本内容：\n${scriptText}\n\n请识别所有关键道具，为每个道具输出完整设计方案（材质/结构/时代背景/使用痕迹/象征意义/角色关联性）。`;

  const gptMsgs = [
    { role: 'user' as const, content: [{ type: 'input_text' as const, text: userMessage }] },
  ];

  let rawOutput: string | null = null;
  try {
    rawOutput = await gpt5Chat(gptMsgs, { effort: 'medium', timeoutMs: 600000 });
  } catch (err: any) {
    console.log('[prop-designer] Failed:', String(err).slice(0, 100));
    return {};
  }

  if (!rawOutput) { console.log('[prop-designer] No output'); return {}; }

  console.log('[prop-designer] Got output ' + rawOutput.length + ' chars in ' + (Date.now() - t0) + 'ms');

  const props: Record<string, string> = {};
  const blocks = rawOutput.split(/===+/).map(b => b.trim()).filter(b => b.length > 30);
  for (const block of blocks) {
    const headerMatch = block.match(/【道具名称】\s*\n?\s*(.+)/);
    if (!headerMatch) continue;
    const name = headerMatch[1].trim();
    if (!name || name.length > 50) continue;
    props[name] = block;
  }

  console.log('[prop-designer] Parsed ' + Object.keys(props).length + ' props');
  return props;
}

// ─── Semantic Music Metadata Extractor ──
// GPT analyzes Chinese script → outputs English structured keywords → feeds into KB matching

const MUSIC_EXTRACTION_PROMPT = `You are a music supervisor analyzing a film script. Output ONLY valid JSON, no markdown, no explanation.

Analyze the script and output:
{
  "enrichedQuery": "English keywords string for searching music knowledge base",
  "genres": ["Epic Orchestral", "Dark Ambient", ...],
  "emotions": ["Heroic", "Melancholic", ...],
  "sceneTypes": ["Battle", "Sunset Farewell", ...],
  "instruments": ["Strings", "Brass", "Taiko", ...],
  "ethnicStyles": ["Chinese Folk", "Nordic", ...],
  "bpmEstimate": [80, 140],
  "analysis": "Chinese text summarizing what kind of music this scene needs and why"
}

Rules:
- genres/emotions/instruments/ethnicStyles: MUST be in English, use standard music terminology
- enrichedQuery: space-separated English keywords covering all extracted concepts
- sceneTypes: descriptive English labels for the scene type
- bpmEstimate: [min, max] based on scene energy level
- analysis: 2-3 Chinese sentences explaining your music choice
- If the script has multiple distinct scenes, analyze the dominant/most important one
- Only output the JSON object, nothing else`;

async function extractMusicMetadata(scriptText: string): Promise<{
  enrichedQuery: string;
  genres: string[];
  emotions: string[];
  sceneTypes: string[];
  instruments: string[];
  ethnicStyles: string[];
  bpmEstimate: [number, number];
  analysis: string;
} | null> {
  try {
    const msgs = [
      { role: 'user' as const, content: [{ type: 'input_text' as const, text: `${MUSIC_EXTRACTION_PROMPT}\n\n剧本内容:\n${scriptText}` }] },
    ];
    const raw = await gpt5Chat(msgs, { effort: 'low', timeoutMs: 30000, maxOutputTokens: 1024 });
    if (!raw) { console.log('[extract-metadata] No GPT output'); return null; }

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { console.log('[extract-metadata] No JSON found in:', raw.slice(0, 200)); return null; }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('[extract-metadata] Extracted:', {
      genres: parsed.genres?.join(',') || 'none',
      emotions: parsed.emotions?.join(',') || 'none',
      instruments: parsed.instruments?.join(',') || 'none',
      bpm: parsed.bpmEstimate?.join('-') || 'none',
    });

    return {
      enrichedQuery: parsed.enrichedQuery || '',
      genres: parsed.genres || [],
      emotions: parsed.emotions || [],
      sceneTypes: parsed.sceneTypes || [],
      instruments: parsed.instruments || [],
      ethnicStyles: parsed.ethnicStyles || [],
      bpmEstimate: Array.isArray(parsed.bpmEstimate) && parsed.bpmEstimate.length === 2
        ? [parsed.bpmEstimate[0], parsed.bpmEstimate[1]] as [number, number]
        : [60, 120] as [number, number],
      analysis: parsed.analysis || '',
    };
  } catch (err: any) {
    console.log('[extract-metadata] Failed:', String(err).slice(0, 150));
    return null;
  }
}

// ─── Semantic Music Extractor (Round 1 augmented with KB directions) ──
async function extractMusicMetadataWithHints(scriptText: string, kbDirections: string): Promise<{
  enrichedQuery: string; genres: string[]; emotions: string[]; sceneTypes: string[];
  instruments: string[]; ethnicStyles: string[]; bpmEstimate: [number, number]; analysis: string;
} | null> {
  try {
    const augmentedPrompt = MUSIC_EXTRACTION_PROMPT + `\n\n## 知识库检索方向（Round 1 GPT自主决定的搜索范围，优先参考）\n${kbDirections}`;
    const msgs = [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: `${augmentedPrompt}\n\n剧本内容:\n${scriptText}` }] }];
    const raw = await gpt5Chat(msgs, { effort: 'low', timeoutMs: 30000, maxOutputTokens: 1024 });
    if (!raw) { console.log('[extract-metadata-hints] No GPT output'); return null; }
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) { console.log('[extract-metadata-hints] No JSON found'); return null; }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      enrichedQuery: parsed.enrichedQuery || '',
      genres: parsed.genres || [], emotions: parsed.emotions || [],
      sceneTypes: parsed.sceneTypes || [], instruments: parsed.instruments || [],
      ethnicStyles: parsed.ethnicStyles || [],
      bpmEstimate: Array.isArray(parsed.bpmEstimate) && parsed.bpmEstimate.length === 2
        ? [parsed.bpmEstimate[0], parsed.bpmEstimate[1]] as [number, number] : [60, 120] as [number, number],
      analysis: parsed.analysis || '',
    };
  } catch (err: any) { console.log('[extract-metadata-hints] Failed:', String(err).slice(0, 150)); return null; }
}

// ─── Sound Composer (声音与音乐设计，GPT-5.4 → Suno) ──
export async function runSoundComposer(scriptText: string, userFeedback?: string, existingContent?: string): Promise<{ scenes: Record<string, string>; sunoPrompts: Record<string, string> }> {
  const t0 = Date.now();
  console.log('[sound-composer] Starting, script length=' + scriptText.length + ' feedback=' + !!userFeedback);

  // ─── Regeneration path ───
  if (userFeedback) {
    const metadata = await extractMusicMetadata(scriptText);
    const { queryMusicKBWithHints, formatKBContext, generateKBSummary } = await import('./music-kb.js');
    const kbResult = metadata ? queryMusicKBWithHints(scriptText, metadata) : queryMusicKBWithHints(scriptText);
    const kbContext = formatKBContext(kbResult); const kbSummary = generateKBSummary();
    const { recommendComposersWithHints, formatComposerContext, composerStats } = await import('./composer-kb.js');
    const composerHints = metadata ? { genres: metadata.genres, emotions: metadata.emotions, sceneTypes: metadata.sceneTypes, instruments: metadata.instruments, ethnicStyles: metadata.ethnicStyles, enrichedQuery: metadata.enrichedQuery } : undefined;
    const composerResult = recommendComposersWithHints(scriptText, composerHints, 5);
    const composerContext = formatComposerContext(scriptText, 5); const cStats = composerStats();
    const musicPlan = await planMusic(scriptText); const musicPlanBlock = formatMusicPlanForPrompt(musicPlan);
    const gptAnalysisBlock = metadata?.analysis ? `\n\n## GPT 语义分析 (中文)\n${metadata.analysis}\n\n## GPT 提取关键词 (英文)\n${metadata.enrichedQuery}` : '';

    const userMessage = await injectFeedback(SOUND_COMPOSER.systemPrompt, userFeedback, existingContent, 'music', scriptText)
      + musicPlanBlock
      + `\n\n## 音乐知识库概览\n${kbSummary}\n作曲家库: ${cStats.total}位 (SSS:${cStats.tiers.SSS} SS:${cStats.tiers.SS} S:${cStats.tiers.S} A:${cStats.tiers.A})`
      + gptAnalysisBlock
      + `\n\n## 知识库匹配结果\n${kbContext}\n\n${composerContext}\n\n## 剧本内容\n${scriptText}\n\n请为每个关键场景输出完整的声音设计方案，参考以上知识库的流派/情绪/配器推荐及音乐家风格参考，每个场景的 Suno Prompt 必须输出英文。`;

    const gptMsgs = [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: userMessage }] }];
    let rawOutput: string | null = null;
    try { rawOutput = await gpt5Chat(gptMsgs, { effort: 'medium', timeoutMs: 600000 }); } catch (err: any) { console.log('[sound-composer] Failed:', String(err).slice(0, 100)); return { scenes: {}, sunoPrompts: {} }; }
    if (!rawOutput) { console.log('[sound-composer] No output'); return { scenes: {}, sunoPrompts: {} }; }
    console.log('[sound-composer] Regeneration output ' + rawOutput.length + ' chars in ' + (Date.now() - t0) + 'ms');
    return parseSoundBlocks(rawOutput);
  }

  // ═══════════════════════════════════════════
  // ─── First-run: Two-round KB retrieval ───
  // ═══════════════════════════════════════════

  // ── Round 1: Ask GPT-5.4 what music KB sections it needs ──
  const round1Msg = KB_CATALOG + '\n\n' + KB_RETRIEVAL_PROMPT_MUSIC + '\n\n剧本内容：\n' + scriptText;
  console.log('[sound-composer] Round 1: asking GPT-5.4 what to retrieve...');

  let keywords: string | null = null;
  try {
    keywords = await gpt5Chat(
      [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: round1Msg }] }],
      { effort: 'low', maxOutputTokens: 500, timeoutMs: 30000 },
    );
  } catch (err: any) { console.log('[sound-composer] Round 1 failed:', String(err).slice(0, 100)); }

  const kbDirections = keywords && keywords.length > 20 ? keywords.slice(0, 800) : '';
  if (kbDirections) console.log('[sound-composer] Round 1 response: ' + keywords!.slice(0, 200).replace(/\n/g, ' | '));

  // ── Step 1: Semantic extraction (augmented with Round 1 KB directions) ──
  const metadata = kbDirections
    ? await extractMusicMetadataWithHints(scriptText, kbDirections)
    : await extractMusicMetadata(scriptText);

  // ── Step 2: Query music KB ──
  const { queryMusicKBWithHints, formatKBContext, generateKBSummary } = await import('./music-kb.js');
  const kbResult = metadata ? queryMusicKBWithHints(scriptText, metadata) : queryMusicKBWithHints(scriptText);
  const kbContextFormatted = formatKBContext(kbResult); const kbSummary = generateKBSummary();
  console.log('[sound-composer] KB matches:', {
    genres: kbResult.genres.map(g => g.name).join(','),
    emotions: kbResult.emotions.map(e => e.name).join(','),
    instruments: kbResult.instruments.map(i => i.name).join(','),
    hints: metadata ? `genres=${metadata.genres.join(',')}` : 'none',
  });

  // ── Step 3: Query composer KB ──
  const { recommendComposersWithHints, formatComposerContext, composerStats } = await import('./composer-kb.js');
  const composerHints = metadata ? {
    genres: metadata.genres, emotions: metadata.emotions, sceneTypes: metadata.sceneTypes,
    instruments: metadata.instruments, ethnicStyles: metadata.ethnicStyles, enrichedQuery: metadata.enrichedQuery,
  } : undefined;
  const composerResult = recommendComposersWithHints(scriptText, composerHints, 5);
  const composerContext = formatComposerContext(scriptText, 5); const cStats = composerStats();
  console.log('[sound-composer] Composer matches:', composerResult.composers.map(c => c.name).join(', '));

  // ── Step 3.5: Q Brain music planning ──
  const musicPlan = await planMusic(scriptText);
  const musicPlanBlock = formatMusicPlanForPrompt(musicPlan);
  if (musicPlan) console.log('[sound-composer] Q Brain plan: type=%s tracks=%d perTrack=%ds', musicPlan.contentType, musicPlan.trackCount, musicPlan.durationPerTrack);

  // ── Round 2: Feed KB results + directions + script → design music ──
  const round1Block = kbDirections ? `\n\n## 🎯 音乐总监检索方向（GPT Round 1 自主决定）\n${kbDirections}` : '';
  const gptAnalysisBlock = metadata?.analysis ? `\n\n## GPT 语义分析 (中文)\n${metadata.analysis}\n\n## GPT 提取关键词 (英文)\n${metadata.enrichedQuery}` : '';

  const round2Msg = round1Block
    + '\n\n' + SOUND_COMPOSER.systemPrompt
    + musicPlanBlock
    + `\n\n## 音乐知识库概览\n${kbSummary}\n作曲家库: ${cStats.total}位 (SSS:${cStats.tiers.SSS} SS:${cStats.tiers.SS} S:${cStats.tiers.S} A:${cStats.tiers.A})`
    + gptAnalysisBlock
    + `\n\n## 知识库匹配结果\n${kbContextFormatted}\n\n${composerContext}\n\n## 剧本内容\n${scriptText}\n\n请为每个关键场景输出完整的声音设计方案，参考以上知识库的流派/情绪/配器推荐及音乐家风格参考，每个场景的 Suno Prompt 必须输出英文。`;

  console.log('[sound-composer] Round 2: designing music (' + round2Msg.length + ' chars)...');
  let rawOutput: string | null = null;
  try {
    rawOutput = await gpt5Chat(
      [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: round2Msg }] }],
      { effort: 'medium', timeoutMs: 600000 },
    );
  } catch (err: any) { console.log('[sound-composer] Round 2 failed:', String(err).slice(0, 100)); return { scenes: {}, sunoPrompts: {} }; }

  if (!rawOutput) { console.log('[sound-composer] No output'); return { scenes: {}, sunoPrompts: {} }; }
  console.log('[sound-composer] Got output ' + rawOutput.length + ' chars in ' + (Date.now() - t0) + 'ms');
  return parseSoundBlocks(rawOutput);
}

function parseSoundBlocks(rawOutput: string): { scenes: Record<string, string>; sunoPrompts: Record<string, string> } {
  const scenes: Record<string, string> = {};
  const sunoPrompts: Record<string, string> = {};
  const blocks = rawOutput.split(/===+/).map(b => b.trim()).filter(b => b.length > 30);

  for (const block of blocks) {
    // Extract scene name from 【场景名称】
    const nameMatch = block.match(/【场景名称】\s*\n?\s*(.+)/);
    if (!nameMatch) continue;
    const name = nameMatch[1].trim();
    if (!name || name.length > 60) continue;

    // Store full sound design block
    scenes[name] = block;

    // Extract Suno Prompt from within the same block
    const sunoMatch = block.match(/【Suno Prompt】\s*\n?\s*(?:⚠️[^\n]*\n?)?\s*(?:格式：[^\n]*\n?)?\s*([\s\S]+?)(?=\n【|\n===|$)/);
    if (sunoMatch) {
      let prompt = sunoMatch[1].trim();
      // Clean instruction lines if captured
      prompt = prompt.replace(/^⚠️[^\n]*\n?/gm, '').replace(/^格式：[^\n]*\n?/gm, '').trim();
      if (prompt.length > 0 && prompt.length < 500) {
        sunoPrompts[name] = prompt;
      }
    }
  }

  console.log('[sound-composer] Parsed ' + Object.keys(scenes).length + ' sound scenes, ' + Object.keys(sunoPrompts).length + ' suno prompts');
  return { scenes, sunoPrompts };
}

// ─── Phase 2: Storyboard Generation (receives character profiles) ──
export async function runScriptAnalysis(
  scriptText: string,
  visualStyle?: string,
  characterProfiles?: Record<string, string>,
  userFeedback?: string,
  existingContent?: string,
): Promise<ScriptAnalysisResult> {
  const t0 = Date.now();
  console.log('[script-analysis] Starting, script length=' + scriptText.length + ' chars=' + (characterProfiles ? Object.keys(characterProfiles).length : 0));

  const styleHint = visualStyle ? `\n用户指定风格：${visualStyle}` : '';

  // Embed pre-extracted character profiles (truncated to save storyboard token budget)
  let charBlock = '';
  if (characterProfiles && Object.keys(characterProfiles).length > 0) {
    charBlock = '\n## 已提取的角色清单（完整角色设计方案详见角色文档，此处仅提供分镜所需的角色识别信息）\n';
    for (const [name, desc] of Object.entries(characterProfiles)) {
      // Extract: name + 基本信息 + 服装概要 (first ~300 chars of each character)
      const summary = desc.replace(/^##\s*.+/m, '').trim().slice(0, 350);
      charBlock += `**${name}**：${summary}\n`;
    }
  }

  // ─── Regeneration path: use existing injectFeedback with constraint compilation ───
  if (userFeedback) {
    const basePrompt = await injectFeedback(SCRIPT_ANALYSIS.systemPrompt, userFeedback, existingContent, 'storyboard', scriptText);
    // Regen path also needs era-aware historical KB
    const dims = await extractScriptTriggers(scriptText);
    const historyKBR = getHistoricalKBForEra(dims?.era || '', dims?.region || '');
    const anachronismR = buildEraAnachronismGuard(dims?.era || '');
    const userMessage = (historyKBR ? historyKBR + '\n\n' : '') + (anachronismR ? anachronismR + '\n\n' : '') + basePrompt + `\n\n${NEGATIVE_CLOTHING}\n${NEGATIVE_INTERIOR}\n\n剧本内容：\n${scriptText}${styleHint}${charBlock}\n\n请严格按输出格式输出分镜表。注意：角色已提供，只需输出分镜表，不要输出角色清单。`;

    const gptMsgs = [
      { role: 'user' as const, content: [{ type: 'input_text' as const, text: userMessage }] },
    ];

    // 单次调用，不重试。
    // 原因：超时重试 = 同一份提示词发给 kie.ai 多份，产生重复计费。
    // 网络瞬时错误由 gpt5Chat 内部的 AbortController 处理即可。
    let rawOutput: string | null = null;
    try {
      rawOutput = await gpt5Chat(gptMsgs, { effort: 'medium', timeoutMs: 900000 });
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.log('[script-analysis] 超时（15分钟）— kie.ai 仍在处理中，不重试');
      } else {
        console.log('[script-analysis] 网络错误:', String(err).slice(0, 100));
      }
    }

    if (!rawOutput) {
      console.log('[script-analysis] GPT-5 call failed');
      return { shots: [], characters: {}, rawOutput: '', durationMs: Date.now() - t0 };
    }

    console.log('[script-analysis] Regeneration output ' + rawOutput.length + ' chars in ' + (Date.now() - t0) + 'ms');
    const characters = characterProfiles || {};
    const shots = parseShotBlocks(rawOutput);
    console.log('[script-analysis] Parsed ' + shots.length + ' shots, ' + Object.keys(characters).length + ' characters');

    return {
      shots,
      characters,
      rawOutput,
      durationMs: Date.now() - t0,
    };
  }

  // ═══════════════════════════════════════════
  // ─── Build context for storyboard generation ───
  // ═══════════════════════════════════════════
  // NOTE: We no longer do blind KB keyword search before analysis.
  // The SCRIPT_ANALYSIS system prompt now encodes deep cinematography/lighting
  // expertise. GPT thinks first, then designs shots. KB catalog is available
  // as reference within the prompt for specific factual needs.

  // Extract script triggers for style card (lightweight, provides era/region/mood context)
  const dimensions = await extractScriptTriggers(scriptText);
  const decision = decideStyle(dimensions || {});
  const styleCard = buildStyleCard(dimensions || {}, decision);

  // ── Historical KB injection: era-aware reference data ──
  const era = dimensions?.era || '';
  const region = dimensions?.region || '';
  const historyKB = getHistoricalKBForEra(era, region);
  const anachronismGuard = buildEraAnachronismGuard(era);

  // ── Round 2: Feed style card + script → design storyboard ──
  const round2Msg = styleCard
    + (historyKB ? '\n\n' + historyKB : '')
    + (anachronismGuard ? '\n\n' + anachronismGuard : '')
    + '\n\n' + NEGATIVE_CLOTHING
    + '\n' + NEGATIVE_INTERIOR
    + '\n\n' + SCRIPT_ANALYSIS.systemPrompt
    + '\n\n## 剧本内容\n' + scriptText
    + styleHint
    + charBlock
    + '\n\n请严格按输出格式输出分镜表。注意：角色已提供，只需输出分镜表，不要输出角色清单。';

  console.log('[script-analysis] Round 2: designing storyboard (' + round2Msg.length + ' chars)...');
  let rawOutput: string | null = null;
  try {
    rawOutput = await gpt5Chat(
      [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: round2Msg }] }],
      { effort: 'medium', timeoutMs: 900000 },
    );
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.log('[script-analysis] 超时（15分钟）— kie.ai 仍在处理中，不重试');
    } else {
      console.log('[script-analysis] 网络错误:', String(err).slice(0, 100));
    }
  }

  if (!rawOutput) {
    console.log('[script-analysis] GPT-5 call failed');
    return { shots: [], characters: {}, rawOutput: '', durationMs: Date.now() - t0 };
  }

  console.log('[script-analysis] Got output ' + rawOutput.length + ' chars in ' + (Date.now() - t0) + 'ms');

  // Use pre-extracted character profiles (no longer parsed from the same output)
  const characters = characterProfiles || {};

  // Parse shots from detailed template
  const shots = parseShotBlocks(rawOutput);

  console.log('[script-analysis] Parsed ' + shots.length + ' shots, ' + Object.keys(characters).length + ' characters');

  return {
    shots,
    characters,
    rawOutput,
    durationMs: Date.now() - t0,
  };
}

export function parseShotBlocks(output: string): ScriptAnalysisResult['shots'] {
  const shots: ScriptAnalysisResult['shots'] = [];

  // Find the storyboard section
  const boardStart = output.search(/###?\s*分镜表/);
  const section = boardStart >= 0 ? output.slice(boardStart) : output;

  // Split by ===
  const blocks = section.split(/===+/).filter(b => {
    const t = b.trim();
    return t.length > 50; // real content blocks only
  });

  blocks.forEach((block, i) => {
    const extract = (label: string): string => {
      const patterns = [
        new RegExp(label + '[：:]\\s*\\n?([^\\n]+)', 'i'),
        new RegExp(label + '[：:]\\s*\\n?([\\s\\S]*?)(?=\\n[^\\s]{1,8}[：:]|\\n===|$)', 'i'),
      ];
      for (const re of patterns) {
        const m = block.match(re);
        if (m) {
          const val = m[1].trim();
          if (val.length > 0) return val;
        }
      }
      return '';
    };

    // Extract all fields from the enhanced four-role format
    const shotFunction = extract('镜头功能') || '';
    const scene = extract('场景') || '';
    const shotType = extract('景别') || 'MS';
    const shotSide = extract('拍摄面') || '';
    const angle = extract('机位垂直') || extract('机位角度') || '平视';
    const lens = extract('焦段') || extract('镜头焦段') || '24mm';
    const composition = extract('构图') || extract('构图方式') || '';
    const depthLayers = extract('深度层次') || '';
    // Character fields — may be "无人物" for empty shots
    const characterPosition = extract('人物位置') || '';
    const characterFacing = extract('人物朝向') || '';
    const characterAction = extract('人物动作') || '';
    const characterExpression = extract('人物表情') || '';
    const characterProps = extract('手持') || extract('手持/接触物') || '';
    // Space layers
    const foreground = extract('前景') || '';
    const midground = extract('中景') || extract('中景主体') || '';
    const background = extract('背景') || '';
    // Lighting
    const lightSources = extract('场景光源') || '';
    const keyLight = extract('主光') || '';
    const fillLight = extract('辅光') || '';
    const rimLight = extract('轮廓光') || '';
    const specialLight = extract('特殊光效') || '';
    // Color & material
    const color = extract('色彩') || extract('色彩方案') || '';
    const material = extract('材质重点') || extract('材质表现') || '';
    const atmosphere = extract('画面氛围') || '';
    const imagePrompt = extract('提示词') || extract('视觉提示词') || '';

    // Assemble structured display template — ALL fields in order
    const parts: string[] = [];
    if (scene) parts.push(`场景：${scene}`);
    if (shotFunction) parts.push(`镜头功能：${shotFunction}`);
    if (shotType) parts.push(`景别：${shotType}`);
    if (shotSide) parts.push(`拍摄面：${shotSide}`);
    if (angle) parts.push(`机位：${angle}`);
    if (lens) parts.push(`焦段：${lens}`);
    if (composition) parts.push(`构图：${composition}`);
    if (depthLayers) parts.push(`深度：${depthLayers}`);
    if (characterPosition && characterPosition !== '无人物') parts.push(`人物位置：${characterPosition}`);
    if (characterFacing && characterFacing !== '无人物') parts.push(`朝向：${characterFacing}`);
    if (characterAction && characterAction !== '无人物') parts.push(`动作：${characterAction}`);
    if (characterExpression && characterExpression !== '无人物') parts.push(`表情：${characterExpression}`);
    if (characterProps && characterProps !== '无人物') parts.push(`手持：${characterProps}`);
    if (foreground) parts.push(`前景：${foreground}`);
    if (midground) parts.push(`中景：${midground}`);
    if (background) parts.push(`背景：${background}`);
    if (lightSources) parts.push(`光源：${lightSources}`);
    if (keyLight) parts.push(`主光：${keyLight}`);
    if (fillLight && fillLight !== '无') parts.push(`辅光：${fillLight}`);
    if (rimLight && rimLight !== '无') parts.push(`轮廓光：${rimLight}`);
    if (specialLight && specialLight !== '无') parts.push(`特效光：${specialLight}`);
    if (color) parts.push(`色彩：${color}`);
    if (material) parts.push(`材质：${material}`);
    if (atmosphere) parts.push(`氛围：${atmosphere}`);
    if (imagePrompt) parts.push(`画面描述：${imagePrompt}`);
    const fullDisplay = parts.join('\n');
    // Gen prompt = 提示词 (clean visual description for image model) | fallback to full display
    // Enhance with photorealism anchor based on shot type
    const rawPrompt = imagePrompt || fullDisplay;
    const photoPrefix = buildPhotorealismPrefix(shotType);
    const genPrompt = photoPrefix + ' ' + rawPrompt;

    shots.push({
      shotNumber: i + 1,
      shotFunction,
      scene,
      shotType,
      shotSide,
      angle,
      lens,
      composition,
      depthLayers,
      characterPosition: characterPosition === '无人物' ? '' : characterPosition,
      characterFacing: characterFacing === '无人物' ? '' : characterFacing,
      characterAction: characterAction === '无人物' ? '' : characterAction,
      characterExpression: characterExpression === '无人物' ? '' : characterExpression,
      characterProps: characterProps === '无人物' ? '' : characterProps,
      foreground,
      midground,
      background,
      lightSources,
      keyLight,
      fillLight: fillLight === '无' ? '' : fillLight,
      rimLight: rimLight === '无' ? '' : rimLight,
      specialLight: specialLight === '无' ? '' : specialLight,
      color,
      material,
      atmosphere,
      visualPrompt: fullDisplay,
      contentCN: fullDisplay,
      genPrompt,
    });
  });

  // Fallback: try markdown table parsing if no block results
  if (shots.length === 0) {
    return parseFallbackTable(output);
  }

  return shots;
}

function parseFallbackTable(output: string): ScriptAnalysisResult['shots'] {
  const shots: ScriptAnalysisResult['shots'] = [];
  const lines = output.split('\n');
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/\|.*镜号.*\|/.test(lines[i])) { headerIdx = i; break; }
  }
  if (headerIdx < 0) return shots;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) continue;
    if (/^\|[\s\-:]+\|$/.test(line)) continue;
    const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
    if (cells.length < 2) continue;
    const contentCell = cells.length >= 4 ? cells[Math.min(cells.length - 1, 3)] : cells[cells.length - 1];
    if (!contentCell || contentCell.length < 5) continue;
    shots.push({
      shotNumber: shots.length + 1,
      shotFunction: '', scene: contentCell, shotType: cells[1] || 'MS', shotSide: '', angle: '平视',
      lens: cells.length > 2 ? cells[2] : '50mm', composition: '', depthLayers: '',
      characterPosition: '', characterFacing: '', characterAction: '', characterExpression: '', characterProps: '',
      foreground: '', midground: '', background: '',
      lightSources: '', keyLight: '', fillLight: '', rimLight: '', specialLight: '',
      color: '', material: '', atmosphere: '',
      visualPrompt: contentCell,
      contentCN: contentCell,
      genPrompt: contentCell,
    });
  }
  return shots;
}

// ─── Fast Text Pipeline (single agent, for TEXT nodes) ──
export interface FullPipelineResult {
  shots: ScriptAnalysisResult | null;
  shotsError?: string;
  characters: Record<string, string> | null;
  charactersError?: string;
  scenes: Record<string, string> | null;
  scenesError?: string;
  sceneArchitecture: Record<string, string> | null;
  sceneArchError?: string;
  props: Record<string, string> | null;
  propsError?: string;
  music: { scenes: Record<string, string>; sunoPrompts: Record<string, string> } | null;
  musicError?: string;
  trace: AgentResult[];
  totalDurationMs: number;
}

export async function runFullPipeline(
  scriptText: string,
  visualStyle?: string,
  onComplete?: PipelineOnComplete,
): Promise<FullPipelineResult> {
  const t0 = Date.now();
  const trace: AgentResult[] = [];

  console.log('[full-pipeline] Starting with script length:', scriptText.length);

  // Run all 6 agents in parallel
  const [
    shotsResult, charsResult, scenesResult,
    archResult, propsResult, musicResult,
  ] = await Promise.allSettled([
    runScriptAnalysis(scriptText, visualStyle),
    runCharacterExtraction(scriptText, visualStyle),
    runSceneExtraction(scriptText),
    runSceneArchitect(scriptText),
    runPropDesigner(scriptText),
    runSoundComposer(scriptText),
  ]);

  const result: FullPipelineResult = {
    shots: null, characters: null, scenes: null,
    sceneArchitecture: null, props: null, music: null,
    trace,
    totalDurationMs: Date.now() - t0,
  };

  if (shotsResult.status === 'fulfilled') {
    result.shots = shotsResult.value;
  } else {
    result.shotsError = String(shotsResult.reason);
    console.error('[full-pipeline] Shots failed:', shotsResult.reason);
  }

  if (charsResult.status === 'fulfilled') {
    result.characters = charsResult.value;
  } else {
    result.charactersError = String(charsResult.reason);
    console.error('[full-pipeline] Characters failed:', charsResult.reason);
  }

  if (scenesResult.status === 'fulfilled') {
    result.scenes = scenesResult.value;
  } else {
    result.scenesError = String(scenesResult.reason);
    console.error('[full-pipeline] Scenes failed:', scenesResult.reason);
  }

  if (archResult.status === 'fulfilled') {
    result.sceneArchitecture = archResult.value;
  } else {
    result.sceneArchError = String(archResult.reason);
    console.error('[full-pipeline] SceneArch failed:', archResult.reason);
  }

  if (propsResult.status === 'fulfilled') {
    result.props = propsResult.value;
  } else {
    result.propsError = String(propsResult.reason);
    console.error('[full-pipeline] Props failed:', propsResult.reason);
  }

  if (musicResult.status === 'fulfilled') {
    result.music = musicResult.value;
  } else {
    result.musicError = String(musicResult.reason);
    console.error('[full-pipeline] Music failed:', musicResult.reason);
  }

  console.log('[full-pipeline] Complete in', result.totalDurationMs, 'ms');

  // Q-system onComplete hook — fire-and-forget
  if (onComplete) {
    try {
      const hookResult = await onComplete(result as unknown as Record<string, unknown>);
    } catch (err: any) {
      console.error('[full-pipeline] onComplete hook error:', err.message);
    }
  }

  return result;
}

export async function runTextPipeline(
  context: PipelineContext,
  onComplete?: PipelineOnComplete,
): Promise<TextPipelineResult> {
  const t0 = Date.now();
  const trace: AgentResult[] = [];

  console.log('[text-pipeline] Starting for: "' + context.userInput.slice(0, 60) + '..."');

  // ── Direct GPT-5.6 image→prompt reverse-engineering (single-step) ──
  // GPT-5.6 Sol natively sees the image — no intermediate text description needed.
  // Falls back to old two-step pipeline ONLY if direct reverse-engineering fails.
  if (context.referenceUrls && context.referenceUrls.length > 0 && !context.referenceAnalysis) {
    console.log('[text-pipeline] Direct GPT-5.6 image→prompt for ' + context.referenceUrls.length + ' image(s)...');
    const reverseResult = await reversePromptFromImages(context.referenceUrls, context.userInput);

    if (reverseResult) {
      const dur = Date.now() - t0;
      console.log('[text-pipeline] Direct reverse-engineering complete in ' + dur + 'ms');
      const textResult = {
        textOutput: reverseResult,
        trace: [{ agentId: 'reverse-prompt', agentName: 'GPT-5.6 Direct', output: reverseResult, durationMs: dur }],
        totalDurationMs: dur,
      };
      if (onComplete) {
        try { await onComplete(textResult as unknown as Record<string, unknown>); } catch (err: any) { console.error('[text-pipeline] onComplete error:', err.message); }
      }
      return textResult;
    }

    // Fallback to old two-step vision analysis pipeline
    console.log('[text-pipeline] Direct reverse-engineering failed, falling back to two-step Vision analysis...');
    const results = await analyzeReferenceImages(context.referenceUrls);
    const allFailed = results.every(r => r.includes('[Unable to fetch image]') || r.includes('[Vision analysis failed]'));
    if (allFailed) {
      console.log("[text-pipeline] All vision analyses failed, falling back to text-only");
    } else {
      context.referenceAnalysis = results.filter(function(r) { return !r.includes("[Unable to fetch image]") && !r.includes("[Vision analysis failed]"); });
    }
    console.log('[text-pipeline] Vision analysis fallback complete');
  }

  // Determine if we have usable image data (from fallback)
  const hasImageData = !!(context.referenceAnalysis && context.referenceAnalysis.length > 0 &&
    !context.referenceAnalysis.every(r => r.includes('[Unable to fetch image]') || r.includes('[Vision analysis failed]')));

  try {
    console.log('[text-pipeline] Running Prompt Analyst | hasImageData:', hasImageData, 'refUrls:', context.referenceUrls?.length || 0);
    const signalBlock = hasImageData
      ? '\n\n[系统] 参考图视觉分析数据已就绪，请执行图像反推。'
      : '\n\n[系统] 无参考图数据，请根据用户文本需求执行文本反推或提示词优化。';
    const augmentedContext = { ...context, userInput: context.userInput + signalBlock };
    const result = await runAgent(PROMPT_ANALYST, augmentedContext, {});
    console.log('[text-pipeline] Agent output (' + result.output.length + ' chars): ' + result.output.slice(0, 120));
    trace.push(result);

    console.log('[text-pipeline] Complete in ' + (Date.now() - t0) + 'ms');

    const textResult = {
      textOutput: result.output,
      trace,
      totalDurationMs: Date.now() - t0,
    };

    if (onComplete) {
      try { await onComplete(textResult as unknown as Record<string, unknown>); } catch (err: any) { console.error('[text-pipeline] onComplete error:', err.message); }
    }

    return textResult;
  } catch (err) {
    console.error('[text-pipeline] Error:', err);
    const errorResult = {
      textOutput: '失败请重新提交',
      trace,
      totalDurationMs: Date.now() - t0,
    };

    if (onComplete) {
      try { await onComplete(errorResult as unknown as Record<string, unknown>); } catch (err: any) { console.error('[text-pipeline] onComplete error:', err.message); }
    }

    return errorResult;
  }
}

// ─── Unified Pipeline — single GPT-5 call outputs all 6 categories ───
// Template is now DYNAMIC — Q Template Advisor analyzes genre/context to decide
// which sections are relevant. Fallback: default template (all sections included).

const UNIFIED_HEADER = `你是一位顶级电影导演兼视觉开发总监。阅读以下剧本，一次性完成六项分析。每项用 ===SECTION_NAME=== 开始标记。禁止输出思考过程，直接输出结构化内容。

## 风格默认原则与视觉参考
当剧本未明确指定服装风格/时代背景/美学方向时，默认当代时尚审美。有明确约束时严格遵循约束。

${FASHION_STYLE_DB}

${FASHION_COORDINATION_DB}

${INTERIOR_STYLE_DB}

${STYLE_DECISION_RULES}`;

function buildCharacterSection(ctx?: { hasWeapons?: boolean; genre?: string }): string {
  const hasWeapons = ctx?.hasWeapons ?? true; // default: include (backward compatible)
  const lines = [
    '===CHARACTERS===',
    '提取每个角色（有名字/有台词），为每个输出：',
    '- 人种/年龄/身高/体型',
    '- 面部特征（五官/肤色/伤疤/妆容）',
    '- 发型/发色',
    '- 服装（逐层：内衣→上衣→外套→下装→鞋履，含颜色/材质）',
    '- 配饰（首饰/腰带/头饰/眼镜/纹身）',
  ];
  if (hasWeapons) {
    lines.push('- 武器/工具（含材质与磨损）');
  }
  lines.push('- 三视图描述：正面/侧面/背面，左侧大版式');
  lines.push('- 表情集（3种：平静/喜悦/愤怒）+ 细节特写（2处：面料材质/标志性道具）');
  lines.push('- 身份/阵营推断[标注]');
  lines.push('用 --- 分隔每个角色。');
  return lines.join('\n');
}

function buildPropsSection(ctx?: { hasMeaningfulProps?: boolean }): string {
  const hasProps = ctx?.hasMeaningfulProps ?? true; // default: include
  const lines = [
    '===PROPS===',
  ];
  if (hasProps) {
    lines.push(
      '列出所有关键道具，每个包含：',
      '- 道具名称',
      '- 材质与结构',
      '- 时代背景',
      '- 使用痕迹/老化程度',
      '- 象征意义',
      '- 关联角色',
    );
  } else {
    lines.push('仅列出对剧情有实际推动作用的关键道具。如无关键道具，标注"本剧无关键道具"并跳过。');
  }
  lines.push('用 --- 分隔每个道具。');
  return lines.join('\n');
}

const UNIFIED_SCENES = `===SCENES===
列出所有场景，每个包含：
- 场景名称/位置
- 时间（时刻/季节）
- 天气/氛围
- 光线条件（方向/色温/强度）
- 色彩基调
- 关键环境元素
用 --- 分隔每个场景。`;

const UNIFIED_ARCHITECTURE = `===SCENE_ARCHITECTURE===
为每个场景输出空间设计方案：
- 建筑风格/空间类型
- 空间尺度（层高/面积/纵深）
- 材质体系（墙面/地面/天花/家具）
- 光照方案（光源位置/类型/色温）
- 色彩体系
- 空间叙事功能
用 --- 分隔每个场景。`;

const UNIFIED_MUSIC = `===MUSIC===
为全片设计音乐方案，每个场景包含：
- 音乐风格（流派/乐器/BPM/情绪）
- Suno格式音乐提示词（英文）
- 关键音效设计要点
用 --- 分隔每个场景的音乐设计。`;

const UNIFIED_STORYBOARD = `===STORYBOARD===
输出完整中文分镜表。全片统一1-2个导演风格。每镜用 === 分隔：
⚠️ 引用格式（必须遵守）：每个镜头中出现的角色必须写 @角色名，场景必须写 @场景名。这是生图链接参考图的唯一标识。
场景：{中文详述 + @场景名}
景别：{ELS/LS/WS/MS/MCU/CU/ECU}
机位角度：{平视/仰拍/俯拍}
焦段：{24/35/50/85mm}
构图：{三分法/中心/对称/对角线/引导线}
前景：{前景元素}
中景：{主体内容与人物 + @角色名}
背景：{环境元素}
调度：{站位/朝向/运动 + @角色名}
动作：{关键瞬间}
情绪：{情绪与氛围}
运镜：{固定/推/拉/摇/升降/手持}
画面重点：{核心视觉}
提示词：{中文整句，融合导演风格，包含@角色名和@场景名，禁英文}

导演风格参考（全片选1-2个统一）：
- 史诗/战争 → 诺兰冷灰史诗+黑泽明天气情绪
- 黑暗/犯罪 → 维伦纽瓦巨物压迫+雷德利高反差粗粝
- 情感/文艺 → 王家卫霓虹忧郁+新海诚光斑眩光
- 赛博/科幻 → 押井守哲学静止+大友克洋饱和密度
- 童话/寓言 → 韦斯安德森极致对称+宫崎骏自然敬畏`;

function buildUnifiedPrompt(ctx?: { hasWeapons?: boolean; hasMeaningfulProps?: boolean; genre?: string }): string {
  return [
    UNIFIED_HEADER,
    buildCharacterSection(ctx),
    UNIFIED_SCENES,
    UNIFIED_ARCHITECTURE,
    buildPropsSection(ctx),
    UNIFIED_MUSIC,
    UNIFIED_STORYBOARD,
  ].join('\n\n');
}

export async function runUnifiedPipeline(
  scriptText: string,
  visualStyle?: string,
  onComplete?: PipelineOnComplete,
): Promise<FullPipelineResult> {
  const t0 = Date.now();
  const styleHint = visualStyle ? '\n用户指定视觉风格：' + visualStyle : '';

  // ── Q Template Advisor: analyze genre → dynamic template ──
  let templateCtx: { hasWeapons?: boolean; hasMeaningfulProps?: boolean; genre?: string } | undefined;
  try {
    const qCtx = await analyzeScriptContext(scriptText, visualStyle);
    templateCtx = {
      hasWeapons: qCtx.hasWeapons,
      hasMeaningfulProps: qCtx.hasMeaningfulProps,
      genre: qCtx.genre,
    };
    console.log('[unified] Q advisor:', qCtx.reasoning,
      '| weapons=' + qCtx.hasWeapons,
      '| props=' + qCtx.hasMeaningfulProps,
      '| genre=' + qCtx.genre,
      '| source=' + qCtx.source);
  } catch (err: any) {
    console.log('[unified] Q advisor unavailable, using default template:', err.message?.slice(0, 60));
    // templateCtx stays undefined → default template with all sections
  }

  const dynamicPrompt = buildUnifiedPrompt(templateCtx);
  console.log('[unified] Starting single GPT call, script=' + scriptText.length + 'chars');

  const msgs = [{ role: 'user' as const, content: [{ type: 'input_text' as const, text: dynamicPrompt + '\n\n===== 剧本 =====\n' + scriptText + styleHint }] }];

  // noTimeout: SSE 流不会被 AbortController 掐断，kie.ai 完成后自然返回结果
  // 不再因客户端超时而丢弃 kie.ai 已生成的数据
  let raw: string | null = null;
  try {
    raw = await gpt5Chat(msgs, { effort: 'high', noTimeout: true });
  } catch (err: any) {
    console.log('[unified] GPT call 1 failed:', err?.name || String(err).slice(0, 80));
  }
  if (!raw) {
    console.log('[unified] GPT call 1 returned null, retrying after 3s...');
    await new Promise(r => setTimeout(r, 3000));
    try {
      raw = await gpt5Chat(msgs, { effort: 'high', noTimeout: true });
    } catch (err: any) {
      console.log('[unified] GPT call 2 failed:', err?.name || String(err).slice(0, 80));
    }
  }
  if (!raw) {
    const err = new Error('Unified pipeline: GPT returned null after 2 attempts (API error or network failure)');
    if (onComplete) {
      try { await onComplete({ shots: null, characters: null, scenes: null, sceneArchitecture: null, props: null, music: null, trace: [], totalDurationMs: Date.now() - t0 } as unknown as Record<string, unknown>); } catch (e: any) { console.error('[unified] onComplete error:', e.message); }
    }
    throw err;
  }

  console.log('[unified] Output ' + raw.length + 'chars');

  // Parse 6 sections
  const SECTIONS = ['CHARACTERS','SCENES','SCENE_ARCHITECTURE','PROPS','MUSIC','STORYBOARD'] as const;
  const parsed: Record<string,string> = {};
  for (const sec of SECTIONS) {
    const m = raw.indexOf('===' + sec + '===');
    if (m === -1) { parsed[sec] = ''; continue; }
    const start = m + sec.length + 6;
    let end = raw.length;
    for (const s2 of SECTIONS) {
      const nm = raw.indexOf('===' + s2 + '===', start);
      if (nm !== -1 && nm < end) end = nm;
    }
    parsed[sec] = raw.slice(start, end).trim();
  }
  console.log('[unified] Sections:', SECTIONS.map(s => s + ':' + parsed[s].length).join(' '));

  // Parse blocks within each section (--- separated)
  const parseBlocks = (t: string): Record<string,string> => {
    if (!t) return {};
    const r: Record<string,string> = {};
    t.split(/^---$/m).filter(b => b.trim()).forEach((b,i) => {
      const first = b.trim().split('\n')[0].replace(/^#+\s*/,'').trim();
      r[first || ('item' + (i+1))] = b.trim();
    });
    return r;
  };

  // Parse storyboard shots
  let shots: ScriptAnalysisResult | null = null;
  if (parsed.STORYBOARD) {
    const shotList: ScriptAnalysisResult['shots'] = [];
    const blocks = parsed.STORYBOARD.split(/^===$/m).filter(b => b.trim());
    (blocks.length > 0 ? blocks : [parsed.STORYBOARD]).forEach((b, i) => {
      const t = b.trim();
      const ext = (re: RegExp) => { const m = t.match(re); return m ? (m[1]||'').trim() : ''; };
      const s: any = {
        shotNumber: i + 1,
        shotFunction: ext(/镜头功能[：:]\s*(.+)/) || '',
        scene: ext(/场景[：:]\s*(.+)/) || ext(/Scene[：:]\s*(.+)/i) || '',
        shotType: ext(/景别[：:]\s*(.+)/) || '',
        shotSide: ext(/拍摄面[：:]\s*(.+)/) || '',
        angle: ext(/机位垂直[：:]\s*(.+)/) || ext(/机位角度[：:]\s*(.+)/) || ext(/角度[：:]\s*(.+)/) || '',
        lens: ext(/焦段[：:]\s*(.+)/) || '',
        composition: ext(/构图[：:]\s*(.+)/) || '',
        depthLayers: ext(/深度层次[：:]\s*(.+)/) || '',
        characterPosition: ext(/人物位置[：:]\s*(.+)/) || '',
        characterFacing: ext(/人物朝向[：:]\s*(.+)/) || '',
        characterAction: ext(/人物动作[：:]\s*(.+)/) || '',
        characterExpression: ext(/人物表情[：:]\s*(.+)/) || '',
        characterProps: ext(/手持[：:]\s*(.+)/) || ext(/手持\/接触物[：:]\s*(.+)/) || '',
        foreground: ext(/前景[：:]\s*(.+)/) || '',
        midground: ext(/中景[：:]\s*(.+)/) || '',
        background: ext(/背景[：:]\s*(.+)/) || '',
        lightSources: ext(/场景光源[：:]\s*(.+)/) || '',
        keyLight: ext(/主光[：:]\s*(.+)/) || '',
        fillLight: ext(/辅光[：:]\s*(.+)/) || '',
        rimLight: ext(/轮廓光[：:]\s*(.+)/) || '',
        specialLight: ext(/特殊光效[：:]\s*(.+)/) || '',
        color: ext(/色彩[：:]\s*(.+)/) || ext(/色彩方案[：:]\s*(.+)/) || '',
        material: ext(/材质重点[：:]\s*(.+)/) || ext(/材质表现[：:]\s*(.+)/) || '',
        atmosphere: ext(/画面氛围[：:]\s*(.+)/) || '',
        visualPrompt: ext(/提示词[：:]\s*(.+)/) || '',
      };
      s.genPrompt = s.visualPrompt;
      // Build full display
      const dp: string[] = [];
      if (s.scene) dp.push(`场景：${s.scene}`);
      if (s.shotFunction) dp.push(`镜头功能：${s.shotFunction}`);
      if (s.shotType) dp.push(`景别：${s.shotType}`);
      if (s.shotSide) dp.push(`拍摄面：${s.shotSide}`);
      if (s.angle) dp.push(`机位：${s.angle}`);
      if (s.lens) dp.push(`焦段：${s.lens}`);
      if (s.composition) dp.push(`构图：${s.composition}`);
      if (s.depthLayers) dp.push(`深度：${s.depthLayers}`);
      const cp = s.characterPosition; if (cp && cp !== '无人物') dp.push(`人物位置：${cp}`);
      const cf = s.characterFacing; if (cf && cf !== '无人物') dp.push(`朝向：${cf}`);
      const ca = s.characterAction; if (ca && ca !== '无人物') dp.push(`动作：${ca}`);
      const ce = s.characterExpression; if (ce && ce !== '无人物') dp.push(`表情：${ce}`);
      const cpr = s.characterProps; if (cpr && cpr !== '无人物') dp.push(`手持：${cpr}`);
      if (s.foreground) dp.push(`前景：${s.foreground}`);
      if (s.midground) dp.push(`中景：${s.midground}`);
      if (s.background) dp.push(`背景：${s.background}`);
      if (s.lightSources) dp.push(`光源：${s.lightSources}`);
      if (s.keyLight) dp.push(`主光：${s.keyLight}`);
      if (s.fillLight && s.fillLight !== '无') dp.push(`辅光：${s.fillLight}`);
      if (s.rimLight && s.rimLight !== '无') dp.push(`轮廓光：${s.rimLight}`);
      if (s.specialLight && s.specialLight !== '无') dp.push(`特效光：${s.specialLight}`);
      if (s.color) dp.push(`色彩：${s.color}`);
      if (s.material) dp.push(`材质：${s.material}`);
      if (s.atmosphere) dp.push(`氛围：${s.atmosphere}`);
      if (s.genPrompt) dp.push(`画面描述：${s.genPrompt}`);
      s.visualPrompt = dp.join('\n');
      s.contentCN = s.visualPrompt;
      shotList.push(s);
    });
    if (shotList.length > 0) shots = { shots: shotList, characters: {}, rawOutput: parsed.STORYBOARD, durationMs: 0 };
  }

  const musicScenes = parseBlocks(parsed.MUSIC);
  const unifiedResult = {
    shots,
    characters: parseBlocks(parsed.CHARACTERS),
    scenes: parseBlocks(parsed.SCENES),
    sceneArchitecture: parseBlocks(parsed.SCENE_ARCHITECTURE),
    props: parseBlocks(parsed.PROPS),
    music: { scenes: musicScenes, sunoPrompts: musicScenes },
    trace: [],
    totalDurationMs: Date.now() - t0,
  };

  // Q-system onComplete hook
  if (onComplete) {
    try { await onComplete(unifiedResult as unknown as Record<string, unknown>); } catch (err: any) { console.error('[unified] onComplete error:', err.message); }
  }

  return unifiedResult;
}
