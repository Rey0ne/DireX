/* === Composer Database — 全球200位核心音乐家资料库 === */
/* Organized by: Film Score / Classical / Electronic / World / Game / Rock-Pop / Avant-Garde */

export interface ComposerProfile {
  name: string;           // English name
  nameCN: string;         // Chinese name
  country: string;        // Country
  countryCN: string;      // Chinese country name
  era: string;            // Active era (e.g. "1990s-present", "18th Century")
  type: string;           // Primary type (Film Score, Classical, Electronic, etc.)
  styles: string[];       // Musical styles (English)
  stylesCN: string[];     // Musical styles (Chinese)
  emotions: string[];     // Emotional signatures (English)
  emotionsCN: string[];   // Emotional signatures (Chinese)
  instruments: string[];  // Signature instruments
  instrumentsCN: string[];// Signature instruments (Chinese)
  scenes: string[];       // Best suited scenes
  scenesCN: string[];     // Best suited scenes (Chinese)
  sunoKeywords: string[]; // Keywords for Suno prompt generation
  influence: 'SSS' | 'SS' | 'S' | 'A'; // Influence tier
  notableWorks: string[]; // Notable works
  notableWorksCN: string[];// Notable works (Chinese)
  tags: string[];         // Search tags
}

// ═══════════════════════════════════════════════════════════
// FILM SCORE COMPOSERS (70)
// ═══════════════════════════════════════════════════════════

