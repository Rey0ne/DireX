/* Writers & Narrative Theory Knowledge Base — style cards + tag-based search engine */
/* For two-round KB retrieval in script analysis / story writing pipelines */

// ─── Writer/Screenwriter Style Cards ───
// Each entry: name, tags (comma-separated), era, region, signature techniques, best-for
// Tags = searchable: GPT-5.4 reads KB_CATALOG → outputs keywords → Agent searches by tag
const ALL_WRITER_CARDS: WriterCard[] = [
  { name: '四大名著', tags: 'ensemble-cast,nonlinear-genealogy,mythic-frame,poetic-chapter-titles,episodic-hero-intro,multi-faction-war,quest-journey,prophecy-weaving,domestic-epic', era: 'classical-chinese', region: 'China', signature: '四种结构模型：串珠式/辫子式/游龙式/绿叶式——从类型化人物到典型化人物的演进', bestFor: 'ensemble-epic,historical-drama,allegorical-fantasy' },
  { name: '鲁迅', tags: 'ironic-distance,cold-satire,psychological-novella,vernacular-revolution,dual-narrative,white-stroke-portrait,polyphonic-voice', era: '20th-century-modernist', region: 'China', signature: '双重叙事结构+白描"画眼睛"——"一篇一个样式"的形式革命', bestFor: 'social-critique,psychological-portrait,historical-trauma' },
  { name: '老舍', tags: 'beijing-vernacular,tragicomic-realism,urban-underclass,folk-humor,dialect-narrative,social-panorama', era: '20th-century-modernist', region: 'China', signature: '京味语言+市民社会长卷——幽默中含悲悯——"含泪的笑"', bestFor: 'urban-realist-drama,working-class-narrative,generational-saga' },
  { name: '张爱玲', tags: 'psychological-realism,urban-decay,feminine-interiority,cinematic-cutting,ironic-romance,spatial-narrative,detail-as-metaphor', era: '20th-century-modernist', region: 'China', signature: '"参差对照"苍凉美学——房间即人心、意象=人物命运', bestFor: 'romantic-tragedy,feminine-psychology,family-decay,urban-alienation' },
  { name: '金庸', tags: 'historical-embedding,bildungsroman,cultural-martial-arts,grand-ensemble,poetic-chapter-titles,intertextuality,mythic-synthesis', era: '20th-century-modernist', region: 'China', signature: '历史虚构熔合+成长叙事+武功文艺化(琴棋书画=武学)——"侠之大者"', bestFor: 'heroic-journey,ensemble-adventure,historical-fantasy,moral-allegory' },
  { name: '古龙', tags: 'hardboiled-wuxia,telegraphic-prose,detective-fusion,anti-hero,existential-romance,minimalist-dialogue,poetic-action', era: '20th-century-modernist', region: 'China', signature: '电报体短句+西方悬疑推理融合+浪子美学——"小李飞刀，例不虚发"', bestFor: 'noir-mystery,lone-hero,philosophical-action,sparse-dialogue' },
  { name: '莫言', tags: 'hallucinatory-realism,reincarnation-structure,folk-narrative,sensory-overload,multi-species-pov,land-and-body,red-sorghum-aesthetic', era: 'contemporary', region: 'China', signature: '六道轮回结构+多物种POV+"幻觉的现实主义"——现实被推到幻觉的边界', bestFor: 'rural-epic,magical-realism,historical-trauma,folk-narrative' },
  { name: '刘慈欣', tags: 'cosmic-sociology,dark-forest,hard-sf-extrapolation,dimensional-framing,civilization-scale,non-human-centered,physics-as-plot', era: 'contemporary', region: 'China', signature: '宇宙社会学+维度武器化+物理学=叙事引擎——"毁灭你，与你有何相干"', bestFor: 'cosmic-epic,hard-sci-fi,civilization-collapse,philosophical-sf' },
  // ── 中国现代文学 (9) ──
  { name: '余华 (Yu Hua)', tags: 'brutal-realism,sparse-prose,survival-narrative,body-as-history,black-humor,zero-degree-writing,repetition-as-rhythm', era: 'contemporary', region: 'China', signature: '零度写作+身体=历史——"活着"=中国的"老人与海"——简洁到残忍——重复=时间的重量', bestFor: 'survival-narrative,historical-trauma,minimalist-tragedy,family-saga' },
  { name: '王安忆 (Wang Anyi)', tags: 'shanghai-memory,long-duration-narrative,female-coming-of-age,urban-minutiae,everyday-epic,detail-as-history', era: 'contemporary', region: 'China', signature: '"长恨歌"——上海=女主角——弄堂/鸽群/旗袍=城市记忆——日常=史诗——女性=城市的肉身', bestFor: 'urban-saga,female-protagonist,detail-narrative,generational-change' },
  { name: '苏童 (Su Tong)', tags: 'southern-china,decadent-beauty,female-psychology,family-genealogy,red-pink-imagery,erotic-melancholy', era: 'contemporary', region: 'China', signature: '"妻妾成群/大红灯笼高高挂"——南方颓废美+女性心理——红色/粉色=欲望=毁灭——江南=腐朽的美丽', bestFor: 'family-decay,female-psychology,southern-gothic-china,erotic-drama' },
  { name: '贾平凹 (Jia Pingwa)', tags: 'rural-china,folk-wisdom,earthy-language,shaanxi-landscape,superstition-modernity,peasant-epic', era: 'contemporary', region: 'China', signature: '"秦腔/废都"——陕西农村=中国灵魂——方言/民谣/风水=叙事——"土"=最高级的文学', bestFor: 'rural-epic,folk-narrative,land-and-people,traditional-modernity-clash' },
  { name: '陈忠实 (Chen Zhongshi)', tags: 'white-deer-plain,clan-war,century-span,confucian-moral,single-village-china,revolution-microcosm', era: 'contemporary', region: 'China', signature: '"白鹿原"——一个村子=半个世纪的中国——族谱/祠堂/革命=道德冲突——"小说是一个民族的秘史"', bestFor: 'clan-epic,century-saga,revolution-narrative,rural-china' },
  { name: '王小波 (Wang Xiaobo)', tags: 'absurdist-humor,logical-paradox,sexual-liberation,ironic-distance,intellectual-anti-hero,science-and-desire', era: 'contemporary', region: 'China', signature: '荒谬幽默+逻辑悖论+性解放——"一只特立独行的猪"——知识分子=体制内的局外人', bestFor: 'absurdist-comedy,intellectual-narrative,social-satire,philosophical-fiction' },
  { name: '钱钟书 (Qian Zhongshu)', tags: 'scholarly-satire,erudite-metaphor,fortress-besieged,marriage-as-trap,cosmopolitan-chinese,wit-as-weapon', era: '20th-century-modernist', region: 'China', signature: '"围城"——婚姻=城堡——外面的人想进去里面的人想出来——博喻=智慧的武器——"中国近代文学中最有趣的小说"', bestFor: 'social-satire,marriage-drama,intellectual-comedy,urban-sophistication' },
  { name: '沈从文 (Shen Congwen)', tags: 'xiangxi-pastoral,primitive-purity,nature-writing,folk-simplicity,river-as-life,ethnographic-novel', era: '20th-century-modernist', region: 'China', signature: '"边城"——湘西=未被现代污染的纯真——翠翠=中国文学最纯净的少女——河流=时间=命运', bestFor: 'pastoral-drama,rural-romance,nature-writing,folk-narrative' },
  { name: '巴金 (Ba Jin)', tags: 'family-saga,feudal-critique,generational-conflict,may-fourth-generation,emotional-torrent,confessional-style', era: '20th-century-modernist', region: 'China', signature: '"家春秋"——激流三部曲——封建家庭=牢笼——青年=冲出牢笼的力量——"我控诉"', bestFor: 'family-conflict,generational-drama,coming-of-age,social-critique' },
  { name: '村上春树', tags: 'parallel-worlds,dream-logic,synchronicity,jazz-structure,mundane-surreal,existential-isolation,dual-protagonist,pop-culture-texture', era: 'contemporary', region: 'Japan', signature: '日常×超现实的缝隙——平行世界在"井"/"入口石"处连接', bestFor: 'surreal-drama,parallel-narrative,psychological-journey,magical-realism' },
  { name: '川端康成', tags: 'haiku-prose,negative-space,mono-no-aware,elliptical-narrative,tradional-japanese-aesthetics,ma-interval,fragmentary', era: '20th-century-modernist', region: 'Japan', signature: '物哀+余白——如俳句的"切れ字"在句间留白——美在消逝中', bestFor: 'poetic-drama,atmospheric-narrative,minimalist-romance' },
  // ── 日本文学 (5) ──
  { name: '三岛由纪夫 (Yukio Mishima)', tags: 'aesthetic-death,body-cult,sea-as-desire,mask-and-face,beauty-and-destruction,traditional-japan-modern,ritual-narrative', era: '20th-century-modernist', region: 'Japan', signature: '"金阁寺/潮骚"——美=毁灭——身体=美学=政治——日本传统的现代自杀——"美到极致只能烧掉"', bestFor: 'aesthetic-tragedy,beauty-and-death,psychological-obsession,japanese-identity' },
  { name: '夏目漱石 (Natsume Soseki)', tags: 'japanese-modernity,meiji-identity,psychological-realism,loneliness-core,transition-era,individual-society', era: '20th-century-modernist', region: 'Japan', signature: '"心/我是猫"——明治日本=东西碰撞——孤独=现代性的代价——"月色真美"=日本式告白', bestFor: 'psychological-drama,modernity-transition,intellectual-loneliness,japanese-society' },
  { name: '芥川龙之介 (Ryunosuke Akutagawa)', tags: 'short-form-master,historical-retelling,psychological-horror,unreliable-narrator,haunting-elegance,dark-fable', era: '20th-century-modernist', region: 'Japan', signature: '"罗生门/竹林中"——短篇完美——历史=镜像——真相=不可知——"人生还不如一行波德莱尔"', bestFor: 'short-form,psychological-horror,unreliable-narrative,dark-fable' },
  { name: '太宰治 (Osamu Dazai)', tags: 'confessional-novel,shame-and-alienation,self-destruction,disqualified-human,postwar-japan,alienation-classic', era: '20th-century-modernist', region: 'Japan', signature: '"人间失格"——"生而为人我很抱歉"——自传式告白——羞耻=日本现代人的底色', bestFor: 'confessional-narrative,alienation-drama,self-destruction,postwar-identity' },
  { name: '谷崎润一郎 (Junichiro Tanizaki)', tags: 'erotic-obsession,shadow-aesthetic,japanese-beauty,fetish-narrative,western-eastern-desire,in-praise-of-shadows', era: '20th-century-modernist', region: 'Japan', signature: '"阴翳礼赞/细雪"——日本的"阴影美学"——欲望=美=毁灭——东方=阴翳/西方=光亮', bestFor: 'erotic-drama,shadow-aesthetic,japanese-beauty,desire-narrative' },
  // ── 韩国文学 (3) ──
  { name: '韩江 (Han Kang)', tags: 'vegetarian-body,metamorphosis-female,trauma-as-physical,plant-becoming,korean-woman-voice,minimalist-horror', era: 'contemporary', region: 'Korea', signature: '"素食者"——拒绝吃肉=拒绝成为人类——身体=创伤=变形=植物——韩国女性的沉默反抗', bestFor: 'body-horror,female-trauma,metamorphosis-narrative,minimalist-drama' },
  { name: '金英夏 (Kim Young-ha)', tags: 'urban-alienation,digital-age,korean-modernity,death-as-spectacle,genre-bending,existential-seoul', era: 'contemporary', region: 'Korea', signature: '"杀人者的记忆法/光之帝国"——首尔=数字时代的荒原——死亡=娱乐——类型=可打破的容器', bestFor: 'urban-alienation,digital-culture,existential-thriller,genre-hybrid' },
  { name: '申京淑 (Shin Kyung-sook)', tags: 'mother-daughter,missing-person,family-secret,korean-family,memory-search,please-look-after-mom', era: 'contemporary', region: 'Korea', signature: '"请照顾我妈妈"——母亲失踪=家庭秘密暴露——第二人称"你"=所有韩国人的母亲——"我们真的了解妈妈吗"', bestFor: 'family-drama,mother-narrative,missing-person,memory-search' },
  { name: '莎士比亚', tags: 'five-act-structure,soliloquy,dramatic-irony,tragic-hero,fool-as-truth-teller,verse-prose-shift,comic-relief,double-plot', era: 'renaissance', region: 'Europe', signature: '五幕剧+独白/旁白+戏剧性反讽——人类情感全光谱', bestFor: 'tragedy,historical-drama,political-intrigue,star-crossed-romance' },
  { name: '陀思妥耶夫斯基', tags: 'polyphonic-novel,free-indirect-discourse,psychological-realism,spatial-psychology,existential-guilt,cat-and-mouse-dialogue,somatic-conscience', era: '19th-century', region: 'Russia', signature: '复调小说——每个角色是平等的思想宇宙,没有谁的声音被"最终宣判"', bestFor: 'psychological-crime,existential-drama,moral-crisis,redemption-story' },
  { name: '托尔斯泰', tags: 'dialectic-of-soul,open-form,aperture-not-closure,anti-literary-prose,godlike-omniscient,historical-contingency,domestic-epic', era: '19th-century', region: 'Russia', signature: '"灵魂辩证法"——用反文学的自然主义散文达到文学的最高真实', bestFor: 'historical-epic,domestic-saga,psychological-realism,social-panorama' },
  { name: '卡夫卡', tags: 'dream-logic,bureaucratic-nightmare,kafkaesque,spatial-weaponization,passive-voice-opening,anaphoric-ambiguity,absurd-precision', era: '20th-century-modernist', region: 'Europe', signature: '梦逻辑×官僚精确——"Kafkaesque"——荒诞被不可理喻地接受', bestFor: 'absurdist-drama,bureaucratic-satire,existential-horror,dystopian' },
  // ── 俄国/欧洲 — 经典补充 (10) ──
  { name: '契诃夫 (Anton Chekhov)', tags: 'gun-on-wall,subtext-master,short-story-genius,everyday-tragedy,comedy-tragedy-blend,indirect-action', era: '19th-century', region: 'Russia', signature: '"枪挂在墙上就一定要响"——潜台词=真正的对话——日常=悲剧——"人不是去戏剧化的地方，是去平凡的地方"', bestFor: 'slice-of-life,subtext-drama,short-form,everyday-tragedy' },
  { name: '果戈理 (Nikolai Gogol)', tags: 'grotesque-satire,absurd-bureaucracy,russian-soul,surreal-comedy,dead-souls,overcoat-legacy', era: '19th-century', region: 'Russia', signature: '"外套/死魂灵"——荒诞=俄罗斯的日常——官僚=鬼魂——"我们都从果戈理的外套里走出来"', bestFor: 'grotesque-comedy,bureaucratic-satire,absurdist-narrative,russian-gothic' },
  { name: '布尔加科夫 (Mikhail Bulgakov)', tags: 'devil-in-moscow,magical-realism-soviet,pontius-pilate-within,satirical-fantasy,manuscripts-dont-burn,censored-genius', era: '20th-century-modernist', region: 'Russia', signature: '"大师与玛格丽特"——魔鬼=莫斯科的拯救者——小说中的小说(本丢·彼拉多)——"手稿不会烧毁"', bestFor: 'magical-realism,political-satire,novel-within-novel,supernatural-comedy' },
  { name: '普鲁斯特 (Marcel Proust)', tags: 'involuntary-memory,madeleine-moment,time-regained,interior-monologue,sensory-trigger,social-taxonomy', era: '20th-century-modernist', region: 'Europe', signature: '"追忆似水年华"——玛德莱娜蛋糕=不由自主的记忆——时间=真正的主题——3000页=一个意识的宇宙', bestFor: 'memory-narrative,interior-monologue,time-meditation,social-satire' },
  { name: '乔伊斯 (James Joyce)', tags: 'stream-of-consciousness,mythic-parallel,dublin-microcosm,language-experiment,epiphany-moment,everyday-epic', era: '20th-century-modernist', region: 'Europe', signature: '"尤利西斯"——一天=奥德赛=全人类——18章18种文体——都柏林=世界的缩影——"历史是一场噩梦我想从中醒来"', bestFor: 'experimental-narrative,stream-of-consciousness,everyday-epic,mythic-parallel' },
  { name: '托马斯·曼 (Thomas Mann)', tags: 'german-bildungsroman,artist-bourgeois,disease-as-metaphor,ironic-detachment,mythic-modernism,time-in-magic-mountain', era: '20th-century-modernist', region: 'Europe', signature: '"魔山"——疗养院=欧洲文明=时间变形——疾病=精神=知识分子——"时间是圆的"', bestFor: 'philosophical-novel,allegorical-narrative,artist-drama,intellectual-saga' },
  { name: '黑塞 (Hermann Hesse)', tags: 'spiritual-journey,east-west-synthesis,self-discovery,duality-resolution,coming-of-age-spiritual,inner-quest', era: '20th-century-modernist', region: 'Europe', signature: '"悉达多/荒原狼"——自我=河流——东方=西方灵魂的解药——"每个人的生命都是通向自我的路"', bestFor: 'spiritual-journey,coming-of-age,self-discovery,east-west-fusion' },
  { name: '米兰·昆德拉 (Milan Kundera)', tags: 'philosophical-novel,lightness-weight,irony-and-lyricism,sex-as-existential,kitsch-critique,central-europe', era: 'contemporary', region: 'Europe', signature: '"不能承受的生命之轻"——轻/重=存在的两极——性=存在实验——kitsch=对粪便的绝对否定', bestFor: 'philosophical-romance,existential-drama,ironic-narrative,political-allegory' },
  { name: '卡尔维诺 (Italo Calvino)', tags: 'ouLiPo,combinatorial-narrative,lightness-of-thought,metafiction,folk-tale-modern,cities-as-idea', era: 'contemporary', region: 'Europe', signature: '"看不见的城市/如果在冬夜一个旅人"——马可波罗=叙述者=虚构——城市=欲望的形式——"经典=一本从未说完它要说的话的书"', bestFor: 'metafiction,experimental-narrative,folk-tale-modern,conceptual-storytelling' },
  { name: '艾柯 (Umberto Eco)', tags: 'medieval-detective,scholarly-thriller,semiotics-and-death,bibliophile-mystery,heresy-and-power,infinite-interpretation', era: 'contemporary', region: 'Europe', signature: '"玫瑰的名字"——中世纪修道院=符号学的犯罪现场——图书馆=迷宫——知识=权力=死亡', bestFor: 'historical-mystery,intellectual-thriller,scholarly-narrative,medieval-setting' },
  { name: '加西亚·马尔克斯', tags: 'magical-realism,cyclical-time,folded-time,polysyndeton,generational-repetition,myth-as-history,matter-of-fact-fantastic', era: '20th-century-modernist', region: 'Latin-America', signature: '"多年以后"三时态一句——家族史如螺旋——时间"在打转不是在流逝"', bestFor: 'magical-realism,family-epic,generational-saga,circular-narrative' },
  // ── 拉丁美洲文学 (3) ──
  { name: '博尔赫斯 (Jorge Luis Borges)', tags: 'labyrinth-mirror,infinite-library,metaphysical-detective,idea-as-story,circular-time,gaucho-and-tiger', era: '20th-century-modernist', region: 'Latin-America', signature: '"小径分岔的花园"——迷宫=时间=无限——图书馆=宇宙——"天堂应该是图书馆的模样"——短篇=思想的完整宇宙', bestFor: 'metaphysical-mystery,experimental-short,conceptual-narrative,labyrinth-story' },
  { name: '巴尔加斯·略萨 (Mario Vargas Llosa)', tags: 'structural-complexity,conversation-in-cathedral,total-novel,dictator-novel,peru-politics,multiple-timeline', era: 'contemporary', region: 'Latin-America', signature: '"城市与狗/酒吧长谈"——总体小说——多条时间线对话互文——独裁=拉丁美洲的宿命——"文学是火"', bestFor: 'political-epic,multi-timeline,dictator-narrative,structural-experiment' },
  { name: '波拉尼奥 (Roberto Bolaño)', tags: '2666-endless,poet-detective,unsolved-crime,latin-american-exile,literary-underworld,violence-as-landscape', era: 'contemporary', region: 'Latin-America', signature: '"2666"——900页未完成=本身就是形式——诗人=侦探=逃犯——暴力=拉丁美洲的地景——"文学+死亡=生活"', bestFor: 'epic-mystery,literary-noir,violence-narrative,exile-story' },
  // ── 非洲文学 (3) ──
  { name: '钦努阿·阿契贝 (Chinua Achebe)', tags: 'things-fall-apart,igbo-society,colonial-collision,proverb-narrative,oral-tradition-literary,african-voice-first', era: '20th-century-modernist', region: 'Africa', signature: '"瓦解"——非洲第一部世界级小说——伊博族=被殖民前是一个完整的文明——谚语=智慧=叙事', bestFor: 'colonial-narrative,african-society,cultural-collision,tragic-hero' },
  { name: '沃莱·索因卡 (Wole Soyinka)', tags: 'yoruba-mythology,ritual-theater,political-satire,prison-memoir,african-modernism,trickster-god', era: 'contemporary', region: 'Africa', signature: '诺贝尔文学奖——约鲁巴神话+现代戏剧——仪式=政治——Eshu(诡计神)=非洲的不可预测性', bestFor: 'mythological-drama,political-satire,african-modernism,ritual-narrative' },
  { name: '恩古吉·瓦·提安哥 (Ngũgĩ wa Thiongo)', tags: 'gikuyu-language,decolonizing-mind,kenyan-struggle,language-as-resistance,oral-epic,peasant-hero', era: 'contemporary', region: 'Africa', signature: '用基库尤语写作=母语=反殖民——"一粒麦种"——肯尼亚独立=背叛——"语言是子弹"', bestFor: 'anti-colonial-narrative,language-politics,african-independence,peasant-epic' },
  // ── 中东文学 (2) ──
  { name: '纳吉布·马哈福兹 (Naguib Mahfouz)', tags: 'cairo-trilogy,arabic-epic,generational-saga,alley-as-universe,modern-egypt,traditional-islamic', era: '20th-century-modernist', region: 'Middle-East', signature: '"开罗三部曲"——一个家庭=埃及的现代史——巷子=宇宙——传统/现代/宗教/世俗=四代人', bestFor: 'family-saga,arabic-narrative,generational-conflict,urban-microcosm' },
  { name: '奥尔罕·帕慕克 (Orhan Pamuk)', tags: 'east-west-identity,istanbul-melancholy,hüzün,museum-narrative,miniature-painting,postmodern-mystery', era: 'contemporary', region: 'Middle-East', signature: '"我的名字叫红/纯真博物馆"——伊斯坦布尔=东西方的伤口——hüzün(呼愁)=城市的集体忧郁——细密画=另一种观看方式', bestFor: 'cultural-identity,mystery-narrative,east-west-conflict,urban-melancholy' },
  { name: '托尔金', tags: 'mythopoeia,entrelacement,pseudo-translation,eucatastrophe,linguistic-worldbuilding,cyclical-time,heroic-elegy,moral-pairing', era: '20th-century-modernist', region: 'Europe', signature: '神话创造+中世纪交织叙事+伪翻译——"善灾"=一切绝望时的突然喜悦', bestFor: 'epic-fantasy,quest-narrative,worldbuilding-heavy,mythic-storytelling' },
  { name: '乔治·马丁', tags: 'multi-pov,decoy-protagonist,gardener-approach,moral-grayness,low-magic-realism,political-machination,subversive-fantasy', era: 'contemporary', region: 'USA', signature: '31个POV+权力与叙事刻意分离+"谁都可以死"——颠覆奇幻惯例', bestFor: 'political-epic,ensemble-tragedy,moral-ambiguity,subversive-fantasy' },
  { name: 'J.K.罗琳', tags: 'chiastic-structure,mystery-plotting,limited-omniscient,evolving-prose,clue-knitting,grounded-magic,boarding-school-noir', era: 'contemporary', region: 'Europe', signature: '交叉对称结构+层层升级的谜案编织——系列每卷一个侦探故事', bestFor: 'coming-of-age,mystery-fantasy,boarding-school,prophecy-narrative,series-arc' },
  { name: '阿加莎·克里斯蒂', tags: 'closed-circle,fair-play-clues,animated-algebra,unreliable-narrator,roundtable-denouement,red-herring-layers,least-likely-suspect', era: '20th-century-modernist', region: 'Europe', signature: '"动画代数"——机械般精密的谜题+"公平游戏"线索预埋+圆桌式终局', bestFor: 'detective-mystery,locked-room,whodunit,twist-ending,suspense-thriller' },
  { name: '雷蒙德·钱德勒', tags: 'hardboiled-poetry,incongruous-simile,first-person-noir,mean-streets-ethos,romantic-knight,moral-adjective,la-as-character', era: '20th-century-modernist', region: 'USA', signature: '暴力性矛盾比喻+"穷街陋巷"伦理——浪漫骑士在腐败都市', bestFor: 'noir-detective,urban-crime,hardboiled,voice-driven,corruption-narrative' },
  { name: '海明威', tags: 'iceberg-theory,parataxis,telegraphic-prose,cinematic-cutting,understatement,omission-as-narrative,declarative-sentences', era: '20th-century-modernist', region: 'USA', signature: '冰山理论——1/8在水上+7/8让读者感知——省略=叙事', bestFor: 'war-story,minimalist-drama,adventure-narrative,sparse-dialogue,action-scene' },
  { name: '福克纳', tags: 'multiple-narrators,southern-gothic,degressive-stream,yoknapatawpha,temporal-fragmentation,one-sentence-epic,tragic-decay', era: '20th-century-modernist', region: 'USA', signature: '4声部叙事(含智障者纯感官意识流)+"退化式"意识流——从山巅走下山', bestFor: 'family-decay,southern-gothic,trauma-narrative,multi-perspective' },
  { name: '斯蒂芬·金', tags: 'character-driven-horror,small-town-america,brand-name-realism,internal-skeptic,pseudodocumentary,ordinary-hero,child-perspective', era: 'contemporary', region: 'USA', signature: '角色驱动恐怖+内置怀疑者+品牌名称现实主义——"大麦克文学"的最高成就', bestFor: 'horror,supernatural-thriller,small-town-mystery,coming-of-age' },
  { name: '阿西莫夫', tags: 'psychohistory,composite-novel,encyclopedia-frame,deterministic-epic,what-if-premise,rational-hero,galactic-scale,cyclical-history', era: '20th-century-modernist', region: 'USA', signature: '心理史学+百科全书框架——动作被对话取代——"暴力是无能者的最后避难所"', bestFor: 'galactic-epic,idea-driven-sf,intellectual-thriller,future-history' },
  { name: '菲利普·迪克', tags: 'ontological-uncertainty,entropy-decay,multiple-premises,shifting-focalization,meta-sf,reality-is-false,paranoid-aesthetic', era: '20th-century-modernist', region: 'USA', signature: '"现实是假的"——多前提写作+熵=体验+开放式结局——"垃圾变圣殿"', bestFor: 'dystopian-sf,reality-bending,philosophical-thriller,identity-crisis' },
  // ── 英美文学 — 经典补充 (8) ──
  { name: '简·奥斯汀 (Jane Austen)', tags: 'free-indirect-discourse,marriage-market,irony-and-wit,drawing-room-drama,social-comedy,female-intelligence', era: '19th-century', region: 'Europe', signature: '自由间接引语——客厅=社会=婚姻市场——讽刺=智慧——"凡是有钱的单身汉总需要一位太太"=全书的反讽', bestFor: 'social-comedy,romance-irony,female-protagonist,drawing-room-drama' },
  { name: '狄更斯 (Charles Dickens)', tags: 'serial-publication,coincidence-as-fate,urban-panorama,memorable-grotesques,social-reform-novel,cliffhanger-chapter', era: '19th-century', region: 'Europe', signature: '连载小说大师——巧合=维多利亚时代的命运——城市=全景——人物的名字=性格(Scrooge/Gradgrind)——"这是最好的时代也是最坏的时代"', bestFor: 'urban-panorama,social-critique,serial-narrative,memorable-character' },
  { name: '乔治·奥威尔 (George Orwell)', tags: 'political-allegory,clear-prose,totalitarianism-critique,language-control,dystopian-warning,journalistic-eye', era: '20th-century-modernist', region: 'Europe', signature: '"1984/动物农场"——政治=寓言——"老大哥在看着你"——新话=思想控制——"好的散文像一块窗玻璃"', bestFor: 'political-allegory,dystopian,clear-prose,language-and-power' },
  { name: '弗吉尼亚·伍尔夫 (Virginia Woolf)', tags: 'stream-of-consciousness,interior-monologue,gender-fluid,narrative-as-wave,lighthouse-structure,androgynous-mind', era: '20th-century-modernist', region: 'Europe', signature: '"到灯塔去/达洛维夫人"——意识流=波浪——灯塔=结构=到达的意义——"一个女人要有钱和一间自己的房间"', bestFor: 'interior-monologue,lyrical-narrative,female-consciousness,experimental-structure' },
  { name: '纳博科夫 (Vladimir Nabokov)', tags: 'unreliable-narrator-king,lolita,language-as-game,literary-lepidoptery,multilingual-pun,reader-as-detective', era: '20th-century-modernist', region: 'USA', signature: '"洛丽塔"——不可靠叙述的巅峰——英语=俄语流亡者的游乐场——蝴蝶=隐藏签名——"文学不是关于什么的，是怎么样写的"', bestFor: 'unreliable-narrator,stylistic-brilliance,taboo-subject,language-as-art' },
  { name: '科马克·麦卡锡 (Cormac McCarthy)', tags: 'biblical-prose,no-quotation-marks,american-wasteland,existential-western,violence-as-theology,blood-meridian', era: 'contemporary', region: 'USA', signature: '"路/血色子午线"——无引号对话=圣经体——美国荒野=道德真空——暴力=神学——"世界继续，它不在乎"', bestFor: 'post-apocalyptic,existential-western,biblical-prose,violence-narrative' },
  { name: '托妮·莫里森 (Toni Morrison)', tags: 'african-american-voice,ghosts-as-history,beloved-memory,lyrical-brutality,oral-tradition-novel,racial-trauma', era: 'contemporary', region: 'USA', signature: '"宠儿"——鬼魂=奴隶制的记忆——"不是讲故事，是驱魔"——非洲口头传统×现代小说=美国黑人史诗', bestFor: 'historical-trauma,ghost-narrative,african-american-experience,lyrical-realism' },
  { name: '玛格丽特·阿特伍德 (Margaret Atwood)', tags: 'speculative-dystopia,feminist-narrative,handmaid-tale,unreliable-history,body-politics,double-voice', era: 'contemporary', region: 'USA', signature: '"使女的故事"——女性身体=国家财产——推测性小说(不是科幻，是"可能发生的")——双层叙事(录音+历史会议)', bestFor: 'feminist-dystopia,body-politics,speculative-fiction,unreliable-history' },
  { name: 'Save the Cat!', tags: 'beat-sheet,three-act,template-driven,genre-dna,commercial-screenwriting,logline-first', era: 'contemporary', region: 'USA', signature: '15拍精确节拍表,每拍由百分比确定位置——好莱坞商业剧本标准工具', bestFor: 'commercial-screenplay,hollywood-pitch,high-concept' },
  { name: '英雄之旅', tags: 'monomyth,seventeen-stages,departure-initiation-return,mythic-archetype,universal-narrative,threshold-crossing', era: 'universal', region: 'Global', signature: '17步跨文化英雄原型——启程→启蒙→归来——Tolkien的偏离：逆任务+永不回家', bestFor: 'epic-fantasy,mythic-storytelling,hero-arc,adventure-narrative' },
  { name: '關子书', tags: 'crisis-based,cold-crisis,hot-crisis,external-story,shared-narration,chinese-dramaturgy,serial-suspense', era: 'classical-chinese', region: 'China', signature: '以"危機"为核心的编剧体系——"书外书"+"共档"——多层悬念嵌套', bestFor: 'historical-drama,suspense-thriller,multi-perspective,chinese-opera-adaptation' },
  // ── 中国古典小说 (7) ──
  { name: '曹雪芹 (Cao Xueqin)', tags: 'domestic-epic,poetic-realism,tragic-prelude,hundred-character-web,jia-family-decline,detail-as-destiny,frame-narrative', era: 'classical-chinese', region: 'China', signature: '"红楼梦"——120回+jia族衰败——草蛇灰线伏脉千里——日常琐碎=命运预言——"满纸荒唐言，一把辛酸泪"', bestFor: 'family-decay,domestic-epic,tragic-romance,detail-driven-narrative' },
  { name: '蒲松龄 (Pu Songling)', tags: 'strange-tales,folk-horror,supernatural-realism,fox-spirit,female-ghost-romance,short-form-episodic,oral-tradition-literary', era: 'classical-chinese', region: 'China', signature: '"聊斋志异"——491篇短篇——狐仙/女鬼/书生——超自然=社会批判——最短的故事最大的余味', bestFor: 'supernatural-romance,folk-horror,short-form-anthology,ghost-story' },
  { name: '吴敬梓 (Wu Jingzi)', tags: 'satirical-novel,scholar-bureaucracy,episodic-picaresque,moral-decay-through-laughter,exam-system-critique', era: 'classical-chinese', region: 'China', signature: '"儒林外史"——科举制度=人性扭曲机——讽刺=百科全书式——"范进中举"=疯狂=社会病', bestFor: 'social-satire,institutional-critique,picaresque,historical-comedy' },
  { name: '兰陵笑笑生', tags: 'domestic-novel,erotic-realism,merchant-class,enclosed-world,everyday-brutality,detail-as-moral,four-character-idiom-title', era: 'classical-chinese', region: 'China', signature: '"金瓶梅"——封闭家庭=人性的全部——西门庆=欲望的解剖——日常=残忍——中国第一部文人独立创作的长篇小说', bestFor: 'domestic-drama,erotic-narrative,moral-decay,enclosed-world' },
  { name: '罗贯中 (Luo Guanzhong)', tags: 'historical-epic,three-kingdoms,military-strategy,multi-faction-war,heroic-archetype,brotherhood-oath,fate-and-fortune', era: 'classical-chinese', region: 'China', signature: '"三国演义"——100年历史压缩为120回——"天下大势分久必合合久必分"——兄弟结义=叙事引擎', bestFor: 'historical-epic,military-strategy,ensemble-hero,faction-war' },
  { name: '吴承恩 (Wu Chengen)', tags: 'quest-narrative,mythological-comedy,animal-companions,chapter-title-poetry,buddhist-allegory,transformation-motif', era: 'classical-chinese', region: 'China', signature: '"西游记"——81难=81个独立故事——猴子/猪/河妖=人性的三面——"路在脚下"', bestFor: 'quest-adventure,mythological-comedy,companion-narrative,allegorical-journey' },
  { name: '施耐庵 (Shi Naian)', tags: 'outlaw-epic,brotherhood-108,episodic-hero-intro,folk-hero,corrupt-system,fate-gathering', era: 'classical-chinese', region: 'China', signature: '"水浒传"——108将=108种英雄引入方式——"逼上梁山"——体制腐败=英雄的母体', bestFor: 'ensemble-epic,outlaw-narrative,hero-introduction,corruption-drama' },
  { name: '五幕剧结构', tags: 'five-act,exposition-complication-climax-resolution,classical-drama,freytag-pyramid,tragic-catharsis', era: 'classical', region: 'Europe', signature: 'Exposition→Complication→Climax→Falling→Denouement——Act III=不可逆转折', bestFor: 'tragedy,historical-epic,stage-adaptation,classical-structure' },
  // ── 编剧理论 (6) ──
  { name: '罗伯特·麦基 (Robert McKee)', tags: 'story-substance,archplot-miniplot-antiplot,gap-of-expectation,scene-design,controlling-idea,negative-of-negative', era: 'contemporary', region: 'USA', signature: '"故事"圣经——故事三角(大情节/小情节/反情节)——鸿沟=期望-结果的裂隙=每一个场景的动力——"故事是生活的比喻"', bestFor: 'screenwriting,scene-craft,commercial-cinema,story-structure' },
  { name: '约翰·特鲁比 (John Truby)', tags: 'anatomy-of-story,22-building-blocks,moral-argument,story-world,character-web,opponent-desire,organic-structure', era: 'contemporary', region: 'USA', signature: '"故事解剖"——22步构建——主角的弱点/欲望/对手=三角核心——故事世界=价值观的物理表达——"好故事从不是公式化的"', bestFor: 'complex-character,organic-structure,world-building,moral-narrative' },
  { name: '李渔 (Li Yu)', tags: '闲情偶寄,structure-first,one-person-one-event,head-and-stomach,contemporary-language,audience-aware', era: 'classical-chinese', region: 'China', signature: '"闲情偶寄"——"立主脑"(一个核心人物+一个核心事件)——"密针线"(前后照应)——结构>词藻——"脱窠臼"(拒绝套路)', bestFor: 'chinese-classical-drama,structure-first,audience-centered,anti-cliché' },
  { name: '金圣叹 (Jin Shengtan)', tags: 'six-genius-books,reader-response,character-motivation,twist-appreciation,narrative-gap,close-reading', era: 'classical-chinese', region: 'China', signature: '"六才子书"——中国第一个认真读小说的人——评点=作品的一部分——"草蛇灰线法"(伏笔)——"狮子滚球法"(聚焦)', bestFor: 'close-reading,character-motivation,plot-twist,meta-narrative' },
  { name: '克里斯托弗·沃格勒 (Christopher Vogler)', tags: 'writers-journey,twelve-stage-hero,campbell-adapted,character-archetypes,mythic-structure,hollywood-monomyth', era: 'contemporary', region: 'USA', signature: '"作家之旅"——坎贝尔英雄之旅的好莱坞实用版——12阶段+8种原型——英雄/导师/边界守卫/变形者/阴影/骗徒/传令官/盟友', bestFor: 'hero-journey,mythic-structure,character-archetype,hollywood-template' },
  { name: '悉德·菲尔德 (Syd Field)', tags: 'three-act-paradigm,plot-point,midpoint,pinching,paradigm-worksheet,commercial-structure', era: 'contemporary', region: 'USA', signature: '三幕剧范式——情节点I(25%)+情节点II(75%)——中点是不可逆的转折——"电影剧本写作基础"是好莱坞的入门圣经', bestFor: 'commercial-screenplay,three-act-structure,plot-point-design,beginner-writer' },
  // ── 导演叙事大师 (3) ──
  { name: '黑泽明 (Akira Kurosawa)', tags: 'weather-as-drama,group-decision-narrative,rashomon-effect,multiple-perspective,movement-in-rain,samurai-archetype', era: '20th-century', region: 'Japan', signature: '"罗生门"——同一事件四个版本=真相不存在——雨/风/太阳=戏剧性本身——"七武士"=群像决策模型', bestFor: 'multi-perspective,group-dynamics,weather-narrative,samurai-epic' },
  { name: '英格玛·伯格曼 (Ingmar Bergman)', tags: 'close-up-as-soul,faith-and-silence,winter-light,marriage-as-battleground,dream-sequence,existential-theater', era: '20th-century', region: 'Europe', signature: '"第七封印/野草莓"——特写=灵魂的地图——信仰=沉默=上帝的缺席——婚姻=两个人的心理战', bestFor: 'existential-drama,faith-crisis,intimate-closeup,psychological-war' },
  { name: '费里尼 (Federico Fellini)', tags: 'circus-of-life,dream-reality-blend,catholic-guilt,italian-excess,procession-narrative,autobiographical-fantasy', era: '20th-century', region: 'Europe', signature: '"八部半/甜蜜的生活"——马戏团=人生——梦境/记忆/现实=一条河——意大利=过剩的美和过剩的罪恶', bestFor: 'surreal-autobiography,dream-narrative,italian-epic,circus-aesthetic' },
];

