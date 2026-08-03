/* === Photorealism Enhancement Layer ===
 * Purpose: Eliminate the AI/smudged/fake look in generated images.
 * Problem: Current genPrompts are raw field lists with no photorealism engineering.
 * Solution: Inject this KB into image generation prompts to achieve:
 *   - Photorealistic skin texture (subsurface scattering, pores, micro-detail)
 *   - Cinematic lighting (Rembrandt, butterfly, motivated sources)
 *   - Real camera lens simulation (anamorphic, vintage glass, focal characteristics)
 *   - Material authenticity (fabric weave, metal patina, leather grain)
 *   - Atmospheric depth (volumetric light, aerial perspective, dust motes)
 *
 * Architecture: Layered prompt enhancement system.
 *   Layer 1: Negative prompt (blocks AI artifacts)
 *   Layer 2: Photorealism anchor (camera/lens/film stock reference)
 *   Layer 3: Cinematic lighting (motivated light sources, ratios, color temp)
 *   Layer 4: Material rendering (fabric/skin/metal/wood surface quality)
 *   Layer 5: Atmosphere & depth (volumetrics, DOF, environmental effects)
 */

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 1: NEGATIVE PROMPT — 消除AI感
// ═══════════════════════════════════════════════════════════════════════════

export const PHOTOREALISM_NEGATIVE = `## 🔴 真实感负面提示词（硬注入，消除AI/CG/橡胶感）

### AI生成常见缺陷（必须在负面词中明确排除）
- 塑料皮肤质感 (plastic skin texture, wax-like skin, mannequin skin, doll-like face)
- 过度平滑 (overly smooth, airbrushed to death, no skin pores, no texture, plastic wrap skin)
- AI模糊/涂抹感 (AI smudging, digital painting artifacts, watercolor blur, loss of detail)
- 不自然的光泽 (unnatural gloss, wet-look skin without reason, silicone sheen)
- 解剖错误 (extra fingers, fused fingers, broken anatomy, asymmetric eyes, wrong proportions)
- 景深伪影 (artificial bokeh artifacts, wrong depth of field, cutout look, bad compositing)
- CG/3D渲染感 (CGI look, 3D render feel, video game graphics, uncanny valley)
- 过度饱和/不自然色彩 (oversaturated colors, HDR tonemapping artifacts, unnatural color grading)
- 重复纹理 (repeating textures, tiling patterns, AI pattern repetition)
- 低质量JPEG压缩感 (JPEG artifacts, compression noise, banding, low bit-depth gradients)
- 文字扭曲 (garbled text, fake letters, AI hallucinated typography)

### 必须使用的英文负面提示词
ugly, deformed, blurry, low quality, jpeg artifacts, watermark, signature, text, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck, plastic skin, wax skin, 3D render, CGI, cartoon, anime, illustration, painting, drawing, sketch, oversaturated, watermarked, logo, brand name, doll, mannequin, airbrushed, photoshopped, over-processed, HDR, unnatural lighting, flat lighting, rim lighting only`;

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 2: PHOTOREALISM ANCHOR — 摄影/电影参考
// ═══════════════════════════════════════════════════════════════════════════