const FILM_SCORE_COMPOSERS: ComposerProfile[] = [
  // ── SSS Tier: Legends ──
  {
    name: 'Hans Zimmer', nameCN: '汉斯·季默', country: 'Germany', countryCN: '德国', era: '1980s-present', type: 'Film Score',
    styles: ['Epic', 'Hybrid', 'Sci-Fi', 'Orchestral'], stylesCN: ['史诗', '混合', '科幻', '管弦'],
    emotions: ['Heroic', 'Powerful', 'Destiny', 'Epic'], emotionsCN: ['英雄', '力量', '宿命', '史诗'],
    instruments: ['Brass', 'Strings', 'Massive Percussion', 'Synth', 'Organ'], instrumentsCN: ['铜管', '弦乐', '大型打击乐', '合成器', '管风琴'],
    scenes: ['War', 'Royalty', 'Destiny', 'Space', 'Hero Journey'], scenesCN: ['战争', '王权', '宿命', '太空', '英雄之旅'],
    sunoKeywords: ['epic orchestral', 'hybrid score', 'cinematic percussion', 'powerful brass', 'Zimmer style'],
    influence: 'SSS', notableWorks: ['Inception', 'Interstellar', 'The Lion King', 'Gladiator', 'Dune', 'Pirates of the Caribbean'],
    notableWorksCN: ['盗梦空间', '星际穿越', '狮子王', '角斗士', '沙丘', '加勒比海盗'],
    tags: ['epic', 'hybrid', 'blockbuster', 'braam', 'inception horn', 'time'],
  },
  {
    name: 'John Williams', nameCN: '约翰·威廉姆斯', country: 'USA', countryCN: '美国', era: '1960s-present', type: 'Film Score',
    styles: ['Orchestral', 'Adventure', 'Fantasy', 'Heroic'], stylesCN: ['管弦', '冒险', '奇幻', '英雄'],
    emotions: ['Heroic', 'Wonder', 'Adventurous', 'Majestic'], emotionsCN: ['英雄', '惊奇', '冒险', '雄伟'],
    instruments: ['Brass', 'Strings', 'Woodwinds', 'Harp', 'Choir'], instrumentsCN: ['铜管', '弦乐', '木管', '竖琴', '合唱'],
    scenes: ['Adventure', 'Space', 'Magic', 'Childhood', 'Heroism'], scenesCN: ['冒险', '太空', '魔法', '童年', '英雄主义'],
    sunoKeywords: ['orchestral', 'adventure theme', 'Williams style', 'brass fanfare', 'magical strings'],
    influence: 'SSS', notableWorks: ['Star Wars', 'Jurassic Park', 'Harry Potter', 'ET', 'Indiana Jones', 'Schindler\'s List'],
    notableWorksCN: ['星球大战', '侏罗纪公园', '哈利波特', 'ET', '夺宝奇兵', '辛德勒的名单'],
    tags: ['orchestral', 'leitmotif', 'adventure', 'space opera', 'magic'],
  },
  {
    name: 'Ennio Morricone', nameCN: '埃尼奥·莫里康内', country: 'Italy', countryCN: '意大利', era: '1960s-2020', type: 'Film Score',
    styles: ['Spaghetti Western', 'Orchestral', 'Experimental', 'Italian'], stylesCN: ['意大利西部片', '管弦', '实验', '意大利'],
    emotions: ['Epic', 'Melancholic', 'Mysterious', 'Dramatic'], emotionsCN: ['史诗', '忧伤', '神秘', '戏剧'],
    instruments: ['Electric Guitar', 'Whistle', 'Harmonica', 'Trumpet', 'Choir', 'Ocarina'], instrumentsCN: ['电吉他', '口哨', '口琴', '小号', '合唱', '陶笛'],
    scenes: ['Western', 'Desert', 'Showdown', 'Destiny', 'Tragedy'], scenesCN: ['西部', '沙漠', '对决', '宿命', '悲剧'],
    sunoKeywords: ['spaghetti western', 'Morricone style', 'whistle theme', 'dramatic choir', 'electric guitar western'],
    influence: 'SSS', notableWorks: ['The Good the Bad and the Ugly', 'Once Upon a Time in the West', 'The Mission', 'Cinema Paradiso'],
    notableWorksCN: ['黄金三镖客', '西部往事', '教会', '天堂电影院'],
    tags: ['western', 'spaghetti', 'whistle', 'Italian', 'epic'],
  },
  {
    name: 'John Barry', nameCN: '约翰·巴里', country: 'UK', countryCN: '英国', era: '1960s-2000', type: 'Film Score',
    styles: ['Orchestral', 'Jazz', 'Romantic', 'Spy'], stylesCN: ['管弦', '爵士', '浪漫', '谍战'],
    emotions: ['Romantic', 'Elegant', 'Mysterious', 'Dramatic'], emotionsCN: ['浪漫', '优雅', '神秘', '戏剧'],
    instruments: ['Strings', 'Brass', 'Piano', 'Saxophone', 'Harp'], instrumentsCN: ['弦乐', '铜管', '钢琴', '萨克斯', '竖琴'],
    scenes: ['Spy', 'Romance', 'Elegance', 'Africa', 'Tragedy'], scenesCN: ['谍战', '浪漫', '优雅', '非洲', '悲剧'],
    sunoKeywords: ['James Bond style', 'orchestral romance', 'spy theme', 'sweeping strings', 'Barry style'],
    influence: 'SSS', notableWorks: ['James Bond series', 'Out of Africa', 'Dances with Wolves', 'Born Free'],
    notableWorksCN: ['007系列', '走出非洲', '与狼共舞', '生而自由'],
    tags: ['Bond', 'spy', 'romantic', 'orchestral', 'British'],
  },

  // ── SS Tier: Masters ──
  {
    name: 'Howard Shore', nameCN: '霍华德·肖', country: 'Canada', countryCN: '加拿大', era: '1980s-present', type: 'Film Score',
    styles: ['Fantasy', 'Orchestral', 'Dark', 'Nordic'], stylesCN: ['奇幻', '管弦', '黑暗', '北欧'],
    emotions: ['Epic', 'Mysterious', 'Dark', 'Ancient'], emotionsCN: ['史诗', '神秘', '黑暗', '古老'],
    instruments: ['Choir', 'Strings', 'Brass', 'Hardanger Fiddle', 'Organ'], instrumentsCN: ['合唱', '弦乐', '铜管', '哈丹格小提琴', '管风琴'],
    scenes: ['Fantasy', 'Epic Journey', 'Dark Lord', 'Elven Realm', 'Dwarven Hall'], scenesCN: ['奇幻', '史诗旅程', '黑暗领主', '精灵之境', '矮人殿堂'],
    sunoKeywords: ['Lord of the Rings style', 'fantasy orchestral', 'Nordic fiddle', 'dark choir', 'Shore style'],
    influence: 'SS', notableWorks: ['Lord of the Rings trilogy', 'The Hobbit', 'The Silence of the Lambs', 'Seven'],
    notableWorksCN: ['指环王三部曲', '霍比特人', '沉默的羔羊', '七宗罪'],
    tags: ['fantasy', 'Tolkien', 'Nordic', 'choir', 'epic'],
  },
  {
    name: 'James Horner', nameCN: '詹姆斯·霍纳', country: 'USA', countryCN: '美国', era: '1980s-2015', type: 'Film Score',
    styles: ['Emotional', 'Orchestral', 'Celtic', 'Adventure'], stylesCN: ['情感', '管弦', '凯尔特', '冒险'],
    emotions: ['Emotional', 'Heroic', 'Melancholic', 'Warm'], emotionsCN: ['情感', '英雄', '忧伤', '温暖'],
    instruments: ['Piano', 'Strings', 'Uilleann Pipes', 'Choir', 'French Horn'], instrumentsCN: ['钢琴', '弦乐', '爱尔兰风笛', '合唱', '法国号'],
    scenes: ['Tragedy', 'Heroism', 'Sea Voyage', 'Nature', 'Friendship'], scenesCN: ['悲剧', '英雄主义', '航海', '自然', '友谊'],
    sunoKeywords: ['emotional orchestral', 'Celtic influence', 'Horner style', 'titanic strings', 'bagpipes cinematic'],
    influence: 'SS', notableWorks: ['Titanic', 'Braveheart', 'Avatar', 'Apollo 13', 'A Beautiful Mind'],
    notableWorksCN: ['泰坦尼克号', '勇敢的心', '阿凡达', '阿波罗13号', '美丽心灵'],
    tags: ['emotional', 'Celtic', 'titanic', 'adventure', 'tear-jerker'],
  },
  {
    name: 'Danny Elfman', nameCN: '丹尼·艾夫曼', country: 'USA', countryCN: '美国', era: '1980s-present', type: 'Film Score',
    styles: ['Gothic', 'Fantasy', 'Whimsical', 'Dark'], stylesCN: ['哥特', '奇幻', '异想天开', '黑暗'],
    emotions: ['Whimsical', 'Dark', 'Playful', 'Mysterious'], emotionsCN: ['异想天开', '黑暗', '俏皮', '神秘'],
    instruments: ['Choir', 'Organ', 'Glockenspiel', 'Strings', 'Brass'], instrumentsCN: ['合唱', '管风琴', '钟琴', '弦乐', '铜管'],
    scenes: ['Gothic', 'Fantasy', 'Halloween', 'Fairy Tale', 'Dark Comedy'], scenesCN: ['哥特', '奇幻', '万圣节', '童话', '黑色喜剧'],
    sunoKeywords: ['gothic fantasy', 'Elfman style', 'whimsical dark', 'choir', 'Tim Burton'],
    influence: 'SS', notableWorks: ['Batman', 'Edward Scissorhands', 'The Nightmare Before Christmas', 'Spider-Man', 'Beetlejuice'],
    notableWorksCN: ['蝙蝠侠', '剪刀手爱德华', '圣诞夜惊魂', '蜘蛛侠', '阴间大法师'],
    tags: ['gothic', 'Burton', 'whimsical', 'choir', 'dark fantasy'],
  },
  {
    name: 'Alexandre Desplat', nameCN: '亚历山大·德斯普拉', country: 'France', countryCN: '法国', era: '1990s-present', type: 'Film Score',
    styles: ['Orchestral', 'Minimalist', 'Elegant', 'French'], stylesCN: ['管弦', '极简', '优雅', '法式'],
    emotions: ['Elegant', 'Mysterious', 'Romantic', 'Reflective'], emotionsCN: ['优雅', '神秘', '浪漫', '反思'],
    instruments: ['Piano', 'Harp', 'Flute', 'Strings', 'Celesta'], instrumentsCN: ['钢琴', '竖琴', '长笛', '弦乐', '钢片琴'],
    scenes: ['Romance', 'Mystery', 'Court Intrigue', 'Fantasy', 'Drama'], scenesCN: ['浪漫', '悬疑', '宫廷', '奇幻', '剧情'],
    sunoKeywords: ['elegant orchestral', 'French film score', 'Desplat style', 'piano harp', 'minimalist beautiful'],
    influence: 'SS', notableWorks: ['The Grand Budapest Hotel', 'The Shape of Water', 'Harry Potter 7-8', 'The King\'s Speech'],
    notableWorksCN: ['布达佩斯大饭店', '水形物语', '哈利波特7-8', '国王的演讲'],
    tags: ['elegant', 'French', 'minimalist', 'Oscar', 'beautiful'],
  },
  {
    name: 'Thomas Newman', nameCN: '托马斯·纽曼', country: 'USA', countryCN: '美国', era: '1980s-present', type: 'Film Score',
    styles: ['Minimalist', 'Ambient', 'Emotional', 'Quirky'], stylesCN: ['极简', '氛围', '情感', '古怪'],
    emotions: ['Reflective', 'Melancholic', 'Quirky', 'Warm'], emotionsCN: ['反思', '忧伤', '古怪', '温暖'],
    instruments: ['Piano', 'Marimba', 'Strings', 'Pad', 'Percussion'], instrumentsCN: ['钢琴', '马林巴', '弦乐', '铺垫', '打击乐'],
    scenes: ['Drama', 'Reflection', 'American Life', 'Quiet Moments', 'Nature'], scenesCN: ['剧情', '反思', '美国生活', '安静时刻', '自然'],
    sunoKeywords: ['minimalist score', 'Newman style', 'marimba piano', 'quirky strings', 'American beauty'],
    influence: 'SS', notableWorks: ['American Beauty', 'The Shawshank Redemption', 'Finding Nemo', '1917', 'Wall-E'],
    notableWorksCN: ['美国丽人', '肖申克的救赎', '海底总动员', '1917', '瓦力'],
    tags: ['minimalist', 'quirky', 'emotional', 'Pixar', 'American'],
  },
  {
    name: 'Jerry Goldsmith', nameCN: '杰里·戈德史密斯', country: 'USA', countryCN: '美国', era: '1950s-2004', type: 'Film Score',
    styles: ['Orchestral', 'Sci-Fi', 'Action', 'Experimental'], stylesCN: ['管弦', '科幻', '动作', '实验'],
    emotions: ['Epic', 'Tense', 'Mysterious', 'Powerful'], emotionsCN: ['史诗', '紧张', '神秘', '力量'],
    instruments: ['Brass', 'Strings', 'Percussion', 'Electronics', 'Organ'], instrumentsCN: ['铜管', '弦乐', '打击乐', '电子', '管风琴'],
    scenes: ['Sci-Fi', 'Action', 'Horror', 'Military', 'Adventure'], scenesCN: ['科幻', '动作', '恐怖', '军事', '冒险'],
    sunoKeywords: ['Goldsmith style', 'sci-fi orchestral', 'military march', 'tension score', 'classic Hollywood'],
    influence: 'SS', notableWorks: ['Star Trek TMP', 'Alien', 'Planet of the Apes', 'Patton', 'The Omen'],
    notableWorksCN: ['星际迷航', '异形', '人猿星球', '巴顿将军', '凶兆'],
    tags: ['sci-fi', 'Star Trek', 'action', 'Hollywood', 'classic'],
  },
  {
    name: 'Bernard Herrmann', nameCN: '伯纳德·赫尔曼', country: 'USA', countryCN: '美国', era: '1940s-1975', type: 'Film Score',
    styles: ['Psychological', 'Orchestral', 'Horror', 'Noir'], stylesCN: ['心理', '管弦', '恐怖', '黑色电影'],
    emotions: ['Fearful', 'Tense', 'Obsessive', 'Dramatic'], emotionsCN: ['恐惧', '紧张', '执着', '戏剧'],
    instruments: ['Strings', 'Brass', 'Theremin', 'Harp', 'Percussion'], instrumentsCN: ['弦乐', '铜管', '特雷门琴', '竖琴', '打击乐'],
    scenes: ['Horror', 'Psychological', 'Suspense', 'Noir', 'Obsession'], scenesCN: ['恐怖', '心理', '悬疑', '黑色电影', '痴迷'],
    sunoKeywords: ['Hitchcock strings', 'Herrmann style', 'psycho strings', 'theremin horror', 'noir orchestral'],
    influence: 'SS', notableWorks: ['Psycho', 'Vertigo', 'Taxi Driver', 'North by Northwest', 'Citizen Kane'],
    notableWorksCN: ['惊魂记', '迷魂记', '出租车司机', '西北偏北', '公民凯恩'],
    tags: ['Hitchcock', 'horror', 'psycho', 'strings', 'noir'],
  },
  {
    name: 'Michael Giacchino', nameCN: '迈克·吉亚奇诺', country: 'USA', countryCN: '美国', era: '1990s-present', type: 'Film Score',
    styles: ['Adventure', 'Orchestral', 'Emotional', 'Upbeat'], stylesCN: ['冒险', '管弦', '情感', '明快'],
    emotions: ['Adventurous', 'Emotional', 'Heroic', 'Playful'], emotionsCN: ['冒险', '情感', '英雄', '俏皮'],
    instruments: ['Brass', 'Strings', 'Piano', 'Percussion', 'Woodwinds'], instrumentsCN: ['铜管', '弦乐', '钢琴', '打击乐', '木管'],
    scenes: ['Adventure', 'Animation', 'Family', 'Sci-Fi', 'Heroism'], scenesCN: ['冒险', '动画', '家庭', '科幻', '英雄主义'],
    sunoKeywords: ['Pixar style', 'adventure orchestral', 'Giacchino style', 'upbeat cinematic', 'emotional brass'],
    influence: 'S', notableWorks: ['Up', 'Ratatouille', 'The Incredibles', 'Rogue One', 'Lost'],
    notableWorksCN: ['飞屋环游记', '美食总动员', '超人总动员', '侠盗一号', '迷失'],
    tags: ['Pixar', 'adventure', 'animation', 'emotional', 'upbeat'],
  },
  {
    name: 'Ramin Djawadi', nameCN: '拉民·贾瓦迪', country: 'Germany', countryCN: '德国', era: '2000s-present', type: 'Film Score',
    styles: ['Epic', 'Dark Fantasy', 'Hybrid', 'Medieval'], stylesCN: ['史诗', '黑暗奇幻', '混合', '中世纪'],
    emotions: ['Epic', 'Dark', 'Powerful', 'Melancholic'], emotionsCN: ['史诗', '黑暗', '力量', '忧伤'],
    instruments: ['Cello', 'Brass', 'Choir', 'Percussion', 'Piano'], instrumentsCN: ['大提琴', '铜管', '合唱', '打击乐', '钢琴'],
    scenes: ['Dark Fantasy', 'War', 'Intrigue', 'Dragon', 'Medieval'], scenesCN: ['黑暗奇幻', '战争', '阴谋', '龙', '中世纪'],
    sunoKeywords: ['Game of Thrones style', 'dark fantasy epic', 'Djawadi cello', 'medieval hybrid', 'dragon theme'],
    influence: 'S', notableWorks: ['Game of Thrones', 'Westworld', 'Pacific Rim', 'Iron Man', 'House of the Dragon'],
    notableWorksCN: ['权力的游戏', '西部世界', '环太平洋', '钢铁侠', '龙之家族'],
    tags: ['GoT', 'dark fantasy', 'medieval', 'cello', 'HBO'],
  },
  {
    name: 'Ludwig Göransson', nameCN: '路德维希·戈兰松', country: 'Sweden', countryCN: '瑞典', era: '2010s-present', type: 'Film Score',
    styles: ['Hybrid', 'Electronic', 'Orchestral', 'African'], stylesCN: ['混合', '电子', '管弦', '非洲'],
    emotions: ['Powerful', 'Mysterious', 'Heroic', 'Intense'], emotionsCN: ['力量', '神秘', '英雄', '紧张'],
    instruments: ['Synth', 'Brass', 'Percussion', 'Strings', 'African Drums'], instrumentsCN: ['合成器', '铜管', '打击乐', '弦乐', '非洲鼓'],
    scenes: ['Sci-Fi', 'Superhero', 'Space', 'Action', 'Cultural'], scenesCN: ['科幻', '超级英雄', '太空', '动作', '文化'],
    sunoKeywords: ['Göransson style', 'hybrid sci-fi', 'African percussion', 'Tenet style', 'Mandalorian theme'],
    influence: 'S', notableWorks: ['Black Panther', 'Tenet', 'The Mandalorian', 'Oppenheimer', 'Creed'],
    notableWorksCN: ['黑豹', '信条', '曼达洛人', '奥本海默', '奎迪'],
    tags: ['sci-fi', 'African', 'hybrid', 'Marvel', 'Nolan'],
  },
  {
    name: 'Junkie XL (Tom Holkenborg)', nameCN: '容基XL', country: 'Netherlands', countryCN: '荷兰', era: '2000s-present', type: 'Film Score',
    styles: ['Epic', 'Electronic', 'Hybrid', 'Industrial'], stylesCN: ['史诗', '电子', '混合', '工业'],
    emotions: ['Powerful', 'Aggressive', 'Epic', 'Intense'], emotionsCN: ['力量', '侵略', '史诗', '紧张'],
    instruments: ['Synth', 'Brass', 'Massive Drums', 'Electric Guitar', 'Strings'], instrumentsCN: ['合成器', '铜管', '大型鼓', '电吉他', '弦乐'],
    scenes: ['Action', 'Racing', 'Superhero', 'Sci-Fi', 'Apocalypse'], scenesCN: ['动作', '赛车', '超级英雄', '科幻', '末世'],
    sunoKeywords: ['Junkie XL style', 'epic hybrid', 'Mad Max drums', 'electronic orchestral', 'racing intensity'],
    influence: 'S', notableWorks: ['Mad Max: Fury Road', 'Deadpool', 'Batman v Superman', 'Zack Snyder\'s Justice League', 'Sonic the Hedgehog'],
    notableWorksCN: ['疯狂的麦克斯4', '死侍', '蝙蝠侠大战超人', '正义联盟导剪版', '刺猬索尼克'],
    tags: ['hybrid', 'action', 'racing', 'intense', 'electronic'],
  },
  {
    name: 'Alan Silvestri', nameCN: '亚伦·史维斯查', country: 'USA', countryCN: '美国', era: '1980s-present', type: 'Film Score',
    styles: ['Adventure', 'Orchestral', 'Heroic', 'Emotional'], stylesCN: ['冒险', '管弦', '英雄', '情感'],
    emotions: ['Heroic', 'Adventurous', 'Emotional', 'Epic'], emotionsCN: ['英雄', '冒险', '情感', '史诗'],
    instruments: ['Brass', 'Strings', 'Choir', 'Percussion', 'Piano'], instrumentsCN: ['铜管', '弦乐', '合唱', '打击乐', '钢琴'],
    scenes: ['Adventure', 'Time Travel', 'Superhero', 'Family', 'Sci-Fi'], scenesCN: ['冒险', '时间旅行', '超级英雄', '家庭', '科幻'],
    sunoKeywords: ['Avengers theme', 'Back to the Future style', 'Silvestri brass', 'adventure orchestral', 'heroic fanfare'],
    influence: 'S', notableWorks: ['Back to the Future', 'Forrest Gump', 'The Avengers', 'Cast Away', 'The Polar Express'],
    notableWorksCN: ['回到未来', '阿甘正传', '复仇者联盟', '荒岛余生', '极地特快'],
    tags: ['Avengers', 'adventure', 'heroic', '80s', 'Marvel'],
  },
  {
    name: 'Joe Hisaishi', nameCN: '久石让', country: 'Japan', countryCN: '日本', era: '1980s-present', type: 'Film Score',
    styles: ['Orchestral', 'Japanese', 'Fantasy', 'Minimalist'], stylesCN: ['管弦', '日本', '奇幻', '极简'],
    emotions: ['Gentle', 'Wonder', 'Melancholic', 'Magical'], emotionsCN: ['温柔', '惊奇', '忧伤', '魔法'],
    instruments: ['Piano', 'Strings', 'Brass', 'Synth', 'Japanese Percussion'], instrumentsCN: ['钢琴', '弦乐', '铜管', '合成器', '日本打击乐'],
    scenes: ['Fantasy', 'Childhood', 'Nature', 'Flight', 'Spirit World'], scenesCN: ['奇幻', '童年', '自然', '飞行', '灵界'],
    sunoKeywords: ['Ghibli style', 'Hisaishi piano', 'Japanese fantasy', 'magical orchestral', 'Miyazaki music'],
    influence: 'SS', notableWorks: ['Spirited Away', 'My Neighbor Totoro', 'Princess Mononoke', 'Howl\'s Moving Castle', 'Kikujiro'],
    notableWorksCN: ['千与千寻', '龙猫', '幽灵公主', '哈尔的移动城堡', '菊次郎的夏天'],
    tags: ['Ghibli', 'Miyazaki', 'Japanese', 'piano', 'fantasy'],
  },
  {
    name: 'Ryuichi Sakamoto', nameCN: '坂本龙一', country: 'Japan', countryCN: '日本', era: '1970s-2023', type: 'Film Score',
    styles: ['Minimalist', 'Electronic', 'Ambient', 'Classical'], stylesCN: ['极简', '电子', '氛围', '古典'],
    emotions: ['Reflective', 'Melancholic', 'Peaceful', 'Ethereal'], emotionsCN: ['反思', '忧伤', '宁静', '飘渺'],
    instruments: ['Piano', 'Synth', 'Strings', 'Koto', 'Pad'], instrumentsCN: ['钢琴', '合成器', '弦乐', '筝', '铺垫'],
    scenes: ['War Drama', 'Reflection', 'Snow', 'Silence', 'Asian Drama'], scenesCN: ['战争剧情', '反思', '雪', '寂静', '亚洲剧情'],
    sunoKeywords: ['Sakamoto piano', 'minimalist Japanese', 'ambient emotional', 'Merry Christmas Mr Lawrence', 'contemplative'],
    influence: 'SS', notableWorks: ['Merry Christmas Mr. Lawrence', 'The Last Emperor', 'The Revenant', 'Babel', 'YMO'],
    notableWorksCN: ['战场上的圣诞快乐', '末代皇帝', '荒野猎人', '通天塔', 'YMO'],
    tags: ['Japanese', 'piano', 'minimalist', 'ambient', 'legend'],
  },
  {
    name: 'Nino Rota', nameCN: '尼诺·罗塔', country: 'Italy', countryCN: '意大利', era: '1930s-1979', type: 'Film Score',
    styles: ['Italian', 'Orchestral', 'Romantic', 'Folk'], stylesCN: ['意大利', '管弦', '浪漫', '民谣'],
    emotions: ['Romantic', 'Melancholic', 'Warm', 'Nostalgic'], emotionsCN: ['浪漫', '忧伤', '温暖', '怀旧'],
    instruments: ['Mandolin', 'Strings', 'Piano', 'Trumpet', 'Accordion'], instrumentsCN: ['曼陀林', '弦乐', '钢琴', '小号', '手风琴'],
    scenes: ['Italian Drama', 'Romance', 'Family Saga', 'Circus', 'Nostalgia'], scenesCN: ['意大利剧情', '浪漫', '家族史诗', '马戏团', '怀旧'],
    sunoKeywords: ['Godfather style', 'Italian orchestral', 'Rota waltz', 'romantic mandolin', 'Fellini music'],
    influence: 'SS', notableWorks: ['The Godfather', 'La Dolce Vita', '8 1/2', 'Romeo and Juliet', 'Amarcord'],
    notableWorksCN: ['教父', '甜蜜的生活', '八部半', '罗密欧与朱丽叶', '阿玛柯德'],
    tags: ['Italian', 'Godfather', 'Fellini', 'romantic', 'classic'],
  },
  // ── More Film Score Composers (A tier, abbreviated) ──
  {
    name: 'Harry Gregson-Williams', nameCN: '哈里·格雷格森-威廉姆斯', country: 'UK', countryCN: '英国', era: '1990s-present', type: 'Film Score',
    styles: ['Epic', 'Orchestral', 'Electronic', 'Medieval'], stylesCN: ['史诗', '管弦', '电子', '中世纪'],
    emotions: ['Epic', 'Heroic', 'Mysterious', 'Powerful'], emotionsCN: ['史诗', '英雄', '神秘', '力量'],
    instruments: ['Strings', 'Brass', 'Synth', 'Choir', 'Percussion'], instrumentsCN: ['弦乐', '铜管', '合成器', '合唱', '打击乐'],
    scenes: ['Medieval', 'Fantasy', 'Action', 'War', 'Adventure'], scenesCN: ['中世纪', '奇幻', '动作', '战争', '冒险'],
    sunoKeywords: ['Narnia style', 'medieval epic', 'Gregson-Williams', 'fantasy orchestral', 'Kingdom of Heaven theme'],
    influence: 'S', notableWorks: ['The Chronicles of Narnia', 'Kingdom of Heaven', 'Shrek', 'The Martian', 'Metal Gear Solid'],
    notableWorksCN: ['纳尼亚传奇', '天国王朝', '怪物史莱克', '火星救援', '合金装备'],
    tags: ['Narnia', 'medieval', 'fantasy', 'adventure', 'game'],
  },
  {
    name: 'James Newton Howard', nameCN: '詹姆斯·纽顿·霍华德', country: 'USA', countryCN: '美国', era: '1980s-present', type: 'Film Score',
    styles: ['Orchestral', 'Fantasy', 'Emotional', 'Thriller'], stylesCN: ['管弦', '奇幻', '情感', '惊悚'],
    emotions: ['Emotional', 'Majestic', 'Mysterious', 'Dark'], emotionsCN: ['情感', '雄伟', '神秘', '黑暗'],
    instruments: ['Piano', 'Strings', 'Brass', 'Choir', 'Harp'], instrumentsCN: ['钢琴', '弦乐', '铜管', '合唱', '竖琴'],
    scenes: ['Fantasy', 'Drama', 'Thriller', 'Nature', 'Romance'], scenesCN: ['奇幻', '剧情', '惊悚', '自然', '浪漫'],
    sunoKeywords: ['Fantastic Beasts style', 'fantasy orchestral', 'Newton Howard piano', 'Hunger Games theme', 'emotional strings'],
    influence: 'S', notableWorks: ['Fantastic Beasts', 'The Hunger Games', 'The Dark Knight (with Zimmer)', 'King Kong', 'The Sixth Sense'],
    notableWorksCN: ['神奇动物在哪里', '饥饿游戏', '黑暗骑士', '金刚', '第六感'],
    tags: ['fantasy', 'emotional', 'thriller', 'Hollywood', 'beautiful'],
  },
  {
    name: 'Patrick Doyle', nameCN: '帕特里克·道尔', country: 'UK', countryCN: '英国', era: '1980s-present', type: 'Film Score',
    styles: ['Orchestral', 'Shakespearean', 'Fantasy', 'Romantic'], stylesCN: ['管弦', '莎士比亚', '奇幻', '浪漫'],
    emotions: ['Romantic', 'Heroic', 'Warm', 'Majestic'], emotionsCN: ['浪漫', '英雄', '温暖', '雄伟'],
    instruments: ['Strings', 'Brass', 'Choir', 'Piano', 'Harp'], instrumentsCN: ['弦乐', '铜管', '合唱', '钢琴', '竖琴'],
    scenes: ['Fantasy', 'Shakespeare', 'Romance', 'Court', 'Adventure'], scenesCN: ['奇幻', '莎士比亚', '浪漫', '宫廷', '冒险'],
    sunoKeywords: ['Harry Potter Goblet style', 'Shakespeare score', 'Doyle orchestral', 'fantasy romance', 'British epic'],
    influence: 'S', notableWorks: ['Harry Potter 4', 'Thor', 'Sense and Sensibility', 'Henry V', 'Gosford Park'],
    notableWorksCN: ['哈利波特4', '雷神', '理智与情感', '亨利五世', '高斯福庄园'],
    tags: ['Harry Potter', 'Shakespeare', 'British', 'romantic', 'fantasy'],
  },
  {
    name: 'Clint Mansell', nameCN: '克林特·曼塞尔', country: 'UK', countryCN: '英国', era: '1990s-present', type: 'Film Score',
    styles: ['Minimalist', 'Dark', 'Electronic', 'Emotional'], stylesCN: ['极简', '黑暗', '电子', '情感'],
    emotions: ['Dark', 'Obsessive', 'Melancholic', 'Transcendent'], emotionsCN: ['黑暗', '执着', '忧伤', '超越'],
    instruments: ['Piano', 'Strings', 'Synth', 'Guitar', 'Pad'], instrumentsCN: ['钢琴', '弦乐', '合成器', '吉他', '铺垫'],
    scenes: ['Psychological Drama', 'Sci-Fi', 'Obsession', 'Addiction', 'Space'], scenesCN: ['心理剧情', '科幻', '执着', '上瘾', '太空'],
    sunoKeywords: ['Requiem for a Dream style', 'Mansell strings', 'dark minimalist', 'Lux Aeterna', 'psychological intensity'],
    influence: 'S', notableWorks: ['Requiem for a Dream', 'Black Swan', 'Moon', 'The Fountain', 'Pi'],
    notableWorksCN: ['梦之安魂曲', '黑天鹅', '月球', '珍爱源泉', '圆周率'],
    tags: ['dark', 'minimalist', 'psychological', 'Aronofsky', 'intense'],
  },
  {
    name: 'Max Richter', nameCN: '马克斯·里希特', country: 'Germany', countryCN: '德国', era: '2000s-present', type: 'Film Score',
    styles: ['Minimalist', 'Post-Classical', 'Ambient', 'Emotional'], stylesCN: ['极简', '后古典', '氛围', '情感'],
    emotions: ['Melancholic', 'Reflective', 'Transcendent', 'Peaceful'], emotionsCN: ['忧伤', '反思', '超越', '宁静'],
    instruments: ['Piano', 'Violin', 'Strings', 'Pad', 'Electronics'], instrumentsCN: ['钢琴', '小提琴', '弦乐', '铺垫', '电子'],
    scenes: ['Drama', 'Memory', 'War Aftermath', 'Space', 'Meditation'], scenesCN: ['剧情', '记忆', '战后', '太空', '冥想'],
    sunoKeywords: ['Richter style', 'post-classical', 'On the Nature of Daylight', 'minimalist strings', 'emotional ambient'],
    influence: 'S', notableWorks: ['The Leftovers', 'Arrival', 'Ad Astra', 'Waltz with Bashir', 'Sleep'],
    notableWorksCN: ['守望尘世', '降临', '星际探索', '和巴什尔跳华尔兹', '睡眠'],
    tags: ['post-classical', 'minimalist', 'emotional', 'ambient', 'strings'],
  },
  {
    name: 'Jóhann Jóhannsson', nameCN: '约翰·约翰逊', country: 'Iceland', countryCN: '冰岛', era: '2000s-2018', type: 'Film Score',
    styles: ['Minimalist', 'Neoclassical', 'Electronic', 'Ambient'], stylesCN: ['极简', '新古典', '电子', '氛围'],
    emotions: ['Cold', 'Transcendent', 'Mysterious', 'Melancholic'], emotionsCN: ['冰冷', '超越', '神秘', '忧伤'],
    instruments: ['Organ', 'Strings', 'Synth', 'Piano', 'Choir'], instrumentsCN: ['管风琴', '弦乐', '合成器', '钢琴', '合唱'],
    scenes: ['Sci-Fi', 'Cold Landscapes', 'Isolation', 'AI', 'Cosmic'], scenesCN: ['科幻', '冰原', '孤立', 'AI', '宇宙'],
    sunoKeywords: ['Jóhannsson style', 'Sicario tension', 'Arrival music', 'organ drone', 'cold ambient'],
    influence: 'S', notableWorks: ['Sicario', 'Arrival', 'The Theory of Everything', 'Arrival', 'Mandy'],
    notableWorksCN: ['边境杀手', '降临', '万物理论', '降临', '曼蒂'],
    tags: ['Icelandic', 'minimalist', 'sci-fi', 'organ', 'cold'],
  },
  {
    name: 'Nicholas Britell', nameCN: '尼古拉斯·布里特尔', country: 'USA', countryCN: '美国', era: '2010s-present', type: 'Film Score',
    styles: ['Minimalist', 'Classical', 'Hip-Hop Influenced', 'Experimental'], stylesCN: ['极简', '古典', '嘻哈影响', '实验'],
    emotions: ['Elegant', 'Tense', 'Emotional', 'Grand'], emotionsCN: ['优雅', '紧张', '情感', '宏大'],
    instruments: ['Piano', 'Strings', 'Brass', 'Synth'], instrumentsCN: ['钢琴', '弦乐', '铜管', '合成器'],
    scenes: ['Dynasty Drama', 'Power Struggle', 'Finance', 'Social Commentary'], scenesCN: ['王朝剧情', '权力斗争', '金融', '社会评论'],
    sunoKeywords: ['Succession theme', 'Britell style', 'classical hip-hop', 'dynasty strings', 'power tension'],
    influence: 'A', notableWorks: ['Succession', 'Moonlight', 'If Beale Street Could Talk', 'The Big Short', 'Andor'],
    notableWorksCN: ['继承之战', '月光男孩', '假若比尔街能说话', '大空头', '安多'],
    tags: ['Succession', 'minimalist', 'HBO', 'piano', 'Oscar'],
  },
  {
    name: 'Yoko Kanno', nameCN: '菅野洋子', country: 'Japan', countryCN: '日本', era: '1990s-present', type: 'Film Score',
    styles: ['Jazz', 'Orchestral', 'Electronic', 'World'], stylesCN: ['爵士', '管弦', '电子', '世界'],
    emotions: ['Adventurous', 'Energetic', 'Romantic', 'Epic'], emotionsCN: ['冒险', '能量', '浪漫', '史诗'],
    instruments: ['Piano', 'Brass', 'Strings', 'Synth', 'Choir'], instrumentsCN: ['钢琴', '铜管', '弦乐', '合成器', '合唱'],
    scenes: ['Anime', 'Sci-Fi', 'Space', 'Adventure', 'Romance'], scenesCN: ['动画', '科幻', '太空', '冒险', '浪漫'],
    sunoKeywords: ['Cowboy Bebop style', 'Kanno jazz', 'anime orchestral', 'space jazz', 'Ghost in the Shell'],
    influence: 'SS', notableWorks: ['Cowboy Bebop', 'Ghost in the Shell SAC', 'Macross Plus', 'Wolf\'s Rain', 'Terror in Resonance'],
    notableWorksCN: ['星际牛仔', '攻壳机动队SAC', '超时空要塞Plus', '狼雨', '东京残响'],
    tags: ['anime', 'jazz', 'space', 'Bebop', 'Japanese'],
  },
  {
    name: 'Shigeru Umebayashi', nameCN: '梅林茂', country: 'Japan', countryCN: '日本', era: '1980s-present', type: 'Film Score',
    styles: ['Chinese', 'Orchestral', 'Romantic', 'Martial Arts'], stylesCN: ['中国风', '管弦', '浪漫', '武侠'],
    emotions: ['Romantic', 'Melancholic', 'Dramatic', 'Epic'], emotionsCN: ['浪漫', '忧伤', '戏剧', '史诗'],
    instruments: ['Erhu', 'Strings', 'Pipa', 'Piano', 'Dizi'], instrumentsCN: ['二胡', '弦乐', '琵琶', '钢琴', '笛子'],
    scenes: ['Martial Arts', 'Chinese Drama', 'Romance', 'Court', 'Tragedy'], scenesCN: ['武侠', '中国剧情', '浪漫', '宫廷', '悲剧'],
    sunoKeywords: ['Wong Kar-wai style', 'Chinese orchestral', 'Umebayashi erhu', 'martial arts romance', 'In the Mood for Love'],
    influence: 'S', notableWorks: ['In the Mood for Love', 'House of Flying Daggers', 'Curse of the Golden Flower', '2046', 'The Grandmaster'],
    notableWorksCN: ['花样年华', '十面埋伏', '满城尽带黄金甲', '2046', '一代宗师'],
    tags: ['Chinese', 'Wong Kar-wai', 'erhu', 'romantic', 'martial arts'],
  },
];