// ─── Search Engine (pure code, ~0ms) ───
export function searchWritersKB(query: string): string {
  const kws = query.toLowerCase().split(/[\s,，、]+/).filter(k => k.length > 1);
  if (!kws.length) return '';

  const scored: { card: WriterCard; score: number }[] = [];

  for (const card of ALL_WRITER_CARDS) {
    const haystack = (card.name + ' ' + card.tags + ' ' + card.signature + ' ' + card.bestFor + ' ' + card.region + ' ' + card.era).toLowerCase();
    let score = 0;
    for (const kw of kws) {
      if (haystack.includes(kw)) score += kw.length;
      // Partial match bonus
      for (let i = 0; i <= kw.length - 2; i++) {
        if (haystack.includes(kw.substring(i, i + 2))) score += 0.5;
      }
    }
    if (score > 0) scored.push({ card, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const unique = scored.filter(s => {
    if (seen.has(s.card.name)) return false;
    seen.add(s.card.name);
    return true;
  });

  // Format results as compact style cards
  const blocks = unique.slice(0, 6).map(s => {
    const c = s.card;
    return `### ${c.name} (${c.era} / ${c.region})\ntags: ${c.tags}\n**技法**: ${c.signature}\n**最适合**: ${c.bestFor}`;
  });

  return blocks.join('\n\n---\n\n');
}

// ─── KB Catalog (for GPT-5.4 to know what's searchable) ───
export const WRITERS_KB_CATALOG = `### 📝 编剧知识库 (Writers & Narrative Theory KB)

**中国文学 (24)**
四大名著(水浒/三国/西游/红楼) · 鲁迅(冷峻讽刺·双重叙) · 老舍(京味幽默·市民长卷) · 张爱玲(苍凉美学·空间叙事) · 金庸(历史熔合·成长叙事·武侠文艺化) · 古龙(电报体·侦探融合·浪子美学) · 莫言(幻觉现实主义·六道轮回结构·多物种视角) · 刘慈欣(宇宙社会学·黑暗森林·物理学=叙事引擎) · 余华(零度写作·活着·重复=时间) · 王安忆(长恨歌·上海城市史诗) · 苏童(南方颓废美·妻妾成群·红色意象) · 贾平凹(陕西农村·秦腔·方言叙事) · 陈忠实(白鹿原·宗族史诗·半世纪) · 王小波(荒谬幽默·逻辑悖论·知识分子) · 钱钟书(围城·学者讽刺·博喻智慧) · 沈从文(边城·湘西牧歌·河流=命运) · 巴金(家春秋·激流三部曲·封建批判) · 曹雪芹(红楼梦·草蛇灰线·家族衰败) · 蒲松龄(聊斋·狐仙鬼怪·短篇奇谭) · 吴敬梓(儒林外史·科举讽刺·范进中举) · 兰陵笑笑生(金瓶梅·封闭家庭·日常残忍) · 罗贯中(三国演义·分久必合·兄弟结义) · 吴承恩(西游记·81难·神魔喜剧) · 施耐庵(水浒传·108将·逼上梁山)

**日本文学 (7)**
村上春树(平行世界·梦逻辑·爵士结构·共时性) · 川端康成(物哀·俳句式散文·余白美学) · 三岛由纪夫(金阁寺·美=毁灭·身体美学) · 夏目漱石(心·明治日本·孤独=现代性代价) · 芥川龙之介(罗生门·短篇完美·真相不可知) · 太宰治(人间失格·羞耻=日本底色) · 谷崎润一郎(阴翳礼赞·阴影美学·欲望=美)

**韩国文学 (3)**
韩江(素食者·身体变形·女性沉默反抗) · 金英夏(杀人者的记忆法·首尔数字荒原) · 申京淑(请照顾我妈妈·母亲失踪·家庭秘密)

**英美/欧洲文学 (27)**
莎士比亚(五幕剧·独白/旁白·戏剧性反讽) · 托尔金(神话创造·中世纪交织叙事·伪翻译·善灾) · J.K.罗琳(交叉对称结构·谜案编织·渐进式散文) · 阿加莎·克里斯蒂(封闭圈·动画代数·红鲱鱼三层嵌套·不可靠叙述者) · 雷蒙德·钱德勒(硬汉诗意·矛盾比喻·穷街陋巷伦理) · 乔治·马丁(31POV·诱饵主角·园丁式写作·道德灰暗) · 海明威(冰山理论·电报体·排比并列) · 福克纳(多声部叙事·南方哥特·退化式意识流) · 斯蒂芬·金(角色驱动恐怖·小城镇世界构建·内置怀疑者) · 阿西莫夫(心理史学·百科全书框架·循环历史) · 菲利普·迪克(本体论不确定性·熵退行·多前提写作·偏执美学) · 简·奥斯汀(自由间接引语·客厅=婚姻市场·反讽智慧) · 狄更斯(连载大师·城市全景·人物名=性格) · 乔治·奥威尔(1984·政治寓言·新话=思想控制) · 弗吉尼亚·伍尔夫(到灯塔去·意识流=波浪·女性房间) · 纳博科夫(洛丽塔·不可靠叙述巅峰·语言=游戏) · 科马克·麦卡锡(路·无引号圣经体·暴力=神学) · 托妮·莫里森(宠儿·鬼魂=奴隶制记忆·驱魔叙事) · 玛格丽特·阿特伍德(使女的故事·推测性小说·身体政治)

**俄国/欧洲古典 (13)**
陀思妥耶夫斯基(复调小说·猫鼠对话·身体罪恶显形) · 托尔斯泰(灵魂辩证法·开放形式·反文学自然主义) · 卡夫卡(Kafkaesque·梦逻辑·官僚噩梦空间武器化) · 契诃夫(枪挂墙必响·潜台词=真对话·日常悲剧) · 果戈理(外套·荒诞=俄罗斯日常·官僚=鬼魂) · 布尔加科夫(大师与玛格丽特·魔鬼=拯救者·手稿不烧) · 普鲁斯特(追忆似水年华·玛德莱娜=不由自主记忆) · 乔伊斯(尤利西斯·一天=奥德赛·18章18种文体) · 托马斯·曼(魔山·疗养院=欧洲文明·时间是圆的) · 黑塞(悉达多·自我=河流·东方解药) · 米兰·昆德拉(生命之轻·轻/重两极·kitsch批判) · 卡尔维诺(看不见的城市·Oulipo·元小说) · 艾柯(玫瑰的名字·中世纪符号学·图书馆=迷宫)

**拉丁美洲 (4)**
加西亚·马尔克斯(魔幻现实主义·循环时间·冷淡叙事语气) · 博尔赫斯(小径分岔·迷宫=时间·图书馆=宇宙) · 巴尔加斯·略萨(总体小说·多时间线互文·独裁宿命) · 波拉尼奥(2666·未完成=形式·暴力=地景)

**非洲文学 (3)**
钦努阿·阿契贝(瓦解·伊博文明·殖民碰撞) · 沃莱·索因卡(诺贝尔奖·约鲁巴神话·仪式=政治) · 恩古吉·瓦·提安哥(基库尤语写作·语言=子弹·反殖民)

**中东文学 (2)**
纳吉布·马哈福兹(开罗三部曲·巷子=宇宙·四代人) · 奥尔罕·帕慕克(我的名字叫红·伊斯坦布尔呼愁·细密画)

**编剧方法论 (9)**
Save the Cat!(15拍节拍表·10种genreDNA) · 英雄之旅(17步单神话·三幕映射) · 關子书(冷關子/热關子·书外书·共档多人叙述) · 五幕剧结构(Exposition→Climax→Denouement) · 罗伯特·麦基(故事圣经·故事三角·鸿沟期望差) · 约翰·特鲁比(故事解剖·22步构建·角色欲望三角) · 李渔(闲情偶寄·立主脑·脱窠臼) · 金圣叹(六才子书·草蛇灰线法·狮子滚球法) · 克里斯托弗·沃格勒(作家之旅·12阶段+8原型) · 悉德·菲尔德(三幕剧范式·情节点25%/75%)

**导演叙事大师 (3)**
黑泽明(罗生门·多视角·天气=戏剧) · 英格玛·伯格曼(第七封印·特写=灵魂地图·信仰沉默) · 费里尼(八部半·马戏团=人生·梦境现实融合)`;

// ─── Retrieval Prompt for Script Writing ───
export const KB_RETRIEVAL_PROMPT_SCRIPT = `你是一位顶级故事策划师和叙事顾问。在分析剧本设计叙事结构之前，上面是一个编剧/作家知识库的目录。
请先思考：这个剧本的叙事类型、结构需求、文化背景、人物关系复杂度是什么样的？然后选择你需要检索的 5-8 个方向。

你需要重点考虑的维度：
- 叙事结构（三幕？五幕？英雄之旅？關子书？章回体？环状对称？）→ 匹配对应结构理论
- 故事类型（史诗/悬疑/爱情/战争/成长/恐怖/黑色？）→ 匹配擅长此类型的作家
- 文化地域（中国古典/中国现代/日本/欧美/拉美/韩国/非洲/中东？）→ 匹配对应地域文学传统
- 人物关系复杂度（单一主角？群像？多视角？）→ 匹配POV策略
- 语言风格（极简？诗化？京味？电报体？感官爆炸？）→ 匹配语言技法
- 叙事视角（全知？第一人称？多声部？不可靠叙述者？）→ 匹配叙事视角技法

输出格式（每行一个）：
关键词：简短说明用途

例如对于一部当代都市悬疑爱情剧：
POV结构多重视角悬疑
钱德勒式硬汉第一人称对话
张爱玲式心理现实空间叙事
阿加莎·克里斯蒂式封闭圈悬疑设计
海明威简洁对话省略叙事
五幕剧高潮不可逆转折结构
村上春树式日常中的超现实裂缝
關子书冷關子热關子悬念层次

请先给出你对剧本叙事需求的简要判断（1-2句话），然后列出你需要检索的关键词。`;

// ─── Full KB text for direct injection (legacy fallback) ───
export const WRITERS_KB_FULL = ALL_WRITER_CARDS.map(c => {
  return `### ${c.name} (${c.era} / ${c.region})\ntags: ${c.tags}\n${c.signature}\n最适合: ${c.bestFor}`;
}).join('\n\n---\n\n');
