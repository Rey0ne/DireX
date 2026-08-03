/* === Historical Civilization Knowledge Base ===
 * Purpose: Replace the modern-fashion-default when era is pre-1900.
 * Problem: style-db.ts is 100% 2020-2026 runway fashion → "3000年前角色穿现代衣服"
 * Fix: Era-aware costume, weapon, prop, and architecture data for 40+ historical periods.
 *
 * Architecture:
 *   - CHINESE_DYNASTIES: 商 through 清 — each with full costume/color/fabric/accessory data
 *   - WORLD_CIVILIZATIONS: Egypt/Greece/Rome/Mesopotamia/Medieval/Renaissance/Edo/Korea/Mughal/Ottoman
 *   - MILITARY_UNIFORMS: By era and civilization
 *   - HISTORICAL_WEAPONS: By period, with size/material/appearance
 *   - HISTORICAL_ARCHITECTURE: By era and region
 *   - ERA_ANACHRONISM_GUARD: Negative prompts per era to prevent time-traveling objects
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. CHINESE DYNASTIC COSTUME — 中国历代服饰
// ═══════════════════════════════════════════════════════════════════════════

export const CHINESE_DYNASTIES_DB = `## 中国历代服饰速查 (Chinese Dynastic Costume Reference)

### 商 (Shang Dynasty, c.1600-1046 BCE)
- **廓形**: 交领右衽 (right-lapel cross-collar)、上衣下裳 (upper garment tucked into lower skirt)、窄袖、衣长及膝
- **面料**: 麻 (ramie/hemp) 为主、葛 (kudzu fiber)、毛织物、早期丝绸仅贵族使用且极珍贵
- **配色**: 赤(红)、黑、白 三主色。尚白 (white revered)。玄衣纁裳 (black top, crimson-red skirt) 为礼制
- **纹样**: 云雷纹 (cloud-thunder pattern)、饕餮纹 (taotie beast mask)、夔龙纹 (kui-dragon)、回纹 (meander/key fret)
- **配饰**: 玉器 (jade — 璧/琮/璜/玦/环)、骨笄 (bone hairpin)、青铜带钩 (bronze belt hooks)
- **鞋履**: 麻履 (hemp shoes)、舄 (xi — ceremonial shoes with wooden sole)、皮革靴 (leather boots for military)
- **头饰**: 頍 (kui — cloth head wrap)、冠 (guan — ceremonial cap for nobility)、笄 (ji — hairpin, both genders)
- **闭合方式**: 系带 (cloth ties/ribbons)、腰带束腰 (sash/belt)。无纽扣、无拉链、无松紧带。
- **贵族标识**: 玉佩组 (jade pendant sets — 组玉佩)、青铜礼器纹样映射到服装纹饰、丝绸为顶级奢侈品

### 西周 (Western Zhou, c.1046-771 BCE)
- **廓形**: 冕服制度确立 — 六冕 (six ceremonial robe levels)。玄衣纁裳 (black top + crimson-red bottom) 为最高礼制
- **面料**: 丝绸种类增加 — 绢/绮/锦 (plain/twill/brocade silk)。麻为平民日常面料。
- **配色**: 正色五色体系 — 青(blue-green)/赤(red)/黄(yellow)/白(white)/黑(black)。间色为绀/红/缥/紫/流黄。
- **十二章纹**: 日/月/星辰/山/龙/华虫/宗彝/藻/火/粉米/黼/黻 — 绣于天子冕服，按等级递减
- **配饰**: 组玉佩 (multi-jade pendant sets — 身份等级核心标识)、玉圭 (jade tablet)、青铜銮铃 (bronze bell ornaments)
- **头饰**: 冕冠 (mian crown — 天子十二旒 twelve tassel strands)、弁 (bian — leather cap)、玄冠 (black ceremonial cap)
- **闭合方式**: 大带 (wide sash belt)、革带 (leather belt with bronze buckle)、系带。无纽扣。

### 春秋战国 (Spring-Autumn / Warring States, 770-221 BCE)
- **廓形**: 深衣 (shenyi — one-piece robe wrapping body, 上衣下裳连属)、曲裾 (curved-hem wrap)、直裾 (straight-hem) 开始出现
- **面料**: 织锦发达 (advanced brocade)、罗 (leno/gauze silk)、绮、刺绣。麻仍为平民日常。
- **配色**: 五色体系完善。楚国(Chu)偏好赤/黑/金; 齐国(Qi)偏好紫; 秦国(Qin)尚黑。
- **纹样**: 龙凤纹 (dragon-phoenix)、蟠螭纹 (coiled dragon)、几何菱形纹、狩猎纹 (hunting scenes)
- **配饰**: 带钩 (belt hook — 青铜/玉/金/银，身份象征)、玉佩 (jade pendants with elaborate carvings)、剑 (sword as noble accessory)
- **胡服骑射**: 赵武灵王引入 — 短衣/长裤/皮带钩/靴 (short jacket + trousers + belt hook + boots)，军事服装革命
- **鞋履**: 屦 (ju — cloth shoes)、舄 (xi — ceremonial)、革靴 (leather boots — 胡服影响)
- **闭合方式**: 带钩(金属/玉/青铜belt hooks)、系带。深衣以带束腰，多绕多系。

### 秦 (Qin Dynasty, 221-207 BCE)
- **廓形**: 统一服制。袍 (pao — full-length robe) 为通用款式。交领右衽、窄袖、衣长及踝。
- **面料**: 丝绸/麻/葛。等级分明 — 丝绸限于官员以上。
- **配色**: **尚黑** (black supremacy — 水德，water element)。官员: 黑色袍服。平民: 麻本色/白/褐。
- **纹样**: 几何菱形、云纹、菱格纹。纹饰远逊于楚地 — 秦审美偏简约、肃穆、功能至上。
- **兵甲**: 兵马俑式: 片甲 (lamellar armor — 皮或青铜片编缀)、长襦 (long tunic under armor)、胫缴 (leg wraps)、方口履 (square-toe shoes)、发髻偏右
- **配饰**: 青铜带钩、玉璧 (bi disc) 简化、法冠 (law cap — 獬豸冠 xiezhi cap)
- **闭合方式**: 带钩 (belt hooks dominant)、腰带系束。衣襟以系带固定。

### 汉 (Han Dynasty, 206 BCE-220 CE)
- **廓形**: 曲裾深衣(女性curved-hem wrap robe,多层缠绕)、直裾深衣(男性straight-hem)、襜褕(chanyu — 宽大直裾袍)。东汉出现上衣下裳分离趋势。
- **面料**: 丝绸黄金时代 — 锦/绣/罗/绮/绡/纨/缣。丝绸之路引入西域毛织物。麻为平民。棉花尚未传入。
- **配色**: 五色体系成熟。朱红/玄黑/纁(橙红)/紫/青/白/黄。马王堆出土织物色谱达36色。
- **纹样**: 云气纹 (floating cloud qi pattern)、茱萸纹、动物纹、几何菱纹、长寿绣 (longevity embroidery)、乘云绣 (riding-cloud embroidery)
- **女性服装**: 曲裾深衣多重绕襟 (curved hem wraps body 3+ turns)、曳地长裙 (floor-length trailing skirt)、宽袖(袖口收束)
- **男性服装**: 直裾长袍、襜褕、皂衣(黑衣)、进贤冠(文人冠)、武冠(武官冠)
- **配饰**: 玉佩组 (jade pendant suite — 珩/璜/琚/瑀/冲牙)、带钩(金/银/玉/青铜)、簪笔 (hairpin pen — 文官标识)、绶带 (ribbon — 官阶标识)
- **鞋履**: 舄 (xi — 绸面厚底)、履 (lǚ — 丝绸面鞋)、屐 (ji — wooden clogs)、革靴
- **闭合方式**: 腰带束衣、带钩扣合、系带。宽腰带(绅带)为礼服标配。无纽扣/拉链。

### 魏晋南北朝 (Wei-Jin-Northern/Southern Dynasties, 220-589 CE)
- **廓形**: 褒衣博带 (loose flowing robes with wide belts)、大袖衫 (wide-sleeved gown)、袴褶 (ku-xi — 短衣+宽口裤，胡服演变)。女性上俭下丰 (fitted top, full flowing bottom)
- **面料**: 丝绸/麻/葛。罗纱(透薄丝)流行。毛织物(胡服影响)。
- **配色**: 清淡素雅为主。白/月白/天青/淡紫/素黄/玄。佛教影响: 袈裟黄/赤。
- **纹样**: 莲花纹(Buddhist lotus)、忍冬纹(honeysuckle scroll)、对兽纹(symmetrical beasts)、联珠纹(pearl roundel — 波斯影响)
- **名士风**: 竹林七贤式 — 宽袍大袖(袖宽2尺+)、露臂/坦胸、散发/披发、木屐、裸袒不拘礼法
- **配饰**: 麈尾(chu-wei — deer-tail whisk,清谈道具)、如意(ruyi scepter)、笼冠(tall cage crown)、漆纱笼冠
- **鞋履**: 木屐(高齿屐 — tall-teeth clogs for muddy ground)、丝履、靴
- **闭合方式**: 博带(wide silk sash — 身份象征)、系带。腰带悬垂极长。无纽扣。

### 唐 (Tang Dynasty, 618-907 CE)
- **廓形(男性)**: 圆领袍 (round-collar robe — 最通用)、幞头(futou headwrap)、革带、乌皮靴。窄袖→中唐变宽。
- **廓形(女性)**: 齐胸襦裙(high-waist ruqun — 裙腰系于腋下，下摆曳地)、半臂(half-sleeve short jacket)、披帛(pibo — 长纱巾披肩)、大袖衫(宽袖透明外罩)
- **面料**: 丝绸盛世 — 锦/绫/罗/纱/绢/绮/缎/缂丝。益州(蜀锦)与扬州(绫)为两大中心。麻为平民。
- **配色**: 极尽华彩 — 石榴红(pomegranate red)、翠绿(kingfisher green)、明黄(imperial yellow)、紫(high rank)、鹅黄(pale yellow)、天水碧(sky-blue green)、绯红(crimson)
- **纹样**: 团窠纹(medallion)、联珠纹(pearl roundel — 萨珊波斯影响)、宝相花纹(lotus medallion)、卷草纹(scroll)、对鸟/对兽纹、狩猎纹、缠枝纹
- **女性妆发**: 高髻(high chignons — 半翻髻/抛家髻/椎髻)、花钿(forehead floral sticker)、面靥(dimple dot)、斜红(temple red)、额黄(forehead yellow powder)、蛾翅眉(moth-wing brows)
- **配饰**: 革带(leather belt with 金/玉/银 belt plaques — 官阶标识)、鱼袋(fish-shaped tally bag)、佩剑(ceremonial)、玉佩、金步摇(gold hairpin with dangling ornaments)、钗(chai — forked hairpin)、梳篦(comb ornament)
- **鞋履**: 乌皮靴(black leather boots for officials)、云头履(cloud-tip shoes)、重台履(platform shoes)、线鞋(string sandals)、锦靴(brocade boots for noble women)
- **闭合方式**: 革带(有带銙等级制)、系带、盘扣开始出现(极早期形态，丝结扣)。无拉链无松紧带。

### 宋 (Song Dynasty, 960-1279 CE)
- **廓形(男性)**: 圆领大袖袍衫(round-collar wide-sleeve robe)、直裰(zhiduo — straight robe, 家居/道袍)、襕衫(lanshan — scholar robe with hem band)
- **廓形(女性)**: 褙子(beizi — 直领对襟长外套至膝)、窄袖短衣+长裙、宋裤(song trousers under skirt)
- **面料**: 丝绸/棉(棉花传入推广)/麻。罗(透薄丝)流行—宋罗极精美。缂丝(kesi silk tapestry)达到艺术巅峰。
- **配色**: **素雅清丽为美**。天水碧(sky-water blue-green)、月白(moon white)、藕荷(pale mauve)、淡青(pale cyan)、烟灰(misty grey)、象牙白。不尚奢华刺绣→改以织纹、材质、剪裁取胜。
- **纹样**: 缠枝牡丹(peony scroll)、满地锦(full-ground brocade)、几何八达晕(octagon)、一年景(四季花卉同幅)、落花流水(floating petals on water)
- **女性妆发**: 低髻/包髻(modest low buns)、花冠(flower crown — 一年景四季花)、盖头(head kerchief)、素妆淡抹
- **配饰(男性)**: 幞头(futou — 长翅/方顶)、革带(pewter-to-leather, less gold)、玉佩简洁化、折扇(folding fan — 日本传入)、手炉(hand warmer)
- **配饰(女性)**: 金/银/珠/翠首饰趋于精巧—秀美不张扬。梳篦、簪、钗、耳环(ear ring — small)、镯(bangle)
- **鞋履**: 乌皮靴(官员)、丝鞋/布鞋、弓鞋(women small arched shoes)、木屐(雨鞋)
- **闭合方式**: 盘扣(silk knot buttons — 宋开始规模化使用)、系带、革带。纽扣(金属/玉/木制)开始出现于褙子。无拉链无松紧带。

### 元 (Yuan Dynasty, 1271-1368 CE)
- **廓形**: 质孙服(jisun — Mongol-style one-piece robe, 窄袖/紧身/及膝/腰带束腰)、辫线袄(braided-line jacket — 腰部有密集辫线装饰)、比肩(bijian — sleeveless vest, campaign gear)
- **面料**: 纳石失(nasij — 织金锦/gold-brocaded silk, 波斯工艺巅峰)、撒答剌欺(zandaniji — 中亚丝毛混纺)、毛皮(fur/pelt)、丝绸、棉
- **配色**: 金/赤/白/蓝/绿。尚白(蒙古传统)与金(伊斯兰+中原混合)。质孙服按等级颜色分明。
- **纹样**: 织金纹(gold brocade)、云肩纹(cloud collar)、团龙/团凤、滴珠窠(teardrop medallion)、格里芬(griffin — 波斯影响)
- **女性服装**: 团衫(tuan-shan — 宽大袍服)+半臂、姑姑冠(gugu hat — 蒙古贵妇高帽,桦树皮+绸缎+羽毛+珠饰,高达1-2尺)、云肩(cloud-shaped collar, 四合如意)
- **男性头饰**: 钹笠帽(baoli hat — bowl-shaped)、瓦楞帽(ribbed hat)、暖帽(fur cap)、七宝重顶冠(seven-jewel crown)
- **配饰**: 金镶嵌宝石、珊瑚/琥珀/玛瑙串饰(蒙古珠宝传统)、纳石失腰带(nasij gold-brocade belt)
- **鞋履**: 皮靴(leather boots — 蒙古传统)、云头靴、毡靴(felt boots)
- **闭合方式**: 革带(belt heavily used)、盘扣、系带。无拉链无松紧带。

### 明 (Ming Dynasty, 1368-1644 CE)
- **廓形(男性)**: 圆领袍(官员公服)、道袍/直裰(文人日常)、曳撒(yisan — 骑射袍,元遗留)、贴里(tieli — 内袍)
- **廓形(女性)**: 袄裙(aoqun — 短袄+马面裙)、褙子(beizi)、比甲(bijia — 无袖长马甲)、披风(pifeng — 对襟大袖外披)、水田衣(patchwork jacket,晚明)
- **面料**: 丝绸(云锦/宋锦/蜀锦/缂丝)、棉布(普及—松江布天下)、麻、纱、罗
- **配色(官服)**: 补子(buzi — rank badge)颜色按品级: 一品绯红(crimson)、二品绯红、三品绯红、四品绯红、五品青(cyan)、六品青、七品青、八品绿、九品绿。皇帝=明黄(弘治后)/玄+纁
- **配色(民间)**: 士庶妻女：紫/绿/桃红/浅红/月白/蓝/翠色。大红/鸦青/明黄限贵。
- **纹样**: 补子纹样: 一品仙鹤(crane)、二品锦鸡(golden pheasant)、三品孔雀(peacock)、龙袍斗牛/飞鱼/蟒纹。民间: 缠枝莲/折枝花/落花流水/八宝纹
- **女性头饰**: 凤冠(phoenix crown — 命妇,点翠+金+珍珠+宝石)、鬏髻(diji — 发髻底托)、头箍(head band, 珍珠/金镶)、簪/钗/梳/耳坠/手镯
- **男性头饰**: 乌纱帽(wu-sha-mao — black gauze official cap with wings)、网巾(wang-jin — hair net, 束发基础)、方巾/儒巾(scholar cap)、六合一统帽(后来演变为瓜皮帽)
- **配饰**: 补子(buzi — square rank badge on chest and back, 40-50cm square,embroidered)、革带(按品级:玉/金/银/乌角)、牙牌(ivory tablet)、玉佩组(组玉佩)、折扇、香囊(sachet)
- **鞋履**: 皂靴(black boots for officials)、云履(cloud shoes)、弓鞋(women shoes)、蒲鞋(straw shoes)
- **闭合方式**: 金属纽扣(metal buttons — 明盛行,金/银/铜/玉)、子母扣(press studs — 女装襟口)、盘扣、系带。无拉链无松紧带。

### 清 (Qing Dynasty, 1644-1912 CE)
- **廓形(男性)**: 长袍(changpao — 圆领/大襟/窄袖/及踝)+马褂(magua — 对襟骑马短褂,套在袍外)、马甲/坎肩(sleeveless vest)、衫(shirt)
- **廓形(女性)**: 旗装(qizhuang — 宽大直筒长袍,圆领大襟,平直不显腰身)+坎肩、氅衣(changyi — 两侧开衩外衣)、衬衣(chenyi — 不开衩内袍)
- **面料**: 丝绸(江宁/苏州/杭州织造府 — 云锦/宋锦/蜀锦)、棉布、漳绒(zhang-rong — 丝绒)、羽缎(camlet)、呢绒(wool broadcloth)
- **配色**: 石青(stone-blue — 最尊贵)、明黄(emperor only)、杏黄/金黄(皇子)、红/紫/蓝/月白/绿/香色/灰/黑。女装滚边配色丰富—18镶滚(18 lines of trim edges)。
- **纹样**: 龙袍十二章(延续明)、海水江崖(waves and cliffs at hem — 江山永固)、八宝(八吉祥:轮/螺/伞/盖/花/罐/鱼/长)、暗八仙、团花(roundel flower)、折枝花、蝴蝶、如意云头
- **女性发式**: 两把头(liangbatou — 旗头基础,横长扁方)、大拉翅(dalachì — 清末高大旗头板,黑缎+绢花+流苏)、燕尾(yànwěi — 脑后燕尾形发髻)
- **女性鞋履**: 花盆底鞋(huapendi — 木质高底鞋,底高5-15cm,形式花盆/马蹄/元宝)+绣花鞋面+穗子
- **男性发式**: 辫发(braided queue — 前额剃光+颅后留发编辫)、官帽(顶戴花翎—crystal/ruby/sapphire bead atop, peacock feather plume for merit)
- **配饰**: 朝珠(court beads — 108颗, 琥珀/珊瑚/蜜蜡/翡翠/碧玺,男女皆用)、扳指(thumb ring for archery — 翡翠/玉/象牙)、怀表(清末)、荷包/香囊(sachet pouch)、扇套/眼镜盒
- **鞋履**: 官靴(official boots — 缎面厚底)、快靴(light boots)、花盆底(女性)、弓鞋(汉族女性缠足小鞋)
- **闭合方式**: 盘扣(花样极多 — 一字扣/琵琶扣/蝴蝶扣/葫芦扣/凤凰扣)、纽扣(铜/玉/蜜蜡)、大襟右衽系带。无拉链无松紧带。

### 民国 (Republican Era, 1912-1949)
- **廓形(男性)**: 长衫(changshan — 改良长袍)+西裤、中山装(Zhongshan suit — 立领/四袋/五扣/三袖扣)、西装(urban elite)、学生装(student uniform)
- **廓形(女性)**: 改良旗袍(1920s-1940s — high mandarin collar, fitted body, side slits, cap sleeves or 3/4 sleeves)、文明新装(倒大袖上衣+黑长裙)、洋装(Western dress)
- **面料**: 丝绸/棉/呢绒/蕾丝(imported)/乔其纱(georgette)/丝绒(velvet)
- **配色**: 女性: 素雅(月白/粉/淡蓝/淡绿/藕荷)+深色滚边(黑/藏蓝/暗红)。男性: 藏蓝/灰/黑/卡其。
- **纹样**: Art Deco几何图案/传统折枝花/条纹/格纹
- **配饰**: 珍珠项链/翡翠/玉镯(民国标志性)、玳瑁眼镜、怀表/手表、手包/手袋(clutch)
- **鞋履**: 高跟鞋(女性革命性变化)、皮鞋(男性)、布鞋
- **闭合方式**: 盘扣(旗袍侧襟, 精致多样)、纽扣(金属/贝壳/布包扣)、拉链(1930s后少量出现,高级定制)。无松紧带(松紧带1940s后才普及)。
`;


// ═══════════════════════════════════════════════════════════════════════════
// 2. WORLD CIVILIZATIONS — 世界文明服饰
// ═══════════════════════════════════════════════════════════════════════════

export const WORLD_CIVILIZATIONS_DB = `## 世界古代文明服饰速查 (World Ancient Civilization Costume)

### 古埃及 (Ancient Egypt, c.3100-30 BCE)
- **男性**: Shendyt (缠腰布 shendyt kilt — 亚麻,及膝或及踝,前片三角形突起), Kalasiris (长袍,贵族男性也穿), 上身赤膊常见, 假发(elaborate wigs — 人发/植物纤维,黑或深棕), Nemes头巾(法老 striped headcloth), Pschent双王冠(红白双冠)
- **女性**: Kalasiris (贴身亚麻长袍,吊带或宽肩带,及踝,白/自然亚麻色), 假发更长更精致, 宽领圈(usekh collar — 彩陶/宝石/金,覆盖胸口), 透薄亚麻显身形
- **面料**: 亚麻(linen) 几乎是唯一面料 — 透气/洁白的极细亚麻为贵族,粗亚麻为平民。棉极稀少。丝绸未出现(丝绸仅始于公元前1世纪托勒密晚期)。
- **配色**: 白(亚麻本色)、金(gold — 神祇之色)、青金石蓝(lapis lazuli blue)、绿松石(turquoise)、红(赭石)、黑(眼影)、黄
- **纹样**: 莲花(lotus)、圣甲虫(scarab)、荷鲁斯之眼(Eye of Horus)、生命之符(ankh)、纸莎草(papyrus)、羽纹(feather pattern)、几何格纹
- **配饰**: 宽领圈(usekh)、臂环/腕环(bangles — 金/彩陶/象牙)、踝环(anklets)、戒指(圣甲虫戒指)、假发/假须(法老仪式用)
- **鞋履**: 凉鞋(sandals — 纸莎草/棕榈叶/皮革编结)、贵族: 金凉鞋或赤脚(室内神圣空间)
- **妆发**: Kohl黑眼线(方铅矿/孔雀石粉)、绿眼影(孔雀石)、红赭唇颊、假发浓密齐肩或更长。蓝或金色指甲花染料。
- **闭合方式**: 腰带/绳结、系带、别针(贵金属别针固定衣襟)。无纽扣无拉链。

### 古美索不达米亚 (Mesopotamia: Sumer/Akkad/Babylon/Assyria, c.3500-539 BCE)
- **男性**: Kaunakes (苏美尔时期 — 羊毛或羊皮流苏裙,层叠流苏覆盖,类似卷毛羊), 后期演变为带流苏边的披肩式袍服。亚述时期: 及踝束腰长袍+刺绣镶边+流苏边。
- **女性**: 同穿Kaunakes(早期)。后期为紧身长袍+披肩包裹。头巾/面纱(已婚女性必须戴面纱 — 亚述法律)。
- **面料**: 羊毛(主)、亚麻、羊皮(kaunakes流苏由羊皮条制成)。棉极少。丝绸未出现。
- **配色**: 自然毛色(棕/米白/黑)、紫(purple — Tyrian purple极珍贵,腓尼基)、红、蓝
- **纹样**: 流苏(fringe/tassels — 核心装饰元素)、几何边饰、玫瑰花结(rosette)、翼日盘(winged sun disk)、生命树(tree of life)
- **配饰**: 金耳环/臂环/项圈/印章戒指(cylinder seal — 圆筒印章,身份核心)、腓尼基玻璃珠项链
- **鞋履**: 凉鞋或赤脚。山地: 系带皮靴(boots with laces)。
- **闭合方式**: 腰带束腰、肩别针(贵金属pin固定披肩)、系带。无纽扣无拉链。

### 古米诺斯/迈锡尼 (Minoan/Mycenaean, c.2700-1100 BCE)
- **米诺斯女性**: 最独特 — 露胸紧身胸衣(bodice with open front/exposed breasts)、多褶长裙(layered flounced skirt)、窄腰(腰带或金属腰带束腰)、短袖紧身上衣、金发披肩或盘髻
- **米诺斯男性**: 缠腰布(loincloth/kilt — 及膝或及踝,前三角突起)、腰带束腰、上身赤膊或短披肩、长发或编辫
- **面料**: 羊毛、亚麻。精细纺织+染色(藏红花黄等)。
- **配色**: 赭红、藏红花黄、蓝、白、金、青金石蓝(壁画所见)
- **配饰**: 金耳环/项圈/臂环/戒指(米诺斯金工极发达)、蛇女神像式的蛇形臂环
- **鞋履**: 凉鞋、尖头皮靴(短靴)、部分赤脚
- **闭合方式**: 腰带(金属/皮革)、系带、别针。无纽扣无拉链。

### 古希腊 (Ancient Greece, c.800-146 BCE)
- **男性**: Chiton (希顿衫 — 亚麻/羊毛矩形布,两肩用fibula别针或缝线固定,腰带束腰、形成kolpos垂褶)、Himation (希马申大披肩 — 大矩形羊毛布包裹全身,外披于chiton上)、Chlamys (克拉米斯短斗篷 — 战士/旅行者/青年)
- **女性**: Doric Peplos (多利克式佩普洛斯 — 上方折返apoptygma形成双层垂感,两肩各一枚大别针fibula固定,腰带束腰)、Ionic Chiton (爱奥尼式 — 更薄更细褶,多枚小别针沿手臂固定形成袖状)、Himation (同男性,外披)
- **面料**: 亚麻(夏季)、羊毛(冬季)。面料幅宽1-2米、长度2-3倍身高(形成丰富垂褶)。极细"科斯岛丝"(Coan silk — 野蚕丝,透薄)为奢侈。棉未使用。
- **配色**: 白(亚麻本色,最常见)、自然羊毛色、藏红花黄、红、紫(Tyrian purple极珍贵,只有最高阶级)、蓝(靛蓝)、黑(丧服)
- **纹样**: 几何回纹(Greek key/meander)、棕叶饰(palmette)、卵锚饰(egg-and-dart)、人物神话场景(绣或织于织物边缘)、枝条纹
- **配饰**: Fibula(大别针 — 金/银/青铜,固定衣襟,常有大头装饰)、金叶冠(gold wreath crown)、金/银耳环/项链/手镯/臂环、蛇形戒指、宝石印章戒指
- **鞋履**: 凉鞋(sandals — 皮革底+系带至踝/小腿)、Crepida(士兵系带凉鞋)、长靴(endromides — 旅行/狩猎)、室内赤脚
- **妆发**: 男性: 短发,络腮胡(古典时期)。女性: 长发盘髻(chignon/bun)以发簪/发带固定,有时花环或金叶冠。
- **闭合方式**: Fibula 别针(肩部固定)、腰带束腰(zostēr — 绳子/皮带/金属链)、系带。无纽扣无拉链。

### 古罗马 (Ancient Rome, 753 BCE-476 CE)
- **男性(公民)**: Toga (托加袍 — 半圆形大羊毛布,半径约2.5m,复杂裹身方式sine sinus式,只有罗马公民可穿,不同颜色/边饰标志身份)、Tunica (丘尼卡内袍 — 亚麻/羊毛短袖及膝,腰带束腰)
- **Toga等级**: Toga praetexta(白袍紫色滚边 — 元老院议员/未成年男孩)、Toga virilis(纯白 — 成年男性公民)、Toga candida(漂白 — 竞选者)、Toga pulla(黑/暗 — 丧服)、Toga picta(全紫金绣 — 凯旋将军)
- **女性**: Stola (斯托拉 — 已婚女性长袍,及踝,肩部用fibula固定,下摆常加instita褶边)、Palla (帕拉外披 — 大矩形布裹身,可包头)、Strophium(胸带 — 软皮革/布,类似早期胸罩)
- **面料**: 羊毛(主)、亚麻(夏/内袍)、棉花(极少量通过埃及输入)、丝绸(极品奢侈通过丝绸之路输入 — 等重于黄金,一度仅限女性,后被禁)
- **配色**: 白(托加主色,白垩粉chalk增白)、紫(Tyrian purple — 从骨螺提取,万只骨螺出1g染料,每条紫滚边=贵族身份)、红/黄/蓝/棕/黑
- **纹样**: Clavi(紫色竖条纹 — tunica上,宽度标志阶级: angustus窄条=骑士, latus宽条=元老)、金色棕叶饰刺绣、圆盘饰(orbiculi — 晚期罗马)
- **配饰**: 金/银/青铜别针(fibula — 多样化设计:弓形/盘形/动物形)、金叶冠(帝王桂冠)、蛇形金臂环/手镯(经典罗马女性款)、印章戒指(签文件用)、Bulla(护身符吊坠盒 — 男孩佩戴至成年)
- **鞋履**: Calcei(皮鞋 — 公民正式鞋,元老:黑+象牙新月,骑士:红)、Soleae(室内凉鞋 — 出门不穿)、Caligae(军靴 — 厚皮底+镂空靴面+铁钉底)、Pero(农民粗皮靴)
- **妆发**: 男性: 短发,剃须(帝国时期)。女性: 复杂高发髻(Flavian时期极端高耸卷发)、金发网(reticulum)、卷发铁(calamistrum)、铅白粉底/赭红胭脂/炭黑眼影
- **闭合方式**: Fibula别针(肩部固定toga/stola)、腰带束腰(cinctus — tunica腰部打结或皮带)、系带/绳结。无纽扣无拉链。

### 拜占庭 (Byzantine Empire, c.330-1453 CE)
- **男性**: Tunica长袖及踝(丝绸/金绣)、Divitision(窄袖束腰长袍)、Chlamys(半圆形紫色大斗篷,右肩fibula固定,帝王专属/Tab lion方形金绣补)、Loros(帝王肩带 — 金绣长条缠绕,镶满宝石与珍珠)
- **女性**: Stola演变 — 长袖丝绸长袍、金银线绣、珍珠镶边、腰带高束胸下、Dalmatica(宽松长袍广袖)。头巾/面纱(mapforion)已婚女性普遍。
- **面料**: 丝绸(552年蚕卵从中国走私至君士坦丁堡—自产)、金线锦(gold brocade)、金织Samite、亚麻(日常)
- **配色**: 紫(Tyrian purple — 帝王专色 "born in the purple")、金(gold — 无处不在)、白(基督神圣)、红/蓝/绿(宝石色)。深色底色+金线绣。
- **纹样**: 基督十字(Christian cross)、双头鹰(Double-headed eagle — 帝国纹章)、狮子/格里芬、圆盘饰(orbiculi — 肩膝部方形绣片)、珍珠滚边(pearl edging)
- **配饰**: 金冠(Stemma — 金+彩色珐琅+珍珠+宝石垂饰)、金耳环(十字架+珍珠垂坠落)、金项圈(maniakis — 宝石镶嵌)、珐琅彩像章(enkolpion — 圣像护身符)、圣物盒(reliquary pendant)
- **鞋履**: Campagi(皇帝朱红或紫色绣金高筒靴 — 正面金线绣+珍珠)、Tzangia(同款更简版 — 高级官员)、凉鞋式宫廷鞋
- **妆发**: 男性: 短发/中长发,胡须(后期)。女性: 复杂编发+珍珠串饰+金冠/冠冕,浓妆(延续罗马)。
- **闭合方式**: Fibula 大别针(肩部固定斗篷)、金腰带(belt)、系带、钩扣(clasp)。无纽扣无拉链。

### 中世纪早期欧洲 (Early Medieval, c.500-1000 CE)
- **迁移时期/墨洛温/加洛林**: Tunic (羊毛/亚麻及膝,长袖,腰带束腰,男女通用)、Braies (宽松亚麻裤,小腿绑腿winingas/puttee wraps缠绕)、斗篷(square or rectangular cloak,右肩或胸前fibula/brooch固定)
- **维京/北欧**: Tunic(及膝,羊毛,腰带束腰)、Hangerok(女性 — 吊带围裙裙,两肩用大龟甲形oval brooches固定,内穿衬裙)、长裤/绑腿、厚毛斗篷(肩胛骨fibula固定)、毛皮镶边帽/兜帽
- **盎格鲁-撒克逊**: 同基础,女性 Cyrtel (长及脚踝束腰长袍)+头巾/面纱(wimple/veil — 已婚女性)。
- **面料**: 羊毛(绝对主导)、亚麻(衬衣/夏季)、毛皮(冬季/贵族)、大麻(粗用)。丝绸通过拜占庭输入极少量。
- **配色**: 天然羊毛色(棕/灰/米白/暗红/暗蓝/暗绿)、蓝(woad染料)、红(madder染料)、黄(weld染料)、紫(lichen)
- **纹样**: 简单几何镶边(tablet-woven braid — 牌织镶边)、刺绣(盎格鲁-撒克逊金线刺绣Opus Anglicanum闻名后期)
- **配饰**: 大胸针(brooch — 圆盘/龟甲/十字形)、琥珀/玻璃珠项链、金属臂环(torc)、腰带(皮革+金属扣)
- **闭合方式**: Brooch大胸针(矩形或圆形,肩/胸固定斗篷/衣服)、腰带(belt buckles)、系带(drawstring at neck)、皮绳。无纽扣(纽扣约1200s后才出现)、无拉链无松紧带。

### 中世纪盛期/晚期 (High/Late Medieval Europe, c.1000-1500 CE)
- **男性**: Cotte/Cote (及膝或及踝束腰外袍,早期宽松→14世纪变紧身,纽扣前襟)、Surcote (外罩,无袖或短袖,两侧大开衩)、Hose (紧身裤 — 羊毛,分体式每腿单独系于腰带上,14世纪变为joined hose连裤)、Pourpoint/Doublet (14世纪 — 紧身夹克,前襟纽扣,多层填充quilted,塑造胸腰廓形)
- **女性**: Cotte (及踝长袍,紧身塑造身形,低领口)、Surcote (外罩,贵族女性:两侧开衩可见内袍,毛皮镶边)、Sideless Surcote (无侧surcote — 露腰身,14世纪潮流)、Hennin (15世纪 — 高圆锥帽,轻纱,高耸夸张,搭配前额剃光)
- **骑士/贵族**: 锁子甲(chainmail hauberk — 及膝,长袖,联锁铁环,头戴coif连帽锁子甲)、罩袍(surcoat over armor — 绣家族纹章)、板甲(plate armor 14-15世纪 — 全钢板甲,关节灵活,米兰式/哥特式)。头盔: Great helm(桶形大盔)→Bascinet(尖顶可开面罩猪面visored bascinet)→Sallet(德式圆顶盔)。
- **面料**: 羊毛(主)、亚麻(内衣)、丝绸(贵族 — 意大利丝绸中心卢卡/威尼斯/佛罗伦萨)、天鹅绒(velvet — 15世纪贵族最爱)、锦缎(damask)、毛皮(ermine貂皮/松鼠皮vair — 镶边+衬里)
- **配色**: 鲜艳——得益于新染料技术。猩红(scarlet — kermes虫染料,最贵)、蓝(woad靛蓝)、绿(verdant绿)、紫(madder+woad)、金(番红花)。Parti-colored — 左右半身不同色(14世纪潮流)。
- **纹样**: 家族纹章(heraldry — 盾形纹章绣于surcoat)、凸纹织锦(brocade weave)、石榴花图案、尖窗饰(tracery)、刺绣(Opus Anglicanum 金线绣)
- **配饰**: 腰带(金属+宝石腰带,女性hip belt极长垂至地面)、法冠/主教冠(教会)、珠宝(戒指/胸针/项圈/冠冕)、念珠/玫瑰经珠(rosary)、朝圣徽章(pilgrim badge)、手套(刺绣+宝石)
- **鞋履**: Poulaine/Crakow (14-15世纪男性 — 极尖长鞋,尖长可达60cm+,象征身份,用鲸骨/苔藓撑鞋尖)、Patten (木底套鞋,防泥)、女性尖头软皮鞋
- **妆发**: 男性: 短发(早)→齐肩卷发(晚),剃须或短须。女性: 长发编辫盘头(早)→高额前剃发际线以显高额(15世纪)+hennin高帽。
- **闭合方式**: 纽扣(buttons — 13世纪普及,布包扣/金属扣/骨扣,前襟+袖口大量使用,从功能性变为装饰性)、lace/系带(lacing — 侧身/后背束身)、钩眼(hook & eye — 15世纪出现)、腰带。无拉链无松紧带。

### 文艺复兴 (Renaissance, c.1400-1600 CE)
- **意大利文艺复兴(15世纪)**: 男性 — Giornea(外穿短罩袍) + Farsetto(紧身夹克) + Calze(hose紧身裤)。女性 — Gamurra(束腰长裙)+ Giornea(外罩)。奢华面料——天鹅绒/锦缎/丝绸/金线锦。高腰线。发: 女性金发染金+珍珠网带+透明面纱。
- **都铎/伊丽莎白(16世纪英国)**: 男性 — Doublet(紧身夹克,蜜蜂腰peascod belly — 填充腹部)+ Trunk hose(南瓜裤 — 填充至球形/桶形)+ Ruff(拉夫领 — 星形褶裥亚麻颈圈,宽度可达30cm+)。女性 — 紧身胸衣stays(鲸骨+硬麻布,塑V形扁平胸腹)+ Farthingale(西班牙锥形裙撑 — 柳条/鲸骨圈)+ Ruff(拉夫领)+ 泡沫袖/羊腿袖+ Partlet(透明薄纱胸衣遮胸)。
- **面料**: 天鹅绒(velvet — 染深红/黑/绿,最贵)、锦缎(brocade — 金线/银线凸花)、丝绸(satin/taffeta/tissue)、蕾丝(lace — 威尼斯针绣蕾丝/枕头蕾丝)、亚麻(内衣/ruff领)
- **配色**: 强对比华丽。深红(crimson)、黑(jet black — 西班牙宫廷色,极难染)、紫(Tyrian purple复兴)、金(gold cloth)、银(silver tissue)、白(ruff领必须漂白至纯白/淀粉浆硬)、宝石色(翡翠绿/宝石蓝/石榴石红)
- **纹样**: 石榴花图案(pomegranate motif — Renaissance标志性)、Arabesque卷草、Grotesque怪诞组合、徽章纹(impresa)、家族纹章、蕾丝花卉纹
- **配饰**: Ruff拉夫领核心、小褶领(whisk collar,替代ruff)、大量珍珠(pearls — 伊丽莎白一世覆盖全身)、金链(collar of office — 官员身份)、戒指(每个手指多枚)、耳环(男性单耳海盗式/女性双耳)、鸵鸟羽毛扇/鸵鸟羽帽饰、手套(perfumed gloves)、手帕(handkerchief — 蕾丝边)
- **鞋履**: Chopine(女性高底木屐鞋 — 威尼斯,底高可达50cm,需两仆搀扶行走)、浅口尖头皮鞋(男)、丝缎平底宫廷鞋
- **闭合方式**: 纽扣(buttons — 小型密集用于doublet/紧身上衣正面)、lace系带(lacing — 紧身胸衣后背交叉系绳)、钩眼(hook & eye)、别针(pins — 固定ruff/partlet/面纱)。无拉链无松紧带。
`;


// ═══════════════════════════════════════════════════════════════════════════
// 3. ERA-ASIAN CIVILIZATIONS — 东亚世界文明（日韩）
// ═══════════════════════════════════════════════════════════════════════════

export const ASIAN_CIVILIZATIONS_DB = `## 东亚世界文明服饰速查 (Asian Civilization Costume)

### 平安时代日本 (Heian Japan, 794-1185 CE)
- **男性(贵族)**: 束带(sokutai — 朝服最高等级: 袍ho外罩+半臂hanpi无袖+下袭shitagasane曳地长裾+石带sekitai嵌玉腰带+笏shaku象牙板+冠kanmuri黑漆冠+靴)、直衣(noshi — 日常简版束带)、狩衣(kariginu — 圆领狩猎袍,最通用)
- **男性(武家)**: 直垂(hitatare — 短衣+长袴,窄袖,武士标准)、鎧(yoroi 大鎧 — 铁+皮革片编缀,色彩艳丽威毛odoshi组绳连接)
- **女性(贵族)**: 十二单(jūnihitoe — 多层衣: 小袖kosode最内层→単hitoe→五衣itsutsuginu(5层彩色)→打衣uchigi→表着uwagi→唐衣karaginu(短外套)→裳mo(拖地长裾后摆)。色彩层叠kasane irome — 各层配色按季节精心设计，袖口和领襟可见色彩渐层
- **女性发式**: 长发垂地(黑,直,长至曳地,中间分缝,垂面颊两侧发束), 金/银/螺钿钗子(saishi hairpin)插于发, 额前无刘海。
- **面料**: 丝绸(主)、绫(twill silk)、罗(leno)、锦(brocade)、麻(平民)。棉花极少。
- **配色**: 十二单色彩制度(kasane): 春夏用青系(blue-green family)、秋冬用赤系(red family)。具体颜色: 紅梅/桜/藤/萌黄/山吹/紅葉/松/雪。袭色目体系: 表(外)与裏(内)配色名如"紅梅の匂"(外红梅/内紫)。
- **纹样**: 有職文様(yusoku patterns — 宫廷几何连续纹样: 立涌/龟甲/菱/七宝)、源氏香(genji incense game symbols)、家纹(kamon — 家族纹章,平安末期出现)
- **闭合方式**: 腰带(織紐/組紐braided silk cords)、結び紐(tied cords)。无纽扣(江户前日本基本无纽扣)、无拉链。

### 江户时代日本 (Edo Japan, 1603-1868 CE)
- **男性(武士)**: 裃(kamishimo — 肩衣kataginu无袖马甲+袴hakama裤裙,肩衣正面有麻布纹样菱/大,家纹在背/胸/袖)、着物(kimono — 长袍,小袖kosode式,角帯kakuobi腰带束腰,腰前结)
- **男性(町人/平民)**: 着物+角帯、半纏(hanten — 短外褂)、股引(momohiki — 紧身长裤)、腹掛(haragake — 工匠围裙)
- **女性**: 着物(小袖式,左襟压右襟,帯obi宽腰带16-30cm,背后结: 太鼓結びotaiko musubi—已婚/文庫結び—少女)、振袖(furisode — 未婚女性长袖和服,袖长及地)、帯揚げ/帯締め(obi accessories)、足袋(tabi — 分趾白布袜)
- **面料**: 丝绸(正式着物)、棉(普及—日常着)、麻(夏季浴衣yukata)、縮緬(chirimen — crepe silk)、友禅染(yuzen dyeing — 多彩手绘)、絞り(shibori — tie-dye)
- **配色**: 芸者/遊女: 华丽色 — 红(紅)、黑(黒留袖)、金、紫。武士/町人: 茶(brown)、鼠(grey)、蓝(靛蓝aizome — 最耐用)、条纹(stripes)、格子(checks)。奢侈禁止令(sumptuary laws)限制町人穿红/紫/金 → 产生粋(iki)审美 — 素雅含蓄、藏奢华于内里
- **纹样**: 友禅(yuzen floral)、家纹(kamon — 5瓣花形small)、麻の葉(hemp leaf)、青海波(seigaiha waves)、市松(ichimatsu checkerboard)、鳞(uroko triangle)、鹿の子(kanoko fawn spot — 绞染)
- **配饰**: 印籠(inro — 药盒)+根付(netsuke toggle)+緒締(ojime bead = 腰间三件套)、烟管(kiseru pipe)、脇差(wakizashi short sword — 武士魂,刃长30-60cm)、刀(katana — 刃长60cm+)、番傘(bangasa oiled paper umbrella)
- **鞋履**: 草履(zōri — 草编或皮编人字拖式)、下駄(geta — 木屐)、足袋(tabi — 白棉分趾袜)、雪駄(setta — 皮底草履,武士用)
- **发式**: 男性 — 月代(sakayaki — 前额剃光)+髷(mage — 后颅发束折向前,小辫/topknot)。女性 — 島田髷(shimada mage — 未婚/已婚不同)、丸髷(marumage — 已婚)、髷上插簪(kogai hairpin)与櫛(kushi decorative comb)
- **闭合方式**: 帯(obi — 宽腰带绕腰打结)、紐(himo — 细绳)、伊達締め(datejime — 细带固定)。无纽扣(和服核心设计 = 腰带和绳子闭合)。

### 朝鲜王朝 (Joseon Korea, 1392-1897 CE)
- **男性(官员)**: 团领(danryeong — 圆领袍,胸背有补子hyungbae — 方形刺绣品阶标识,鹤/虎/孔雀等)、纱帽(samo — 黑纱帽,后有两翅)、品带(pumdae — 腰带嵌玉/金/银/角=品级)、靴(hwa — 黑皮靴)
- **男性(士大夫/两班)**: 道袍(dopo — 交领长袍广袖,背有开缝)、深衣(simui — 儒式深衣)、程子冠(jeongjagwan — 马鬃编笠冠)、黑笠(heungnip — 黑漆竹笠)
- **女性(贵族)**: 唐衣(dangui — 短外衣,袖口彩色滚边,交领)+ 치마(chima — 高腰大裙,多层,撑裙)+ 저고리(jeogori — 短上衣,后期极短仅及胸下,彩色袖口끝동kkeutdong 和 领口깃git 搭配)、阔衣(hwarot — 大婚礼服,绣花满饰)、圆衫(wonsam — 宫廷大礼服)
- **女性(平民)**: 苎麻/棉制chima+jeogori,无彩色边饰,素色
- **面料**: 丝绸(贵族)、苎麻(ramie — 高质精细,平民至贵族通用)、棉(普及)、麻(平民日常)
- **配色**: 两班贵族: 白(素白—朝鲜审美核心,玉色白)、玉色(jade blue-green)、淡粉、淡黄、淡蓝/紫、青。红=婚礼/王后,黄/紫=王室。庶民: 白/本色麻/浅褐—限于白色和浅褐(禁穿彩色)。
- **纹样**: 龙凤(王室)、补子(纹样=品级 — 文官鹤/孔雀,武官虎/豹)、十长生(日月山石水云松鹤龟鹿 — 祈福长寿)、花鸟(牡丹/莲花/蝴蝶)、寿福(文字纹"寿""福"字)
- **配饰**: 黑笠+笠缨(gatkkeun — 笠珍珠/琥珀/玉珠串)、妆刀(jangdo — 银鞘小刀,女性防身+装饰)、佩玉(men's jade pendant)、노리개(norigae — 女式三件坠饰: 结+珠+穗,悬于裙腰)、비녀(binyeo — 玉/金/银发簪)、뒤꽂이(dwikkotji — 小梳簪)
- **鞋履**: 징신(jipsin — 草鞋,平民/日常)、태사혜(taesahye — 丝面皮底鞋,贵族)、꽃신(kkotsin — 绣花丝鞋,女性)、黑靴(黑綢绣花鞋official)、나막신(namaksin — 木屐,雨鞋)
- **发式**: 男性 — 상투(sangtu — topknot发髻,固定以망건 manggeon 马尾网)+笠。女性 — 쪽진 머리(twisted chignon — 低侧髻,簪)+ 댕기(daenggi — 发带,未婚女孩红+黑,两侧垂辫发带)。男性须髯(口髭+下须,有年龄/身份含义)。
- **闭合方式**: 고름(goreum — 布带系结,jeogori/dopo襟口,左上右下蝴蝶结式)、腰带(대님 daenim — 裤口束腿带)、纽扣(少量金银纽扣用于官服)。核心闭合为布带而非纽扣。无拉链无松紧带。
`;


// ═══════════════════════════════════════════════════════════════════════════
// 3b. SOUTHEAST ASIA CIVILIZATIONS — 东南亚文明服饰
// ═══════════════════════════════════════════════════════════════════════════

export const SOUTHEAST_ASIA_CIVILIZATIONS_DB = `## 东南亚文明服饰速查 (Southeast Asian Civilization Costume)

### 高棉帝国/吴哥 (Khmer Empire/Angkor, 802-1431 CE)
- **男性**: Sampot (缠腰布 — 棉/丝,及膝或及踝,前片打褶垂褶,腰部打结)、裸上身或短披肩(sbai — 窄布条斜披于胸,贵族)、金项圈/臂环/踝环(贵族)
- **女性**: Sampot(及踝裹裙)+ Sbai(斜披布裹胸或披肩,丝绸)、金腰带/项圈、金叶头饰(mokot — 锥形金冠/花冠)、手臂/脚踝多层金环
- **面料**: 棉(cotton)、丝绸(silk — 高棉丝织金锦hol pidan)、麻
- **配色**: 金(gold — 神权/王权)、赤/深红、青金石蓝、白、绿
- **纹样**: 莲花(lotus)、Apsara飞天(吴哥窟壁画女神—紧身裹裙+裸胸+金冠+持莲花)、Naga蛇(5/7/9头)、几何菱形织纹
- **配饰**: 金冠/花冠、金项圈、多层金臂环/踝环、宝石戒指、金腰带、长金耳环(撑大耳洞,吴哥时期典型)
- **鞋履**: 赤脚(神庙内/宫廷仪式)、皮凉鞋(户外)
- **妆发**: 男性短发或发髻(topknot),女性长发盘髻+金簪/花,额头点红,全身涂香木粉
- **闭合方式**: 缠裹打结、金腰带/布带束腰。无纽扣无拉链。

### 泰国王朝 (Thai Kingdoms — Sukhothai 1238-1438 / Ayutthaya 1351-1767 / Rattanakosin 1782-present)
- **男性**: Chong kraben (缠裹裤 — 棉/丝,腰前打结,类似dhoti裤)、裸上身或Raj pattern jacket(立领短外套,19世纪后)、Sabai斜披(正式场合)
- **女性**: Pha nung(裹裙及踝)+ Sabai(斜披布裹胸或披肩,一端垂地)、Chong kraben(正式)、金腰带/项圈
- **面料**: 丝绸(泰丝matmi ikat — 扎染织纹)、棉、金线锦(yaan tong — royal)
- **配色**: 金/赤/深红/紫/蓝/绿(宝石色)、白(丧)
- **纹样**: 几何ikat、花卉(lai thai)、神兽(金翅鸟Garuda/那伽蛇Naga/象Erawan)、火焰纹
- **配饰**: 金冠(chada — 尖顶多层金冠,舞剧/皇家)、金项圈/臂环、宝石戒指、金腰带带扣
- **鞋履**: 赤脚(室内/宫廷)、皮凉鞋
- **妆发**: 男性短发或发髻,女性长发盘髻+金簪+鲜花环,Thanakha式香木粉涂面
- **闭合方式**: 缠裹打结、金腰带扣。无纽扣无拉链。

### 越南历代 (Vietnamese Dynasties — Ly 1009-1225 / Tran 1225-1400 / Le 1428-1789 / Nguyen 1802-1945)
- **男性**: Ao dai(早期 — 交领长袍,及踝,宽袖,白/黑/蓝) + Quan(宽松白绸裤)、Khan dong(黑头巾盘头)、官服: 圆领袍(中国影响)+补子(品级方补)+乌纱帽
- **女性**: Ao dai(早期 — 交领长袍,紧身,及踝) + Quan(白绸宽裤) + Yem(肚兜 — 菱形红/粉/白,挂颈,遮胸,内穿)、Ao tu than(四片式长袍 — 北越,前后各两片,腰带束腰,头戴non quai thao扁平笠)
- **面料**: 丝绸(河内/会安丝绸)、棉、麻
- **配色**: 白/黑/蓝(靛蓝)/红/褐(民间),黄(皇帝专属),紫/红(高官)
- **纹样**: 龙(五爪=皇帝/四爪=王)、凤凰、莲花、竹、云纹、汉字福禄寿
- **配饰**: 金/银/玉簪、珠串项圈、玉镯、牙签筒/槟榔盒(银制,腰间)、斗笠(non la — 棕榈叶/竹编)
- **鞋履**: 草鞋/布鞋(平民)、木屐(guoc)、皮靴/绣花绸鞋(贵族)
- **妆发**: 男性盘发髻或黑头巾裹头,女性长发盘髻+簪钗
- **闭合方式**: 系带、纽扣(盘扣—中国影响)、腰带。无拉链。

### 缅甸王国 (Burmese Kingdoms — Pagan 849-1297 / Konbaung 1752-1885)
- **男性**: Paso(缠腰布 — 棉/丝,及踝裹裙,前打结,格纹或素色)、Taikpon(立领短外套,白/黑,正式)、Gaung baung(头巾 — 棉/丝缠绕,正式场合)
- **女性**: Htamein(裹裙 — 棉/丝,及踝,腰部折叠宽边,花纹)、Aingyi(紧身上衣,白/素色,前开襟纽扣或按扣)、披肩(shawl — 丝/棉,斜披)
- **面料**: 丝绸(缅甸丝)、棉(手织)、苎麻
- **配色**: 金/赤/翠绿/蓝/紫(宫廷)、白/黑/靛蓝(平民)、格纹(男装paso),深红/紫红配金线(女装htamein — luntaya acheik波浪纹织)
- **纹样**: Acheik(100+线的波浪纹 — 缅甸标志性织纹,织入金线/彩丝)、花卉(lotus/jasmine)、孔雀(royal bird)、Zei-wa(几何菱形)
- **配饰**: 金冠(magalaik)、金项圈(带pendant宝石坠)、金臂环、金踝环、宝石耳钉(男女皆戴—耳垂撑大)、Yadana(九宝 — 红宝/钻石/珍珠/珊瑚/翡翠/蓝宝/黄玉/猫眼/锆石)、Thanakha(香木粉 — 脸颊涂,防晒+美容,米白色)
- **鞋履**: 赤脚(室内/寺庙)、天鹅绒/皮凉鞋(slippers)
- **妆发**: 男性发髻或头巾裹头,女性长发盘髻+金簪,Jasmine花环,Thanakha香木粉涂面(标志性)
- **闭合方式**: 缠裹打结、纽扣(taikpon立领外套前开襟)、按扣(hook)。无拉链。

### 印尼群岛 (Indonesian Archipelago — Majapahit 1293-1527 / Mataram / Balinese)
- **男性**: Sarong(裹裙 — batik蜡染棉布,及踝,前打褶)、Kain panjang(长裹布)、Batik shirt(对襟短袖或长袖)、Blangkon(爪哇头巾 — batik布,帽状,后部有凸起)、Kris(波浪刃短剑 — 插于腰后,仪式/身份标识,刃长25-50cm)
- **女性**: Sarong(batik裹裙)+ Kebaya(蕾丝或刺绣短上衣,对襟,长袖,紧身)、Selendang(披肩长布条—斜披于肩或包头)、Kemben(裹胸布—古典爪哇/巴厘)
- **面料**: Batik蜡染棉布、Ikat扎染、Songket金线锦(金/银线织入丝绸/棉)、Lurik条纹布、Endek(巴厘ikat)
- **配色**: 蓝/棕(靛蓝+soga brown — 爪哇古典batik色)、金(金线songket)、白(巴厘仪式)、红/黑/绿(各种)
- **纹样**: Batik图案体系(parang刀纹/lereng斜纹/kawung棕榈果/ceplok对称几何/mega mendung云纹/semen半写实)、Wayang皮影人物(巴厘/爪哇)、Garuda金翅鸟(国徽神鸟)
- **配饰**: Kris(波刃短剑 — 爪哇男性标配,仪式用,金/钢锻打Pamor流水纹)、金/银簪(tusuk konde — 女性发髻)、金项圈/臂环、Selop(尖头绣花拖鞋)
- **鞋履**: 赤脚(日常)、Selop(绣花尖头绒面平底鞋)、皮凉鞋
- **妆发**: 男性戴Blangkon头巾或发髻,女性长发盘髻(tusuk konde簪固定)+Jasmine花/Kamboja鸡蛋花
- **闭合方式**: 缠裹打结、对襟纽扣(kebaya)、腰带。无拉链。

### 菲律宾前殖民 (Pre-Colonial Philippines, before 1521)
- **男性**: Bahag(缠腰布/兜裆布 — 棉/树皮布,彩色条纹)、Kangan(无袖短上衣,对襟,不扣)、Putong(头巾 — 彩色,缠绕,颜色=身份,红=勇士/杀过敌)、金项圈/臂环
- **女性**: Tapis(裹裙 — 及膝或及踝)、Baro(短上衣,宽袖)、Alampay(披肩布)、金项圈/耳环(多层)、金牙/黑牙(pagngingipin — 染黑或金镶牙=美)
- **面料**: 麻(abaca马尼拉麻)、棉(pinukpok捶打棉)、树皮布(barkcloth)、Pina(菠萝纤维 — 极精细网眼)、丝绸(与中国贸易)
- **配色**: 红/蓝/黄/白/黑(天然染料: 胭脂树红achuete/姜黄kunig/靛蓝tayum/talum)
- **纹样**: 几何条纹/三角/菱形(部落织纹—各有独立motif系统)、ikat/蜡染(南部穆斯林区)
- **配饰**: 金项圈(layong-layong — 多层叠)、金耳环(pamarang — 圆盘形/动物形,撑大耳洞)、金臂环/踝环、金牙/金箔贴牙(sangka — Visayan贵族女性)、全身纹身(batok — Visayan:全身几何图腾,勇士全身纹=身份/功绩)、金匕首/仪式刀
- **鞋履**: 赤脚
- **妆发**: 男性长发或发髻+Putong头巾,女性长发披肩或盘髻,全身纹身(batok—几何图腾),染黑牙或金牙
- **闭合方式**: 缠裹打结、金别针/扣。无纽扣无拉链。
`;


// ═══════════════════════════════════════════════════════════════════════════
// 3c. PRE-COLUMBIAN AMERICAS — 前哥伦布美洲文明服饰
// ═══════════════════════════════════════════════════════════════════════════

export const PRE_COLUMBIAN_AMERICAS_DB = `## 前哥伦布美洲文明服饰速查 (Pre-Columbian Americas Costume)

### 阿兹特克 (Aztec/Mexica, 1345-1521 CE)
- **男性**: Maxtlatl(缠腰布/兜裆布 — 棉,贵族彩色刺绣+流苏边)、Tilmatli(三角披肩斗篷 — 棉/龙舌兰纤维,右肩打结,长度=身份,平民及膝,贵族及踝,禁止平民超长)、Cactli(皮凉鞋 — 贵族专用,平民赤脚)、Cueitl(战裙 — 羽毛+皮革)
- **女性**: Huipil(无袖矩形长罩衫 — 棉,及踝,领口/下摆刺绣,宽大直筒)、Cueitl(裹裙 — 棉,缠裹+腰带束腰,及踝)
- **面料**: 棉(cotton — 贵族)、龙舌兰纤维(ixtle/maguey fiber — 平民)、羽毛(feather — 贵族斗篷/头饰/盾牌,绿咬鹃quetzal尾羽最珍贵)、兔毛/皮
- **配色**: 白(棉本色)、红(胭脂虫cochineal — 特诺奇蒂特兰特产,最珍贵染料)、蓝(靛蓝/玛雅蓝Maya blue — 靛蓝+凹凸棒石黏土,千年不褪)、黄(achuete)、黑
- **纹样**: 几何阶梯纹(xicalcoliuhqui — stepped fret/meander, 阿兹特克标志)、羽蛇(Quetzalcoatl — 绿咬鹃羽蛇)、美洲豹(jaguar)、鹰(eagle)、骷髅/头骨(death symbols)、太阳石(calendar stone motifs)、水/火/玉/花象形
- **配饰**: 羽毛头饰(quetzal feather headdress — 绿咬鹃尾羽+红/蓝/黄羽毛+金+宝石,高可1m+,帝王/最高战士)、金/银/铜耳线轴(ear spools — 耳垂穿孔扩大至可插入大圆盘)、金/铜鼻饰(nose ornaments)、唇饰(labret — 金/黑曜石/玉石,下唇穿孔插入,武士/贵族专属)、玉/绿松石/贝壳项圈+胸饰、黑曜石刀(祭祀)
- **武器**: Macuahuitl(黑曜石锯齿木棒 — 木板镶嵌黑曜石blade碎片,锋利,可砍马头)、Atlatl(掷矛器)、Tepoztopilli(长矛,黑曜石尖)、Chimalli(羽毛盾牌)
- **鞋履**: Cactli(皮凉鞋 — 有后跟带)、贵族: 绣花/金饰皮凉鞋、平民: 赤脚
- **妆发**: 男性: 短发+发髻(topknot on crown—武士),插羽毛。女性: 长发披肩或编辫盘髻,插羽毛/花。全身涂红/黑/蓝(仪式/战争/身份—胭脂虫红=祭司)
- **闭合方式**: 缠绕打结、腰带、斗篷肩部打结。无纽扣无拉链。

### 玛雅 (Maya Civilization, 2000 BCE-1697 CE)
- **男性**: Ex(缠腰布 — 棉,刺绣几何纹)、Pati(披肩斗篷,贵族)、棉/羽毛大羽冠头饰(king/queen — 绿咬鹃羽+玉)、Jade mosaics面具(国王殡葬)
- **女性**: Huipil(无袖罩衫,刺绣,及膝或更长)+ Corte(裹裙,缠裹+腰带)、Quechquemitl(三角形披肩 — 贵族/仪式)
- **面料**: 棉(cotton)、龙舌兰纤维(henequen — 平民)
- **配色**: 玛雅蓝(Maya blue — 靛蓝+凹凸棒石黏土,千年不褪,祭祀/壁画/陶器)、红(胭脂虫/赤铁矿)、白、黑、黄
- **纹样**: 象形文字(hieroglyphic — 每个方块=一个词/音节,装饰+叙事)、羽蛇(Kukulkan)、美洲豹、玉米神(maize god)、世界树(world tree/ceiba)、几何菱形/阶梯
- **配饰**: 玉(jade — 绿色翡翠玉,玛雅最贵材料,面具/项链/耳轴/唇饰/葬礼口含玉)、羽毛头冠(绿咬鹃羽)、颅骨变形(婴儿期木板夹头—扁额/高冠=美)、斜视眼(人工诱导对眼=美)、牙齿镶嵌(前牙钻小孔嵌入玉/黄铁矿/绿松石小圆片)、疤痕划痕(scarification — 面部刻纹)
- **鞋履**: 皮凉鞋(henequen纤维或皮底+皮绑带)、赤脚(平民)
- **妆发**: 男性发髻+羽冠,女性编辫盘髻,身体彩绘(仪式用红/黑/蓝),颅骨变形(扁额/高冠为美)
- **闭合方式**: 缠裹打结、腰带、披肩单肩打结。无纽扣无拉链。

### 印加 (Inca Empire, 1438-1533 CE)
- **男性**: Uncu(无袖或短袖长袍 — 骆马毛/棉,及膝,几何织纹,tocapu方格图案=身份等级)、Yacolla(披肩斗篷 — 肩部大别针tupu固定)、Llauto(头箍/头巾 — 彩色编织,贵族插羽毛+金饰)、Chuspa(古柯叶袋 — 斜挎,织纹)
- **女性**: Anacu(裹裙 — 及踝,缠裹+腰带chumpi束腰,水平织纹条)、Lliclla(披肩 — 矩形羊毛布,两肩或胸前用大银别针tupu固定)、头巾(nanaca — 已婚女性盖头)
- **面料**: 骆马毛(vicuna — 金色细软,帝王专属,比羊绒更细更稀有)、羊驼毛(alpaca/llama — 贵族)、棉花(低地)、麻/龙舌兰(平民)、羽毛(热带区进贡)
- **配色**: 骆马金/棕(自然毛色)、红(胭脂虫cochineal)、靛蓝、黄、白、黑(自然毛色+染料)
- **纹样**: Tocapu(方格几何图案系统 — 内含意义的抽象方块,每格一个符号,排列组合=信息/身份/叙事,unco上按等级排列格数)、阶梯纹、菱形、动物(羊驼/美洲豹/秃鹰/蛇)、彩虹(CHAKANA — 印加十字,四级阶梯=三界:Amaru蛇/地+Puma美洲豹/人间+Condor秃鹰/天空)
- **配饰**: Tupu(大银/金别针 — 女性披肩固定用,+圆盘头+垂链+穗,实用+装饰)、金/银/铜耳线轴(ear spools — 贵族耳垂穿孔扩大至可插入大金/银圆盘,直径可达5-6cm,西班牙人称印加为"orejones"大耳族)、金/铜鼻饰、金/银/铜项圈/臂环/踝环、羽毛头冠(亚马孙进贡 — 绿/红/蓝羽毛+金)、Khipu(结绳记录 — 彩色棉/毛结绳,打结/颜色/位置=数字/叙事/历史,悬于腰间或置放)
- **鞋履**: Usuta(皮凉鞋 — 骆马或羊驼皮底,羊毛编织鞋面绑带)、赤脚(平民)
- **妆发**: 男性短发+Llauto头箍+羽毛(贵族),女性长发编辫盘髻+nanaca头巾(已婚),面部/身体彩绘(仪式)
- **闭合方式**: Tupu大别针(肩部固定披肩)、腰带束腰(chumpi — 编织几何纹)、缠裹打结。无纽扣无拉链。
`;


// ═══════════════════════════════════════════════════════════════════════════
// 3d. AFRICAN CIVILIZATIONS — 非洲文明服饰
// ═══════════════════════════════════════════════════════════════════════════

export const AFRICAN_CIVILIZATIONS_DB = `## 非洲文明服饰速查 (African Civilization Costume)

### 库施/努比亚 (Kush/Nubia, c.2500 BCE-350 CE)
- **男性**: Shendyt式缠腰布(亚麻/棉,及膝,前三角突起—埃及影响)、长袍(棉/亚麻宽松及踝)、披肩斗篷、金项圈/臂环(贵族)、头巾或假发(埃及式)
- **女性**: Kalasiris式贴身长袍(亚麻/棉,及踝,吊带或宽肩带)、裹裙+披肩、金宽领圈(usekh式)、多层金臂环/踝环
- **面料**: 亚麻(linen)、棉(cotton — 努比亚为非洲最早种棉区之一)、皮革、毛皮(rare)
- **配色**: 白(亚麻/棉本色)、金(gold — 努比亚盛产黄金)、红(赭石)、蓝(埃及蓝frit)、黑
- **纹样**: 埃及式莲花/圣甲虫/荷鲁斯之眼、狮身人面像(sphinx)、努比亚独特: 战象/狮子/公羊(Amon神)、几何边饰
- **配饰**: 金宽领圈、金耳环(圆盘形/动物形)、金臂环/腕环/踝环、玉/红玉髓/紫晶珠串、圣甲虫印章戒指(埃及影响)
- **鞋履**: 皮凉鞋(金饰贵族款)、赤脚(平民/室内圣地)
- **妆发**: Kohl黑眼线(埃及影响)、假发(紧密小卷或编辫)、男性短发或编辫,女性编辫盘髻或假发+金饰
- **闭合方式**: 腰带/绳结、金别针、系带。无纽扣无拉链。

### 大津巴布韦 (Great Zimbabwe, c.1100-1450 CE)
- **男性**: 缠腰布(棉/树皮布,及膝或及踝,前打褶)、披肩斗篷(兽皮或编织棉布,单肩打结)、皮腰带+铜/铁扣、头饰(鸵鸟羽/鹤羽冠—首领)
- **女性**: 裹裙(棉,及踝,缠裹+腰带)、披肩或裹胸布、铜/铁/金项圈(多层,身份标志)、铜/铁臂环/踝环(固定佩戴,不可脱卸)
- **面料**: 棉(cotton — 本地种植+纺纱)、树皮布(barkcloth — 捶打无花果树皮)、兽皮(cattle hide/leopard skin—首领)、麻
- **配色**: 自然色(棉白/树皮棕/皮革棕褐)、红赭石(ochre — 涂身+染布)、黑(木炭+油脂)、白(高岭土clay)
- **纹样**: 几何三角/菱形/阶梯纹(织入或刺绣)、动物纹(牛/鸟/鳄鱼)、津巴布韦鸟(Zimbabwe bird — 皂石刻,国徽前身)、棋盘格(checkerboard)
- **配饰**: 铜/铁/金项圈(wire-wound — 缠丝式)、铜/铁臂环/腿环(示身份,常永久性佩戴)、象牙手镯、鸵鸟蛋壳珠串(ostrich eggshell beads — 经典南部非洲饰物)、贝壳串(印度洋贸易)
- **鞋履**: 赤脚、皮凉鞋(少数)
- **妆发**: 男性短发或剃发+羽毛冠,女性编辫或盘髻,身体涂红赭石+动物油脂(防晒+仪式),划痕/纹身(scarification — 面部/身体几何纹)
- **闭合方式**: 缠裹打结、皮绳系带、铜/铁别针。无纽扣无拉链。

### 马里帝国 (Mali Empire, c.1230-1670 CE)
- **男性**: Boubou(大袍 — 棉/丝,宽大及踝,长袖,领口/胸刺绣几何纹,贵族用金线绣)、缠腰裤(trousers — 棉,宽松,及踝,腰带束腰)、头巾(turban — 棉/丝,缠绕,深蓝/白/黑)、Kaftan(卡弗坦长袍 — 伊斯兰影响,对襟)
- **女性**: Boubou(同男性大袍式)+ wrapper(裹裙 — 棉/丝,及踝,缠裹+腰带)、头巾(head wrap — 棉,缠绕,鲜艳色)、金耳环/项圈(贵族,黄金贸易富庶)
- **面料**: 棉(cotton — 西非自产,手织strip-weave窄幅布)、丝绸(跨撒哈拉贸易)、兽皮(皮革)
- **配色**: 靛蓝(indigo — 深蓝染布,马里标志,反复浸染至近黑)、白(棉本色)、金(金线绣,帝国黄金富庶)、红(科拉坚果kola dye)、黄/绿
- **纹样**: 几何strip-weave条纹、三角形/菱形刺绣(boubou领口+前胸)、伊斯兰几何(贸易影响)、泥染布纹(bogolanfini/mudcloth — 巴马纳族: 发酵泥浆手绘几何纹于棉布,黄底+黑/深棕纹)
- **配饰**: 金耳环(大型圆盘/月牙形crescent)、金项圈/臂环/踝环(帝国盛产黄金)、琥珀/红玉髓珠串(carnelian — 跨撒哈拉奢侈品)、皮革amulet袋(gris-gris — 护身符,方形小皮袋,悬挂颈/臂/腰)、象牙手镯
- **鞋履**: 皮凉鞋(骆驼皮/牛皮)、皮靴(沙漠旅行)、赤脚(日常)
- **妆发**: 男性短发或剃发+头巾(turban),女性编辫(复杂几何图案cornrow式)或头巾包裹,靛蓝染手指/脚趾,划痕/纹身(面部,族群标记)
- **闭合方式**: 缠裹打结、腰带、系带。大袍为套头式。无纽扣无拉链。

### 贝宁王国 (Benin Kingdom, c.1180-1897 CE)
- **男性(平民)**: 缠腰布(棉,及膝,素色或条纹)、裸上身或短披肩、珊瑚珠项圈(身份标志)
- **男性(贵族/Oba)**: 多层珊瑚珠袍(coral bead regalia — 红色珊瑚珠密编成高领长袍/披肩/冠冕,重达数十公斤,需侍从扶行)、象牙臂环/踝环、豹皮腰饰(leopard skin waist sash — Oba权力象征)
- **女性**: Wrapper(裹裙 — 棉/丝,及踝,缠裹+腰带)+ 披肩或裹胸布、珊瑚珠项圈(多层)、珊瑚珠头饰(okuku — 高冠形)、象牙/铜臂环
- **面料**: 棉(cotton)、丝绸(跨撒哈拉/葡萄牙贸易)、树皮布、兽皮(leopard为王室专属)
- **配色**: 红(coral red — 珊瑚珠=王权,贝宁标志色)、白(棉/象牙白)、靛蓝、金(黄铜黄)
- **纹样**: 豹(leopard — Oba化身)、象(elephant)、泥鱼(mudfish — 变身/王权)、葡萄牙士兵(16世纪后)、几何菱形/Ivri纹、Oba头像(黄铜饰板Benin Bronzes)
- **配饰**: 珊瑚珠(coral beads — 贝宁最核心财富/权力符号: 冠+高领袍+项圈+手镯+踝镯,全为红色管形珊瑚珠)、黄铜/青铜饰板(Benin Bronzes — 雕刻场景/人物/动物,装饰宫殿)、象牙面具(ivory pendant mask — 腰佩,Oba母后像)、豹牙项链、铜/铁手镯/臂环
- **鞋履**: 赤脚(室内/宫廷)、皮凉鞋
- **妆发**: 男性: 短发或剃发+珊瑚珠冠;女性: 复杂编辫盘髻(okuku式高耸发髻)+珊瑚珠头饰;划痕/纹身(面部+身体,族群/身份标记,三条或四条面颊竖纹为典型)
- **闭合方式**: 缠裹打结、腰带、珊瑚珠为编结连接(非穿线)。无纽扣无拉链。

### 阿克苏姆/埃塞俄比亚 (Aksum/Ethiopia, c.100-940 CE / Ethiopian Empire to 1974)
- **男性(贵族)**: Shamma(白棉大披肩 — 矩形布裹身,单肩固定,类似罗马toga)、长袍(kamis — 及踝白棉袍,长袖,领口/下摆彩色织纹镶边tilet)、头巾(turban式或缠绕)
- **男性(武士/平民)**: 缠腰布+披肩、皮腰带+短剑(shotel — 埃塞俄比亚弯刀)、狮鬃头饰(勇士)
- **女性**: Habesha kemis(白棉长袍 — 及踝,长袖,紧身,领口至胸+下摆彩色手工织纹tilet镶边,十字架/几何纹)、Netela(白棉大披肩—轻薄,裹身或包头)、金/银首饰(耳环/项圈/手镯/踝环,贵族)
- **面料**: 棉(cotton — 手织,埃塞俄比亚特产细棉shema)、丝绸(少量,贸易)、皮革(武士/平民)
- **配色**: **白(white — 埃塞俄比亚传统核心色,象征纯洁/神圣)**、tilet彩色织边(红/黄/绿/蓝/黑 — 几何纹镶边)、金(gold — 皇室/教会)
- **纹样**: Tilet几何镶边(十字cross/菱形/三角/阶梯纹)、所罗门之印(Star of David — 皇室/教会)、狮子(Lion of Judah — 皇室纹章)、科普特十字(Coptic cross — 多样几何形,遍布服装/首饰/建筑)
- **配饰**: 科普特十字吊坠(Coptic cross pendant — 银/金/黄铜,各省样式各异: 拉利贝拉十字/Lalibela cross/Gondar cross/Axum cross)、金/银耳环(圆环式)、金项圈、银/铜/象牙手镯、Shotel弯刀(埃塞俄比亚独特 — 近半圆形曲刃剑,皮革鞘,武士/贵族腰间)
- **鞋履**: 皮凉鞋(骆驼皮)、赤脚(室内/教堂)、皮靴(高原山区)
- **妆发**: 男性: 短发或编辫(传统),胡须(贵族/教士)。女性: 编辫(shuruba — 紧密小辫,向前额/两侧排列)或盘髻、Kohl眼线(古传统)
- **闭合方式**: 缠裹/披挂(Shamma/Netela单肩固定)、系带、腰带。无纽扣无拉链。
- **特殊**: 埃塞俄比亚为世界最早基督教国家之一(4世纪),服饰深受科普特教会影响: 白色为主、十字纹为祥瑞、遮盖身体以示谦卑。区别于其他非洲文明—非部落风,为高度纺织文明。

### 斯瓦希里海岸 (Swahili Coast, c.800-1500 CE)
- **男性**: Kanzu(白棉长袍 — 及踝,长袖,立领,对襟或套头,领口/前襟刺绣)、Kofia(绣花无檐帽 — 金/红/黑线绣几何纹,男性日常必戴)或头巾(turban)、凉鞋(makubadhi — 皮制)
- **女性**: Bui-bui(黑长大披袍 — 伊斯兰影响,全身遮盖,仅露脸,极薄黑纱)、Kanga(印花棉裹布 — 两件套: 一件裹裙+一件包头或披肩,彩色边框+中央图案+下缘斯瓦希里文字谚语)、Diria(长袍+裤套装— 胸/袖/下摆刺绣)
- **面料**: 棉(cotton — 本地+印度进口)、丝绸(印度洋贸易—中国/印度丝绸)、Kente式窄幅织布(本地)
- **配色**: 白(kanzu男袍)、黑(bui-bui女袍)、鲜艳多彩(kanga — 红/黄/绿/蓝/紫印花边框)、金(绣线)
- **纹样**: Kanga中央图案(花卉/动物/几何)、Kanga下缘Jina谚语(Swahili文字 — 谚语/祝福/社交信息)、Kofia帽几何刺绣、阿拉伯式卷草(arabesque)、印度洋贸易图案(中国龙/凤凰/印度paisley — 融合)
- **配饰**: 金/银耳环(大型圆环或垂坠式)、金/银项圈(多层)、Kofia绣花帽(男性日常+仪式必戴)、银/铜手镯/臂环/踝环、琥珀/珊瑚/象牙珠串、Henna手绘(henna — 女性手足,花卉几何纹,婚礼/节日)
- **鞋履**: Makubadhi皮凉鞋(尖头,皮底+皮绑带)、赤脚(室内)、木屐(印度影响)
- **妆发**: 男性短发+Kofia帽或头巾,女性编辫或盘髻+头巾,Henna手绘(女性标志),Kohl眼线,香水/香油(广用—阿拉伯影响)
- **闭合方式**: 缠裹打结、套头式(kanzu)、系带。无纽扣无拉链。

### 祖鲁王国 (Zulu Kingdom, c.1816-1897 CE)
- **男性(未婚)**: Umutsha(腰前皮裙 — 牛皮/豹皮带,带尾毛皮垂饰,腰皮带系绑,臀后也有)、裸上身、臂环/腿环(牛皮/铜,缠绕于臂/小腿)
- **男性(已婚/武士)**: Isicoco(头环 — 蜡+树胶+头发编成硬环,戴于颅顶,已婚标志)、Umutsha(皮裙)、Iqhiye(豹皮/牛皮披肩 — 首领/高级武士)、武器: Isijula(投掷矛/assegai)+ Isihlangu(大牛皮盾—椭圆,高约1.3m,黑白相间或单色)
- **女性(未婚)**: Isigege(腰前珠串裙 — 彩色玻璃珠编成流苏裙/帘,围腰)+ 裸上身、珠串项圈/臂环/腿环(多层,彩色几何纹,颜色含义=婚姻状态/身份)
- **女性(已婚)**: Isidwaba(牛皮裙 — 黑色/棕色,硬质,及膝)+ 珠串项圈+头饰(isicholo — 已婚女性大圆盘帽,红色赭石+油脂涂硬,宽大圆盘形,直径可达40-50cm)
- **面料**: 皮革(cattle hide/leather — 核心材料,牛为祖鲁财富根基)、豹皮/狮皮(leopard/lion skin — 王室/首领专属)、玻璃珠(glass beads — 欧洲贸易,红/白/蓝/黑/绿/黄,取代早期骨珠/贝壳/种子)、金属(铜/黄铜 — 臂环/腿环)
- **配色**: 红(赭石ochre — 涂身+涂发+涂皮)、白(骨珠/石灰)、黑(牛皮)、蓝/绿/黄(玻璃珠),珠色含义: 白=纯洁/爱、红=激情/婚、蓝=忠诚/希望、黑=成熟/已婚
- **纹样**: 珠串几何三角/菱形/条纹(色彩编码信息: 爱意/身份/族群)、盾牌纹(黑白相间或纯色—军团标志impi)、皮裙毛皮垂条纹
- **配饰**: 玻璃珠串(beadwork — 祖鲁最核心艺术: 项圈/臂环/腿环/腰带/头饰,彩珠编成几何纹,色彩编码承载社交信息)、铜/黄铜臂环(ingxotha — 紧箍于上臂/小腿)、Isicoco头环(男性已婚标志)、Isicholo帽(女性已婚标志)、牛皮盾+投矛(武士标配)
- **鞋履**: 赤脚(全民赤脚,祖鲁传统不穿鞋—夏卡Zulu军事改革要求赤脚行军,增强速度+脚底耐力)
- **妆发**: 男性: 剃发或短发+Isicoco头环(已婚,蜡+树胶编成硬环于颅顶);女性: 红赭石+油脂涂发(isicholo帽)—硬圆锥/圆盘形;全身涂红赭石(防晒+仪式+美观)
- **闭合方式**: 皮绳系绑、缠裹、腰皮带。无纽扣无拉链。

### 阿散蒂帝国 (Ashanti Empire, c.1670-1902 CE)
- **男性**: Kente cloth(肯特布 — 丝绸/棉,窄幅织带拼接为宽幅大布,裹身如toga式,左肩+右腋露出,贵族/王室)、缠腰裤(棉,及踝)、凉鞋(akenge — 皮制,贵族金饰)
- **女性**: Kente wrapper(裹裙+披肩两件套—同Kente布,裹裙及踝+披肩裹胸或单肩)、头巾(headwrap — 同Kente布,缠绕高耸)、金首饰(耳环/项圈/臂环/戒指,大量)
- **面料**: Kente布(丝绸/棉 — 窄幅手织strip-weave,每幅宽10-15cm,多幅拼接为整块布,几何纹极其复杂)、Adinkra(手绘符号棉布 — 葫芦刻模蘸黑色天然染料印制符号)、兽皮(leopard skin—王室专属)
- **配色**: 金(yellow/gold — 财富/皇室)、红(血/牺牲/祖先)、绿(土地/生长/丰收)、蓝(和平/和谐)、黑(成熟/祖先/灵性)、白(纯洁)— 每色有明确象征意义
- **纹样**: Kente几何纹(数百种命名图案,每种有名字+含义: Sika fre mogya"金招血"= 财富招来亲人、Adwinasa"全能"= 图案最全最贵、Oyokoman"奥约科族"= 红黄绿黑条纹)、Adinkra符号(60+种象形符号手绘于布: Gye Nyame"唯神至上"、Sankofa"回头取"= 学习过去、Dwennimmen"公羊角"= 力与谦逊并存)
- **配饰**: 大量金饰(gold — 阿散蒂盛产黄金: 金耳环/金项圈/金臂环/金戒指/金凉鞋饰,王室+贵族+平民均佩戴,富庶程度以金衡量)、金权杖(gold linguist staff — 顶部雕刻谚语场景)、金面具/金王座(Golden Stool — 非真坐,为民族灵魂)、Kuduo(黄铜仪式容器 — 铸造雕刻,存放黄金/宝物)
- **鞋履**: Akenge凉鞋(皮制,贵族金饰或金线绣)、赤脚(平民)
- **妆发**: 男性短发或剃发,女性编辫盘髻或高耸头巾(headwrap — 彩色Kente布缠绕),划痕/纹身(面部小几何纹,族群标记),金粉涂面(仪式)
- **闭合方式**: 裹身打结(toga式单肩固定)、缠裹、腰带。无纽扣无拉链。
`;


// ═══════════════════════════════════════════════════════════════════════════
// 3e. ISLAMIC WORLD — 伊斯兰世界服饰
// ═══════════════════════════════════════════════════════════════════════════

export const ISLAMIC_WORLD_DB = `## 伊斯兰世界服饰速查 (Islamic World Costume)

### 阿拔斯王朝 (Abbasid Caliphate, 750-1258 CE)
- **男性(哈里发/贵族)**: Qaba (长袍 — 丝绸/金线锦,及踝,长袖,圆领或立领,前襟系扣或系带,黑/金/紫,臂上tiraz刺绣带标注姓名/头衔)、Sirwal (宽松绸裤)、Imama (头巾 — 长棉/丝布缠绕于帽kalansuwa外,黑/白为哈里发色,学者/法官戴特殊形状)、Taylasan (披肩头巾 — 从Imama垂至肩背的长布尾)
- **男性(学者/法官/Qadi)**: 黑色长袍+巨大黑/白头巾Imama(标志性学者形象)、Qaba简版
- **女性**: Qamis (长袍 — 及踝,长袖,腰带高束胸下,刺绣镶边)+ Sirwal (绸裤)、面纱(niqab — 遮面至眼下,或全遮,丝/薄纱)、头巾(khimar — 包头+披肩)、外披(jilbab — 出门罩袍,全身遮盖)
- **面料**: 丝绸(巴格达/大马士革丝织中心)、金线锦(brocade — 拜占庭+波斯传承)、棉(伊拉克/埃及/呼罗珊)、亚麻(埃及)、羊毛(冬季/山区)、毛皮(里海/中亚)
- **配色**: 黑(black — 阿拔斯王朝色,旗帜/官服黑)、白(white — 倭马亚Umayyad旧色,日常)、紫(royal purple — 哈里发专属)、金(gold brocade)、蓝(靛蓝)、绿(Islam绿 — 先知色,但阿拔斯不主用)
- **纹样**: Tiraz刺绣带(臂上书写名字/头衔/古兰经文的带状刺绣 — 身份核心标识)、阿拉伯书法(calligraphy — Kufic库法体: 几何直线+方形,装饰衣襟/袖口)、Arabesque藤蔓卷草、几何星形多角/六角/八角、动物(狮/鹰/孔雀 — 世俗贵族,非宗教)
- **配饰**: Tiraz臂章(荣誉袍khil'a — 哈里发赐予高官的绣名荣誉袍)、Imama头巾(巨大缠绕 — 体积/颜色=身份)、金/银印章戒指(签文件用,刻姓名)、金/银/玉项圈、腰剑/匕首(贵族,金鞘宝石嵌)、琥珀/珊瑚念珠(misbaha — 33/99珠)
- **鞋履**: Khuff(软皮短靴 — 红/黄/黑,及踝或小腿,可配套鞋)、Na'l(皮凉鞋)、Babuj(尖头拖鞋 — 宫廷室内)
- **妆发**: 男性: 短发或中长发+Imama头巾,胡须(全须,染henna红或靛蓝黑—先知圣行),香水(浓香—沉香oud/麝香musk/玫瑰)、Kohl眼线。女性: 长发编辫盘髻,浓妆(Kohl眼线/henna手足/香精油)、面纱遮蔽
- **闭合方式**: 系带/纽扣(qaba前襟布纽/骨纽)、腰带(belt — 皮革+金属扣)、披挂/缠裹(Imama头巾)、钩扣。无拉链无松紧带。
- **特殊**: Tiraz刺绣工坊由哈里发直接管控—伪造者死罪。荣誉袍khil'a为阿拔斯核心政治仪式物品—获赐=权力授予。

### 法蒂玛王朝 (Fatimid Caliphate, 909-1171 CE)
- **男性**: Qaba长袍(白/绿/金为主—什叶派Ismaili色,其他同阿拔斯)、Imama头巾(白/绿)、Tiraz臂章(金线绣古兰经+法蒂玛名号)
- **女性**: 同阿拔斯基本款,更偏向白/绿配色(法蒂玛/什叶派色),金线绣更密集
- **面料**: 丝绸(埃及/叙利亚丝织)、金线锦(法蒂玛金线绣极精细)、亚麻(埃及亚麻为世界最优之一—极薄透、高质)、棉
- **配色**: 白(white — 法蒂玛王朝主色+什叶派圣色)、绿(green — 什叶派/先知家族色)、金(gold)、红、蓝
- **纹样**: Tiraz(臂章+荣誉袍 — 法蒂玛版: 金线绣古兰经/头衔/几何+卷草,极精致)、Arabesque藤蔓、星形几何、书法(Kufic—更趋装饰化,融入藤蔓)、人物(哈里发像+舞者/音乐家—世俗宫廷文化开放)
- **配饰**: Tiraz荣誉袍、Imama白/绿头巾、金/珠宝首饰(大量 — 法蒂玛宫廷富有)、琥珀/象牙/珊瑚念珠、Jawhar珠宝(珠宝镶嵌—法蒂玛珠宝商闻名)
- **妆发**: 同阿拔斯,男性胡须(染henna),女性浓妆+面纱
- **闭合方式**: 同阿拔斯: 系带/纽扣/腰带/披挂。无拉链无松紧带。

### 奥斯曼帝国 (Ottoman Empire, c.1299-1922 CE)
- **男性(苏丹)**: Kaftan(卡弗坦长袍 — 丝绸/金线锦,及踝,长袖,对襟或前开襟,宝石纽扣,厚重锦缎,苏丹专属配色/纹样)、Entari(内袍—同款但薄)、Salvar(宽松绸裤—裤管极宽,及踝)、Kavuk(大头巾 — 巨大白色缠绕于帽外,16世纪可达50cm+高/宽,苏丹专属样式)、Samur kurk(貂皮/猞猁皮袍—冬季,欧洲进贡)
- **男性(官员/帕夏)**: Kaftan(按品级: 面料/毛皮/头巾大小递减)、Kavuk(大头巾 — 体积<苏丹)、Biniş(骑马外袍)
- **男性(耶尼切里Janissary近卫军)**: Börk(白色高帽—前有holder插羽饰/汤匙)、Dolama(长袍—蓝/红/绿,及膝,长袖)、Salvar(红裤)、Yelek(无袖短外套)、腰刀(yatağan — 短曲刀)
- **女性(苏丹后宫/Valide Sultan太后)**: Entari(内袍 — 丝绸,及踝,长袖,前开襟,低领口)+ Kaftan(外袍—同色系,更厚锦缎)、Salvar(缎裤)、Bindallı(金线绣丝绒袍—婚礼/仪式)、Yasmak(面纱 — 两件: 上额布+下脸纱,白薄纱,只露眼)、Hotoz(高头冠—珍珠+宝石+羽毛+金线绣,后宫/贵族标志)
- **女性(平民)**: Ferace(外出罩袍—黑/暗色,全身遮盖,面纱yasmak)、Entari+Salvar简版
- **面料**: 丝绸(布尔萨Bursa丝织中心—奥斯曼丝闻名全欧)、金线锦/银线锦(seraser — 丝绸底织入全金属线,只有苏丹可穿)、丝绒(velvet — 厚重,染深红/靛蓝/紫)、锦缎(brocade — kemha)、安哥拉羊毛(mohair — 安卡拉山羊)、貂皮/猞猁皮(fur — 贵族外套衬里/饰边,欧洲进口,苏丹为最厚)
- **配色**: 苏丹专属: 深红(crimson kaftan)、紫(imperial purple)、祖母绿(emerald green)、蓝(sapphire blue)。官员: 按品级递减颜色鲜艳度/金线量。女性后宫: 粉/淡紫/天蓝/白/深红/金。平民: 褐/蓝/黑
- **纹样**: 郁金香(tulip — 奥斯曼国花,遍布织锦)、康乃馨(carnation)、石榴(pomegranate)、Cintamani(三珠+双波浪纹 — 奥斯曼保护符图案,虎纹/豹斑演变)、皇冠(tuğra — 苏丹花押,书法体签名,绣于袍+文件+建筑+货币)、Arabesque藤蔓、星形+六角、新月(crescent)
- **配饰**: Tuğra花押(苏丹签名 — 书法形式,出现于所有皇家物品)、Kavuk大头巾(苏丹/官员体积巨大)、Egret羽饰(sorguç — 白鹭羽+宝石,插于头巾,苏丹/高官礼仪)、金/宝石戒指(满手指)、Yatağan腰刀(短曲刀,银鞘镶珊瑚/宝石,Janissary+平民男性普遍佩戴)、琥珀念珠(tesbih)、怀表(19世纪)
- **鞋履**: Yemeni(尖头平底皮拖鞋—红/黄/黑,室内)、Çizme(长筒皮靴—骑马/户外)、Pabuç(低帮皮鞋)、Nalın(木屐—浴室用,珍珠母镶嵌)
- **妆发**: 男性: 剃发或短发+Kavuk大头巾,胡须(全须,修剪整齐,染henna红—苏丹/贵族)。女性: 长发编辫盘髻+Hotoz高冠+珠宝,Yasmak面纱(出门必戴),浓妆(Kohl眼线/henna手足/腮红),眉心点(sürme)
- **闭合方式**: 纽扣(kaftan前襟—宝石/金/银/丝编纽扣,密集排列,兼具装饰+功能)、腰带(sash/belt — 绸缎/皮革)、系带。无拉链无松紧带。

### 萨法维波斯 (Safavid Persia, 1501-1736 CE)
- **男性(沙赫/贵族)**: Qaba或Kaftan(长袍 — 丝绸/金线锦,及踝,前开襟,腰带束腰,宽长袖,肩宽衣窄腰)、Qamis(内衣)、Salvar(绸裤)、Taj-i Haydari(红头巾 — 红色12褶头巾turban缠于帽外,12褶=什叶派12伊玛目,萨法维标志)、披肩(shawl — 克什米尔/波斯羊绒,围肩或腰)
- **女性**: 同款Qaba长袍+Salvar裤(但更合体+色彩更艳)、Charqat(大披巾 — 丝/羊绒,罩头+披肩,出门)、Ruband(面纱 — 白,遮面至眼下)、首饰(波斯特产绿松石turquoise+天青石lapis lazuli+红玉髓carnelian+珍珠,大量)
- **面料**: 丝绸(伊斯法罕/亚兹德/喀山 — 波斯丝闻名世界,16-17世纪对欧洲出口主力)、金线锦/银线锦(zarbaft — 丝底织入金/银线)、丝绒(velvet — 波斯丝绒以花纹复杂著称)、羊绒(shawl wool — 克什米尔/克尔曼)、Termeh(手工织羊绒锦 — 极精致,闻名波斯+印度)
- **配色**: 红(crimson/深红 — 萨法维国家的什叶派+尚武色)、蓝(波斯蓝Persian blue/青金lapis/靛蓝)、绿(Islam绿)、金(gold)、白、黑(turban/头巾)
- **纹样**: Arabesque卷草藤蔓、Gul-o-bulbul(玫瑰与夜莺 — 波斯诗歌/艺术核心主题)、Botah/Paisley(佩斯利水滴纹 — 波斯起源,后传印度/欧洲)、Shah Abbas花卉(写实花卉 — 阿拔斯大帝时期现实主义花卉/鸟/树)、Gereft-o-bast(几何嵌合)、书法(Nastaliq体 — 波斯悬体,优雅曲线,绣于袍边)
- **配饰**: Taj-i Haydari红头巾(萨法维身份标志—12褶红巾=什叶派)、Jigha(羽饰 — 白鹭羽+宝石,插头巾前)、Khanjar(波斯弯刀 — 曲刃,大马士革钢,象牙/玉/金柄,宝石嵌)、羊绒披肩(shawl — 克什米尔/波斯,贵族标配)、绿松石+天青石首饰(本土宝石,项圈/耳环/戒指/臂环)、珐琅水烟壶(qalyan — 珐琅彩绘)、念珠(tasbih)
- **鞋履**: Giveh(手工布面皮底凉鞋—波斯传统,白/蓝布面,棉线编织底)、Charoq(皮拖鞋,尖头)、长靴(骑马)
- **妆发**: 男性: 剃发+Taj-i Haydari红头巾(turban式缠绕,红色12褶),全须(修剪整齐,染henna或靛蓝黑),Kohl眼线。女性: 长发编辫盘髻,浓妆(Kohl/henna/胭脂),面纱。
- **闭合方式**: 纽扣(kaftan前襟—布包纽扣+丝绸编纽)、腰带(shawl sash—羊绒/丝绸宽腰带围腰打结)、系带。无拉链无松紧带。

### 莫卧儿印度 (Mughal India, 1526-1857 CE)
- **男性(皇帝/贵族)**:
  - Jama(紧身长袍 — 丝绸/棉,及膝或及踝,圆领或V领,前襟系带或纽扣,腰束Patka腰带,袖长至腕或更长,窄袖,肩宽合体→腰收紧→下摆A形。Akbar/Aurangzeb时期不同廓形)
  - Pajama(紧身绸裤 — 下窄至踝,系带束腰)
  - Patka(腰带 — 丝绸/金线锦,宽15-20cm,围腰打结,两端垂膝,珠宝/金绣点缀)
  - Pagri/Turban(头巾 — 棉/丝缠绕于帽外,各朝代样式不同: Akbar式=圆顶+珠饰+羽饰sarpesh+宝石jigha插于前; Shah Jahan式=更大更圆; Aurangzeb式=简素。颜色/样式=身份/族群/地区)
  - 外披: 羊绒披肩(克什米尔 — 极薄极细极暖 — pashmina/shatoosh羚羊绒,贵族标配)
- **女性(皇后/公主)**:
  - Peshwaz(长袍 — 丝绸/薄纱,及踝,前开襟,长袖,紧身,透明外层,腰带高束胸下)+ Pajama(绸裤 — 紧身,下至踝)
  - 或: Lehenga(大裙 — 丝/金线锦,及踝,多层)+ Choli(紧身短上衣 — 短至胸下+露腰)+ Dupatta(长披巾 — 丝/薄纱,罩头+披肩或围手臂,透明)
  - Anarkali(安那卡利袍 — 紧身上身+宽大A形下摆,多层,长袖,丝,金绣,经典莫卧儿女装)
- **面料**: 丝绸(莫卧儿丝 — 孟加拉/古吉拉特/克什米尔丝,染极细)、金线锦/银线锦(kamkhwab — 丝底全部覆盖金/银线,最奢华)、薄纱(muslin — 达卡Dhaka极细棉纱,透明如雾: Jamdani织花muslin,皇帝/皇后最珍爱)、丝绒(velvet)、羊绒(pashmina — 克什米尔,极细极暖: shatoosh为最=藏羚羊绒,轻可穿戒指)
- **配色**: 白(muslin白 — 达卡细纱白,半透明)、红/深红(帝国色 — 皇帝/皇后婚礼)、祖母绿(emerald green — 莫卧儿最爱宝石色)、蓝(sapphire/indigo)、金(gold)、橙(saffron)、紫(imperial purple)、粉/桃红(女性偏)
- **纹样**: Buta/Paisley(佩斯利水滴纹 — 莫卧儿时期极致成熟,遍布织锦/披肩)、花卉(写实花卉 — 波斯+印度传统融合: 玫瑰/百合/罂粟/iris,茎叶卷曲)、Jamdani(织花muslin — 在极薄棉纱上织入几何/花卉纹,图案浮于纱面,若隐若现)、Shikargah(狩猎场景 — 皇帝骑马猎狮/鹿/豹,衣袍金线绣)、星形+几何arabesque
- **配饰**: Sarpech(羽饰 — 头巾前插的白鹭羽+宝石,贵族核心配饰)、Jigha(宝石束 — 头巾正中)、大量宝石首饰(祖母绿/钻石/红宝/蓝宝/珍珠 — 颈/耳/臂/手/踝,男女皆大量佩戴)、Sarpech+Jigha头巾饰(男性核心)、Kataar(拳剑 — 横握H形柄,刺击,水纹钢,金/宝石嵌柄,腰间)、Nath(鼻环 — 女性,金+珍珠/宝石,左鼻翼至耳(链) 、Paizeb(踝铃—银/金,铃铛,女性脚踝,舞女/皇后)、Bazuband(上臂护符 — 玉石/金,内藏祈祷文/护符,绑上臂)
- **鞋履**: Juti(尖头卷翘绣花皮拖鞋 — 莫卧儿经典,金/银线绣,男女皆穿,尖头向上卷曲)、Khussa(更厚底的Juti)、Chappal(皮凉鞋)
- **妆发**: 男性: 短发或中长发+Pagri头巾+羽饰,全须(修剪整齐)。女性: 长发编辫盘髻(中央分缝,+Jhumar垂链头饰),浓妆(Kohl眼线/Kajal/胭脂/Henna手足/额间bindi红点),面纱(dupatta透明薄纱罩头,莫卧儿不强制遮面—贵族女性仅透明dupatta遮=优雅)
- **闭合方式**: 系带(jama前襟系带—彩色丝绳结)、纽扣(金/珍珠/宝石纽扣)、腰带(patka—丝绸/金线锦宽带围腰打结)。无拉链无松紧带。
- **特殊**: 莫卧儿服装融合波斯+中亚+印度本土=世界最奢华服饰传统之一。皇帝每年举办"khil'a荣誉袍授予仪式"——赐金线锦袍+羽饰+珠宝=kingship/封臣仪式。帝国服装法规详细规定谁可穿金线锦/丝绒/特定色/特定毛皮。
`;


// ═══════════════════════════════════════════════════════════════════════════
// 3f. SLAVIC & EASTERN EUROPE — 斯拉夫与东欧服饰
// ═══════════════════════════════════════════════════════════════════════════

export const SLAVIC_EASTERN_EUROPE_DB = `## 斯拉夫与东欧传统服饰速查 (Slavic & Eastern European Costume)

### 基辅罗斯 (Kievan Rus, c.882-1240 CE)
- **男性(王公/Druzhina亲兵)**: Rubakha(套头长衫 — 亚麻/羊毛,及膝或及踝,长袖,领口+袖口+下摆刺绣几何纹,左肩斜开领或正中开领,系带闭合)、Porty(宽松长裤 — 亚麻/羊毛,及踝,腰带束腰)、Korzno(斗篷 — 羊毛/丝绒,矩形或半圆形,右肩或胸前大别针/钩扣固定,毛皮镶边,王公/贵族)、皮腰带(宽,金属扣+金属牌饰,挂刀/袋/火镰)
- **男性(平民)**: Rubakha(简版,素亚麻/羊毛,无或仅有简单刺绣)+ Porty+ 树皮鞋(lapti)
- **女性(王公妃/贵族)**: Rubakha(长衫 — 亚麻,及踝,长袖,领口+袖口+下摆红/蓝/金刺绣)、Poneva(裹裙 — 羊毛,格纹或条纹,及踝,腰带束腰的未缝合裹裙,斯拉夫传统)、Navershnik(外罩 — 开襟短上衣或长马甲)、Ochelie(头冠 — 金属/珠宝/刺绣硬冠,已婚女性必戴,遮盖全部头发)、Kolt(太阳穴垂饰 — 金/银空心珠或珐琅彩,挂于头冠两侧垂于太阳穴)
- **女性(平民)**: Rubakha+ Poneva或sarafan(无袖长裙 — 后来出现)、头巾(已婚女性必盖发)
- **面料**: 亚麻(linen — 核心面料)、羊毛(wool — 冬季/外衣/格纹poneva)、大麻(hemp — 粗用)、丝绸(拜占庭/东方贸易,极珍贵—王公/教会)、毛皮(fur — 貂/狐/松鼠/狼,冬衣衬里/饰边,基辅罗斯皮毛出口大户)
- **配色**: 白(亚麻本色)、红(red — 斯拉夫人最神圣色,象征生命/太阳/保护: 刺绣用红丝线大面积使用)、蓝(靛蓝)、金(拜占庭金线)、黑(自然羊毛)
- **纹样**: 几何刺绣(领口/袖口/下摆/前襟): 菱形(rhombus — 土地/丰收)、太阳轮(solar wheel — 旋转十字/卍swastika — 古斯拉夫太阳符号,万字符,好运+保护)、鸟/公鸡(天界信使)、树木/生命树(tree of life)、女身像(Mokosh大地母神—双手举鸟/星,刺绣于仪式服)、波浪纹(水) — 所有符号=斯拉夫多神教宇宙观
- **配饰**: Kolt(太阳穴金银垂饰 — 珐琅彩+金丝细工+珍珠,基辅罗斯标志性配饰,王公/贵族女性必佩)、Grivna(金/银颈环 — torc式,王公/高贵族男性标识)、Fibula大别针(肩/胸固定斗篷,金银制)、Temporal rings(太阳穴小环 — 编入发辫或挂于头带)、金属项链/手镯/戒指(银/金/青铜)、琥珀(波罗的海琥珀 — 基辅罗斯出口大宗)
- **鞋履**: 皮靴(sapogi — 软皮及膝或短靴,贵族+武士,绣花/金饰)、Lapti(树皮鞋 — 椴树皮/桦树皮编结,平民日常,雪地+草绳绑腿onuchi)、Porchini(平底皮鞋)
- **妆发**: 男性: 长发或中长发(斯拉夫传统,不剪短),胡须(全须,标志性)。女性: 未婚—长发披肩或编一辫,戴花环/丝带;已婚—编两辫盘于头,永远遮盖(头冠/头巾),露出头发=失贞/羞辱
- **闭合方式**: 系带(rubakha领口系绳)、钩扣(斗篷肩部大钩扣fibula式)、腰带(皮或织物宽腰带束腰,金属扣)。纽扣极少—仅少量骨纽或木纽。无拉链无松紧带。

### 波兰-立陶宛联邦 (Polish-Lithuanian Commonwealth, 1569-1795 CE)
- **男性(贵族/Szlachta)**: Zupan(内袍 — 丝绸/羊毛,及膝或及踝,立领,前襟密集纽扣(数十颗金/银/宝石纽扣,紧密排列至颈),窄袖,腰带束腰)、Kontusz(外袍 — 丝绸/金线锦,及踝,长袖(但不穿入—后甩于背,两侧开衩),对襟,毛皮镶边,腰带Pas kontuszowy束外)、Pas kontuszowy(波兰腰带 — 丝/金线/银线编织,宽30-40cm,长3-4m,双面织不同色,围腰多绕+两端垂至膝,17-18世纪波兰贵族标志 — 由波斯/亚美尼亚工匠在波兰本土工坊生产,为世界级纺织艺术品)、Delia(冬季斗篷 — 毛皮衬里,貂/猞猁/熊皮,肩部大钩扣/宝石扣)
- **男性头饰**: Kolpak(毛皮高帽 — 貂/猞猁/羊羔皮,布面,顶有羽饰/宝石束heron feather+jeweled aigrette)、Rogatywka(方顶帽 — 四角形硬帽,18世纪),Konfederatka(四角帽演变)
- **女性(贵族)**: Kontusik(女版kontusz — 及踝,长袖,对襟,毛皮镶边,腰带高束胸下)+ Sukienka(内裙 — 丝绸/锦缎)、Jupka(短外衣 — 毛皮镶边)、Kolpak式冬季帽。总体服饰在16-17世纪为波兰国风(Sarmatism萨马提亚主义—追认萨马提亚祖先=东方化时尚),18世纪法国化(法式宫廷裙取代)。
- **面料**: 丝绸(波兰本土丝织: 格但斯克/克拉科夫/利沃夫)、金线锦/银线锦(zlotoglow — 丝底织金线)、丝绒(velvet)、羊毛(广泛)、毛皮(貂/猞猁/狐/熊/狼 — 波兰-立陶宛毛皮出口欧洲,贵族冬装衬里极厚)、Pas kontuszowy腰带(丝+金/银线手工编织—每条约需数月,工坊在李斯/斯乌茨克)
- **配色**: 深红(crimson/karmazyn — 波兰贵族标志色,贵族别名"Karmazyni"深红者)、蓝(azure/sapphire)、绿(emerald)、金(gold)、深紫(plum)、白(zupan内袍)。Pas腰带双面: 一面深色(冬季/正式)、一面浅色(夏季)。
- **纹样**: Pas kontuszowy腰带花纹: 花卉/几何条纹/菱形、波兰鹰(Polish Eagle — 国徽白鹰,金线绣于袍)、Pogon骑士(立陶宛骑士纹章 — 白马骑士举剑盾)、Arabesque卷草(波斯/奥斯曼影响)
- **配饰**: Pas kontuszowy(波兰编织腰带 — 最核心配饰,全世界独有波兰,身份/财富/品味象征,贵族之间馈赠最贵重的礼品)、Karabela(波兰弯刀 — 曲刃,十字护手,象牙/玳瑁/金柄,宝石嵌,19世纪仍佩戴)、Buzdygan/Bulawa(权杖mace — 金属头+木/象牙柄,军官/议会主席标志)、Kolpak毛皮高帽+苍鹭羽饰(heron feather — 贵族/军官帽饰)、印章戒指(signet ring)、琥珀(波罗的海琥珀 — 项链/手串/烟斗)
- **鞋履**: 皮靴(黄色/红色软皮长靴,及膝或及踝,男贵标志 — szlachta贵族经典黄靴)、Cizmy(皮鞋 — 高跟/低跟)、Trzewiki(短皮鞋)、Czerwone boty(红皮靴 — 妇女)
- **妆发**: 男性: 剃发(16-17世纪剃短或剃光前额+脑后留发—Sarmatian style,波兰贵族独特)、全须(修剪整齐,大八字胡wąsy为波兰贵族标志—Sarmatian传统)、18世纪剃须戴假发(法国化)。女性: 长发编辫盘髻+珍珠串饰+Kolpak帽(冬),18世纪法国化高发髻
- **闭合方式**: 纽扣(zupan前襟密集排列—金/银/宝石/丝编纽扣,数十颗,从腰至颈,波兰典型)、钩扣(kontusz对襟—宝石钩扣)、Pas腰带(外束于zupan+ kontusz外,缠绕打结)。无拉链无松紧带。

### 巴尔干传统 (Balkan Traditional, c.1400-1900 CE — Serbian/Croatian/Bulgarian/Romanian)
- **男性**: Kosulja(套头长衫 — 亚麻/棉,及膝或及踝,长袖,领口+袖口+下摆刺绣几何斜纹)、Gace(宽松白长裤 — 亚麻/棉,及踝,腰带束腰)、Jelek(无袖短马甲 — 羊毛/丝绒,前开襟,刺绣/金属线镶边)、Koporan/Gunja(冬季羊毛外袍或羊皮背心)、皮腰带(silah — 宽皮革带+金属扣+金属牌,插刀/袋)、Opanci(猪皮/牛皮opanka系带鞋)、Caksire(紧身裤 — 蓝或黑,贵族/富裕,及踝,镶黑丝绒边)
- **女性**: Kosulja(长衫 — 亚麻/棉,及踝,长袖,领口/袖口/前襟+下摆大量彩色刺绣)、Pregaca(前围裙 — 羊毛/亚麻,刺绣几何纹+花卉,系于腰前,遮蔽膝至踝)、Zubun(无袖长马甲 — 羊毛,前开,及膝或及踝)、Jelek(短马甲 — 刺绣或金属线镶边)、Pojas(宽编织腰带,彩色几何纹,束腰+悬垂长穗)、Marama(头巾 — 棉/丝,彩绣边,已婚女性包发至颈)
- **面料**: 亚麻(linen — 衬衫/内袍)、羊毛(wool — 外衣/裙/腰带)、棉(奥斯曼时期后引入)、大麻(hemp — 粗用)、丝绸(贵族/富裕 — 奥斯曼影响,丝线刺绣)、皮革(腰带/鞋/羊皮背心)
- **配色**: 白(衬衫/裤底色)、红(red — 核心色,刺绣/腰带/头巾,生命+保护)、黑(black — 羊毛外衣/腰带刺绣/头巾刺绣)、金/黄(gold embroidery — 金属线镶边,贵族)、蓝/绿(靛蓝/绿刺绣)、几何彩色条纹(腰带/围裙)
- **纹样**: 几何刺绣: 菱形/三角/十字/阶梯/太阳轮(各地各有独立motif体系,族群/村落身份标识)、花卉(玫瑰/郁金香/康乃馨 — 奥斯曼影响,18世纪后更普遍)、蛇形波浪、生命树(tree of life)
- **配饰**: Pojas(彩色编织腰带 — 羊毛,宽15-25cm,几何纹,长至可绕腰多圈+两端垂穗,男女皆用,各颜色/纹样=村落/族群)、银/铜首饰(项圈/耳环/手镯/戒指 — filigree金银丝细工,奥斯曼风格)、Dukat金币项链(女性 — 金币串于链/布条悬胸前,富庶标志)、Pafte(大银腰扣 — 腰带前中央,filigree+珊瑚/宝石嵌,女性礼仪)
- **鞋履**: Opanci/Opanak(猪皮/牛皮系带鞋 — 巴尔干全民鞋,一片皮折起+皮绳系绑至踝/小腿,脚尖上翘,巴尔干标志性鞋履)、Cizme(皮靴 — 奥斯曼式)、Terlik(室内绣花拖鞋)、Kalcune(毛袜)
- **妆发**: 男性: 短发或中长发,胡须(全须或八字胡,奥斯曼影响)。女性: 未婚—长发披肩或编一辫,戴花环;已婚—编辫盘髻,Marama头巾(包发+盖颈),部分地区: 女性纹身(tetoviranje — 天主/正教徒十字纹身+几何纹于手/额/胸,防被奥斯曼掳去改宗,巴尔干特有)
- **闭合方式**: 系带(kosulja领口系绳)、纽扣(jelek前襟 — 银/金属扣,少量)、腰带(pojas宽编织带缠腰打结)、钩扣。无拉链无松紧带。
`;


// ═══════════════════════════════════════════════════════════════════════════
// 3g. PACIFIC ISLANDERS — 太平洋岛屿服饰
// ═══════════════════════════════════════════════════════════════════════════

export const PACIFIC_ISLANDERS_DB = `## 太平洋岛屿传统服饰速查 (Pacific Islanders Costume)

### 毛利 (Maori, c.1300-present — New Zealand/Aotearoa)
- **男性(酋长/Rangatira/武士)**: Piupiu(亚麻裙 — 新西兰亚麻flax/harakeke叶条编成,及膝或及踝,腰部编织带束腰,叶条染色成黑/棕几何条纹,穿时作响)、Tatua(编织腰带)、Kahu huruhuru(羽毛斗篷 — 亚麻底+几维鸟kiwi/鸽子kereru/鹦鹉kaka羽毛密织,王者/酋长专属)、Kahu kiwi(几维鸟羽斗篷 — 最珍贵,毛利王标志)、Kaitaka(精细亚麻斗篷 — 几何taniko镶边,最高级亚麻编织)
- **男性(平民)**: Piupiu或Maro(缠腰布/腰布 — 亚麻,及膝,无装饰)、裸上身、Ta moko(面部纹身 — 凿刻式,非针刺,凿入皮肤沟槽,墨+油脂,男性全脸+臀部/大腿)
- **女性(贵族)**: Pari(编织紧身胸衣 — 亚麻,taniko几何镶边,菱形/三角/条纹)、Piupiu或Rapaki(亚麻裹裙)、Kahu huruhuru(羽毛斗篷)、Hei tiki(玉坠 — pounamu绿玉/软玉雕刻人形hanging pendant,酋长家族传家宝,世代相传)、耳坠(绿玉/鲸骨/鲨鱼牙)
- **女性(平民)**: Rapaki(亚麻裹裙 — 缠裹+腰带)、裸上身日常(仪式时遮盖)、Ta moko(女性 — 唇+下巴纹,凿刻式,蓝黑色)
- **面料**: 新西兰亚麻(harakeke/NZ flax — 不是麻,为本地常绿植物phormium tenax,叶纤维极强韧+可漂白+可染,毛利核心纺织原料)、鸟羽(几维/鸽子/鹦鹉/恐鸟(moa灭绝前) — 羽毛斗篷)、狗皮/毛皮(kuri — 波利尼西亚狗,现已绝种,狗皮斗篷珍贵)、绿玉(pounamu — 新西兰南岛产软玉,毛利最珍贵材料,武器+饰物+传家宝)、鲸骨(whalebone)、鲨鱼牙(shark teeth)
- **配色**: 自然色: 亚麻黄/白(本色+漂白)、黑(泥染/树皮染)、红赭石(kokowai — 涂身/涂面/染织)、棕(自然亚麻)。白+黑+赭石红 = 毛利三主色。
- **纹样**: Taniko(几何镶边 — 亚麻斗篷边缘,菱形/三角/条纹/阶梯纹,彩色: 黑+白+红/黄,极精细编织,身份的视觉语言)、Kowhaiwhai(漩涡纹 — 建筑/船上彩绘图案,卷曲蕨叶+koro螺旋=新生+生命)、Ta moko(纹身图案 — 螺旋kora/曲线/部落祖先谱系,面部各部分对应身体/地位/部落,每人的moko独特=个人身份)
- **配饰**: Hei tiki(绿玉人形吊坠 — 毛利最著名配饰,大头+歪头+双手置于大腿,代表祖先/生育/智慧,世代传家宝,非售卖)、Mere(绿玉短棒 — 扁椭圆形,玉/鲸骨,单手执,打击武器+酋长权杖,礼仪/战斗,极珍贵,世代传)、Taiaha(长矛 — 木制,一端扁舌形arero/一端尖,武士近战+礼仪用,双持挥舞,雕刻精细)、耳坠(绿玉/鲸骨/鲨鱼牙 — 男女皆戴,耳洞撑大)、Pounamu(绿玉 — 一切: 武器/工具/首饰/传家宝)
- **鞋履**: 赤脚(全民赤脚,毛利传统无鞋)
- **妆发**: 男性: 长发或发髻(topknot — 武士),插羽毛(Huia鸟尾羽—酋长专属,12片尾羽/件斗篷),Ta moko全脸纹身。女性: 长发披肩或编辫,插羽毛/花,Ta moko唇+下巴纹(蓝黑沟槽),全身涂红赭石+鲨鱼油(仪式/社交)。男性与女性均有: 划痕纹身(scarification on body)+ Ta moko全脸(男)/唇下巴(女)
- **闭合方式**: 缠裹打结、编织腰带(harakeke亚麻带)、别针式固定(骨/绿玉别pin)。无纽扣无拉链。

### 夏威夷 (Hawaiian, pre-1778 — Pre-Contact Hawaii)
- **男性(酋长/Ali'i)**: Malo(缠腰布 — kapa树皮布或编织,及膝,前+后缠裹+腰带束腰,酋长长至曳地,平民短至膝)、Kapa moe(树皮布斗篷披肩 — 红/黄/黑几何纹,单肩披)、Ahu'ula(羽毛斗篷 — 密织网底+红iiwi鸟羽/黄oo鸟羽/黑mamo鸟羽覆盖全表面,极其珍贵=几代鸟羽采集+无数工时,只有最高酋长可穿,礼仪用)、Mahiole(羽毛头盔 — 同羽,新月形顶冠+前额遮额+侧垂护颊,全网底+羽覆盖,只有酋长佩戴+战斗穿戴—兼礼仪)
- **男性(平民/Maka'ainana)**: Malo(短,简,kapa素色)、裸上身、赤脚
- **女性(酋长妻女/贵族)**: Pa'u(裹裙 — kapa树皮布,多层,缠裹及踝,腰带束腰)、Kapa披肩、Lei(花环 — 羽毛/鲜花/贝壳/象牙/种子/狗牙)、Lei niho palaoa(鲸牙钩形吊坠 — 鲸牙+密编人发编带挂于颈,钩形,酋长家族标志,夏威夷最珍贵装饰)
- **女性(平民)**: Pa'u(简版,素kapa)、裸上身(日常,被西人禁止后遮盖)
- **面料**: Kapa(树皮布 — 构树/纸桑wauke树皮浸泡→捶打→多层粘合,可染色+印花+花纹压印,夏威夷kapa闻名波利尼西亚—极薄+极精细+水印纹)、羽毛(bird feathers — 红iiwi/黄oo/mamo/黑apapane: 全羽衣=至高奢侈品,1件全羽斗篷需几十万根羽=几代采集+制作)、狗皮/牙(kuri狗皮+狗牙)
- **配色**: 红(red — 酋长/神圣色,红赭石+红鸟羽,神只/酋长专属)、黄(yellow — 神圣+稀有,oo/mamo鸟羽极稀有)、黑(black)、白(kapa本色)、绿(植物染料)
- **纹样**: Kapa水印纹(watermark patterns — 捶打时竹/木刻模压印于布: 几何条纹/三角/菱形/十字,夏威夷各区独有纹样体系)、羽毛衣几何纹(红+黄+黑三角/月牙排布构成ahupua'a=土地段)
- **配饰**: Ahu'ula羽毛斗篷+Mahiole羽毛头盔(酋长专属 — 礼仪+战斗,红/黄/黑全覆盖网底,波利尼西亚最奢华的羽毛艺术品)、Lei niho palaoa(鲸牙钩形吊坠 — 钩形象牙+人发编带,酋长家族传家)、Lei(花环/羽毛环/贝壳环/象牙环/狗牙环 — 头/颈/腕/踝,大量,男女皆戴)、Kupe'e(贝壳/犬牙/鲸骨腕环+踝环)、Kapu stick(禁忌杖 — 羽毛+编织,标示禁地)
- **鞋履**: 赤脚(全民赤脚)
- **妆发**: 男性: 长发或发髻+羽毛饰,面部/身体涂红赭石+植物油脂,纹身(kakau — 几何纹,身份/谱系,点刺式)。女性: 长发披肩或编辫,大量花环Lei,纹身(手+腕+舌),红赭石涂身
- **闭合方式**: 缠裹打结、kapa布/编织腰带束腰。无纽扣无拉链。

### 萨摩亚 (Samoan, pre-contact traditional)
- **男性(酋长/Matai)**: Lava-lava(裹裙 — siapo树皮布或编织,及膝或及踝,缠裹+腰带束腰)、'Ie toga(精细席 — 编织pandanus露兜树叶,极细极软,仪式礼袍,贵族专属,裹身或披肩,萨摩亚最珍贵物品之一)、Ula nifo(鲸牙项链 — 劈半鲸牙串+编织绳,酋长标志)、Fuipu(拂尘 — 椰纤维+木柄,酋长礼仪)
- **男性(平民/武士)**: Lava-lava(简版,素色,及膝)、裸上身、Pe'a(男性全身纹身 — 腰至膝: 几何纹+图腾+谱系,点刺式(tatau—Samoa词源=tattoo),手工骨/牙/木梳蘸墨敲入皮肤,极度痛苦=成人礼+勇气考验,耗时数周至数月,萨摩亚纹身=世界最复杂最广泛传统)
- **女性(贵族)**: Puletasi(两件套 — 紧身上衣+长裹裙,及踝,同色同布,素色或手绘/印花,现代受基督教影响)、Lava-lava、'Ie toga(精细席,披肩仪式用)、头饰(鲜花/贝壳/羽毛 — 编入头发)
- **女性(平民)**: Lava-lava(裹裙)、裸上身(传统,后遮盖)、Malu(女性纹身 — 膝盖上下+大腿,几何纹,点刺式,比Pe'a面积小但同样精细)
- **面料**: Siapo(树皮布 — 构树/桑树皮捶打粘合,萨摩亚siapo特色: 手绘+印花+刻模板印刷(o'o),图案极精细,棕色染底+黑/红棕绘纹)、'Ie toga(精细席 — Pandanus露兜树叶晒干撕条+编织成极软极细的席布,柔韧似布,用于礼仪袍/礼物/交换,萨摩亚财富/地位象征,编织数月)、椰子纤维(coconut sennit — 编绳+编织)、羽毛(热带鸟羽)、鲸牙/贝壳/龟壳
- **配色**: 棕(siapo树皮布棕底色)、黑/深棕(染料 — 蜡烛果lama candlenut碳黑+树皮单宁)、红赭石(olo'a — 涂身+染布)、黄(姜黄turmeric)、白(石灰/珊瑚粉)
- **纹样**: Siapo图案(手绘/模板印刷): 几何条纹/三角/菱形/十字、海星/蜈蚣/鱼(fa'a — 自然元素)、植物(椰子/面包树/露兜)、家系图腾(fa'ailoga — 村落/家族符号)、Pe'a / Malu纹身(全身/腿部几何+图腾: 蜈蚣/海龟/鸟/鱼/矛,谱系+身份+保护)
- **配饰**: 'Ie toga(精细席 — 编织露兜树为极软席布,仪式披肩/裹身袍,艺术品,萨摩亚最珍贵财产,婚礼/葬礼/头衔仪式等不可少)、Ula nifo(鲸牙项链 — 酋长/高地位标识)、Ula fala(露兜树果串项圈 — 红/橙色,酋长/演说者tulafale专用)、Fuipu(椰纤维拂尘 — 酋长礼仪,执于手或肩上)、新鲜花环/贝壳环(头/颈)、Tuiga(酋长头冠 — 编织+贝壳+羽毛+人发编带,高耸,礼仪)
- **鞋履**: 赤脚(全民赤脚,萨摩亚传统无鞋,室内室外皆然)
- **妆发**: 男性: 短发或编辫,Pe'a全身纹身(腰至膝,黑蓝色,几何+图腾,成人礼)、涂椰子油(全身,日常护肤+仪式)。女性: 长发编辫或盘髻+鲜花(栀子花tiare/扶桑/鸡蛋花),Malu腿部纹身(膝上下,精细几何),涂椰子油
- **闭合方式**: 缠裹打结(lava-lava裹裙—腰部多层缠裹+布头塞入或打结)、编织腰带/绳束腰。无纽扣无拉链。
`;


// ═══════════════════════════════════════════════════════════════════════════
// 4. HISTORICAL WEAPONS — 历史武器速查
// ═══════════════════════════════════════════════════════════════════════════

export const HISTORICAL_WEAPONS_DB = `## 历史武器道具速查 (Historical Weapons & Props Reference)

### 中国历代兵器
| 时代 | 主战兵器 | 材质 | 长度/尺寸 | 外观特征 |
|------|---------|------|----------|---------|
| 商周 | 戈(ge — dagger-axe) | 青铜 | 柄长1.5-3m,戈头20-30cm | L形横刃,装在长柄上,钩啄式攻击,非刺非砍 |
| 商周 | 钺(yue — ceremonial battle-axe) | 青铜/玉(礼器) | 刃宽25-40cm | 大弧刃,圆銎(插柄孔),商代饕餮纹/虎纹装饰 |
| 商周 | 矛(spear) | 青铜/木柄 | 全长2-3m,矛头20-35cm | 柳叶形或三角矛头,圆骹(插柄孔) |
| 春秋战国 | 剑(sword) | 青铜(早期)→钢(后期) | 短剑30-50cm,长剑50-70cm | 双刃直身,格(guard)窄,柄缠丝绳,越王勾践剑: 菱形暗格纹+同心圆首 |
| 秦 | 弩(crossbow) | 木+青铜机构 | 弩臂70-100cm,弩机含悬刀/牙/望山 | 标准化弩机(可互换零件),青铜弩机机构精密,箭簇三棱铜镞 |
| 秦 | 铍(pi — long spear-sword) | 青铜/铁 | 全长3-4m,铍头35-60cm | 剑形长刃装在3m+长柄上,类似欧洲glaive |
| 汉 | 环首刀(ring-pommel dao) | 钢(百炼钢) | 刀身70-120cm,单刃直身或微曲 | 柄端金属环,单面刃,刀背厚实,取代剑成为骑兵主武器 |
| 汉 | 戟(ji — halberd) | 铁+木柄 | 全长2.5-3m | 卜字形: 矛头+横枝(卜),可刺可钩可啄 |
| 魏晋南北朝 | 槊(shuo — cavalry lance) | 钢 | 全长3-4.5m | 长杆骑兵冲击用,矛头加长加宽,重甲骑兵专用 |
| 唐 | 横刀(heng-dao — horizontal dao) | 钢(镔铁/花纹钢) | 刀身70-100cm,直刃单面,柄长20-25cm可双手 | 唐刀: 直刃,切刃造(刀尖斜切),银/铜装具(鞘口/鞘尾/柄头),饰金/银/宝石 |
| 唐 | 陌刀(modao — anti-cavalry greatsword) | 钢 | 全长2.5-3m,刃部60-80cm | 长柄大刀,双面刃,步兵列阵对骑兵专用 |
| 宋 | 朴刀(podao) | 钢 | 全长1.5-2m,刀身60-80cm | 宽刃大刀,柄可卸,民间/散兵标配 |
| 宋 | 神臂弓(shenbi crossbow) | 复合: 山桑木+檀木+牛角+筋 | 弩臂1.2-1.5m,射程300m+ | 复合弩臂强劲,蹶张(脚踏张弦),最大射程远 |
| 元 | 蒙古弓(Mongol recurve bow) | 木芯+角+筋复合 | 弓臂长1.2-1.5m,矢80-100cm | 强反曲(卸弦后弓臂反向弯曲),射程200-300m |
| 元 | 蒙古弯刀(Mongol saber) | 钢(镔铁crucible steel) | 刀身70-90cm,曲刃 | 单面曲刃(弯度>汉刀),锻打流水纹,轻量化骑兵专用 |
| 明 | 绣春刀(xiuchun dao — "spring-brocade saber") | 钢(花纹钢) | 刀身70-100cm,直刃微曲 | 雁翎刀式(刀身前窄后宽似雁翎),锦衣卫专属,银/金鎏金装具 |
| 明 | 狼筅(langxian — wolf-brush) | 竹+铁枝 | 全长4-5m | 大毛竹顶端保留枝丫,枝上绑铁尖,戚继光鸳鸯阵核心 |
| 明 | 三眼铳(three-barrel hand cannon) | 铁/青铜 | 全长30-50cm,三管并联 | 三根枪管并联铸造,木柄,火绳或火门点火,一次三发 |
| 清 | 牛尾刀(oxtail saber) | 钢 | 刀身70-90cm,刀尖加宽 | 刀身近柄窄→刀尖突然加宽,形状似牛尾,清军/捕快标准 |
| 清 | 弓箭+扳指(Manchu bow+thumb ring) | 复合弓+翡翠/玉/象牙扳指 | 弓长1.5-1.8m | 强力复合弓,扳指保护拇指钩弦,兼饰品 |

### 日本兵器
| 武士刀(katana) | 钢(玉钢tamahagane) | 刃长60-80cm,柄长25-30cm | 曲刃,刃纹(hamon),镐筋(shinogi)、地肌(jihada锻打纹理),装具: 刀镡(tsuba — 铁/金/赤铜)、柄卷(tsuka-ito — 丝绳缠绕)、鞘(saya — 木漆) |
| 胁差(wakizashi) | 同katana | 刃长30-60cm | 短刀,入室卸刀后随身携带,切腹专用 |
| 薙刀(naginata) | 钢,木柄 | 全长2-2.5m,刃部30-60cm | 曲刃长柄,僧兵/女武士专用,刃形似katana装在长杆上 |

### 欧洲中世纪~文艺复兴兵器
| 武装剑(arming sword) | 钢 | 刃长70-80cm | 直刃双面,十字护手(crossguard),轮形配重球(wheel pommel) |
| 长剑(longsword) | 钢 | 刃长90-110cm,柄长20-30cm可双手 | 直刃双面,大十字护手,柄可双手持握,14-16世纪为主 |
| 战斧(battle-axe) | 钢头+木柄 | 全长80-150cm | 宽弧刃,可能带背刺(pick)、顶刺(top spike),骑士步战 |
| 戟(halberd) | 钢+木杆 | 全长2-2.5m | 斧刃+矛尖+背钩三合一,瑞士卫兵标志性武器 |
| 弩(crossbow) | 钢弓臂+木托 | 托长60-80cm,弓臂跨度60-90cm | 钢弓臂(14世纪后),曲柄绞盘(cranequin)张弦,方簇矢(bolt) |
| 鸢盾(kite shield) | 木+皮革+金属边 | 高100-130cm,宽50-70cm | 倒泪滴形,顶部圆→底部尖,覆盖左半身,8-13世纪 |
| 火绳枪(arquebus) | 铁+木 | 全长1.2-1.5m,口径15-20mm | 弯木托,火绳蛇杆(serpentine lock),前装滑膛,16世纪 |
| Rapier(刺剑) | 钢 | 刃长100-120cm,细长双面直刃 | 复杂篮形护手(swept hilt),16-17世纪决斗/市民佩剑 |

### 古希腊/罗马兵器
| 希腊短剑(xiphos) | 青铜/铁 | 刃长45-60cm | 双面直刃,叶形(leaf-shaped blade),青铜时代经典 |
| 罗马短剑(gladius) | 钢 | 刃长50-65cm | 双面直刃,平行刃→长三角尖,配重球ball pommel+半球护手 |
| 长矛(dory) | 木杆+铁头 | 全长2-3m | 希腊重装步兵主武器,铁质矛头+青铜尾刺(sauroter) |
| 罗马标枪(pilum) | 木+铁 | 全长2m,铁杆细长60-90cm | 铁杆特长(全长的1/2),击中盾后弯折,敌方无法捡回用 |
| 希腊大盾(aspis/hoplon) | 木+青铜面 | 直径80-100cm | 圆形,内凹,青铜覆面,斯巴达人标志: 红色底+Λ(lambda)纹章 |
| 罗马方盾(scutum) | 木+皮革+金属边 | 高100-120cm,宽60-80cm | 弧形矩形,中部金属凸起(umbo),红色底+雷电/飞鹰+联队编号
`;


// ═══════════════════════════════════════════════════════════════════════════
// 5. HISTORICAL ARCHITECTURE — 历史建筑速查
// ═══════════════════════════════════════════════════════════════════════════

export const HISTORICAL_ARCHITECTURE_DB = `## 历史建筑速查 (Historical Architecture Reference)

### 中国历代建筑
| 朝代 | 风格 | 关键特征 | 材质 | 代表 |
|------|------|---------|------|------|
| 商周 | 高台建筑 | 夯土高台(earth-rammed platform)+木构殿堂、茅草或瓦顶、青铜构件(金釭)连接木材、院落布局萌芽 | 夯土、木、茅草、少量瓦、青铜 | 陕西岐山凤雏村西周宫殿遗址 |
| 秦汉 | 夯土+木构成熟 | 大夯土台基(高达10-20m)、抬梁式木构(柱→梁→檩)、多层楼阁、瓦当(wadang — 圆瓦当/文字瓦当)、斗拱萌芽(一斗二升/一斗三升)、直棂窗 | 夯土、木、青瓦、空心砖(地暖)、画像砖/石 | 未央宫、阿房宫、汉阙(que — 墓道石柱标志) |
| 魏晋南北朝 | 佛塔+石窟 | 佛教建筑传入: 佛塔(pagoda — 印度stupa+中国楼阁融合=多层木塔/砖塔)、石窟寺(云冈/龙门)、须弥座(Summit throne base)、鸱尾(chiwei — 脊端兽头) | 木、砖、石(石窟)、琉璃瓦(北魏始见) | 云冈石窟、龙门石窟、北魏洛阳永宁寺塔(147m木塔) |
| 唐 | 雄浑大气 | 斗拱硕大(材份制标准化,用材比例大)、出檐深远(檐挑出4-5m)、屋顶坡度平缓、鸱尾→鸱吻(兽头吞脊)、朱白二色(朱柱/白墙/绿琉璃)、梭柱(上细下粗) | 木、青瓦/绿琉璃瓦、砖、石(台基) | 佛光寺东大殿(857年,现存最古木构)、大明宫含元殿 |
| 宋 | 精致典雅 | 斗拱变小变密(材份缩小,装饰性增强)、屋脊起翘(翼角上翘,曲线优雅)、格子门/格子窗(gezi — 棂花复杂菱花/龟背/步步锦)、彩画(五彩遍装/碾玉装/解绿装)、须弥座精细化、减柱法(减少室内柱) | 木(精湛榫卯)、青瓦、琉璃瓦(皇家/寺庙)、砖(塔/城墙)、石(柱础/台基) | 《营造法式》(1103年,李诫著—标准化规范化建筑法典)、晋祠圣母殿 |
| 元 | 粗犷+藏传影响 | 减柱法/移柱法(大胆减少/移动柱位—空间开阔)、大额式(大横梁替代柱)、藏传喇嘛塔(白塔寺式—覆钵式)、琉璃大量使用(山西琉璃) | 木(粗料不精)、琉璃(元琉璃色彩丰富)、砖、石 | 永乐宫、北京妙应寺白塔 |
| 明 | 规整庄严 | 斗拱极小(装饰化,结构功能→纯装饰)、梁柱用材硕大规整(紫禁城)、彩画发展为"旋子彩画"(tangent circle pattern)、琉璃瓦颜色制度(黄=帝、绿=王、蓝=天坛、黑=水)、砖墙普及(城砖/金砖) | 木(楠木/松木)、琉璃瓦(各色)、大城砖、金砖(苏州特制)、汉白玉(台基/栏杆) | 紫禁城(1420)、天坛祈年殿、明十三陵 |
| 清 | 繁复华丽 | 斗拱极繁(比例进一步缩小)、彩画发展: 和玺彩画(hexie — 龙纹金箔,皇家最高)+旋子彩画+苏式彩画(苏州式—人物/花鸟/山水)、屋顶制度严格(庑殿>歇山>悬山>硬山)、琉璃脊兽(仙人走兽—数量和种类按等级)、门窗棂花极繁(冰裂纹/灯笼框/万字等)、西洋建筑影响(圆明园西洋楼) | 楠木/松木/进口紫檀/黄花梨(家具/装修)、琉璃(五彩琉璃雕花/九龙壁)、汉白玉(栏杆/台基)、金砖(太和殿铺地)、乾隆朝铜活(铜缸/铜龟/铜鹤) | 故宫(清重修+扩建)、颐和园、圆明园(1750西洋楼)、承德避暑山庄 |
| 民居 | 各地 | 四合院(北京 — 四面围合+影壁+垂花门)、窑洞(陕西/山西黄土高原 — 靠山/地坑)、土楼(福建 — 圆形/方形夯土大堡,3-5层,客家)、徽派(安徽/江西 — 马头墙+天井+木雕砖雕)、吊脚楼(湖南/贵州/重庆 — 依山/临水,木构挑出) | 因地制宜: 木、砖、石、土、竹 | 福建土楼、徽州宏村西递 |

### 世界古文明建筑
| 古埃及 | 石材(limestone/granite/sandstone)、圆柱(莲花柱头/棕榈柱头/纸莎草柱头)、方尖碑(obelisk — 整石,顶部金箔)、壁画浮雕覆盖全部墙面(象形文字+神祇+法老)、中轴线对称、巨大尺度 | 石灰石、花岗岩、砂岩、彩绘(矿物颜料) | 卡纳克神庙(Karnak)、卢克索神庙、吉萨金字塔 |
| 古希腊 | 三柱式: Doric(多立克 — 粗壮无柱础,凹槽20)、Ionic(爱奥尼 — 修长有柱础,涡卷柱头volute)、Corinthian(科林斯 — 茛苕叶柱头acanthus)、三角楣(pediment)雕刻群像、黄金比例(1:1.618)、柱间距(intercolumniation)制度、视觉修正(entasis — 柱中部微凸) | 大理石(pentelic/parian)、石灰石、陶瓦(红/黑彩绘)、青铜(雕塑/门) | 帕特农神庙(Parthenon)、雅典卫城、厄瑞克忒翁神庙(女像柱Caryatids) |
| 古罗马 | 拱券(arch)+穹顶(dome — 万神殿43.3m跨度,中央天眼oculus 8.8m)+混凝土(opus caementicium — 火山灰+石灰+碎石,可浇筑任意形状)、希腊柱式装饰化(贴在墙面/拱券上而非结构)、巴西利卡(basilica — 长方形公共大厅)、水道桥(aqueducts)多层连拱 | 罗马混凝土、砖、大理石(覆面)、石灰华(travertine)、火山灰 | 万神殿(Pantheon)、斗兽场(Colosseum — 四层三柱式叠加)、卡拉卡拉浴场(Baths of Caracalla) |
| 拜占庭 | 穹顶+帆拱(pendentive — 方形到圆形的过渡,四个球面三角穹顶坐于四柱/四墙)、马赛克(mosaic — 金底彩色玻璃/石材 tessera拼贴,人物/基督/圣母/皇帝)、集中式+十字平面(Greek cross — 四方等臂)、厚墙体+小窗(穹顶底部开一圈小窗drum) | 砖(拜占庭标准砖38x38x5cm)、大理石(柱/地面/墙裙)、金底马赛克(金箔夹玻璃) | 圣索菲亚大教堂(Hagia Sophia, 532-537)、圣维塔教堂(拉文纳,马赛克《查士丁尼与随从》) |
| 哥特(Gothic) | 尖拱(pointed arch)、肋拱(rib vault)、飞扶壁(flying buttress — 外部拱桥抵住墙体传递推力)、玫瑰窗(rose window — 巨大彩色玻璃圆窗)、束柱(clustered columns)、高耸(追求最大高度,中殿可达48m)、滴水兽(gargoyle) | 石材(limestone — 法国Caen stone/英国Portland stone)、彩绘玻璃(stained glass — 铅条+彩绘+烧制)、铅(屋顶)、铁(窗棂/拉杆)、木(屋顶构架) | 巴黎圣母院(Notre-Dame 1163-1345)、沙特尔大教堂(Chartres 1194-1220)、科隆大教堂(Cologne 1248-1880) |
| 文艺复兴 | 古典柱式秩序回归+数学比例(Alberti/Brunelleschi/Bramante)、中央集中式平面(圆形/希腊十字)、穹顶(双层砖壳穹顶 Brunelleschi's Duomo — 44m跨度自承重无鹰架)、柱式叠加(Rustic底→Ionic中→Corinthian顶)、帕拉第奥母题(Palladian motif — 拱门+两侧平梁矩形开口)、粗琢(Rustication — 底层石材粗面不磨) | 石材(pietra serena灰砂岩+大理石contrast)、灰泥(stucco)、壁画(fresco)、穹顶(砖双层壳) | 佛罗伦萨百花大教堂(Santa Maria del Fiore 1436穹顶落成)、圣彼得大教堂(1506-1626)、圆厅别墅(Villa Rotonda, 1567-1591) |
`;


// ═══════════════════════════════════════════════════════════════════════════
// 6. ERA ANACHRONISM GUARD — 时代错位负面词
// ═══════════════════════════════════════════════════════════════════════════

export const ERA_ANACHRONISM_GUARD = `## ⚠️ 时代错位禁止元素（ERA ANACHRONISM GUARD — 必须严格遵守）

以下元素在对应时代绝对禁止出现。违反任何一条都意味着角色设计根本性失败——这会直接导致生图输出"不像那个时代"。

### 🔴 所有古代场景（1900年以前）绝对禁止：
- **拉链** (zipper — 1893年才发明,1913年Gideon Sundback改良后开始普及,1920s才用于服装)
- **松紧带/弹性腰带** (elastic waistband — 天然橡胶1843年硫化,但服装弹性带直到1920s-1930s才出现)
- **塑料纽扣/塑料配饰** (plastic — 第一种合成塑料Bakelite 1907年发明,而服装中使用的通用塑料到1950s后才普及)
- **魔术贴** (velcro — 1941年George de Mestral发明,1955年专利)
- **合成面料** (polyester涤纶/nylon尼龙/spandex氨纶/acrylic腈纶 — 1935年尼龙发明,1939年商业化。涤纶1941年专利,1950s后普及。氨纶1958年发明)
- **现代运动鞋/球鞋** (sneakers/trainers — 19世纪末 rubber-soled plimsolls只在特定运动场景,通用运动鞋是1920s后)
- **任何带商标Logo的现代物品**
- **塑料瓶装水/塑料袋/一次性制品**
- **现代眼镜(金属细框/胶框/隐形眼镜)** — 古代/中世纪眼镜是可折叠铰链式或单片手持式(13世纪意大利发明,限于学者,极为罕见)
- **现代军装元素/迷彩** (camouflage — 一战后1918年才开始用于军装)
- **电子设备/屏幕/电线**
- **现代印刷体文字(T-shirt标语/Helvetica字体的招牌/任何电脑字体)**

### 🟠 按时代阶段的禁止项：

| 时代阶段 | 允许的闭合方式 | 允许的面料 | 禁止的面料/闭合 | 允许的鞋履 | 禁止的鞋履 |
|---------|-------------|----------|---------------|----------|----------|
| 远古-古典(公元前) | 系带、腰带束腰、别针(fibula)、绳结 | 亚麻(linen)、羊毛(wool)、麻(ramie/hemp)、兽皮/皮革、毛皮 | 棉(极少除外)、丝绸(中国商周有但极稀少,其他文明无)、纽扣(无)、拉链(无) | 凉鞋(皮/草编)、皮靴(仅山地/军事)、草鞋、赤脚 | 任何现代鞋(运动鞋/皮鞋/高跟鞋/橡胶底鞋) |
| 古典-中世(0-1500) | 系带、腰带、纽扣(13世纪后欧洲/宋以后中国)、绳结、别针(fibula/brooch)、钩眼(15世纪) | 上栏+丝绸(中国)、棉花(宋以后中国+印度,欧洲极少)、薄纱 | 拉链、松紧带、合成面料、塑料纽扣 | 凉鞋、皮鞋/靴、草鞋、木屐、尖头皮鞋(哥特后期) | 橡胶底鞋、运动鞋、现代高跟鞋(路易跟,15世纪止) |
| 近古近代(1500-1900) | 纽扣、系带、lace(束身lacing)、钩眼(hook & eye)、别针、腰带 | 上栏+蕾丝(lace)、天鹅绒、锦缎、丝绸(全球)、棉花(全球普及)、呢绒(wool broadcloth)、亚麻 | 拉链(1893前)、松紧带(1890s前)、尼龙/涤纶/氨纶/腈纶、塑料纽扣(1907前) | 皮鞋/靴、丝缎鞋、木屐、草鞋、高跟鞋(路易跟) | 橡胶底运动鞋、人字拖(1960s后)、Crocs等塑料鞋 |

### 🟡 各文明/时代的特定禁止项：

**中国商周—汉(公元前1600-220CE)**: 禁止盘扣(盘扣始于唐/宋)、禁止棉(棉宋以后)、禁止佛珠(佛教东汉传入)、禁止纸(西汉纸非书写用,东汉105年蔡伦改良后始用)、禁止印刷体文字

**中国唐末以后(900+)**: 盘扣允许、棉允许(宋以后)、纸允许、印刷体允许(雕版印刷唐代已成熟)

**日本平安时代**: 禁止纽扣、禁止棉花、禁止鞋子(室内赤脚)、禁止裤子(穿袴/裳)、禁止短发(男女皆长发——男性贵族长发束冠,男性武家龙须/topknot)、女性禁止裸露颈下皮肤

**古希腊/罗马**: 禁止裤子(Greeks嘲穿裤子的部落为barbaroi蛮族—裤子是"不文明"标识)、禁止纽扣、禁止大面积紫色(Tyrian purple = 帝王贵族专色)

**欧洲中世纪(5-15世纪)**: 禁止棉(极少从东方输入,昂贵)、禁止丝绸(早期只有教会/最高贵族)、禁止领带/蝴蝶结(17世纪才出现)、禁止波尔卡圆点(polka dots — 19世纪中叶)、禁止格纹(tartan — 高地地区有但其他地区无,且非今日clan tartan含义)

### 🟢 各时代的正确服装闭合方式指南：

**系带/绳结** — 全时代通用。衣襟左右各一绳,打结固定。可用彩色编织丝带/绳(身份标识)。

**纽扣** — 欧洲约1200s大量出现(最初在紧身袖口,13-14世纪用于前襟紧身衣)。中国: 宋开始纽扣规模化(金属/玉/骨/木纽扣),明盛行金属纽扣,清盛行盘扣(更多样的中国结式扣)。伊斯兰世界: 纽扣相对少见,偏用系带。

**别针/胸针(Brooch/Fibula)** — 古希腊/罗马/中世纪早期/拜占庭核心固定方式。金属制(金/银/青铜),装饰性极强。两肩各一brooch固定peplos/chiton/toga/斗篷。

**腰带(Belt/Sash)** — 全时代通用。身份标识(金/银带銙=高官/贵族,革带=平民,丝绸博带=文人/僧侣/贵族女)。宽窄变化: 宽腰带(唐/平安/明),极宽腰带(日本obi),极窄腰带(宋)。

**盘扣(Frog/Pankou)** — 宋以后中国出现,清明极盛。丝绳编结成花式(一字/琵琶/蝴蝶/葫芦/凤凰扣),兼具功能与装饰。左侧右衽(左襟压右襟)配4-7颗盘扣(清)。用于马褂/旗袍/长衫。

**钩眼(Hook & Eye)** — 欧洲15世纪出现,细金属钩+环。用于紧身胸衣(stays/corset)、领口、贴身的衣物隐形闭合。
`;


// ═══════════════════════════════════════════════════════════════════════════
// 7. ERA-SPECIFIC KB ROUTING — 路线映射
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Map trigger-extracted era to the appropriate historical KB sections.
 * Returns an array of KB block names to inject into the character extraction prompt.
 */