// ═══════════════════════════════════════════════════════════
// CLASSICAL COMPOSERS (30)
// ═══════════════════════════════════════════════════════════

const CLASSICAL_COMPOSERS: ComposerProfile[] = [
  { name: 'Ludwig van Beethoven', nameCN: '贝多芬', country: 'Germany', countryCN: '德国', era: '18th-19th Century', type: 'Classical',
    styles: ['Romantic', 'Symphonic', 'Heroic'], stylesCN: ['浪漫', '交响', '英雄'],
    emotions: ['Heroic', 'Tragic', 'Triumphant', 'Passionate'], emotionsCN: ['英雄', '悲剧', '胜利', '激情'],
    instruments: ['Orchestra', 'Piano', 'Strings', 'Choir'], instrumentsCN: ['管弦乐队', '钢琴', '弦乐', '合唱'],
    scenes: ['Heroism', 'Tragedy', 'Triumph', 'Destiny', 'Nature'], scenesCN: ['英雄主义', '悲剧', '胜利', '宿命', '自然'],
    sunoKeywords: ['Beethoven style', 'symphony no 5', 'heroic classical', 'Moonlight Sonata', 'Ode to Joy'],
    influence: 'SSS', notableWorks: ['Symphony No.5', 'Symphony No.9', 'Moonlight Sonata', 'Für Elise'],
    notableWorksCN: ['第五交响曲', '第九交响曲', '月光奏鸣曲', '致爱丽丝'],
    tags: ['symphony', 'heroic', 'German', 'piano', 'classic'],
  },
  { name: 'Wolfgang Amadeus Mozart', nameCN: '莫扎特', country: 'Austria', countryCN: '奥地利', era: '18th Century', type: 'Classical',
    styles: ['Classical', 'Operatic', 'Elegant'], stylesCN: ['古典', '歌剧', '优雅'],
    emotions: ['Elegant', 'Joyful', 'Divine', 'Dramatic'], emotionsCN: ['优雅', '喜悦', '神圣', '戏剧'],
    instruments: ['Orchestra', 'Piano', 'Strings', 'Opera Voice'], instrumentsCN: ['管弦乐队', '钢琴', '弦乐', '歌剧人声'],
    scenes: ['Royal Court', 'Opera', 'Elegance', 'Divine Comedy', 'Classical Drama'], scenesCN: ['宫廷', '歌剧', '优雅', '神圣喜剧', '古典戏剧'],
    sunoKeywords: ['Mozart style', 'classical elegance', 'Requiem', 'opera dramatic', 'Vienna classical'],
    influence: 'SSS', notableWorks: ['Requiem', 'The Magic Flute', 'Don Giovanni', 'Eine kleine Nachtmusik'],
    notableWorksCN: ['安魂曲', '魔笛', '唐璜', '小夜曲'],
    tags: ['classical', 'opera', 'elegant', 'Vienna', 'genius'],
  },
  { name: 'Johann Sebastian Bach', nameCN: '巴赫', country: 'Germany', countryCN: '德国', era: '18th Century', type: 'Classical',
    styles: ['Baroque', 'Sacred', 'Contrapuntal'], stylesCN: ['巴洛克', '神圣', '复调'],
    emotions: ['Sacred', 'Contemplative', 'Solemn', 'Mathematical'], emotionsCN: ['神圣', '沉思', '庄严', '数学'],
    instruments: ['Organ', 'Harpsichord', 'Strings', 'Choir'], instrumentsCN: ['管风琴', '羽管键琴', '弦乐', '合唱'],
    scenes: ['Cathedral', 'Sacred', 'Contemplation', 'Mathematics', 'Ancient'], scenesCN: ['大教堂', '神圣', '沉思', '数学', '古老'],
    sunoKeywords: ['Bach style', 'Baroque sacred', 'Toccata and Fugue', 'organ majestic', 'Cello Suites'],
    influence: 'SSS', notableWorks: ['Toccata and Fugue in D minor', 'Mass in B minor', 'Cello Suites', 'Brandenburg Concertos'],
    notableWorksCN: ['d小调托卡塔与赋格', 'b小调弥撒', '大提琴组曲', '勃兰登堡协奏曲'],
    tags: ['Baroque', 'sacred', 'organ', 'German', 'mathematical'],
  },
  { name: 'Pyotr Ilyich Tchaikovsky', nameCN: '柴可夫斯基', country: 'Russia', countryCN: '俄国', era: '19th Century', type: 'Classical',
    styles: ['Romantic', 'Ballet', 'Emotional'], stylesCN: ['浪漫', '芭蕾', '情感'],
    emotions: ['Tragic', 'Romantic', 'Epic', 'Passionate'], emotionsCN: ['悲剧', '浪漫', '史诗', '激情'],
    instruments: ['Orchestra', 'Strings', 'Brass', 'Celesta'], instrumentsCN: ['管弦乐队', '弦乐', '铜管', '钢片琴'],
    scenes: ['Ballet', 'Romance', 'War', 'Fantasy', 'Christmas'], scenesCN: ['芭蕾', '浪漫', '战争', '奇幻', '圣诞'],
    sunoKeywords: ['Tchaikovsky style', 'Swan Lake', 'Nutcracker', '1812 Overture', 'romantic Russian'],
    influence: 'SSS', notableWorks: ['Swan Lake', 'The Nutcracker', '1812 Overture', 'Symphony No.6 Pathétique'],
    notableWorksCN: ['天鹅湖', '胡桃夹子', '1812序曲', '第六交响曲悲怆'],
    tags: ['Russian', 'ballet', 'romantic', 'emotional', 'Christmas'],
  },
  { name: 'Claude Debussy', nameCN: '德彪西', country: 'France', countryCN: '法国', era: '19th-20th Century', type: 'Classical',
    styles: ['Impressionist', 'Ambient', 'Dreamy'], stylesCN: ['印象派', '氛围', '梦幻'],
    emotions: ['Dreamy', 'Ethereal', 'Peaceful', 'Mysterious'], emotionsCN: ['梦幻', '飘渺', '宁静', '神秘'],
    instruments: ['Piano', 'Harp', 'Flute', 'Strings'], instrumentsCN: ['钢琴', '竖琴', '长笛', '弦乐'],
    scenes: ['Water', 'Moonlight', 'Dream', 'Underwater', 'Impressionist Painting'], scenesCN: ['水', '月光', '梦', '水下', '印象派绘画'],
    sunoKeywords: ['Debussy style', 'impressionist piano', 'Clair de Lune', 'dreamy classical', 'water music'],
    influence: 'SS', notableWorks: ['Clair de Lune', 'Prélude à l\'après-midi d\'un faune', 'La Mer', 'Arabesque No.1'],
    notableWorksCN: ['月光', '牧神午后前奏曲', '大海', '阿拉伯风格曲第一号'],
    tags: ['impressionist', 'French', 'piano', 'dreamy', 'water'],
  },
  { name: 'Frédéric Chopin', nameCN: '肖邦', country: 'Poland', countryCN: '波兰', era: '19th Century', type: 'Classical',
    styles: ['Romantic', 'Piano', 'Nocturne'], stylesCN: ['浪漫', '钢琴', '夜曲'],
    emotions: ['Melancholic', 'Romantic', 'Passionate', 'Delicate'], emotionsCN: ['忧伤', '浪漫', '激情', '细腻'],
    instruments: ['Piano'], instrumentsCN: ['钢琴'],
    scenes: ['Romance', 'Melancholy', 'Salon', 'Autumn', 'Night'], scenesCN: ['浪漫', '忧伤', '沙龙', '秋天', '夜晚'],
    sunoKeywords: ['Chopin style', 'nocturne', 'romantic piano', 'mazurka', 'etude expressive'],
    influence: 'SS', notableWorks: ['Nocturnes', 'Ballade No.1', 'Études', 'Polonaise in A-flat major'],
    notableWorksCN: ['夜曲', '第一叙事曲', '练习曲', '降A大调波兰舞曲'],
    tags: ['piano', 'romantic', 'Polish', 'nocturne', 'emotional'],
  },
  { name: 'Antonio Vivaldi', nameCN: '维瓦尔第', country: 'Italy', countryCN: '意大利', era: '18th Century', type: 'Classical',
    styles: ['Baroque', 'Programmatic', 'Nature'], stylesCN: ['巴洛克', '标题音乐', '自然'],
    emotions: ['Joyful', 'Energetic', 'Pastoral', 'Dramatic'], emotionsCN: ['喜悦', '活力', '田园', '戏剧'],
    instruments: ['Violin', 'Strings', 'Harpsichord', 'Orchestra'], instrumentsCN: ['小提琴', '弦乐', '羽管键琴', '管弦乐队'],
    scenes: ['Nature', 'Four Seasons', 'Storm', 'Garden', 'Baroque Court'], scenesCN: ['自然', '四季', '暴风雨', '花园', '巴洛克宫廷'],
    sunoKeywords: ['Vivaldi style', 'Four Seasons', 'Baroque strings', 'violin concerto', 'storm music'],
    influence: 'SS', notableWorks: ['The Four Seasons', 'Gloria', 'Concerto for Two Violins', 'Nulla in mundo pax sincera'],
    notableWorksCN: ['四季', '荣耀经', '双小提琴协奏曲', '世上没有真正的和平'],
    tags: ['Baroque', 'Italian', 'violin', 'nature', 'seasonal'],
  },
  { name: 'Igor Stravinsky', nameCN: '斯特拉文斯基', country: 'Russia', countryCN: '俄国', era: '20th Century', type: 'Classical',
    styles: ['Modern', 'Primitivist', 'Neoclassical'], stylesCN: ['现代', '原始主义', '新古典'],
    emotions: ['Primal', 'Chaotic', 'Ritualistic', 'Powerful'], emotionsCN: ['原始', '混乱', '仪式', '力量'],
    instruments: ['Orchestra', 'Percussion', 'Brass', 'Bassoon'], instrumentsCN: ['管弦乐队', '打击乐', '铜管', '大管'],
    scenes: ['Ancient Ritual', 'Primitive', 'Chaos', 'Sacrifice', 'Rebellion'], scenesCN: ['古老仪式', '原始', '混乱', '牺牲', '反叛'],
    sunoKeywords: ['Stravinsky style', 'Rite of Spring', 'primitive rhythm', 'orchestral chaos', 'ritual drums'],
    influence: 'SS', notableWorks: ['The Rite of Spring', 'The Firebird', 'Petrushka', 'Symphony of Psalms'],
    notableWorksCN: ['春之祭', '火鸟', '彼得鲁什卡', '诗篇交响曲'],
    tags: ['modern', 'primal', 'ritual', 'Russian', 'revolutionary'],
  },
  { name: 'Maurice Ravel', nameCN: '拉威尔', country: 'France', countryCN: '法国', era: '19th-20th Century', type: 'Classical',
    styles: ['Impressionist', 'Orchestral', 'Spanish Influenced'], stylesCN: ['印象派', '管弦', '西班牙影响'],
    emotions: ['Sensual', 'Elegant', 'Mysterious', 'Dramatic'], emotionsCN: ['感性', '优雅', '神秘', '戏剧'],
    instruments: ['Orchestra', 'Piano', 'Harp', 'Percussion'], instrumentsCN: ['管弦乐队', '钢琴', '竖琴', '打击乐'],
    scenes: ['Spanish Night', 'Waltz', 'Fairy Tale', 'Orchestral Showcase'], scenesCN: ['西班牙之夜', '华尔兹', '童话', '管弦展示'],
    sunoKeywords: ['Ravel style', 'Bolero', 'Daphnis et Chloé', 'impressionist orchestral', 'piano concerto'],
    influence: 'S', notableWorks: ['Boléro', 'Daphnis et Chloé', 'Pavane pour une infante défunte', 'Gaspard de la nuit'],
    notableWorksCN: ['波莱罗', '达芙妮与克罗埃', '悼念公主的帕凡舞曲', '夜之幽灵'],
    tags: ['impressionist', 'French', 'orchestral', 'Spanish', 'beautiful'],
  },
  { name: 'Gustav Mahler', nameCN: '马勒', country: 'Austria', countryCN: '奥地利', era: '19th-20th Century', type: 'Classical',
    styles: ['Romantic', 'Symphonic', 'Epic'], stylesCN: ['浪漫', '交响', '史诗'],
    emotions: ['Epic', 'Tragic', 'Transcendent', 'Profound'], emotionsCN: ['史诗', '悲剧', '超越', '深刻'],
    instruments: ['Orchestra', 'Choir', 'Brass', 'Strings'], instrumentsCN: ['管弦乐队', '合唱', '铜管', '弦乐'],
    scenes: ['Cosmos', 'Life and Death', 'Nature', 'Heaven', 'Tragedy'], scenesCN: ['宇宙', '生死', '自然', '天堂', '悲剧'],
    sunoKeywords: ['Mahler style', 'Symphony of a Thousand', 'Adagietto', 'epic orchestral', 'cosmic'],
    influence: 'SS', notableWorks: ['Symphony No.2 Resurrection', 'Symphony No.5', 'Symphony No.8', 'Das Lied von der Erde'],
    notableWorksCN: ['第二交响曲复活', '第五交响曲', '第八千人交响曲', '大地之歌'],
    tags: ['symphony', 'epic', 'Austrian', 'cosmic', 'transcendent'],
  },
  { name: 'Dmitri Shostakovich', nameCN: '肖斯塔科维奇', country: 'Russia', countryCN: '俄国', era: '20th Century', type: 'Classical',
    styles: ['Modern', 'Dark', 'Soviet'], stylesCN: ['现代', '黑暗', '苏联'],
    emotions: ['Dark', 'Sardonic', 'Tragic', 'Heroic'], emotionsCN: ['黑暗', '讽刺', '悲剧', '英雄'],
    instruments: ['Orchestra', 'Brass', 'Piano', 'Percussion'], instrumentsCN: ['管弦乐队', '铜管', '钢琴', '打击乐'],
    scenes: ['War', 'Oppression', 'Dark Comedy', 'Soviet Era', 'Resistance'], scenesCN: ['战争', '压迫', '黑色喜剧', '苏联时代', '抵抗'],
    sunoKeywords: ['Shostakovich style', 'Soviet symphony', 'dark waltz', 'war strings', 'sardonic brass'],
    influence: 'SS', notableWorks: ['Symphony No.5', 'Symphony No.7 Leningrad', 'String Quartet No.8', 'Jazz Suite No.2 (Waltz)'],
    notableWorksCN: ['第五交响曲', '第七交响曲列宁格勒', '第八弦乐四重奏', '第二爵士组曲(华尔兹)'],
    tags: ['Soviet', 'dark', 'war', 'waltz', 'modern'],
  },
];