export const PHOTOREALISM_ANCHOR = `## 🎥 真实感锚点（Photorealism Anchor — 以真实摄影/电影为参考基准）

### 摄影真实性核心原则
本作品以**电影剧照/时尚摄影**为唯一视觉标准。画面质量对标：
- 电影级：ARRIFLEX  Alexa 65 / Sony VENICE 2 / RED V-RAPTOR 拍摄质感
- 摄影级：Hasselblad X2D / Phase One IQ4 + 顶级镜头的光学解析力
- 灯光：ARRI SkyPanel / Aputure / Dedolight 影视灯光体系
- 色彩：DaVinci Resolve 调色工作流、ACES色彩管线

### 禁止的视觉风格
这不是插画、不是概念艺术、不是数字绘画、不是3D渲染、不是动漫。
这不是 Midjourney "cinematic lighting" 预设。这是真实摄影棚/实景拍摄的质感。
皮肤必须有毛孔、细纹、自然光泽（不是完美塑料）。
面料必须有织纹、褶皱、垂坠重力感。
金属必须有划痕、氧化、真实反射（不是环境贴图反射）。
玻璃必须有折射、厚度、边缘色散。
食物必须有油脂光泽、蒸汽、不完美的自然形态。

### 真实感核心指标
- 皮肤：可见毛孔 (visible skin pores)、微血管透色 (subtle vasculature)、自然光泽 (natural sebum sheen, not plastic)
- 眼睛：角膜反射 (corneal light reflex)、虹膜纹理 (iris texture detail)、泪膜湿润光泽 (tear film wetness)
- 头发：单根发丝 (individual strands)、飞丝 (flyaway hairs)、自然光泽变化 (anisotropic hair specular)
- 面料：织纹可见 (visible weave/texture)、纤维方向 (fabric nap direction)、自然褶皱与重力垂坠 (natural drape & crease from gravity)
- 环境：灰尘粒子 (dust motes in light beam)、大气透视 (atmospheric haze at distance)、表面微尘 (surface micro-dust)
- 光影：软阴影有半影过渡 (soft shadows with penumbra falloff)、非纯黑阴影有环境光反弹 (ambient bounce in shadows)、高光形状反映光源形状 (specular shape reveals light source shape)`;

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 3: CINEMATIC LIGHTING — 电影灯光体系
// ═══════════════════════════════════════════════════════════════════════════

export const CINEMATIC_LIGHTING = `## 💡 电影灯光速查 (Cinematic Lighting Reference)

### 基础灯光模式（选择最适合场景情绪的1种作为主光逻辑）
| 模式 | 光源位置 | 效果 | 适用场景 |
|------|---------|------|---------|
| Rembrandt Lighting | 45°侧上方+下方三角形光斑于暗侧颧骨 | 立体感强、古典油画人像质感 | 肖像、权威人物、戏剧性 |
| Butterfly/Paramount | 正面上方、鼻下蝴蝶形阴影、双颧骨高光 | 迷人、时尚、对称美感 | 女性特写、时尚、美妆 |
| Loop Lighting | 30-45°侧上方、鼻影在嘴角形成小圈 | 自然、讨喜、不极端 | 通用人像、对话场景 |
| Split Lighting | 正侧90°、半脸全亮半脸全暗 | 神秘、双重人格、冲突 | 反派、悬念、内心挣扎 |
| Rim/Edge Lighting | 背后或侧后、勾勒轮廓光 | 分离主体与背景、戏剧性 | 剪影、动作、TVC产品 |
| Broad Lighting | 脸宽敞面朝向相机 | 脸显宽、开放感 | 需要增加存在感/体重感 |
| Short Lighting | 脸窄面朝向相机 | 脸显瘦、神秘感 | 需要瘦脸效果、低调人物 |
| Under Lighting | 下方光源、面部阴影倒置 | 诡异、恐怖、超自然 | 恐怖片、悬疑、反派reveal |
| Ambient/Soft | 大面积柔光、无明确方向影 | 自然、真实、纪录片感 | 日常生活、写实、自然光 |

### 灯光质量 (Light Quality)
- **硬光 (Hard Light)**: 单点光源、清晰阴影边缘、高对比 — 戏剧性、动作、黑色电影
- **柔光 (Soft Light)**: 大面积光源、渐变半影过渡、低对比 — 自然、迷人、时尚、纪录片
- **混合**: 硬主光+柔补光 = 有质感但不刺目（最常用电影布光）

### 灯光色彩温度 (Color Temperature)
- 3200K 钨丝暖光 (warm tungsten — 室内、黄昏、温馨)
- 4300K 荧光白 (cool fluorescent — 办公室、医院、实验室)
- 5600K 日光 (daylight balanced — 窗户光、HMI灯、正午)
- 6000-7000K 阴天/蓝调 (overcast/cool — 清晨、阴天、蓝色时刻)
- 2500-2900K 烛光/火光 (candle/fire — 古代场景、浪漫、温暖)
- 双色温混合 (mixed CT — 窗光5600K+室内灯3200K = 真实感、视觉丰富)

### 光比参考
- 1:2 (1 stop difference) — 极柔、高调 (high-key)、广告/喜剧
- 1:3 (1.5 stops) — 自然柔和、时尚/美妆
- 1:4 (2 stops) — 经典电影光比、有形体但不暗
- 1:8 (3 stops) — 戏剧性、黑色电影、低调用光 (low-key)
- 1:16+ (4+ stops) — 极度戏剧、恐怖、悬疑

### 实用布光公式
**"三分法则"电影布光**:
- Key Light (主光): 60-80% 画面亮度来源。确定光影方向和角色。
- Fill Light (补光): 控制阴影深度。反射/柔光屏，比主光低1-3档。
- Rim/Back Light (轮廓光): 主体与背景分离。通常比主光亮0.5-1档。
- Background Light (背景光): 控制深度感。比主体低1-2档。
- Practical Lights (场景光源): 画面可见的灯 — 台灯、窗、烛、霓虹 — 作为布光的动机源

### 自然光参考
- Golden Hour (金色时刻): 日出后/日落前1小时 — 暖金、长影、低角度、大气散射
- Blue Hour (蓝色时刻): 日出前/日落后20-40分钟 — 冷蓝、柔和均匀、城市灯初亮
- Overcast (阴天): 巨大柔光箱天空 — 无影、色彩饱和、细节清晰
- Window Light (窗光): 北向窗=恒定柔光、南向窗=强光+时间变化
- Dappled Light (斑驳光): 树叶间隙投射 — 动态光影、浪漫、夏日感`;

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 4: CAMERA & LENS — 真实摄影机/镜头模拟
// ═══════════════════════════════════════════════════════════════════════════