// ═══════════════════════════════════════════════════════════════════════════
// Search Engine
// ═══════════════════════════════════════════════════════════════════════════

interface EraMatch {
  era: string;
  section: string;
  snippet: string;
  score: number;
}

/** Fast keyword search across all historical costume data */
export function searchHistoryKB(query: string): string {
  const tokens = query.toLowerCase().split(/[\s,，、/\-—|]+/).filter(t => t.length >= 2);
  if (!tokens.length) return '';

  const allDBs = [
    CHINESE_DYNASTIES_DB,
    WORLD_CIVILIZATIONS_DB,
    ASIAN_CIVILIZATIONS_DB,
    SOUTHEAST_ASIA_CIVILIZATIONS_DB,
    PRE_COLUMBIAN_AMERICAS_DB,
    AFRICAN_CIVILIZATIONS_DB,
    ISLAMIC_WORLD_DB,
    SLAVIC_EASTERN_EUROPE_DB,
    PACIFIC_ISLANDERS_DB,
    HISTORICAL_WEAPONS_DB,
    HISTORICAL_ARCHITECTURE_DB,
  ];

  const matches: EraMatch[] = [];
  const eraHeaderRe = /^### (.+)/gm;
  const allText = allDBs.join('\n');
  const sections = allText.split(/^### /gm).filter(Boolean);

  for (const section of sections) {
    const headerLine = section.split('\n')[0] || '';
    const haystack = section.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (haystack.includes(t)) score += t.length >= 4 ? 3 : 2;
      for (let j = 0; j <= t.length - 2; j++) {
        if (haystack.includes(t.substring(j, j + 2))) score += 0.5;
      }
    }
    if (score > 0) {
      const lines = section.split('\n');
      const snippet = lines.slice(1, 6).join('\n');
      matches.push({ era: headerLine.trim(), section: '### ' + headerLine.trim(), snippet, score });
    }
  }

  matches.sort((a, b) => b.score - a.score);
  return matches.slice(0, 6).map(m => `### ${m.era}\n${m.snippet}`).join('\n\n---\n\n');
}