// ═══════════════════════════════════════════════════════════
// ELECTRONIC / AMBIENT / EXPERIMENTAL (25)
// ═══════════════════════════════════════════════════════════

const ELECTRONIC_COMPOSERS: ComposerProfile[] = [
  { name: 'Vangelis', nameCN: '范吉利斯', country: 'Greece', countryCN: '希腊', era: '1970s-2022', type: 'Electronic',
    styles: ['Synth Cinematic', 'Ambient', 'Space', 'New Age'], stylesCN: ['合成电影', '氛围', '太空', '新世纪'],
    emotions: ['Epic', 'Transcendent', 'Mysterious', 'Heroic'], emotionsCN: ['史诗', '超越', '神秘', '英雄'],
    instruments: ['Synthesizer', 'Piano', 'Pad', 'Choir'], instrumentsCN: ['合成器', '钢琴', '铺垫', '合唱'],
    scenes: ['Space', 'Olympics', 'Ancient World', 'Future', 'Epic Journey'], scenesCN: ['太空', '奥运', '古代世界', '未来', '史诗旅程'],
    sunoKeywords: ['Vangelis style', 'Blade Runner synth', 'Chariots of Fire', 'space ambient', 'Greek electronic'],
    influence: 'SSS', notableWorks: ['Blade Runner', 'Chariots of Fire', '1492: Conquest of Paradise', 'Antarctica'],
    notableWorksCN: ['银翼杀手', '烈火战车', '1492征服天堂', '南极'],
    tags: ['synth', 'space', 'ambient', 'Blade Runner', 'Greek'],
  },
  { name: 'Brian Eno', nameCN: '布莱恩·伊诺', country: 'UK', countryCN: '英国', era: '1970s-present', type: 'Electronic',
    styles: ['Ambient', 'Minimalist', 'Generative', 'Experimental'], stylesCN: ['氛围', '极简', '生成式', '实验'],
    emotions: ['Peaceful', 'Contemplative', 'Ethereal', 'Detached'], emotionsCN: ['宁静', '沉思', '飘渺', '抽离'],
    instruments: ['Pad', 'Synth', 'Piano', 'Tape'], instrumentsCN: ['铺垫', '合成器', '钢琴', '磁带'],
    scenes: ['Space', 'Meditation', 'Hospital', 'Art Gallery', 'Liminal Space'], scenesCN: ['太空', '冥想', '医院', '美术馆', '阈限空间'],
    sunoKeywords: ['Eno style', 'ambient generative', 'Music for Airports', 'atmospheric drone', 'minimalist electronic'],
    influence: 'SSS', notableWorks: ['Music for Airports', 'Ambient 1-4', 'Apollo', 'Another Green World'],
    notableWorksCN: ['机场音乐', '氛围1-4', '阿波罗', '另一个绿色世界'],
    tags: ['ambient', 'generative', 'minimalist', 'British', 'pioneer'],
  },
  { name: 'Aphex Twin', nameCN: '艾菲克斯双胞胎', country: 'UK', countryCN: '英国', era: '1990s-present', type: 'Electronic',
    styles: ['IDM', 'Experimental', 'Ambient', 'Glitch'], stylesCN: ['智能舞曲', '实验', '氛围', '故障'],
    emotions: ['Unsettling', 'Hypnotic', 'Ethereal', 'Playful'], emotionsCN: ['不安', '催眠', '飘渺', '俏皮'],
    instruments: ['Synth', 'Drum Machine', 'Piano', 'Sampler'], instrumentsCN: ['合成器', '鼓机', '钢琴', '采样器'],
    scenes: ['Cyberpunk', 'Dream State', 'Glitch Reality', 'Abstract'], scenesCN: ['赛博朋克', '梦境', '故障现实', '抽象'],
    sunoKeywords: ['Aphex Twin style', 'IDM glitch', 'ambient experimental', 'Selected Ambient Works', 'electronic avant-garde'],
    influence: 'SS', notableWorks: ['Selected Ambient Works 85-92', 'Drukqs', 'Syro', 'Windowlicker'],
    notableWorksCN: ['氛围作品精选85-92', 'Drukqs', 'Syro', 'Windowlicker'],
    tags: ['IDM', 'experimental', 'ambient', 'British', 'glitch'],
  },
  { name: 'Daft Punk', nameCN: '蠢朋克', country: 'France', countryCN: '法国', era: '1990s-2021', type: 'Electronic',
    styles: ['French House', 'Disco', 'Electronic', 'Funk'], stylesCN: ['法国浩室', '迪斯科', '电子', '放克'],
    emotions: ['Energetic', 'Futuristic', 'Nostalgic', 'Cool'], emotionsCN: ['活力', '未来', '怀旧', '酷'],
    instruments: ['Synth', 'Bass', 'Drum Machine', 'Vocoder'], instrumentsCN: ['合成器', '贝斯', '鼓机', '声码器'],
    scenes: ['Cyberpunk', 'Dance', 'Future City', 'Space', 'Robot'], scenesCN: ['赛博朋克', '舞会', '未来城市', '太空', '机器人'],
    sunoKeywords: ['Daft Punk style', 'French touch', 'Tron Legacy score', 'funk electronic', 'robot disco'],
    influence: 'SSS', notableWorks: ['Tron: Legacy', 'Random Access Memories', 'Discovery', 'Homework'],
    notableWorksCN: ['创：战纪', '随机存取记忆', '发现', '家庭作业'],
    tags: ['French house', 'disco', 'funk', 'robot', 'Tron'],
  },
  { name: 'M83', nameCN: 'M83', country: 'France', countryCN: '法国', era: '2000s-present', type: 'Electronic',
    styles: ['Dream Pop', 'Synthwave', 'Shoegaze', 'Epic'], stylesCN: ['梦幻流行', '合成波', '自赏', '史诗'],
    emotions: ['Nostalgic', 'Dreamy', 'Epic', 'Euphoric'], emotionsCN: ['怀旧', '梦幻', '史诗', '欣快'],
    instruments: ['Synth', 'Guitar', 'Drums', 'Pad'], instrumentsCN: ['合成器', '吉他', '鼓', '铺垫'],
    scenes: ['Coming of Age', 'Cosmic', 'Retro Future', 'Emotional Climax'], scenesCN: ['成长', '宇宙', '复古未来', '情感高潮'],
    sunoKeywords: ['M83 style', 'Oblivion score', 'Midnight City', 'dreamwave', 'epic synth'],
    influence: 'S', notableWorks: ['Oblivion', 'Hurry Up We\'re Dreaming', 'Before the Dawn Heals Us', 'Saturdays = Youth'],
    notableWorksCN: ['遗落战境', '快，我们在做梦', '黎明前治愈我们', '星期六=青春'],
    tags: ['synthwave', 'dreamy', 'French', 'epic', 'nostalgic'],
  },
  { name: 'Jean-Michel Jarre', nameCN: '让·米歇尔·雅尔', country: 'France', countryCN: '法国', era: '1970s-present', type: 'Electronic',
    styles: ['Synth', 'Space Music', 'New Age', 'Electronic'], stylesCN: ['合成器', '太空音乐', '新世纪', '电子'],
    emotions: ['Futuristic', 'Mysterious', 'Ethereal', 'Grand'], emotionsCN: ['未来', '神秘', '飘渺', '宏大'],
    instruments: ['Synthesizer', 'Laser Harp', 'Sequencer', 'Pad'], instrumentsCN: ['合成器', '激光竖琴', '音序器', '铺垫'],
    scenes: ['Space', 'Future', 'Light Show', 'Cityscape', 'Technology'], scenesCN: ['太空', '未来', '灯光秀', '城市景观', '科技'],
    sunoKeywords: ['Jarre style', 'Oxygène', 'French electronic', 'space synth', 'Équinoxe'],
    influence: 'SS', notableWorks: ['Oxygène', 'Équinoxe', 'Magnetic Fields', 'Waiting for Cousteau'],
    notableWorksCN: ['氧气', '昼夜平分', '磁场', '等待库斯托'],
    tags: ['French', 'synth', 'space', 'pioneer', 'New Age'],
  },
  { name: 'Tangerine Dream', nameCN: '橘梦', country: 'Germany', countryCN: '德国', era: '1960s-present', type: 'Electronic',
    styles: ['Berlin School', 'Ambient', 'Synth', 'Krautrock'], stylesCN: ['柏林学派', '氛围', '合成', '泡菜摇滚'],
    emotions: ['Mysterious', 'Atmospheric', 'Hypnotic', 'Spacey'], emotionsCN: ['神秘', '氛围', '催眠', '太空感'],
    instruments: ['Synthesizer', 'Sequencer', 'Mellotron', 'Pad'], instrumentsCN: ['合成器', '音序器', '电子琴', '铺垫'],
    scenes: ['Space', 'Sci-Fi', 'Dream', 'Hypnosis', 'Underground'], scenesCN: ['太空', '科幻', '梦', '催眠', '地下'],
    sunoKeywords: ['Tangerine Dream style', 'Berlin School', 'synth sequence', 'ambient kosmische', 'German electronic'],
    influence: 'SS', notableWorks: ['Phaedra', 'Rubycon', 'Risky Business', 'Sorcerer'],
    notableWorksCN: ['费德拉', '鲁比孔', '乖仔也疯狂', '巫师'],
    tags: ['Berlin School', 'German', 'synth', 'ambient', 'pioneer'],
  },
  { name: 'Kraftwerk', nameCN: '发电站', country: 'Germany', countryCN: '德国', era: '1970s-present', type: 'Electronic',
    styles: ['Electro', 'Synth Pop', 'Krautrock', 'Techno'], stylesCN: ['电子', '合成流行', '泡菜摇滚', '科技舞曲'],
    emotions: ['Futuristic', 'Robotic', 'Clean', 'Hypnotic'], emotionsCN: ['未来', '机器人', '干净', '催眠'],
    instruments: ['Synthesizer', 'Drum Machine', 'Vocoder', 'Sequencer'], instrumentsCN: ['合成器', '鼓机', '声码器', '音序器'],
    scenes: ['Futuristic City', 'Autobahn', 'Robot Factory', 'Computer World'], scenesCN: ['未来城市', '高速公路', '机器人工厂', '电脑世界'],
    sunoKeywords: ['Kraftwerk style', 'German electro', 'Autobahn', 'robot pop', 'analog synth'],
    influence: 'SSS', notableWorks: ['Autobahn', 'Trans-Europe Express', 'The Man-Machine', 'Computer World'],
    notableWorksCN: ['高速公路', '环欧快车', '人机', '电脑世界'],
    tags: ['German', 'electro', 'pioneer', 'robot', 'synth pop'],
  },
  { name: 'Boards of Canada', nameCN: '加拿大木板', country: 'UK', countryCN: '英国', era: '1990s-present', type: 'Electronic',
    styles: ['IDM', 'Ambient', 'Downtempo', 'Nostalgic'], stylesCN: ['智能舞曲', '氛围', '缓拍', '怀旧'],
    emotions: ['Nostalgic', 'Unsettling', 'Warm', 'Childlike'], emotionsCN: ['怀旧', '不安', '温暖', '童真'],
    instruments: ['Synth', 'Sampler', 'Drum Machine', 'Tape'], instrumentsCN: ['合成器', '采样器', '鼓机', '磁带'],
    scenes: ['Childhood Memory', 'Nature Documentary', 'Hauntology', 'Summer'], scenesCN: ['童年记忆', '自然纪录片', '魂学', '夏天'],
    sunoKeywords: ['Boards of Canada style', 'nostalgic IDM', 'warped tape', 'ambient downtempo', 'childhood'],
    influence: 'S', notableWorks: ['Music Has the Right to Children', 'Geogaddi', 'The Campfire Headphase', 'Tomorrow\'s Harvest'],
    notableWorksCN: ['音乐对孩子有权利', '地质', '篝火过度阶段', '明日收获'],
    tags: ['IDM', 'nostalgic', 'Scottish', 'ambient', 'tape'],
  },
];