export const CAMERA_LENS_SIM = `## 📷 摄影机/镜头真实性 (Camera & Lens Authenticity)

### 镜头焦段的情感含义
| 焦段 | 视角 | 景深 | 情感效果 | 典型用途 |
|------|------|------|---------|---------|
| 14-24mm (超广角) | 极宽、透视夸张 | 极深 | 压迫感、巨大感、不安、能量 | 建筑、狭窄空间、动作、主观眩晕 |
| 24-35mm (广角) | 宽广、近物大远物小 | 深 | 环境感、纪实性、观众在场感 | 全景、群体、纪录片、街头摄影 |
| 35-50mm (标准) | ≈人眼视角 | 中等 | 自然、客观、亲密但不夸张 | 中景、对话、大部分叙事情节 |
| 50-85mm (中长焦) | 窄、空间压缩 | 浅 | 肖像、亲近、选择性关注 | 特写、单人镜头、情感时刻 |
| 85-135mm (长焦) | 望远镜、空间极度压缩 | 极浅 | 偷窥、孤立、疏离、脆弱 | 极端特写、远处观察、运动/野生动物 |
| 135-300mm+ (超长焦) | 偷窥级 | 纸张薄 | 完全孤立、浮游感、不真实 | 监视、狙击镜、运动员特写 |

### 镜片特性（增加真实感的关键细节）
- **Anamorphic (变形宽银幕)**: 椭圆形散景 (oval bokeh)、水平镜头光晕 (horizontal lens flare)、2.39:1宽高比、独特的空间拉伸
- **Vintage Glass (老镜头)**: 柔和的对比度、暖色调偏移 (warm amber shift)、彗形像差 (coma aberration)、边角柔化、有机光晕
- **Modern/Clinical Glass (现代锐镜)**: 极高解析力、零畸变、APO复消色差 (no color fringing)、微对比 (micro-contrast) 极佳
- **Tilt-Shift (移轴)**: 选择性焦点平面、微缩模型效果、建筑透视修正
- **Macro (微距)**: 1:1放大、极浅景深、微观世界感—纹理、眼睛、水滴、肌肤细节

### 镜头光晕/像差（精心使用增加真实感，避免过度CG感）
- **Veiling Glare**: 整体画面雾化（逆光时 — 镜头内散射）
- **Ghost Flare**: 彩色多边形光斑阵列（光圈形状取决于光圈叶片数）
- **Anamorphic Streak**: 水平蓝色/琥珀色光带（变形镜头标志）
- **Chromatic Aberration**: 高反差边缘紫/绿边（老镜头特征 — 但要自然）
- **Vignetting**: 边角减光（自然镜头暗角 — 不要过于均匀）
- **Lens Breathing**: 手动对焦时的轻微焦距变化（极小 — 电影感）

### 胶片/传感器特性
- Film Grain (胶片颗粒): Subtle, organic luminance noise — NOT digital noise
- Halation (光晕): 高光边缘红色光晕 — 胶片时代强逆光特征（Kodak Vision3 250D/500T 特征）
- Gate Weave (胶片抖动): 极微弱的帧间位移 — 胶片放映特征（极其微妙）
- Dynamic Range: 保留高光细节 (highlight rolloff)、不裁切暗部
- Color Science: 对应主流品牌色彩科学 — ARRI (暖中性/优秀肤色)、Sony (冷锐)、RED (中性可塑)、Kodak (暖金/有机)
- Aspect Ratio: 2.39:1 (Cinemascope史诗)、1.85:1 (Flat宽银幕)、1.66:1 (欧洲)、1.33:1 (4:3学院比例)、16:9 (现代电视)、1:1 (中画幅)、3:2 (全画幅/Leica)`;

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 5: SURFACE QUALITY — 材质表面真实性
// ═══════════════════════════════════════════════════════════════════════════