/** Fast lookup: returns relevant costume DB text for a specific era keyword */
export function lookupEraCostume(eraKeyword: string): string {
  const allDBs = [
    CHINESE_DYNASTIES_DB,
    WORLD_CIVILIZATIONS_DB,
    ASIAN_CIVILIZATIONS_DB,
    SOUTHEAST_ASIA_CIVILIZATIONS_DB,
    PRE_COLUMBIAN_AMERICAS_DB,
    AFRICAN_CIVILIZATIONS_DB,
    ISLAMIC_WORLD_DB,
    SLAVIC_EASTERN_EUROPE_DB,
    PACIFIC_ISLANDERS_DB,
  ].join('\n');
  const sections = allDBs.split(/^### /gm);
  const kw = eraKeyword.toLowerCase();
  for (const section of sections) {
    if (section.toLowerCase().includes(kw)) {
      return '### ' + section;
    }
  }
  return '';
}

export function getHistoricalKBForEra(era: string, region: string): string {
  const parts: string[] = [];

  // Determine which Chinese dynasty data to include
  const isChinese = /中国|中原|中华|华|唐|宋|明|清|汉|京|沪|东亚/.test(region || '');
  const eraLower = (era || '').toLowerCase();

  // Only inject historical KB for pre-modern eras
  if (/当代|现代早期|近未来|远未来/.test(era || '') && !/古代/.test(era || '')) {
    return ''; // No historical KB needed for modern/future
  }

  // Always include anachronism guard for any historical era
  parts.push(ERA_ANACHRONISM_GUARD);

  // Include full Chinese dynastic data when relevant
  if (isChinese || /远古|上古|古典|中世|近古|近代|先秦|商|周|秦|汉|魏晋|南北朝|隋|唐|宋|元|明|清|民国/.test(era || '')) {
    parts.push(CHINESE_DYNASTIES_DB);
    parts.push(HISTORICAL_WEAPONS_DB);
    parts.push(HISTORICAL_ARCHITECTURE_DB);
  }

  // Include world civilizations data
  if (!isChinese || /古典|希腊|罗马|埃及|美索|拜占庭|中世|哥特|文艺|复兴/.test(era || '')) {
    parts.push(WORLD_CIVILIZATIONS_DB);
  }

  // Include Asian civilizations for Japan/Korea
  if (/日本|日式|和风|平安|江户|东京|京都|韩国|朝鲜|首尔/.test(region || '') || /平安|江户|朝鲜/.test(era || '')) {
    parts.push(ASIAN_CIVILIZATIONS_DB);
  }

  // Include Southeast Asia civilizations
  if (/东南亚|高棉|吴哥|泰|暹罗|越南|缅甸|蒲甘|印尼|爪哇|巴厘|满者伯夷|菲律宾|马来/.test(region || '') ||
      /高棉|吴哥|泰|暹罗|素可泰|大城|越南|缅甸|蒲甘|爪哇|满者伯夷|印尼|菲律宾|马来/.test(era || '')) {
    parts.push(SOUTHEAST_ASIA_CIVILIZATIONS_DB);
  }

  // Include Pre-Columbian Americas civilizations
  if (/美洲|阿兹特克|玛雅|印加|墨西哥|秘鲁|中美|南美/.test(region || '') ||
      /阿兹特克|玛雅|印加|前哥伦布|美洲原住民/.test(era || '')) {
    parts.push(PRE_COLUMBIAN_AMERICAS_DB);
  }

  // Include African civilizations
  if (/非洲|埃及|努比亚|库施|津巴布韦|马里|贝宁|埃塞|阿克苏姆|斯瓦希里|祖鲁|阿散蒂|加纳/.test(region || '') ||
      /非洲|埃及|努比亚|库施|津巴布韦|马里|贝宁|埃塞|阿克苏姆|斯瓦希里|祖鲁|阿散蒂/.test(era || '')) {
    parts.push(AFRICAN_CIVILIZATIONS_DB);
  }

  // Include Islamic World civilizations
  if (/伊斯兰|阿拉伯|阿拔斯|法蒂玛|奥斯曼|土耳其|萨法维|波斯|伊朗|莫卧儿|印度|巴格达|大马士革|开罗|伊斯坦布尔/.test(region || '') ||
      /伊斯兰|阿拉伯|阿拔斯|法蒂玛|奥斯曼|土耳其|萨法维|莫卧儿/.test(era || '')) {
    parts.push(ISLAMIC_WORLD_DB);
  }

  // Include Slavic & Eastern Europe civilizations
  if (/斯拉夫|罗斯|波兰|立陶宛|巴尔干|塞尔维亚|克罗地亚|保加利亚|罗马尼亚|俄罗斯|东欧|基辅/.test(region || '') ||
      /斯拉夫|基辅罗斯|波兰|立陶宛|巴尔干|东欧/.test(era || '')) {
    parts.push(SLAVIC_EASTERN_EUROPE_DB);
  }

  // Include Pacific Islanders civilizations
  if (/太平洋|波利尼西亚|毛利|夏威夷|萨摩亚|新西兰|斐济|汤加|大溪地/.test(region || '') ||
      /毛利|夏威夷|萨摩亚|波利尼西亚|太平洋/.test(era || '')) {
    parts.push(PACIFIC_ISLANDERS_DB);
  }

  return parts.join('\n\n---\n\n');
}

/**
 * Build era-specific anachronism guard — negative prompt that prevents
 * objects/fabrics/closures from the wrong time period.
 */
export function buildEraAnachronismGuard(era: string): string {
  if (!era || /当代|近未来|远未来/.test(era)) return '';

  // Base guard for any pre-modern era
  let guard = `\n## ⚠️ 时代防错位红线（ERA ANACHRONISM GUARD）

你正在设计的是 **${era}** 时代的角色。以下现代物品在该时代绝对不存在，角色设计描述中严禁出现：\n`;

  const preCommon = [
    '拉链（zipper — 1893年发明，1920s才普及服装）',
    '松紧带/弹力腰带（elastic — 1920s后才用于服装）',
    '合成面料：涤纶(polyester)/尼龙(nylon)/氨纶(spandex)',
    '塑料纽扣或塑料配饰',
    '魔术贴(Velcro)',
    '现代运动鞋/橡胶底鞋（古代鞋底为皮革/麻编/草编/木制）',
    '现代金属拉链/纽扣牛仔裤',
    'T恤/卫衣/帽衫等现代廓形服装',
    '电子设备/屏幕/电线',
    '现代印刷体文字/商标Logo',
  ];

  if (/远古|上古|古典|秦|汉|商|周/.test(era)) {
    guard += preCommon.join('；') + '\n';
    guard += '额外禁止：任何形式的纽扣（中国汉魏以后才有纽扣雏形，宋以后才普及）、盘扣（宋以后才有）、棉花面料（棉宋以后传入中国，此前只有麻/丝/毛/皮）、纸张（东汉105年以前无纸）、印刷文字、佛珠（东汉佛教传入前）\n';
    guard += '闭合方式只能用：系带（衣襟绳结）、腰带（革带/大带/绅带）、带钩（青铜/玉制的belt hook）\n';
  } else if (/中世|唐|宋/.test(era)) {
    guard += preCommon.join('；') + '\n';
    guard += '盘扣允许（宋）、纽扣允许（金属/玉/骨材质，宋以后）、棉花允许（宋以后普及）\n';
    guard += '闭合方式允许：系带、纽扣、盘扣、腰带。禁用拉链/松紧带/塑料。\n';
  } else if (/近古|元|明|清|江户|文艺|复兴|维多利亚/.test(era)) {
    guard += preCommon.slice(0, 8).join('；') + '\n';
    guard += '注意：金属纽扣/玉纽扣/骨纽扣允许，盘扣允许（中国清明盛行，丝绳编结），皮革/金属腰带允许。拉链/松紧带/塑料/现代合成面料仍禁止。\n';
  } else if (/近代|民国|明治|清末/.test(era)) {
    guard += '禁止：合成面料（涤纶/尼龙/氨纶/腈纶，1939前不存在）、塑料纽扣、魔术贴、现代运动鞋\n';
    guard += '允许：拉链（少量高级定制，1893年后）、松紧带（少量出现）、金属/贝母/骨/布包纽扣、皮鞋/布鞋/丝鞋、丝绸/棉/麻/羊毛/呢绒\n';
  }

  guard += '\n**角色设计的每一个细节必须能追溯到该时代的真实物质文化。如果角色需要穿某种服装，必须用该时代真实存在的面料、闭合方式、染色技术来描述。不要编造不存在于该时代的元素。**\n';

  return guard;
}