// ═══════════════════════════════════════════════════════════
// GAME MUSIC COMPOSERS (15)
// ═══════════════════════════════════════════════════════════

const GAME_COMPOSERS: ComposerProfile[] = [
  { name: 'Nobuo Uematsu', nameCN: '植松伸夫', country: 'Japan', countryCN: '日本', era: '1980s-present', type: 'Game Music',
    styles: ['Orchestral', 'Rock', 'Fantasy', 'Operatic'], stylesCN: ['管弦', '摇滚', '奇幻', '歌剧'],
    emotions: ['Epic', 'Emotional', 'Adventurous', 'Heroic'], emotionsCN: ['史诗', '情感', '冒险', '英雄'],
    instruments: ['Orchestra', 'Electric Guitar', 'Choir', 'Piano'], instrumentsCN: ['管弦乐队', '电吉他', '合唱', '钢琴'],
    scenes: ['Fantasy Adventure', 'Battle', 'Airships', 'World Map', 'Final Boss'], scenesCN: ['奇幻冒险', '战斗', '飞艇', '世界地图', '最终Boss'],
    sunoKeywords: ['Final Fantasy style', 'Uematsu orchestral', 'JRPG music', 'fantasy rock', 'Nobuo epic'],
    influence: 'SSS', notableWorks: ['Final Fantasy I-X', 'Lost Odyssey', 'The Last Story', 'Fantasian'],
    notableWorksCN: ['最终幻想I-X', '失落的奥德赛', '最后的故事', '幻想曲'],
    tags: ['Final Fantasy', 'JRPG', 'Japanese', 'orchestral', 'fantasy'],
  },
  { name: 'Koji Kondo', nameCN: '近藤浩治', country: 'Japan', countryCN: '日本', era: '1980s-present', type: 'Game Music',
    styles: ['Orchestral', 'Playful', 'Adventure', 'Fantasy'], stylesCN: ['管弦', '俏皮', '冒险', '奇幻'],
    emotions: ['Adventurous', 'Playful', 'Heroic', 'Magical'], emotionsCN: ['冒险', '俏皮', '英雄', '魔法'],
    instruments: ['Orchestra', 'Piano', 'Synth', 'Brass'], instrumentsCN: ['管弦乐队', '钢琴', '合成器', '铜管'],
    scenes: ['Adventure', 'Fantasy World', 'Underwater', 'Castle', 'Forest'], scenesCN: ['冒险', '奇幻世界', '水下', '城堡', '森林'],
    sunoKeywords: ['Zelda style', 'Nintendo orchestral', 'Kondo adventure', 'Mario theme', 'Hyrule field'],
    influence: 'SSS', notableWorks: ['Super Mario Bros.', 'The Legend of Zelda', 'Ocarina of Time', 'Super Mario 64'],
    notableWorksCN: ['超级马里奥兄弟', '塞尔达传说', '时之笛', '超级马里奥64'],
    tags: ['Nintendo', 'Zelda', 'Mario', 'Japanese', 'adventure'],
  },
  { name: 'Yoko Shimomura', nameCN: '下村阳子', country: 'Japan', countryCN: '日本', era: '1990s-present', type: 'Game Music',
    styles: ['Orchestral', 'Piano', 'Fantasy', 'Emotional'], stylesCN: ['管弦', '钢琴', '奇幻', '情感'],
    emotions: ['Emotional', 'Heroic', 'Melancholic', 'Epic'], emotionsCN: ['情感', '英雄', '忧伤', '史诗'],
    instruments: ['Piano', 'Strings', 'Brass', 'Choir'], instrumentsCN: ['钢琴', '弦乐', '铜管', '合唱'],
    scenes: ['Fantasy RPG', 'Emotional Moment', 'Battle', 'Disney Fantasy'], scenesCN: ['奇幻RPG', '情感时刻', '战斗', '迪士尼奇幻'],
    sunoKeywords: ['Kingdom Hearts style', 'Shimomura piano', 'JRPG emotional', 'fantasy orchestral', 'Dearly Beloved'],
    influence: 'SS', notableWorks: ['Kingdom Hearts series', 'Final Fantasy XV', 'Street Fighter II', 'Mario & Luigi RPG'],
    notableWorksCN: ['王国之心系列', '最终幻想15', '街头霸王2', '马里奥与路易RPG'],
    tags: ['Kingdom Hearts', 'piano', 'JRPG', 'fantasy', 'emotional'],
  },
  { name: 'Keiichi Okabe', nameCN: '冈部启一', country: 'Japan', countryCN: '日本', era: '2000s-present', type: 'Game Music',
    styles: ['Orchestral', 'Vocal', 'Fantasy', 'Emotional'], stylesCN: ['管弦', '人声', '奇幻', '情感'],
    emotions: ['Melancholic', 'Epic', 'Emotional', 'Ethereal'], emotionsCN: ['忧伤', '史诗', '情感', '飘渺'],
    instruments: ['Choir', 'Strings', 'Piano', 'Percussion'], instrumentsCN: ['合唱', '弦乐', '钢琴', '打击乐'],
    scenes: ['Post-Apocalyptic', 'Fantasy', 'Tragedy', 'Ruins', 'Emotional Boss'], scenesCN: ['末世', '奇幻', '悲剧', '废墟', '情感Boss战'],
    sunoKeywords: ['Nier style', 'Okabe vocal', 'Weight of the World', 'fantasy melancholy', 'choir emotional'],
    influence: 'S', notableWorks: ['Nier series', 'Nier: Automata', 'Drakengard 3', 'Tekken series'],
    notableWorksCN: ['尼尔系列', '尼尔：机械纪元', '龙背上的骑兵3', '铁拳系列'],
    tags: ['Nier', 'vocal', 'melancholic', 'fantasy', 'choir'],
  },
  { name: 'Austin Wintory', nameCN: '奥斯汀·温托里', country: 'USA', countryCN: '美国', era: '2000s-present', type: 'Game Music',
    styles: ['Orchestral', 'Emotional', 'Minimalist', 'World'], stylesCN: ['管弦', '情感', '极简', '世界'],
    emotions: ['Emotional', 'Peaceful', 'Adventurous', 'Reflective'], emotionsCN: ['情感', '宁静', '冒险', '反思'],
    instruments: ['Strings', 'Flute', 'Piano', 'Orchestra'], instrumentsCN: ['弦乐', '长笛', '钢琴', '管弦乐队'],
    scenes: ['Journey', 'Desert', 'Ancient Ruin', 'Flight', 'Discovery'], scenesCN: ['旅途', '沙漠', '古老废墟', '飞行', '发现'],
    sunoKeywords: ['Journey game style', 'Wintory orchestral', 'emotional strings', 'desert ambient', 'Grammy game'],
    influence: 'S', notableWorks: ['Journey', 'Abzû', 'The Banner Saga', 'Assassin\'s Creed Syndicate'],
    notableWorksCN: ['风之旅人', 'ABZÛ', '旗帜传说', '刺客信条枭雄'],
    tags: ['Journey', 'emotional', 'orchestral', 'Grammy', 'indie'],
  },
  { name: 'Gareth Coker', nameCN: '加雷思·科克', country: 'UK', countryCN: '英国', era: '2010s-present', type: 'Game Music',
    styles: ['Orchestral', 'Fantasy', 'Emotional', 'Nature'], stylesCN: ['管弦', '奇幻', '情感', '自然'],
    emotions: ['Emotional', 'Heroic', 'Peaceful', 'Magical'], emotionsCN: ['情感', '英雄', '宁静', '魔法'],
    instruments: ['Strings', 'Brass', 'Piano', 'Woodwinds'], instrumentsCN: ['弦乐', '铜管', '钢琴', '木管'],
    scenes: ['Forest', 'Fantasy Adventure', 'Emotional Journey', 'Nature'], scenesCN: ['森林', '奇幻冒险', '情感旅程', '自然'],
    sunoKeywords: ['Ori style', 'Coker fantasy', 'emotional platformer', 'orchestral nature', 'spirit tree'],
    influence: 'S', notableWorks: ['Ori and the Blind Forest', 'Ori and the Will of the Wisps', 'ARK', 'Immortals Fenyx Rising'],
    notableWorksCN: ['奥日与黑暗森林', '奥日与萤火意志', '方舟', '渡神纪芬尼克斯崛起'],
    tags: ['Ori', 'fantasy', 'emotional', 'orchestral', 'nature'],
  },
  { name: 'Martin O\'Donnell', nameCN: '马丁·奥唐纳', country: 'USA', countryCN: '美国', era: '1990s-present', type: 'Game Music',
    styles: ['Orchestral', 'Epic', 'Sci-Fi', 'Gregorian'], stylesCN: ['管弦', '史诗', '科幻', '格里高利'],
    emotions: ['Epic', 'Mysterious', 'Ancient', 'Heroic'], emotionsCN: ['史诗', '神秘', '古老', '英雄'],
    instruments: ['Choir', 'Strings', 'Brass', 'Percussion'], instrumentsCN: ['合唱', '弦乐', '铜管', '打击乐'],
    scenes: ['Sci-Fi', 'Ancient Alien', 'Epic Battle', 'Space'], scenesCN: ['科幻', '古老外星', '史诗战斗', '太空'],
    sunoKeywords: ['Halo style', 'Gregorian chant', 'sci-fi epic', 'O\'Donnell choir', 'Halo theme'],
    influence: 'SS', notableWorks: ['Halo series', 'Destiny', 'Myth', 'Oni'],
    notableWorksCN: ['光环系列', '命运', '神话', '鬼妮'],
    tags: ['Halo', 'sci-fi', 'choir', 'epic', 'Gregorian'],
  },
  { name: 'Mick Gordon', nameCN: '米克·戈登', country: 'Australia', countryCN: '澳大利亚', era: '2000s-present', type: 'Game Music',
    styles: ['Industrial', 'Metal', 'Electronic', 'Aggressive'], stylesCN: ['工业', '金属', '电子', '侵略'],
    emotions: ['Aggressive', 'Powerful', 'Intense', 'Hellish'], emotionsCN: ['侵略', '力量', '紧张', '地狱'],
    instruments: ['8-String Guitar', 'Synth', 'Chains', 'Distorted Bass'], instrumentsCN: ['8弦吉他', '合成器', '链条', '失真贝斯'],
    scenes: ['Hell', 'Arena Combat', 'Demon Slaying', 'Cyber-Demon'], scenesCN: ['地狱', '竞技场', '恶魔猎杀', '赛博恶魔'],
    sunoKeywords: ['DOOM style', 'Mick Gordon industrial', 'djent metal', 'heavy electronic', 'BFG Division'],
    influence: 'SS', notableWorks: ['DOOM (2016)', 'DOOM Eternal', 'Wolfenstein', 'Prey'],
    notableWorksCN: ['毁灭战士2016', '毁灭战士永恒', '德军总部', '掠食'],
    tags: ['DOOM', 'metal', 'industrial', 'aggressive', 'heavy'],
  },
  { name: 'Jessica Curry', nameCN: '杰西卡·柯里', country: 'UK', countryCN: '英国', era: '2000s-present', type: 'Game Music',
    styles: ['Orchestral', 'Emotional', 'Minimalist', 'Choral'], stylesCN: ['管弦', '情感', '极简', '合唱'],
    emotions: ['Emotional', 'Melancholic', 'Peaceful', 'Haunting'], emotionsCN: ['情感', '忧伤', '宁静', '萦绕'],
    instruments: ['Choir', 'Piano', 'Strings', 'Harp'], instrumentsCN: ['合唱', '钢琴', '弦乐', '竖琴'],
    scenes: ['Walking Simulator', 'Emotional Narrative', 'Coastal', 'English Countryside'], scenesCN: ['步行模拟', '情感叙事', '海岸', '英国乡村'],
    sunoKeywords: ['Dear Esther style', 'emotional choral', 'British orchestral', 'Everybody\'s Gone to the Rapture', 'Curry strings'],
    influence: 'A', notableWorks: ['Dear Esther', 'Everybody\'s Gone to the Rapture', 'Amnesia: A Machine for Pigs', 'So Let Us Melt'],
    notableWorksCN: ['亲爱的埃丝特', '众生已入灭', '失忆症：猪猡的机器', '让我们一起融化'],
    tags: ['emotional', 'choral', 'British', 'indie', 'narrative'],
  },
  { name: 'Yasunori Mitsuda', nameCN: '光田康典', country: 'Japan', countryCN: '日本', era: '1990s-present', type: 'Game Music',
    styles: ['Celtic', 'Orchestral', 'World', 'Folk'], stylesCN: ['凯尔特', '管弦', '世界', '民谣'],
    emotions: ['Emotional', 'Adventurous', 'Melancholic', 'Epic'], emotionsCN: ['情感', '冒险', '忧伤', '史诗'],
    instruments: ['Guitar', 'Flute', 'Violin', 'Bagpipe'], instrumentsCN: ['吉他', '长笛', '小提琴', '风笛'],
    scenes: ['Time Travel', 'Fantasy RPG', 'Ocean', 'Ancient Civilization'], scenesCN: ['时空旅行', '奇幻RPG', '海洋', '古代文明'],
    sunoKeywords: ['Chrono style', 'Mitsuda Celtic', 'JRPG emotional', 'time theme', 'Xenogears'],
    influence: 'SS', notableWorks: ['Chrono Trigger', 'Chrono Cross', 'Xenogears', 'Xenoblade Chronicles 2'],
    notableWorksCN: ['时空之轮', '穿越时空', '异度装甲', '异度神剑2'],
    tags: ['Chrono', 'Celtic', 'JRPG', 'emotional', 'time travel'],
  },
];