export const SURFACE_QUALITY = `## 🔬 材质表面真实性 (Material Surface Quality Reference)

### 皮肤渲染质量 (Skin Quality — 核心生图指标)
皮肤不能是完美塑料。真实的皮肤有：
- **Pores**: 毛孔 — 鼻翼/颧骨/额头T区最明显，visible pore texture, not airbrushed
- **Micro-texture**: 微纹理 — 皮肤的细微凹凸 (skin micro-relief)，在侧光下更明显
- **Sebum**: 皮脂光泽 — 不是湿漉漉的反光，是subtle natural sheen on T-zone
- **Subsurface Scattering (SSS)**: 次表面散射 — 光穿透浅层皮肤后散射，边缘处半透明红光（耳朵/鼻翼/手指背光时最明显）
- **Freckles/Moles**: 雀斑/痣 — 不完美、不对称分布
- **Vellus Hair (Peach Fuzz)**: 汗毛/面毛 — 侧光下可见的极细面毛，特别是女性面颊/唇上
- **Fine Lines**: 细纹 — 眼角鱼尾纹、额头横纹、法令纹（按年龄合理）
- **Blemish/Variation**: 皮肤色调不均匀 — 局部泛红、暗沉、血管可见（非病态）

### 不同人种的皮肤渲染差异 (Ethnicity-Specific Skin Rendering)
> **不同人种的皮肤光学特性不同——这直接影响SSS/反射/色温表现。**
> 通用"skin texture" prompt 无法覆盖这些差异，必须按角色身份精准指定。

| 肤色类型 | 次表面散射 (SSS) | 表面反射 | 色调/底色 | 关键细节 |
|---------|-----------------|---------|----------|---------|
| 东亚/白皙 (East Asian fair) | 中等SSS散射距离，红光穿透浅层明显 | 中等镜面反射 (specular)，T区皮脂光泽 | 暖象牙/蜜色底色 (warm ivory/honey undertone)，非"white" | 蒙古褶(epicanthic fold)、直发、雀斑少、T区光泽明显 |
| 东亚/偏深 (East Asian tan) | SSS稍弱于白皙肤质 | 较低镜面反射 (melanin吸收更多光) | 暖小麦/淡金褐 (warm wheat/light golden-brown undertone) | 同上+日光晒痕(tan lines)、色调Munsell 5YR-7.5YR |
| 南亚/印度 (South Asian) | 中等偏弱SSS，melanin密度抵消红光穿透 | 低到中镜面反射 | 暖橄榄到深小麦 (warm olive to deep wheat)，底色偏黄/红 | 深色眼周、浓眉、发质粗、Fitzpatrick III-VI |
| 非洲/深色 (African deep skin) | 极弱SSS，melanin几乎完全吸收红光 | **极低镜面反射**，需要diffuse+specular分离 | 深棕到乌木 (deep brown to ebony)，底色偏红/蓝/灰 | **最重要的渲染差异**: 不是"加深的白色皮肤"——高光应更柔和、哑光面积更大、耳朵鼻翼背光无红光 |
| 中东/地中海 (Middle Eastern/Mediterranean) | 中等SSS | 中等偏低调(semi-matte) | 暖橄榄到沙色 (warm olive to sand)，底色偏金 | 浓密毛发的毛囊可见、深色体毛、浓眉 |
| 东南亚/太平洋 (SE Asian/Pacific) | 接近东亚白皙的SSS特性 | 中等 | 暖金褐 (warm golden-brown) | 皮下脂肪更薄(可见骨点)、直/波浪发各半 |
| 拉美/混血 (Latino/Mixed) | SSS范围广(取决于祖先配比) | 中到低 | 极广——浅蜜色到深橄榄 | Fitzpatrick III-V混合特征，"不是一种肤色而是光谱" |

### 年龄层次的皮肤差异 (Age-Specific Skin Quality)
> **皮肤年龄=叙事可信度的静默信号。** 错误地将20岁皮肤应用于50岁角色→AI感/不真实。

| 年龄段 | 表皮特征 | 真皮/皮下 | 光影特性 | 关键视觉线索 |
|--------|---------|----------|---------|------------|
| 儿童 (0-12) | 极细毛孔、无细纹、雀斑可选 | SSS强(真皮薄透明)、脸颊红晕 | 漫反射为主、baby fat柔和阴影 | 柔软面颊轮廓、乳牙间隙、比例: 眼睛占面部更大 |
| 青少年 (13-19) | 毛孔初现(T区)、可能痤疮/痘印 | SSS强、胶原蛋白充足、皮下脂肪饱满 | 肤质紧致、鼻翼/额头轻微皮脂光泽 | 皮肤张力最大、无皱纹、可能有青春期皮肤瑕疵 |
| 青年 (20-35) | 毛孔清晰但不粗大、皮肤质地最佳 | SSS开始减弱、胶原蛋白峰值 | 平衡——既不是儿童漫反射也不是老年高反差 | 表情纹(眼周)、额头横纹微弱、皮肤弹性良好 |
| 中年 (36-55) | 毛孔粗大(T区/面颊)、肤色不均(老年斑初现) | SSS显著减弱、胶原蛋白流失开始 | 对比度增加——阴影更深(组织下垂)、高光更锐利 | 鱼尾纹+额纹+法令纹明确、颈纹出现、眼袋/泪沟 |
| 老年 (56+) | 皮肤薄如纸(可见毛细血管)、色素沉着(老年斑) | SSS极弱——耳朵/鼻子背光几乎无红光穿透 | **最大对比度**——深皱纹+松弛+骨点突出 | 手背静脉突出、头发花白/稀疏、颈部皮肤松弛、眼窝深陷 |

> **⚠️ 关键生成原则**: 年龄提示词必须以**具体生理特征**表述，不能用"young"或"old"这种模糊词。
> ✅ 正确: "fine crow's feet at eye corners, subtle nasolabial folds, slight loss of facial volume beneath cheekbones, early forehead lines"
> ❌ 错误: "middle-aged woman" → 模型可能输出 25 岁或 65 岁

### 恐怖谷规避指南 (Uncanny Valley Avoidance)
> **当图像"几乎真实但某些东西不对"时——这就是恐怖谷。** 生成模型极易落入此陷阱。
> 恐怖谷阈值：80-95%真实度是最危险的区间。目标=要么100%照片级真实，要么有意风格化。

| 恐怖谷触发器 | 表现 | 规避方法 |
|------------|------|---------|
| 完美对称脸 | 左右镜像复制、照片翻转感 | prompt 中加 "slight natural facial asymmetry, one eyebrow slightly higher, subtle uneven smile" |
| 死眼 (Dead Eyes) | 虹膜无景深/高光单一/瞳孔等大/无血丝 | "natural catchlights in both eyes, subtle iris texture and color variation, tiny visible blood vessels at sclera edges" |
| 塑料皮肤 | 无毛孔/无纹理/均匀色调 → 硅胶感 | 已在 Layer 1 负词中排除（见上方 \`PHOTOREALISM_NEGATIVE\`）|
| 过度锐利 (Hyper-Sharp) | 所有边缘同等锐利→手机计算摄影感 | "natural depth of field falloff, softer edges on background elements, lens-appropriate sharpness rolloff at frame edges" |
| 完美牙齿 | 纯白/等大/等间距 → 假牙感 | "natural teeth with subtle ivory tone, slight irregularity, natural gum line, not bleached white" |
| 无重力头发 | 头发像头盔/无碎发/无重力拉扯 | "natural flyaway hairs, subtle frizz, hair reacting to gravity and movement, few strands out of place" |
| 尴尬手指/手 | 多余手指/融合/关节角度不可能 | 已在 Layer 1 负词中排除；正面:"natural hand pose with anatomical finger joints, relaxed not posed" |
| 表情阈值 (Expression Uncanny) | 嘴角精确对称上扬→面试假笑/AI式微笑 | "natural unposed smile reaching the eyes, subtle asymmetry in expression, genuine emotion not camera-ready" |
| 过度HDR/饱和度 | 天空过曝+阴影过亮→手机计算摄影 | "natural dynamic range, filmic highlight rolloff, shadows with true black point, not HDR phone look" |
| 皮肤纹理尺度错误 | 毛孔太大(月球表面)或太小(橡皮) | "realistic skin pore scale matching human skin at this viewing distance, micro-texture visible but not exaggerated" |

> **终极恐怖谷测试**: 遮挡嘴部只看眼睛→是否像真人？遮挡眼睛只看嘴部→是否像真人？
> 两个都像→整脸一般就通过。一个不像→存在恐怖谷。
| 材质 | 表面特征 | 光影表现 |
|------|---------|---------|
| Silk (丝绸) | 极细纤维、各向异性光泽 (anisotropic specular)、随角度变色 | 高光锐利、暗部深沉、褶皱处光泽变化丰富 |
| Cotton (棉) | 短纤维、哑光或微弱光泽、可见织纹 | 柔和漫反射、吸光、无锐利高光 |
| Linen (亚麻) | 粗长纤维、不规则纹理、天然皱褶 | 哑光但有自然纹理凹凸、透气感 |
| Wool (羊毛) | 卷曲纤维、毛绒表面、毛向 (nap direction) | 柔和散射、光线被纤维捕捉、温暖感 |
| Leather (皮革) | 毛孔纹理、自然皱纹、使用磨损痕迹 | 柔和准镜面反射、crease处光反射变化 |
| Velvet (天鹅绒) | 短密绒簇、强烈nap方向性 | 极其特殊：正看哑光、侧看反光 (Fresnel effect极致) |
| Denim (丹宁) | 斜纹织法 (twill weave)、靛蓝染色不均匀、磨损/猫须 | 粗纹理、褪色渐变、铆钉/缝线细节 |
| Lace (蕾丝) | 网眼结构、花卉纹样编织 | 透光/漏光 (sheer areas + opaque pattern)、层次重叠 |
| Metal (金属) | 反射环境 (reflect environment, not just white specular) | 真实反射、氧化/划痕、重量感 |
| Wood (木材) | 年轮纹、导管孔、清漆光泽、使用磨损 | 定向纹理、哑光到半光表面 |

### 环境材质细节
- 灰尘粒子 (dust motes floating in light beam — 体积光可见)
- 玻璃上的指纹/污渍 (fingerprints on glass — 不是完美洁净)
- 金属氧化/铜绿 (patina on copper/bronze — 时间痕迹)
- 石材表面微孔/风化 (stone micro-pores & weathering)
- 水渍/茶渍/咖啡渍 (water rings on wood, tea stains — 生活痕迹)
- 布料起球/磨损 (fabric pilling & wear — 服装已穿过、不是全新的)`;

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 6: ATMOSPHERE & DEPTH — 氛围与深度
// ═══════════════════════════════════════════════════════════════════════════