// ═══════════════════════════════════════════════════════════
// ALL COMPOSERS
// ═══════════════════════════════════════════════════════════

export const ALL_COMPOSERS: ComposerProfile[] = [
  ...FILM_SCORE_COMPOSERS,
  ...CLASSICAL_COMPOSERS,
  ...ELECTRONIC_COMPOSERS,
  ...GAME_COMPOSERS,
];

// ═══════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════

/** Search composers by scene description, genre, mood, or instrument */
export function searchComposers(query: string, topN: number = 5): ComposerProfile[] {
  const lower = query.toLowerCase();
  const scored = ALL_COMPOSERS.map(c => {
    let score = 0;
    const searchFields = [
      c.name.toLowerCase(), c.nameCN, c.type.toLowerCase(), c.country.toLowerCase(), c.countryCN, c.era,
      ...c.styles.map(s => s.toLowerCase()), ...c.stylesCN,
      ...c.emotions.map(s => s.toLowerCase()), ...c.emotionsCN,
      ...c.instruments.map(s => s.toLowerCase()), ...c.instrumentsCN,
      ...c.scenes.map(s => s.toLowerCase()), ...c.scenesCN,
      ...c.sunoKeywords.map(s => s.toLowerCase()),
      ...c.tags.map(s => s.toLowerCase()),
    ];
    for (const f of searchFields) {
      for (const word of lower.split(/\s+/)) {
        if (word.length < 2) continue;
        if (f.includes(word)) score += word.length >= 4 ? 2 : 1;
      }
    }
    // Influence bonus
    if (c.influence === 'SSS') score += 2;
    else if (c.influence === 'SS') score += 1;
    return { composer: c, score };
  }).filter(r => r.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN).map(r => r.composer);
}