export const ATMOSPHERE_DEPTH = `## 🌫️ 氛围与深度层次 (Atmosphere & Depth Layering)

### 大气透视 (Aerial/Atmospheric Perspective)
远处物体因大气散射而：
- 对比度降低 (reduced contrast)
- 饱和度降低 (desaturated — 向大气色偏移)
- 色调偏冷蓝/灰白 (shift toward atmospheric blue/grey-white)
- 细节减少 (less visible detail)
→ 这产生画面的"纵深感"，让2D图像看起来像3D空间

### 体积光/丁达尔效应 (Volumetric Light / Tyndall Effect)
- 窗光光束中可见的灰尘粒子
- 烟雾/雾气中的光柱
- 逆光树叶间的光束 (god rays through canopy)
- 舞台聚光灯+雾机的光束
→ 体积光是让画面从"平面"升级到"电影级"最快的元素
→ 如何描述："visible light beams through atmospheric haze/dust, volumetrically illuminating the air"

### 景深 (Depth of Field)
- 浅景深 (Shallow DOF): f/1.2-f/2.8 — 单眼/物体聚焦，远处模糊
- 中等景深 (Medium DOF): f/4-f/8 — 主体清晰、背景可辨识但柔和
- 深景深 (Deep DOF): f/11+ — 全部清晰、风光/建筑/大群戏
- Tilt-Shift DOF: 倾斜焦平面 — 非水平焦面、微缩模型效果
→ 景深是叙事工具：浅景深=亲密/内心、深景深=客观/史诗

### 散景质量 (Bokeh Quality)
- 圆形散景 (circular bokeh — 现代镜头圆形光圈)
- 猫眼散景 (cat's eye bokeh — 画面边角椭圆形散景)
- 甜甜圈散景 (donut bokeh — 折返镜头/mirror lens特有)
- 肥皂泡散景 (soap bubble bokeh — Meyer Trioplan等老镜头)
→ 散景形状反映真实光学系统，而非模糊滤镜

### 运动模糊 (Motion Blur)
- 主体移动 → 方向性模糊 (directional blur, 而非整体模糊)
- 相机抖动 → 全局中等模糊
- 长曝光 → 流水柔化/光轨/人流虚影
→ 合理的运动模糊增加动态感和真实性

### 天气/环境效果
- Rain: 雨滴、湿地面反射、溅水花、人物湿发
- Fog/Mist: 空气可见密度、光散射增强、距离感压缩
- Snow: 雪花体积、积雪山脊、哈气白雾
- Dust/Sand: 空气雾化、沙粒纹理、干燥感
- Heat Haze: 远处物体扭曲 (mirage/shimmer effect)、蒸腾感
- Smoke: 层状烟雾 (layered)、逆光下密度可见、散逸形态 (turbulent dissipation)`;

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 7: COMPOSITION — 构图真实感
// ═══════════════════════════════════════════════════════════════════════════