/** Get top composers for a specific scene type + emotion + genre combo */
export function recommendComposers(sceneDescription: string, topN: number = 3): {
  composers: ComposerProfile[];
  aggregatedKeywords: string[];
  aggregatedInstruments: string[];
} {
  const composers = searchComposers(sceneDescription, topN);
  const keywords = [...new Set(composers.flatMap(c => c.sunoKeywords))].slice(0, 10);
  const instruments = [...new Set(composers.flatMap(c => c.instruments))].slice(0, 8);
  return { composers, aggregatedKeywords: keywords, aggregatedInstruments: instruments };
}

/** Format composer recommendations for Suno prompt injection */
export function formatComposerContext(sceneDescription: string, topN: number = 3): string {
  const { composers, aggregatedKeywords } = recommendComposers(sceneDescription, topN);
  if (composers.length === 0) return '';
  const parts = ['\n## 参考音乐家风格'];
  composers.forEach((c, i) => {
    parts.push(`${i + 1}. ${c.name} (${c.nameCN}) [${c.influence}] — ${c.stylesCN.join('/')} — Suno: ${c.sunoKeywords.slice(0, 3).join(', ')}`);
  });
  parts.push(`聚合关键词: ${aggregatedKeywords.slice(0, 8).join(', ')}`);
  return parts.join('\n');
}

/** Get composer count by tier */
export function composerStats() {
  const tiers = { SSS: 0, SS: 0, S: 0, A: 0 };
  const byType: Record<string, number> = {};
  ALL_COMPOSERS.forEach(c => {
    tiers[c.influence]++;
    byType[c.type] = (byType[c.type] || 0) + 1;
  });
  return { total: ALL_COMPOSERS.length, tiers, byType };
}