export const COMPOSITION_GUIDE = `## 🎬 构图真实感 (Cinematic Composition)

### 基础构图法则（但在生图时以自然为首要原则 — "不完美才真实"）
- Rule of Thirds (三分法): 主体放在1/3或2/3交叉点 — 而非完美中心
- Leading Lines (引导线): 环境中的线引导视线 — 路、栏杆、河流、建筑边缘
- Framing (框中框): 窗户/门框/拱廊 框住主体 — 增加深度层次
- Symmetry (对称): 刻意对称 = 权力/秩序/压迫感 — 谨慎使用
- Negative Space (留白): 大量空画面让观众感受孤独/渺小/留白空间思考
- Dutch Angle (倾斜构图): 不安/失衡/精神不稳定 — 轻微2-5°倾斜

### 真实性优先于完美构图
真实的摄影不是每一帧都能完美对齐三分线。以下元素让画面看起来像"真实拍摄"而非"AI生成"：
- 轻微的水平线不完美 (±1-2° 倾斜)
- 前景元素遮挡部分主体 (foreground obstruction — 增加空间层次和偷窥感)
- 手持感 (slight camera shake — 极其微妙，只在动作/纪录片风格使用)
- 不完美裁剪 (slightly awkward cropping at frame edges — 人物部分被切出画面)
- 意外的环境元素进入画面 (photobomb — 路人/车辆/鸟在画面边缘)

### 景别 (Shot Size) — 按叙事功能选择，不是默认值
| 景别 | 英文 | 画框范围 | 叙事功能 |
|------|------|---------|---------|
| 大远景 | EWS | 人在画面中极小 | 环境主导、人渺小、史诗感 |
| 全景 | WS/FS | 全身+环境 | 建立空间、人物与环境关系 |
| 中全景 | MFS | 膝以上 | 肢体语言可见、多人互动 |
| 中景 | MS | 腰以上 | 对话标准、两人/三人关系 |
| 中近景 | MCU | 胸以上 | 情感开始主导、表情可见 |
| 近景/特写 | CU | 肩/颈以上 | 情感、内心、反应镜头 |
| 极大特写 | ECU | 眼/手/嘴/物体局部 | 极度关注、欲望、威胁、重要道具 |`;

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 8: MASTER PROMPT FORMULA — 合成公式
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the full photorealistic prompt prefix.
 * This is injected BEFORE the visual description in the genPrompt.
 * @param shotType - EWS/FS/MS/CU/ECU (affects DOF and lens recommendation)
 */
export function buildPhotorealismPrefix(shotType?: string): string {
  const isWide = /EWS|FS|全景|远景|WS/.test(shotType || '');
  const isCloseup = /ECU|CU|MCU|特写|近景/.test(shotType || '');

  let lensRec = '50mm lens';
  let dofRec = 'moderate depth of field';
  if (isWide) {
    lensRec = '24-35mm wide-angle lens';
    dofRec = 'deep focus, everything in sharp detail from foreground to background';
  } else if (isCloseup) {
    lensRec = '85-135mm telephoto lens';
    dofRec = 'shallow depth of field, sharp on subject, background softly blurred with natural bokeh';
  }

  return `Photorealistic, cinematic quality, shot on ARRI Alexa 65 with ${lensRec}. ${dofRec}. Image quality equivalent to a professionally lit and composed film still from a high-budget production. Not CGI, not animation, not illustration — this is a photograph.`;
}

/**
 * Build the negative prompt string for image generation models.
 */
export function buildPhotorealismNegative(): string {
  return `ugly, deformed, blurry, low quality, jpeg artifacts, watermark, signature, text, bad anatomy, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck, plastic skin, wax skin, 3D render, CGI, cartoon, anime, illustration, painting, drawing, sketch, oversaturated, airbrushed, over-processed, HDR, unnatural lighting, flat lighting, rim lighting only, plastic texture, mannequin, doll, silicone, perfect skin, no pores, smudged, watercolor effect, digital painting artifacts`;
}

/**
 * Build the full photorealism enhancement layer.
 * This should be injected into ALL image generation prompts.
 */
export function buildPhotorealismLayer(shotType?: string): string {
  return [
    buildPhotorealismPrefix(shotType),
    '',
    PHOTOREALISM_NEGATIVE,
    '',
    PHOTOREALISM_ANCHOR,
    '',
    CINEMATIC_LIGHTING,
    '',
    CAMERA_LENS_SIM,
    '',
    SURFACE_QUALITY,
    '',
    ATMOSPHERE_DEPTH,
    '',
    COMPOSITION_GUIDE,
  ].join('\n');
}

/**
 * Lightweight version — for when token budget is tight.
 * Just the critical photorealism anchors without full KB.
 */
export function buildPhotorealismLayerCompact(shotType?: string): string {
  return [
    buildPhotorealismPrefix(shotType),
    '',
    PHOTOREALISM_NEGATIVE,
    '',
    PHOTOREALISM_ANCHOR,
  ].join('\n');
}
