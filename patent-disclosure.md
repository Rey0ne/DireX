# 专利技术交底书 / Patent Technical Disclosure Document

> 符合 WIPO PCT 规则第 5.1 条、第 8 条及中国国家知识产权局《专利审查指南》对说明书撰写的要求。
> Compliant with WIPO PCT Rule 5.1, Rule 8, and CNIPA Guidelines for Patent Examination regarding specification drafting.

---

## 【摘要 / Abstract】

**中文**：

本发明涉及一种以无尽画布为智能Agent的多模态AI内容生成系统及方法，属于人工智能内容生成（AIGC）技术领域。与现有技术将画布视为被动画板的范式不同，本发明将无尽画布本身设计为一个具有感知-认知-行动能力的智能Agent——画布Agent感知有向图中各节点的类型、端口、连接拓扑和生成状态，理解创作者的创意意图，自主决策任务路由和管线选择，并自动执行跨节点的数据汇流和多Agent并行调度。画布Agent不仅编排二维内容生成（图像、视频、音频、文本分析），还内建了一个完整的三维世界维度——包括AI驱动的3D模型生成（文本/图像到三维模型）、实时WebGL 3D场景编辑器、电影级物理灯光系统、多机位虚拟摄影系统和3D↔2D双向数据贯通管线。画布Agent集成了五层结构约束提取、任务分离异步并行管线、结构化参数注入等自研认知能力。本发明的核心创新在于：将AI内容生成系统的交互界面从"工具面板"升级为"智能创作伙伴"——画布不再是创作者的被动作画空间，而是主动理解创作上下文、自主编排多模态生成流程、持续维护创作状态一致性的智能Agent，且该Agent的创作空间同时涵盖二维内容生成和三维世界构建。

**English**:

The present invention relates to a multi-modal AI content generation system and method with an infinite canvas serving as an intelligent Agent, belonging to the technical field of Artificial Intelligence Generated Content (AIGC). Unlike prior art paradigms that treat the canvas as a passive drawing surface, the present invention designs the infinite canvas itself as an intelligent Agent with perception-cognition-action capabilities — the Canvas Agent perceives the types, ports, connection topology, and generation status of each node in the directed graph, understands the creator's creative intent, autonomously decides task routing and pipeline selection, and automatically executes cross-node data confluence and multi-agent parallel scheduling. The Canvas Agent integrates cognitive capabilities including five-layer structural constraint extraction, task-separated async parallel pipeline, and structured parameter injection. The core innovation of the present invention lies in upgrading the interaction interface of AI content generation systems from a "tool panel" to an "intelligent creative partner" — the canvas is no longer a passive drawing space for the creator, but an intelligent Agent that actively understands creative context, autonomously orchestrates multi-modal generation workflows, and continuously maintains creative state consistency.

---

## 一、发明名称 / Title of Invention

**中文**：一种以无尽画布为智能Agent的多模态AI内容生成系统及方法

**English**: A Multi-Modal AI Content Generation System and Method with an Infinite Canvas Serving as an Intelligent Agent

---

## 二、技术领域 / Technical Field

**中文**：

本发明属于人工智能内容生成（AIGC）与人机交互技术领域，具体涉及一种将可视化交互界面本身设计为智能Agent的创新架构。本发明首次提出"画布即Agent"（Canvas-as-Agent）的范式，使无尽画布不再是承载工具的被动容器，而是具备感知（Perception）、认知（Cognition）和行动（Action）能力的智能创作伙伴。该画布Agent能够理解有向图节点拓扑中蕴含的创作意图，自主编排跨模态生成任务（图像、视频、音频、三维模型生成、三维场景编辑、剧本分析），并集成AI驱动3D建模、实时WebGL 3D场景构建、电影级物理灯光渲染、多机位虚拟摄影、五层结构约束提取、任务分离异步并行调度、结构化参数注入等自研认知能力。特别地，画布Agent内建了一个完整的三维世界维度——3D场景不是作为一个孤立的"查看器"存在，而是作为Agent感知-认知-行动循环的重要组成部分，与二维节点流之间实现双向数据贯通。

**English**:

The present invention belongs to the technical field of Artificial Intelligence Generated Content (AIGC) and human-computer interaction, specifically relating to an innovative architecture that designs the visual interaction interface itself as an intelligent Agent. The present invention first proposes the "Canvas-as-Agent" paradigm, making the infinite canvas no longer a passive container carrying tools, but an intelligent creative partner with Perception, Cognition, and Action capabilities. This Canvas Agent can understand the creative intent embedded in the directed graph node topology, autonomously orchestrate cross-modal generation tasks (image, video, audio, 3D model, script analysis), and integrate self-developed cognitive capabilities including five-layer structural constraint extraction, task-separated async parallel scheduling, and structured parameter injection.

---

## 三、背景技术 / Background Art

### 3.1 现有技术概述

**中文**：

近年来，基于大规模神经网络的多模态AI内容生成技术快速发展。在文本到图像（T2I）、图像到图像（I2I）、文本到视频（T2V）、文本到三维模型（T2-3D）、文本到音频（T2A）以及剧本智能分析等方向上，陆续出现了多种商业化工具和开源解决方案。

然而，在系统架构层面，所有现有方案共享一个未被质疑的前提假设：**交互界面是被动的工具容器，智能仅存在于后端的AI模型调用中**。具体而言，现有方案的架构将"前端画布"定位于一个纯粹的视图层（View Layer）——负责渲染节点、处理拖拽、显示结果——所有"智能"（理解意图、决策路由、调度任务、管理上下文）要么由人类创作者手动完成，要么分散在独立的后端服务中各自为政。

本发明挑战这一前提假设，提出"画布即Agent"的新范式。

**English**:

In recent years, multi-modal AI content generation technologies based on large-scale neural networks have developed rapidly. Various commercial tools and open-source solutions have emerged in directions such as text-to-image (T2I), image-to-image (I2I), text-to-video (T2V), text-to-3D model (T2-3D), text-to-audio (T2A), and script intelligent analysis.

However, at the system architecture level, all existing solutions share an unquestioned premise: **the interaction interface is a passive tool container, and intelligence exists only in backend AI model calls**. Specifically, the architecture of existing solutions positions the "frontend canvas" as a pure View Layer — responsible for rendering nodes, handling drag-and-drop, displaying results — while all "intelligence" (understanding intent, deciding routing, scheduling tasks, managing context) is either manually performed by the human creator or dispersed across independent backend services operating in silos.

The present invention challenges this premise and proposes the new paradigm of "Canvas-as-Agent."

---

### 3.2 现有技术范式 vs 本发明范式

**中文**：

**现有范式：画布是被动的工具容器（Canvas-as-Container）**

```
创作者（唯一智能体）
  │
  ├── 手动理解："我应该先分析剧本，再用角色描述去生成图像"
  ├── 手动编排："我需要把生成的图像下载，再上传到视频工具里"
  ├── 手动判断："这个提示词里有'提取'，我应该切换到提取模式"
  ├── 手动搬运："角色A的描述文本，复制粘贴到图像生成的提示词里"
  └── 手动维护："刷新后这些数据还在不在？哪个任务已经完成了？"
        │
        ▼
  画布（被动的渲染表面）
    - 只管渲染节点和边，不理解节点之间的关系
    - 不主动传递数据，等创作者手动操作
    - 不做意图判断，创作者说了才算
    - 不管理状态一致性，刷新可能丢数据
```

**本发明的范式：画布是智能创作Agent（Canvas-as-Agent）**

```
创作者（表达创意意图）
  │
  │  "我想要一个角色A在场景B中的视频，风格参考这张图"
  │
  ▼
画布Agent（感知-认知-行动的完整智能循环）
  │
  ├── 【感知层】读取图拓扑 →
  │     "这个节点连了剧本分析和图像生成，
  │      图像生成又连了视频生成"
  │
  ├── 【认知层】理解意图 + 决策 →
  │     "这是一个三阶段管线：分析→图像→视频。
  │      角色提取和场景提取可以并行。
  │      图像生成需要角色描述作为约束。
  │      '提取'关键词+有参考图→走视觉提取管线"
  │
  └── 【行动层】自动执行 →
        - 并行提交角色提取+场景提取
        - 角色提取完成后自动触发分镜生成
        - 分镜完成后自动将角色描述注入图像生成节点
        - 图像生成完成后自动传递给视频生成节点
        - 全程数据自动汇流，无需创作者手动操作
        - 状态实时持久化，刷新不丢失
```

**English**:

**Prior Art Paradigm: Canvas as a Passive Tool Container (Canvas-as-Container)**

```
Creator (the only intelligent agent)
  │
  ├── Manual understanding: "I should first analyze the script,
  │     then use character descriptions to generate images"
  ├── Manual orchestration: "I need to download the generated image,
  │     then upload it to the video tool"
  ├── Manual judgment: "This prompt has 'extract' — I should switch to extraction mode"
  ├── Manual transfer: "Copy-paste Character A's description text
  │     into the image generation prompt"
  └── Manual maintenance: "Will the data still be there after refresh?
        Which task has already completed?"
        │
        ▼
  Canvas (passive rendering surface)
    - Only renders nodes and edges, does not understand their relationships
    - Does not actively transfer data — waits for manual creator action
    - Makes no intent judgments — only acts when the creator says so
    - Does not manage state consistency — data may be lost on refresh
```

**The Present Invention's Paradigm: Canvas as an Intelligent Creative Agent (Canvas-as-Agent)**

```
Creator (expresses creative intent)
  │
  │  "I want a video of Character A in Scene B,
  │   with style referencing this image"
  │
  ▼
Canvas Agent (complete Perception-Cognition-Action intelligent loop)
  │
  ├── [Perception Layer] Reads graph topology →
  │     "This node is connected to script analysis and image generation,
  │      and image generation is connected to video generation"
  │
  ├── [Cognition Layer] Understands intent + makes decisions →
  │     "This is a three-stage pipeline: analysis → image → video.
  │      Character extraction and scene extraction can run in parallel.
  │      Image generation needs character descriptions as constraints.
  │      'Extract' keyword + reference image present → route to visual extraction pipeline"
  │
  └── [Action Layer] Autonomous execution →
        - Submits character extraction + scene extraction in parallel
        - Auto-triggers storyboard generation after character extraction completes
        - Auto-injects character descriptions into image generation node after storyboard completes
        - Auto-transfers generated image to video generation node
        - Full-process automatic data confluence — no manual creator operations needed
        - Real-time state persistence — no data loss on refresh
```

---

### 3.3 现有技术的具体缺陷 / Specific Deficiencies of Prior Art

**中文**：

**缺陷一：交互界面与智能能力的架构性分离**

现有方案在架构上将"智能"完全归于后端的AI模型调用，而将前端画布降格为纯粹的视图渲染层。这种分离导致一个悖论：画布上已经通过节点和边的连接拓扑明确表达了创作者的意图结构（"节点A的输出应该驱动节点B的生成"），但画布本身不理解这一结构——它只是渲染了节点和边的视觉外观，所有的数据传递、上下文组装、管线选择仍然需要人类创作者手动完成。

本质上，现有方案将"画布"视为一个**死的数据结构**（存储了节点列表和边列表），而非一个**活的智能体**（能够理解拓扑中蕴含的意图并自主行动）。

**缺陷二：视觉提取中的语义漂移（Semantic Drift）**

当创作者希望从参考图像中提取特定目标物并独立生成时，现有方案使用自然语言语义标签（如"一个花瓶"）描述目标物。自然语言中的类别词在生成模型的潜在空间中对应的是一个模糊的概率分布集合——以"花瓶"为例，该语义标签覆盖了数百种在瓶颈形状、瓶身曲线、底座比例、表面纹理、釉色质感等方面存在巨大差异的物理实体。模型按照训练数据的统计概率采样生成"某个花瓶"，而非参考图中"那个特定的花瓶"。现有技术中不存在系统性的方法来约束模型在提取任务中忠实保留参考物的身份特征。

**缺陷三：长文本分析中的输出截断、串行阻塞与断线不可恢复**

在剧本分析等长文本场景中，现有方案将多个逻辑独立的子任务合并为单次模型调用，导致：(a) 输出token超出限制，部分数据被截断；(b) 无依赖的子任务被迫串行等待；(c) 长连接同步等待模式在网络波动时极易断开且无法恢复。

**缺陷四：生成参数不可精确控制和复现**

现有方案仅接受自然语言描述（如"cinematic lighting"）来控制视觉风格。自然语言是定性的、模糊的、不可精确量化的。同一段提示词在不同时刻生成的图像视觉风格存在随机漂移，创作者无法建立可复现的风格管线。

**缺陷五：跨模态数据上下文丢失**

在独立工具链中，前序步骤的创作决策上下文在下游工具中不可见。下游工具只能看到上游产出的最终文件，而非产出该文件的完整创作上下文（角色设定、风格选择、参数决策）。

**缺陷六：3D内容创作与AI生成流程的断裂**

现有技术中，AI驱动的3D模型生成工具（文本到3D、图像到3D）和3D场景编辑工具（如WebGL编辑器、游戏引擎）是两个完全独立的系统。这种断裂导致以下问题：

(1) **生成-编辑断层**：创作者使用AI生成一个3D模型后，需要下载模型文件→在本地存储→打开独立的3D编辑器→手动导入模型→手动调整材质和位置→手动设置灯光→手动设置摄像机角度。这个六步机械操作循环将AI生成的"智能"成果与后续的3D编辑流程完全割裂。

(2) **3D场景无法参与Agent编排**：现有的3D编辑器（无论是Web端还是桌面端）均以"独立应用"模式运行——它们是一个自包含的沙盒，无法作为有向图中的一个节点接收上游AI生成结果或向下游节点输出渲染产物。这意味着3D场景构建工作无法融入Agent的自动化编排管线。

(3) **灯光和摄影参数缺乏AI辅助**：现有3D编辑器的灯光配置和摄像机设置完全依赖创作者手动调整——选择灯光类型、设置强度/颜色/位置、调整曝光和白平衡、配置景深参数等。这些物理参数与AI图像生成管线中的"视觉风格参数"存在天然的对应关系（例如，3D场景的电影级灯光预设完全可以作为结构化参数注入AI图像生成提示词），但现有方案未建立这种跨维度的参数映射。

(4) **3D场景无法作为AI生成的参考源**：在现有方案中，如果创作者在3D编辑器中搭建了一个精心布光的场景，该场景的三维信息（摄像机视角、灯光方向与色温、物体空间关系、材质属性）无法被AI图像或视频生成管线利用。创作者只能用截图的方式将3D场景"降维"为2D参考图，丢失了深度、法线、材质、灯光方向等三维信息。

**English**:

**Deficiency 1: Architectural Separation of Interaction Interface and Intelligence Capabilities**

Existing solutions architecturally attribute all "intelligence" to backend AI model calls while degrading the frontend canvas to a pure view rendering layer. This separation creates a paradox: the canvas already explicitly expresses the creator's intent structure through the connection topology of nodes and edges ("Node A's output should drive Node B's generation"), yet the canvas itself does not understand this structure — it merely renders the visual appearance of nodes and edges, while all data transfer, context assembly, and pipeline selection still require manual human operation.

In essence, existing solutions treat the "canvas" as a **dead data structure** (storing node lists and edge lists), rather than a **living intelligent agent** (capable of understanding the intent embedded in the topology and acting autonomously).

**Deficiency 2: Semantic Drift in Visual Extraction**

When a creator wishes to extract a specific target object from a reference image and generate it independently, existing solutions use natural language semantic labels (e.g., "a vase") to describe the target. Category words in natural language correspond to a fuzzy probability distribution set in the generation model's latent space — taking "vase" as an example, this semantic label covers hundreds of physical entities that differ enormously in neck shape, body curve, base proportion, surface texture, and glaze quality. The model samples "some vase" according to the statistical probability of training data, rather than "that specific vase" in the reference image. No systematic method exists in prior art to constrain the model to faithfully preserve the identity features of the reference object in extraction tasks.

**Deficiency 3: Output Truncation, Serial Blocking, and Unrecoverable Disconnection in Long-Text Analysis**

In long-text scenarios such as script analysis, existing solutions merge multiple logically independent sub-tasks into a single model call, resulting in: (a) output tokens exceeding limits with partial data truncated; (b) independent sub-tasks forced into serial waiting; (c) long-connection synchronous waiting patterns that easily disconnect under network fluctuations with no recovery capability.

**Deficiency 4: Imprecise and Irreproducible Generation Parameter Control**

Existing solutions only accept natural language descriptions (e.g., "cinematic lighting") to control visual style. Natural language is qualitative, vague, and cannot be precisely quantified. The same prompt generates images with random stylistic drift at different times, preventing creators from establishing reproducible style pipelines.

**Deficiency 5: Cross-Modal Data Context Loss**

In independent tool chains, the creative decision context from preceding steps is invisible in downstream tools. Downstream tools can only see the final output file from upstream, not the complete creative context that produced it (character designs, style selections, parameter decisions).

**Deficiency 6: The Gap Between 3D Content Creation and AI Generation Pipelines**

In prior art, AI-driven 3D model generation tools (text-to-3D, image-to-3D) and 3D scene editing tools (WebGL editors, game engines) are two completely independent systems. This gap creates the following problems:

(1) **Generation-Editing Disconnect**: After using AI to generate a 3D model, the creator must download the model file → save locally → open a separate 3D editor → manually import the model → manually adjust materials and position → manually set up lighting → manually configure camera angles. This six-step mechanical operation cycle completely severs the "intelligent" output of AI generation from the subsequent 3D editing workflow.

(2) **3D Scenes Cannot Participate in Agent Orchestration**: Existing 3D editors (whether web-based or desktop) operate in "standalone application" mode — they are self-contained sandboxes that cannot function as a node in a directed graph, receiving upstream AI generation results or outputting rendered products to downstream nodes. This means 3D scene construction work cannot be integrated into the Agent's automated orchestration pipeline.

(3) **Lighting and Camera Parameters Lack AI Assistance**: Lighting configuration and camera settings in existing 3D editors rely entirely on manual creator adjustment — selecting light types, setting intensity/color/position, adjusting exposure and white balance, configuring depth of field parameters, etc. These physical parameters have natural correspondences with the "visual style parameters" in AI image generation pipelines (e.g., a 3D scene's cinematic lighting preset could be directly injected as a structured parameter into an AI image generation prompt), yet existing solutions establish no such cross-dimensional parameter mapping.

(4) **3D Scenes Cannot Serve as Reference Sources for AI Generation**: In existing solutions, if a creator builds a carefully lit scene in a 3D editor, the scene's three-dimensional information (camera viewpoint, light direction and color temperature, object spatial relationships, material properties) cannot be utilized by AI image or video generation pipelines. Creators can only "flatten" the 3D scene into a 2D reference image via screenshot, losing depth, normal, material, and lighting direction information.

**Deficiency 2: Semantic Drift in Visual Extraction**

[Same as previous version — natural language labels correspond to fuzzy probability distributions in latent space]

**Deficiency 3: Output Truncation, Serial Blocking, and Unrecoverable Disconnection in Long-Text Analysis**

[Same as previous version — merged single call leads to truncation, serial waiting, connection fragility]

**Deficiency 4: Imprecise and Irreproducible Generation Parameter Control**

[Same as previous version — natural language descriptions are qualitative and fuzzy]

**Deficiency 5: Cross-Modal Data Context Loss**

[Same as previous version — upstream creative decisions invisible to downstream tools]

---

## 四、发明内容 / Summary of the Invention

### 4.1 本发明要解决的技术问题 / Technical Problem to be Solved

**中文**：

本发明要解决的核心技术问题是：**如何将AI内容生成系统的交互界面从被动的工具容器升级为具有感知-认知-行动能力的智能Agent**，使画布本身能够：

(1) **感知**有向图中各节点的类型、端口、连接拓扑、生成状态和历史上下文；
(2) **认知**拓扑结构中蕴含的创作意图，自主决策管线选择和任务路由；
(3) **行动**自动执行跨节点数据汇流、多Agent并行调度、约束编译与注入、状态持久化与恢复；
(4) 在上述Agent能力的支撑下，系统性解决语义漂移、输出截断、风格不可复现、上下文丢失等下游技术问题。

**English**:

The core technical problem to be solved by the present invention is: **how to upgrade the interaction interface of AI content generation systems from a passive tool container to an intelligent Agent with Perception-Cognition-Action capabilities**, enabling the canvas itself to:

(1) **Perceive** the types, ports, connection topology, generation status, and historical context of each node in the directed graph;
(2) **Cognize** the creative intent embedded in the topological structure, autonomously deciding pipeline selection and task routing;
(3) **Act** by automatically executing cross-node data confluence, multi-agent parallel scheduling, constraint compilation and injection, state persistence and recovery;
(4) Supported by the above Agent capabilities, systematically solve downstream technical problems including semantic drift, output truncation, style irreproducibility, and context loss.

---

### 4.2 本发明的核心创新：画布即Agent（Canvas-as-Agent）架构

**中文**：

本发明的核心创新在于提出了"画布即Agent"（Canvas-as-Agent）这一全新的系统架构范式。与现有技术将画布视为被动画板不同，本发明将无尽画布本身设计为一个完整的智能Agent，具备以下三个闭环能力层次：

---

**第一层：画布Agent的感知能力（Perception）**

画布Agent持续感知以下信息维度：

**(P1) 图拓扑感知**：画布Agent读取并维护整个有向图的完整拓扑结构——包括每个节点的类型、位置、每个端口的类型标识、每条边的源-目标关系。不同于简单的数据结构存储，Agent将拓扑结构理解为一个"意图表达"：如果节点A（输出类型为character_profile）连接到节点B（输入类型为character_profile），Agent理解这意味着"节点B的生成需要参考节点A产出的角色信息"，而非仅仅存储一条A→B的记录。

**(P2) 端口类型感知**：每个节点的输入/输出端口具有预定义的数据类型标识（image | video | audio | prompt | character_profile | shot_list | model_3d）。Agent维护一个端口类型兼容性矩阵，在创作者建立有向边时即时校验——不兼容的连接被实时拒绝并给予解释。更重要的是，Agent感知到哪些端口类型的数据"可用"——当某个上游节点生成完成后，Agent自动将新可用的数据类型广播给依赖它的下游节点。

**(P3) 生成状态感知**：Agent持续跟踪每个节点的生成状态（idle | pending | running | completed | failed），以及每个进行中任务的实时进度（0-100%）。Agent通过变更计数器感知状态的每次变化，并在合适的时机触发后续行动。

**(P4) 语义意图感知**：Agent读取创作者在各节点中输入的提示词文本，执行关键词模式匹配和语义分析，感知创作者的具体意图类型——"提取意图"（关键词：提取、抠出、单独、三视图等）、"参考意图"（@mention引用图像节点）、"生成意图"（纯文本描述无引用）——为后续的智能路由决策提供依据。

---

**第二层：画布Agent的认知能力（Cognition）**

基于感知层收集的信息，画布Agent执行以下认知推理：

**(C1) 意图推理与管线选择**：Agent综合节点的类型标识、创作者的提示词语义分析结果、以及参考上下文对象的内容特征，推理出创作者的真实意图，并自主选择最优的生成管线。例如：
- 感知到"提取"关键词 + 有image类型参考 → 推理："创作者想提取图中某个物体" → 选择"五层结构约束视觉提取管线"
- 感知到@mention引用 + 无提取关键词 → 推理："创作者想基于参考图生成新图" → 选择"参考图增强的I2I管线"
- 两者均不满足 → 推理："纯文本生成意图" → 选择"标准T2I管线"

这一推理-选择过程**完全自动**，创作者无需手动切换任何"模式"下拉菜单——Agent从创作者的输入内容和图拓扑中自动推断意图。

**(C2) 依赖分析与并行调度规划**：当面对复杂分析任务（如剧本分析），Agent自动将任务按语义边界拆分为独立子任务（角色提取、场景提取、分镜生成、声音设计），构建子任务间的依赖有向图（无依赖→可并行，有依赖→串行排程），生成最优的并行-串行混合调度计划。

**(C3) 上下文组装与约束编译**：Agent自动收集目标节点所有上游节点的产出物，按数据类型分类组装为结构化的"参考上下文对象"。对于特定管线（如视觉提取），Agent进一步将上下文编译为管线专用的约束格式（如五层结构约束型提示词）。对于图像生成管线，Agent读取创作者选择的视觉风格参数，编译为结构化前缀并注入提示词。

**(C4) 状态一致性推理**：Agent通过变更计数器驱动的增量同步机制，持续维护前端画布状态与后端持久化状态的一致性。在服务重启或网络重连后，Agent自动执行状态恢复推理——读取持久化状态文件，识别所有"进行中"的任务标识符，恢复对应轮询。

---

**第三层：画布Agent的行动能力（Action）**

基于认知层的推理结果，画布Agent自主执行以下行动：

**(A1) 自动数据汇流**：当创作者触发目标节点生成时，Agent自动沿所有入边向上游递归遍历，构建上游子图，收集所有源节点的输出端口数据，按类型组装为参考上下文对象，注入目标节点的生成请求。整个过程对创作者透明——创作者只看到"点了生成按钮，系统自动把所有上游数据汇集并生成"，无需手动下载、保存、上传任何中间文件。

**(A2) 智能任务路由与提交**：Agent根据认知层（C1）的管线选择结果，通过Provider注册表查询具备所需能力的Provider实例，将任务以标准化的异步格式提交，并立即返回任务标识符。

**(A3) 并行任务编排与依赖触发**：Agent根据认知层（C2）的调度计划，并行提交无依赖关系的子任务，监听各子任务的完成事件，在依赖条件满足时自动触发后续子任务。

**(A4) 多通道轮询与进度同步**：Agent为每个进行中的任务启动独立的轮询通道，持续更新任务的进度状态，在任务完成时自动获取结果并更新对应的节点预览区域和输出端口。

**(A5) 状态持久化与恢复**：Agent在每次状态变更时触发增量同步——仅将变更的实体差异集序列化传输至后端持久化。服务重启或网络重连时，Agent自动从持久化状态文件完整恢复画布和所有进行中任务的轮询。

---

**画布Agent的完整感知-认知-行动循环示意**：

```
┌─────────────────────────────────────────────────────────────┐
│                      画布 Agent                              │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   感知层      │ →  │   认知层      │ →  │   行动层      │  │
│  │  Perception  │    │  Cognition   │    │   Action     │  │
│  ├──────────────┤    ├──────────────┤    ├──────────────┤  │
│  │·图拓扑结构    │    │·意图推理      │    │·自动数据汇流  │  │
│  │·端口类型      │    │·管线选择      │    │·智能任务路由  │  │
│  │·生成状态      │    │·依赖分析      │    │·并行编排      │  │
│  │·语义意图      │    │·约束编译      │    │·进度同步      │  │
│  │·变更计数器    │    │·状态一致性    │    │·持久化恢复    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                          ↑                                  │
│                          │ 反馈（结果更新感知）              │
│                          └──────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
```

**English**:

The core innovation of the present invention lies in proposing the entirely new system architecture paradigm of "Canvas-as-Agent." Unlike prior art that treats the canvas as a passive drawing surface, the present invention designs the infinite canvas itself as a complete intelligent Agent with the following three closed-loop capability layers:

**Layer 1: Perception Capabilities of the Canvas Agent**

The Canvas Agent continuously perceives the following information dimensions:

**(P1) Graph Topology Perception**: The Agent reads and maintains the complete topological structure of the entire directed graph — including each node's type and position, each port's type identifier, and each edge's source-target relationship. Unlike simple data structure storage, the Agent understands the topology as an "intent expression": if Node A (output type: character_profile) is connected to Node B (input type: character_profile), the Agent understands this means "Node B's generation needs to reference the character information produced by Node A," rather than merely storing a record of A→B.

**(P2) Port Type Perception**: Each node's input/output ports have predefined data type identifiers (image | video | audio | prompt | character_profile | shot_list | model_3d). The Agent maintains a port type compatibility matrix and performs instant validation when a creator establishes a directed edge — incompatible connections are rejected in real time with explanations. More importantly, the Agent perceives which port type data is "available" — when an upstream node completes generation, the Agent automatically broadcasts the newly available data type to downstream nodes that depend on it.

**(P3) Generation Status Perception**: The Agent continuously tracks each node's generation status (idle | pending | running | completed | failed) and the real-time progress of each in-progress task (0-100%). The Agent perceives every state change through the change counter and triggers subsequent actions at appropriate times.

**(P4) Semantic Intent Perception**: The Agent reads the prompt text entered by the creator in each node, performs keyword pattern matching and semantic analysis, and perceives the creator's specific intent type — "extraction intent" (keywords: extract, isolate, separate, three-view, etc.), "reference intent" (@mention referencing image nodes), "generation intent" (plain text description without references) — providing the basis for subsequent intelligent routing decisions.

**Layer 2: Cognition Capabilities of the Canvas Agent**

Based on information collected by the perception layer, the Canvas Agent performs the following cognitive reasoning:

**(C1) Intent Reasoning and Pipeline Selection**: The Agent synthesizes the node type identifier, semantic analysis results of the creator's prompt, and content characteristics of the reference context object to infer the creator's true intent and autonomously select the optimal generation pipeline. For example:
- Perceives "extract" keyword + image-type reference present → Infers: "Creator wants to extract an object from the image" → Selects: "Five-Layer Structural Constraint Visual Extraction Pipeline"
- Perceives @mention reference + no extraction keywords → Infers: "Creator wants to generate a new image based on the reference" → Selects: "Reference-Enhanced I2I Pipeline"
- Neither condition met → Infers: "Plain text generation intent" → Selects: "Standard T2I Pipeline"

This inference-selection process is **completely automatic** — the creator does not need to manually switch any "mode" dropdown menu. The Agent autonomously infers intent from the creator's input content and graph topology.

**(C2) Dependency Analysis and Parallel Scheduling Planning**: When facing complex analysis tasks (such as script analysis), the Agent automatically splits the task into independent sub-tasks along semantic boundaries (character extraction, scene extraction, storyboard generation, sound design), constructs a sub-task dependency directed graph (no dependency → parallelizable; has dependency → serial scheduling), and generates an optimal parallel-serial hybrid scheduling plan.

**(C3) Context Assembly and Constraint Compilation**: The Agent automatically collects the outputs of all upstream nodes of the target node, classifies them by data type, and assembles them into a structured "Reference Context Object." For specific pipelines (such as visual extraction), the Agent further compiles the context into a pipeline-specific constraint format (such as a five-layer structural constraint generation prompt). For image generation pipelines, the Agent reads the visual style parameters selected by the creator, compiles them into a structured prefix, and injects them into the prompt.

**(C4) State Consistency Reasoning**: The Agent continuously maintains consistency between frontend canvas state and backend persistent state through a change-counter-driven incremental synchronization mechanism. After service restart or network reconnection, the Agent automatically performs state recovery reasoning — reading the persistent state file, identifying all "in-progress" task identifiers, and resuming corresponding polling.

**Layer 3: Action Capabilities of the Canvas Agent**

Based on the reasoning results of the cognition layer, the Canvas Agent autonomously executes the following actions:

**(A1) Automatic Data Confluence**: When a creator triggers generation on a target node, the Agent automatically traverses recursively upstream along all incoming edges, builds the upstream sub-graph, collects output port data from all source nodes, assembles it by type into a Reference Context Object, and injects it into the target node's generation request. The entire process is transparent to the creator — the creator only sees "clicked the generate button, and the system automatically gathered all upstream data and generated," without any manual downloading, saving, or uploading of intermediate files.

**(A2) Intelligent Task Routing and Submission**: Based on the pipeline selection result from the cognition layer (C1), the Agent queries the Provider Registry for a Provider instance with the required capability, submits the task in standardized async format, and immediately returns a task identifier.

**(A3) Parallel Task Orchestration and Dependency Triggering**: Based on the scheduling plan from the cognition layer (C2), the Agent submits independent sub-tasks in parallel, listens for completion events of each sub-task, and automatically triggers subsequent sub-tasks when dependency conditions are satisfied.

**(A4) Multi-Channel Polling and Progress Synchronization**: The Agent starts independent polling channels for each in-progress task, continuously updates task progress status, and automatically retrieves results and updates the corresponding node's preview area and output ports upon task completion.

**(A5) State Persistence and Recovery**: The Agent triggers incremental synchronization on every state change — serializing and transmitting only the differential entity set to the backend for persistence. Upon service restart or network reconnection, the Agent automatically fully recovers the canvas and all in-progress task polling from the persistent state file.

**The Canvas Agent's Complete Perception-Cognition-Action Loop Diagram:**
[Same ASCII diagram in English]

---

### 4.3 画布Agent集成的自研认知能力

**中文**：

以下能力不是独立的功能模块，而是画布Agent认知层（Cognition）的具体能力维度——它们是Agent在感知画布状态后、采取行动前所执行的推理过程。

---

#### 能力一：五层结构约束提取 — Agent的"精确视觉理解"认知能力

这是画布Agent在感知到创作者的"提取意图"（C1推理结果）后，对参考图像执行的五层结构认知过程。该方法的核心创新在于：**用可验证的几何/结构约束替代不可验证的模糊语义标签**。

传统方法是：用户说"提取花瓶"→ 提交"花瓶"这个语义标签 + 参考图给模型 → 模型在"花瓶"的概率分布中采样。语义标签无法精确定位到参考图中"那一个特定物体"，因此产生漂移。

画布Agent的认知方法是自顶向下的五层结构锁定：

**第1层：类别定位** — Agent使用最大外延的功能性分类词（如"容器vessel"而非"青花瓷瓶"）定位目标物，刻意避免窄化分类词引入形态偏见。这一层的认知策略是"宽定位"——仅确定搜索方向，不锁定形态。

**第2层：功能结构约束** — Agent分析并记录决定目标物"能做什么"的不可变结构特征，以"有/无"二值属性或有限离散值描述。例如：有盖/无盖、开口大小比例、有把手/无把手及其连接方式、底部可稳定放置/不可、有倾倒结构/无。这些特征在同类物品中无模糊空间，构成物品身份的"骨架"。

**第3层：形态结构约束** — Agent以几何描述语言（而非审美风格语言）记录目标物的形状特征：截面轮廓曲线类型、瓶颈与瓶身的比例关系、最大直径的位置、整体高宽比、底部收窄方式、口沿处理方式等。禁止使用"优雅"、"古典"等审美词汇——这些词汇在模型训练数据中对应完全不同的视觉形态。

**第4层：细节约束** — Agent记录参考图中实际可见的、用于区分"这一类物品"和"这一个特定物品"的细节：表面装饰图案的布局、颜色数量和排列方式、文字或标记的位置、表面光泽度、材质纹理特征等。每项细节附带其在参考图中的位置说明，确保约束可验证。

**第5层：排除约束** — **这是本发明最具创新性的一层**。Agent列举该品类物品在市场常见的变体形态中，参考图确定不存在（NOT）的特征。例如："非双耳结构"、"非广口设计"、"非透明材质"、"表面无浮雕"等。排除约束的作用是在生成模型的概率空间中划定"禁区"——前四层正向约束划定了一个"包含区"，但区域内可能仍存在符合所有正向约束的错误形态变体；排除约束在包含区内"挖洞"，显式标记通往错误变体的路径为不可通行。

五层分析完成后，Agent将结果编译为"结构约束型生成提示词"。该提示词以"以所附参考图为第一视觉来源，锁定图中目标物的所有视觉信息"的参考图直引声明开头——在模型内部建立"参考图优先"的注意力机制，随后逐层列出约束项，排除约束以否定形式标注，最后附加场景和光照参数。

**技术效果**：五层锁定策略构成从"大类定位"到"个体锁定"的完整约束链。排除约束层（第5层）是本领域首次提出的约束类型——现有技术中不存在在概率空间中显式划定"排除区域"的方法。

---

#### 能力二：任务分离异步并行管线 — Agent的"复杂任务分解"认知能力

这是画布Agent在面对复杂分析任务时的认知分解与调度能力。与传统方法将多个子任务合并为单次模型调用不同，Agent执行三个认知步骤：

**步骤1 — 语义分离**：Agent将整体分析任务按语义关注维度拆分为独立子任务。以剧本分析为例：角色提取（关注"谁"→输出结构化角色清单）、场景提取（关注"哪里"→输出结构化场景清单）、分镜生成（关注"怎么拍"→输出结构化分镜表）、声音设计（关注"什么声音"→输出配乐风格建议）。四个子任务在语义上各自独立。

**步骤2 — 依赖分析**：Agent分析子任务间的输入/输出数据类型匹配关系，构建依赖有向图。角色提取和场景提取之间无依赖（输出类型不重叠）→ 可并行；分镜生成依赖角色提取的character_profile类型输出 → 排在角色提取完成之后。

**步骤3 — 并行编排与异步执行**：Agent根据依赖图生成最优调度计划——并行组内的子任务同时提交（每个子任务作为独立异步任务，立即返回任务标识符），串行链上的子任务在前置任务完成时自动触发。每个子任务具有独立的轮询通道和失败重试机制。所有子任务标识符持久化存储，支持网络断开重连后恢复轮询而无需重新提交。

**技术效果**：(a) 每个子任务的输出独立控制在安全token范围内，彻底消除截断；(b) 无依赖的子任务并行执行，总耗时取决于最慢单链路而非各任务之和；(c) 独立异步模式消除长连接脆弱性。

---

#### 能力三：结构化参数注入 — Agent的"风格精确编译"认知能力

这是画布Agent将创作者模糊的风格意图编译为精确结构化参数的认知编译能力。

Agent自研并维护一个"视觉风格参数知识库"，按成像设备特性、光学系统特征、感光介质特征三个维度分层组织。知识库的核心设计原则是**独立于任何特定AI模型**——每条参数记录存储的是标准化的参数标识符和结构化表达格式（如`[ParamCategory: ParamValue]`），而非绑定到任何模型的私有语法。

在生成任务提交前，Agent的"结构化前缀编译器"：读取创作者在参数面板中选定的参数标识符集合 → 从知识库查找对应的结构化表达格式 → 按设备→光学→介质的顺序组装为前缀字符串 → 置于创作者自然语言提示词之前 → 形成完整生成指令提交。

**技术效果**：同一组参数标识符在不同时间生成具有统计一致性的视觉风格；参数组合可导出为风格预设并分享；团队协作中使用相同预设保证输出风格统一。

---

#### 能力四：变更计数器驱动的增量同步 — Agent的"状态一致性维护"认知能力

这是画布Agent维护前端画布状态与后端持久化状态一致性的认知能力。

Agent维护一个全局变更计数器。每次节点或边的增删改操作，在修改内存中的Map结构状态后，计数器自增。Agent的同步模块持续感知计数器变化——仅在计数器变化时执行增量同步：对比前后状态快照，识别差异实体集（新增/修改/删除），仅将差异集序列化传输至后端，后端合并差异到持久化状态文件。

**技术效果**：(a) 避免全量同步的性能开销；(b) 前端Map结构提供O(1)的节点查找和更新；(c) 服务重启后从持久化文件完整恢复画布和所有进行中任务的轮询。

---

**English**:

The following capabilities are not independent functional modules, but specific cognitive capability dimensions of the Canvas Agent's Cognition Layer — they are the reasoning processes that the Agent executes after perceiving canvas state and before taking action.

#### Capability 1: Five-Layer Structural Constraint Extraction — The Agent's "Precise Visual Understanding" Cognitive Ability

This is the five-layer structural cognitive process that the Canvas Agent executes on reference images after perceiving the creator's "extraction intent" (C1 reasoning result). The core innovation of this method lies in: **replacing unverifiable vague semantic labels with verifiable geometric/structural constraints**.

The traditional approach is: user says "extract the vase" → submits the semantic label "vase" + reference image to the model → the model samples from the "vase" probability distribution. The Canvas Agent's cognitive approach is a top-down five-layer structural lock-in:

**Layer 1: Category Positioning** — The Agent uses the broadest functional classification term (e.g., "vessel" rather than "blue-and-white porcelain vase") to position the target object, deliberately avoiding morphological bias introduced by narrow classification terms.

**Layer 2: Functional Structure Constraints** — The Agent analyzes and records immutable structural features that determine what the target object "can do," described as "yes/no" binary attributes or finite discrete values (has lid / no lid, opening size ratio, has handles / no handles, base stability, pouring structure presence, etc.).

**Layer 3: Morphological Structure Constraints** — The Agent records the target object's shape features using geometric description language (not aesthetic style language): cross-section profile curve type, neck-to-body proportional relationship, maximum diameter position, overall height-to-width ratio, base narrowing method, rim treatment method, etc. Aesthetic terms like "elegant" or "classical" are prohibited.

**Layer 4: Detail Constraints** — The Agent records details actually visible in the reference image that distinguish "this category of object" from "this specific object": layout of surface decorative patterns, number of colors and arrangement, position of text or markings, surface gloss level, material texture characteristics, etc. Each detail is accompanied by its position in the reference image, ensuring verifiability.

**Layer 5: Negative Constraints** — **This is the most innovative layer of the present invention.** The Agent enumerates common variant forms of this object category in the market that are definitively absent (NOT) from the reference image. For example: "NOT dual-handled structure," "NOT wide-mouth design," "NOT transparent material," "no relief decoration on surface." Negative constraints delineate "exclusion zones" in the generation model's probability space — explicitly marking paths to incorrect variants as impassable.

After completing the five-layer analysis, the Agent compiles the results into a "Structural Constraint Generation Prompt" beginning with a reference image direct citation declaration, with constraints listed layer by layer and negative constraints annotated in negation format.

#### Capability 2: Task-Separated Async Parallel Pipeline — The Agent's "Complex Task Decomposition" Cognitive Ability

This is the Canvas Agent's cognitive decomposition and scheduling ability when facing complex analysis tasks. The Agent executes three cognitive steps:

**Step 1 — Semantic Separation**: The Agent splits the overall analysis task into independent sub-tasks along semantic attention dimensions (e.g., for script analysis: Character Extraction, Scene Extraction, Storyboard Generation, Sound Design).

**Step 2 — Dependency Analysis**: The Agent analyzes input/output data type matching relationships between sub-tasks to construct a dependency directed graph — independent sub-tasks are parallelizable; dependent sub-tasks are queued after their predecessor completes.

**Step 3 — Parallel Orchestration and Async Execution**: The Agent submits independent sub-tasks simultaneously (each as an independent async task, immediately returning a task identifier), and automatically triggers dependent sub-tasks when their predecessor task completes. Each sub-task has an independent polling channel and failure retry mechanism. All sub-task identifiers are persistently stored, supporting polling recovery after disconnection and reconnection without resubmission.

#### Capability 3: Structured Parameter Injection — The Agent's "Precise Style Compilation" Cognitive Ability

This is the Canvas Agent's cognitive compilation ability to translate the creator's vague stylistic intent into precise structured parameters. The Agent has independently developed and maintains a "Visual Style Parameter Knowledge Base," hierarchically organized across three dimensions: imaging equipment characteristics, optical system characteristics, and photosensitive medium characteristics. The core design principle is **independence from any specific AI model** — each parameter record stores a standardized parameter identifier and structured expression format (e.g., `[ParamCategory: ParamValue]`). Before generation task submission, the Agent's "Structured Prefix Compiler" reads the parameter identifier set selected by the creator, assembles them into a prefix string in Equipment → Optics → Medium order, and places it before the creator's natural language prompt to form the complete generation instruction.

#### Capability 4: Change-Counter-Driven Incremental Synchronization — The Agent's "State Consistency Maintenance" Cognitive Ability

This is the Canvas Agent's cognitive ability to maintain consistency between frontend canvas state and backend persistent state. The Agent maintains a global change counter incremented on each node/edge add/delete/modify operation. The synchronization module only performs incremental synchronization when the counter changes — comparing before-and-after state snapshots, identifying the differential entity set, and transmitting only differences to the backend for persistence merging. The frontend Map structure provides O(1) node lookup and update performance. Upon service restart, the Agent fully recovers canvas state and all in-progress task polling from the persistent file.

---

#### 能力五：画布Agent的3D世界维度 — Agent的"三维空间感知与构建"能力

这是画布Agent区别于所有现有AI内容生成系统的最具差异化特征的能力——Agent不仅编排二维内容，还内建了一个完整的三维世界维度。这一能力的核心突破在于：**3D不是作为一个孤立的"查看器"存在，而是作为Agent感知-认知-行动循环的有机组成部分，与二维节点流实现双向数据贯通**。

该能力由四个子能力构成：

**(A) AI驱动的3D模型生成 — Agent的"文本/图像到三维"认知能力**

画布Agent集成了AI 3D模型生成能力。创作者通过文本描述或参考图像表达创作意图，Agent自动将任务路由至3D生成管线。生成管线支持以下认知决策：

- **双模式生成**：Agent根据输入类型自动选择文本到3D（Text-to-3D）或图像到3D（Image-to-3D）模式。文本模式下，Agent理解创作者的自然语言描述（如"一把中世纪风格的木质扶手椅，雕花靠背，天鹅绒坐垫"）——这与二维图像生成共享相同的语义理解能力，但输出目标从像素空间切换为三维几何空间。图像模式下，Agent将参考图中的二维视觉信息推理为三维结构（形状推断、材质识别、尺度估计）。

- **精度与质量的自适应决策**：Agent提供多级精度系列——高精度系列（约150万面，适合影视级资产）、低多边形系列（适合实时渲染和游戏资产）——创作者可根据下游用途选择。Agent同时决策是否生成PBR（Physically Based Rendering）材质贴图，以及贴图分辨率等级（标准、精细、极致），使生成的3D模型在下游3D场景编辑器中可直接用于物理渲染。

- **生成结果的Agent化管理**：模型生成完成后，Agent自动执行以下行动：(i) 将模型文件（GLB格式）保存至Agent的模型资产库；(ii) 在节点预览区展示模型的实时交互式3D预览（基于WebGL的R3F渲染管线，支持旋转/缩放/平移的全自由度观察）；(iii) 将模型URL和路径注册到节点的输出端口（model_3d类型），供下游3D场景编辑节点通过有向边自动接收；(iv) 提供一键下载功能，将模型保存至创作者本地磁盘。

**(B) 实时WebGL 3D场景编辑器 — Agent的"三维世界构建与感知"能力**

画布Agent内建了一个完整的实时3D场景编辑器，作为有向图中的一个特殊节点类型（3D场景节点）。该编辑器基于WebGL渲染管线（React Three Fiber / Three.js），提供以下能力：

**场景对象体系**：
- 基础几何体：方块、球体、圆柱体、平面，每种可独立调整位置、旋转、缩放
- 人体角色系统：具有预设姿态库（站立、行走、跑步、坐下、蹲下、卧倒、战斗姿态等），角色可加载为程序化骨架模型或外部GLB/FBX模型文件。姿态之间可切换，构成角色表演的基础
- AI生成模型自动导入：当上游Tripo3D节点的输出通过有向边连接至本节点的model-in输入端口时，Agent自动将AI生成的3D模型导入场景——无需创作者手动下载和导入操作。Agent在导入前自动验证模型文件的存在性和完整性

**电影级物理灯光系统**：
Agent自研了一套基于物理的灯光预设系统，包含多个电影级预设（如黄金时刻暖光、月夜冷光、阴天柔光、摄影棚三点布光、经典好莱坞暖调、科幻蓝调、恐怖暗调、雪地高亮等）。每个预设定义了完整的光照方案：
- 方向光（DirectionalLight）：方位角、仰角、强度、色温、是否投射阴影
- 可选的辅助光源：点光源（PointLight）、聚光灯（SpotLight）
- 环境光方案：基于HDRI的环境贴图（日落/夜景/黎明/摄影棚/仓库等预设）或程序化天空穹顶
- 伪全局光照补偿：环境光（AmbientLight）+ 半球光（HemisphereLight）的天色/地色独立控制
- 色调映射（Tone Mapping）：ACESFilmic（电影级）、Cineon（胶片模拟）、Linear（线性）、Reinhard
- 曝光控制：可调曝光值范围

Agent感知到灯光预设的切换事件后，即时更新3D场景中所有光源的参数和渲染管线的后期处理配置。重要的是，Agent的认知层（C3——上下文组装与约束编译）能够将当前3D场景的灯光参数（色温、方向、强度、氛围描述）编译为结构化文本，注入到下游AI图像生成节点的提示词中——实现3D灯光方案到2D图像风格的结构化参数传递。

**多机位虚拟摄影系统**：
Agent在3D场景中支持创建和管理的摄像机系统：
- 多机位布局：支持在场景中同时部署多个虚拟摄像机机位，每个机位具有独立的三维位置、朝向和视觉标识（摄像机模型或指示器）
- 物理镜头模拟：每个机位可选择不同的虚拟镜头规格，Agent根据所选镜头自动调整视野（FOV）和透视特征——广角镜头产生强烈的深度感和空间纵深感，中焦段模拟人眼自然透视，长焦段产生空间压缩效果
- 景深（Depth of Field）渲染：Agent基于物理光圈参数（T-stop制式）计算焦外虚化效果——大光圈产生浅景深（主体清晰、背景模糊），小光圈产生深景深（全景清晰）。景深效果通过后处理管线（EffectComposer）实时渲染
- 画中画（Picture-in-Picture）取景器：Agent为当前选中的摄像机提供独立的画中画预览窗口，显示该机位的实际取景画面，创作者可在PiP窗口中直接调整镜头参数和光圈值

**摄像机运动系统**：
Agent为每个虚拟摄像机提供三种运动rig模式：
- 轨道运动（Dolly）：摄像机在三维空间中沿直线轨道从A点运动到B点，运动速度可通过速度曲线（关键帧）控制
- 曲线运动（Curved）：摄像机沿Catmull-Rom样条曲线路径运动，创作者可编辑曲线控制点来定义复杂的摄像机运动轨迹
- 环绕运动（Orbit）：摄像机围绕指定的目标中心点做圆周环绕运动，可调节轨道半径、高度和环绕速度

每种运动模式支持叠加旋转关键帧（俯仰角/偏航角随时间变化）和动画轨道绑定（将摄像机运动与场景中角色的动画时间线同步）。

**(C) 3D→2D输出贯通 — Agent的"三维到二维的数据降维与注入"能力**

3D场景节点不是封闭的沙盒——Agent将其无缝接入有向图数据流：

- **快照输出（Snapshot）**：Agent将当前3D场景从选定摄像机视角渲染为高分辨率PNG图像。该图像自动注册到节点的image类型输出端口，通过有向边传递给下游的图像生成节点（作为参考图）、视频生成节点（作为首帧或风格参考）、或视觉提取节点（从3D场景中提取特定物体进行独立设计）。

- **视频录制输出（Video Recording）**：Agent支持将摄像机在运动rig上的完整运动过程录制为WebM视频文件（高码率VP9编码）。录制完成后，Agent自动创建一个下游视频生成节点，将录制的视频作为输入素材，或在画布上直接展示生成的视频片段。

- **灯光参数的结构化注入**：Agent将3D场景中的灯光方案（色温、方向、强度等物理参数）编译为结构化文本描述，可从3D场景节点传递至图像生成节点——使AI生成的2D图像在光照氛围上与3D场景保持一致性。这一能力体现了Agent的跨维度认知编译：同一个"黄金时刻暖光"的概念，在3D世界中表现为具体的物理光源参数，在2D生成管线中表现为结构化风格前缀——Agent自动完成两个维度之间的参数映射。

**(D) 2D→3D逆向贯通 — Agent的"二维参考到三维构建"能力**

数据流不仅可以从3D到2D，也可以从2D到3D：

- **AI生成模型自动导入**：上游AI 3D生成节点（Tripo3D）产出的模型，通过有向边自动导入3D场景编辑器，Agent自动完成模型的加载、材质标准化、缩放适配和场景放置。

- **图像参考驱动的场景构建**：上游图像生成节点产出的概念图/氛围图，通过有向边传递至3D场景节点。Agent感知到传入的参考图像后，可辅助创作者基于参考图的视觉信息（色调、光照方向、空间结构）在3D场景中进行对应的灯光预设选择和摄像机角度摆放。

- **角色描述驱动的角色配置**：上游剧本分析节点产出的角色描述（character_profile类型），通过有向边传递至3D场景节点。Agent感知到角色描述文本后，可辅助创作者在3D场景中选择对应的角色模型、设置角色的初始姿态和位置。

**3D世界维度作为Agent感知-认知-行动循环的延伸**：

上述四项子能力共同构成了画布Agent的3D世界维度。在Agent的感知-认知-行动循环中：

- **感知层**新增了对3D场景状态的感知：场景中的对象列表（类型、位置、旋转、缩放）、灯光配置（类型、参数、色温）、摄像机状态（机位、镜头、运动rig、景深参数）、角色的姿态和动画状态、AI生成模型的加载状态

- **认知层**新增了对3D场景的推理能力：根据参考图像推理灯光方案、根据角色描述推理姿态选择、将3D灯光参数编译为2D风格前缀、识别3D→2D和2D→3D的数据贯通时机

- **行动层**新增了3D场景的操作能力：自动导入AI模型、自动渲染快照/视频输出、自动更新灯光参数、自动管理模型资产

这一3D世界维度使画布Agent的创作空间从"二维平面"扩展为"二维+三维的混合空间"——Agent不仅编排像素的生成，还编排三维空间中的物体、灯光和摄像机构建。

**English**:

#### Capability 5: The Canvas Agent's 3D World Dimension — The Agent's "Three-Dimensional Spatial Perception and Construction" Ability

This is the most differentiated capability distinguishing the Canvas Agent from all existing AI content generation systems — the Agent not only orchestrates two-dimensional content but also incorporates a complete three-dimensional world dimension. The core breakthrough: **3D does not exist as an isolated "viewer" but as an organic component of the Agent's Perception-Cognition-Action loop, achieving bidirectional data throughput with the 2D node flow**.

**(A) AI-Driven 3D Model Generation — The Agent's "Text/Image to 3D" Cognitive Ability**

The Canvas Agent integrates AI 3D model generation capabilities. Creators express creative intent through text descriptions or reference images, and the Agent automatically routes tasks to the 3D generation pipeline, supporting dual-mode generation (Text-to-3D and Image-to-3D) and adaptive precision decisions (high-precision series at ~1.5M faces for film-grade assets, low-polygon series for real-time/game assets, with PBR material and texture resolution configuration). After model generation completes, the Agent automatically: saves the model file (GLB format) to the asset library, displays an interactive WebGL-based real-time 3D preview in the node preview area, registers the model URL to the model_3d output port, and provides one-click download to local disk.

**(B) Real-Time WebGL 3D Scene Editor — The Agent's "3D World Construction and Perception" Ability**

The Canvas Agent incorporates a complete real-time 3D scene editor as a special node type within the directed graph, based on the WebGL rendering pipeline (React Three Fiber / Three.js). Capabilities include:

- **Scene Object System**: Primitives (box, sphere, cylinder, plane), human figure system with preset pose library (standing, walking, running, sitting, squatting, lying down, combat stances), and auto-import of AI-generated models via directed edge connection to the model-in input port — the Agent automatically validates model file existence, loads the GLB/FBX model, standardizes PBR materials, computes bounding boxes, and scales adaptively, requiring zero manual download or import operations.

- **Cinematic Physical Lighting System**: An independently developed physically-based lighting preset system with multiple cinematic presets (Golden Hour warm light, Moonlight cool light, Overcast soft light, Studio Three-Point Lighting, Classic Hollywood Warm, Sci-Fi Blue, Horror Dark, Snowfield Bright). Each preset defines a complete lighting scheme: DirectionalLight (azimuth, elevation, intensity, color temperature, PCFSoft shadows), optional auxiliary lights (PointLight, SpotLight), ambient light scheme (HDRI environment maps or procedural sky dome), pseudo global illumination compensation (AmbientLight + HemisphereLight with independent sky/ground color control), Tone Mapping (ACESFilmic, Cineon, Linear, Reinhard), and exposure control.

- **Multi-Camera Virtual Cinematography System**: Supports multiple virtual camera positions with independent 3D position, orientation, and lens specifications. Physical lens simulation automatically adjusts FOV based on selected lens. Depth of Field (DoF) rendering based on physical aperture parameters (T-stop system) through the post-processing pipeline (EffectComposer). Picture-in-Picture (PiP) viewfinder provides real-time rendering of the selected camera's framed image.

- **Camera Motion System**: Three motion rig modes per camera — Dolly (linear track between two points with speed curves), Curved (Catmull-Rom spline path with editable control points), Orbit (circular motion around a target center point). Each mode supports superimposed rotation keyframes (pitch/yaw) and animation track binding for timeline synchronization.

**(C) 3D→2D Output Throughput — The Agent's "3D to 2D Data Dimension Reduction and Injection" Ability**

The 3D scene node is not a closed sandbox — the Agent seamlessly integrates it into the directed graph data flow: Snapshot output renders the 3D scene from the selected camera viewpoint as a high-resolution PNG, registered to the image-type output port and transmitted downstream. Video recording captures the complete camera motion rig process as a WebM file (high-bitrate VP9 encoding). Structured injection of lighting parameters compiles the 3D scene's physical lighting scheme into structured text descriptions, transmitted to downstream image generation nodes as style constraints — achieving cross-dimensional lighting consistency between 3D and 2D.

**(D) 2D→3D Reverse Throughput — The Agent's "2D Reference to 3D Construction" Ability**

Data flow operates bidirectionally: AI-generated 3D models auto-import into the 3D scene editor via directed edges; reference images from upstream image generation nodes drive lighting preset selection and camera angle placement; character descriptions from upstream script analysis nodes drive 3D figure model and pose configuration.

**The 3D World Dimension as an Extension of the Agent's Perception-Cognition-Action Loop**: The Perception Layer adds 3D scene state perception (objects, lights, cameras, figure poses, model loading status). The Cognition Layer adds 3D scene reasoning (inferring lighting from reference images, inferring poses from character descriptions, compiling 3D lighting parameters into 2D style prefixes, recognizing 3D↔2D throughput timing). The Action Layer adds 3D scene operations (auto-importing AI models, auto-rendering snapshots/videos, auto-updating lighting, auto-managing model assets). This 3D world dimension expands the Canvas Agent's creative space from a "2D plane" to a "2D + 3D hybrid space."

---

### 4.4 本发明的有益效果 / Advantageous Effects

**中文**：

**效果一：范式革新 — 从"工具链"到"智能创作伙伴"**

本发明将AI内容生成系统的架构范式从"被动画板+离散工具链"升级为"智能Agent画布+统一编排"。创作者从"操作工具的工人"转变为"与Agent对话的创意总监"——仅需在画布上表达创意意图（放置节点、连接边、写提示词），画布Agent自主完成所有底层编排工作（数据汇流、意图推理、管线选择、任务调度、状态维护）。这一范式革新从根本上消除了现有方案中"交互界面与智能能力架构性分离"的缺陷。

**效果二：语义漂移的系统性消除**

五层结构约束提取——特别是排除约束层（第5层）的创新——将视觉提取从"基于模糊语义标签的概率采样"转变为"基于可验证几何/结构约束的精确匹配"。该方法是任务无关的：无论目标物是哪种品类（器具、家具、配饰、电子产品、建筑构件等），五层约束的分析逻辑框架均可适用，区别仅在于品类特有的结构和细节特征。

**效果三：长文本分析无截断、可并行、断线可恢复**

任务分离架构彻底消除了输出截断问题。依赖分析驱动的并行-串行混合调度消除了不必要的串行等待。异步非阻塞模式和任务标识符持久化使网络波动不再导致进度丢失或重复计算。

**效果四：视觉风格的精确量化与稳定复现**

结构化参数注入将风格控制从定性自然语言升级为定量标准化参数。参数知识库独立于模型的架构设计使平台可灵活升级底层AI服务而不改动参数体系和创作者体验。

**效果五：平台架构的开放性与可扩展性**

统一Provider抽象层（三方法标准接口）使新AI服务的接入成本降至最低。能力-服务映射的Provider注册表天然支持多Provider负载均衡和故障切换。

**效果六：工业级系统鲁棒性**

变更计数器驱动的增量同步、Map结构的高性能状态管理、完整的状态持久化与恢复机制，确保画布Agent在大型画布（数十到上百节点）、网络波动、服务重启等各种工况下的稳定运行。

**效果七：3D创作与AI生成的无缝融合**

画布Agent的3D世界维度从根本上消除了现有技术中"AI 3D生成"与"3D场景编辑"之间的断裂。AI生成的3D模型自动导入3D场景编辑器，3D场景的灯光方案结构化注入AI图像生成提示词，3D场景的快照和视频自动汇入下游2D节点——构成了"AI生成→3D编辑→AI再生成"的闭环创作管线。这一闭环在现有技术中需要至少四个独立工具（AI 3D生成工具 + 3D编辑器 + AI图像生成工具 + 视频生成工具）和大量手动文件操作才能完成，在本发明中由画布Agent自主编排完成。

**English**:

**Effect 1: Paradigm Innovation — From "Tool Chain" to "Intelligent Creative Partner"**

The present invention upgrades the architecture paradigm of AI content generation systems from "passive canvas + discrete tool chain" to "intelligent Agent canvas + unified orchestration." The creator transforms from a "worker operating tools" to a "creative director conversing with an Agent" — merely expressing creative intent on the canvas (placing nodes, connecting edges, writing prompts), while the Canvas Agent autonomously completes all underlying orchestration work (data confluence, intent reasoning, pipeline selection, task scheduling, state maintenance). This paradigm innovation fundamentally eliminates the "architectural separation of interaction interface and intelligence capabilities" deficiency in existing solutions.

**Effect 2: Systematic Elimination of Semantic Drift**

The five-layer structural constraint extraction — particularly the innovation of the Negative Constraints layer (Layer 5) — transforms visual extraction from "probabilistic sampling based on fuzzy semantic labels" to "precise matching based on verifiable geometric/structural constraints." The method is task-agnostic: regardless of the target category (vessels, furniture, accessories, electronic products, architectural components, etc.), the analytical logic framework of the five-layer constraint system is universally applicable, with only category-specific structural and detail features differing.

**Effect 3: No Truncation, Parallelizable, Recoverable in Long-Text Analysis**

The task separation architecture completely eliminates output truncation. Dependency-analysis-driven parallel-serial hybrid scheduling eliminates unnecessary serial waiting. The async non-blocking pattern and task identifier persistence ensure that network fluctuations no longer cause progress loss or duplicate computation.

**Effect 4: Precise Quantification and Stable Reproduction of Visual Style**

Structured parameter injection upgrades style control from qualitative natural language to quantitative standardized parameters. The model-independent architecture of the parameter knowledge base enables flexible upgrading of underlying AI services without modifying the parameter system and creator experience.

**Effect 5: Openness and Extensibility of Platform Architecture**

The unified Provider abstraction layer (three-method standard interface) reduces the integration cost for new AI services to a minimum. The capability-service mapping Provider Registry natively supports multi-Provider load balancing and failover.

**Effect 6: Industrial-Grade System Robustness**

Change-counter-driven incremental synchronization, Map-structure high-performance state management, and complete state persistence and recovery mechanisms ensure stable operation of the Canvas Agent under various conditions including large canvases (dozens to hundreds of nodes), network fluctuations, and service restarts.

**Effect 7: Seamless Integration of 3D Creation and AI Generation**

The Canvas Agent's 3D world dimension fundamentally eliminates the gap between "AI 3D generation" and "3D scene editing" in prior art. AI-generated 3D models auto-import into the 3D scene editor, 3D scene lighting schemes are structurally injected into AI image generation prompts, and 3D scene snapshots and videos automatically flow into downstream 2D nodes — forming a closed-loop creative pipeline of "AI Generation → 3D Editing → AI Re-Generation." This closed loop would require at least four independent tools (AI 3D generation tool + 3D editor + AI image generation tool + video generation tool) and extensive manual file operations in prior art, yet is autonomously orchestrated by the Canvas Agent in the present invention.

---

## 五、附图说明 / Brief Description of Drawings

**中文**：

**图1** — 画布即Agent（Canvas-as-Agent）架构总览图
展示本发明的核心架构创新：画布Agent的感知-认知-行动三层闭环结构，标注各层的具体能力和数据流向。

**图2** — 画布Agent的感知-认知-行动完整循环时序图
以一个三节点创作管线（剧本分析→图像生成→视频生成）为例，展示画布Agent从感知图拓扑、推理意图、选择管线、编排任务到自动数据汇流的完整执行时序。

**图3** — 五层结构约束提取认知流程详图
展示画布Agent在感知到提取意图后执行的自顶向下五层认知分析过程（类别定位→功能结构→形态结构→细节→排除约束），标注各层的输入信息源、输出格式、层间递进关系和"禁区划定"机制。

**图4** — 任务分离异步并行管线调度时序图
展示画布Agent对复杂分析任务的语义分离（拆分为四个独立子任务）、依赖分析（构建依赖有向图）、并行编排（无依赖并行提交）和依赖触发（前置完成自动触发后继）的完整时序。

**图5** — 结构化参数注入认知编译流程图
展示画布Agent的视觉风格参数知识库（模型独立的标准化参数存储）→结构化前缀编译器→参数注入→完整指令生成的认知编译流程。

**图6** — 画布Agent的双通道感知与智能路由决策图
展示画布Agent同时通过有向边通道（结构化自动数据流）和@mention通道（语义化手动引用）感知创作者的参考关联意图，综合两种通道信息执行意图推理和管线选择的决策流程。

**图7** — 画布Agent的Provider感知与自适应调度架构图
展示Provider注册表的能力-服务映射机制、多Provider实例的负载均衡/故障切换路由、以及自适应调度引擎基于历史数据动态优化轮询策略的学习机制。

**图8** — 画布Agent的状态一致性维护机制图
展示变更计数器驱动的增量同步流程、Map结构高性能状态存储、后端结构化文件持久化格式、以及服务重启时的完整状态恢复流程。

**图9** — 画布Agent的3D世界维度架构总览图
展示画布Agent的3D世界维度的四个子能力（AI 3D模型生成、实时WebGL 3D场景编辑器、3D→2D输出贯通、2D→3D逆向贯通）及其在Agent感知-认知-行动循环中的位置，标注3D世界维度与2D节点流之间的双向数据通路。

**图10** — 3D场景编辑器内部架构图
展示3D场景编辑器的核心子系统——场景对象体系（基础几何体+角色系统+AI模型导入）、电影级灯光系统（预设结构+物理参数+色调映射管线）、多机位虚拟摄影系统（机位布局+镜头模拟+景深渲染+画中画取景器）、摄像机运动系统（三种运动rig+关键帧+动画轨道）——以及各子系统之间的数据交互关系。

**图11** — "AI生成→3D编辑→AI再生成"闭环管线时序图
展示实施例四的完整流程：Tripo3D AI生成模型→自动导入3D场景编辑器→灯光预设选择与多机位部署→快照/视频渲染输出→灯光参数结构化注入下游图像生成→3D场景迭代修改驱动2D重新生成。标注画布Agent在各环节的感知、认知和行动。

**English**:

**Figure 1** — Canvas-as-Agent Architecture Overview Diagram. Illustrating the core architectural innovation of the present invention: the three-layer closed-loop structure of the Canvas Agent (Perception-Cognition-Action), with annotations on specific capabilities and data flow directions within each layer.

**Figure 2** — Canvas Agent Complete Perception-Cognition-Action Loop Sequence Diagram. Using a three-node creative pipeline (script analysis → image generation → video generation) as an example, illustrating the complete execution sequence of the Canvas Agent from perceiving graph topology, reasoning intent, selecting pipelines, orchestrating tasks, to automatic data confluence.

**Figure 3** — Five-Layer Structural Constraint Extraction Cognitive Process Detail Diagram. Illustrating the top-down five-layer cognitive analysis process executed by the Canvas Agent after perceiving extraction intent (Category Positioning → Functional Structure → Morphological Structure → Details → Negative Constraints), with annotations on input sources, output formats, inter-layer progression relationships, and the "exclusion zone delineation" mechanism of each layer.

**Figure 4** — Task-Separated Async Parallel Pipeline Scheduling Sequence Diagram. Illustrating the complete sequence of the Canvas Agent's semantic separation of complex analysis tasks (splitting into four independent sub-tasks), dependency analysis (constructing dependency directed graph), parallel orchestration (parallel submission of independent tasks), and dependency triggering (auto-triggering successors upon predecessor completion).

**Figure 5** — Structured Parameter Injection Cognitive Compilation Flow Diagram. Illustrating the complete cognitive compilation flow from the Canvas Agent's visual style parameter knowledge base (model-independent standardized parameter storage) → structured prefix compiler → parameter injection → complete instruction generation.

**Figure 6** — Canvas Agent Dual-Channel Perception and Intelligent Routing Decision Diagram. Illustrating the parallel working mechanisms of the Canvas Agent's simultaneous perception of creator reference association intent through the directed edge channel (structured automatic data flow) and the @mention channel (semantic manual reference), and the decision flow for intent reasoning and pipeline selection synthesizing information from both channels.

**Figure 7** — Canvas Agent Provider Perception and Adaptive Scheduling Architecture Diagram. Illustrating the capability-service mapping mechanism of the Provider Registry, load balancing and failover routing logic for multiple Provider instances, and the learning mechanism of the adaptive scheduling engine dynamically optimizing polling strategies based on historical data.

**Figure 8** — Canvas Agent State Consistency Maintenance Mechanism Diagram. Illustrating the change-counter-driven incremental synchronization flow, Map-structure high-performance state storage, backend structured file persistence format, and complete state recovery flow upon service restart.

**Figure 9** — Canvas Agent 3D World Dimension Architecture Overview Diagram. Illustrating the four sub-capabilities of the Canvas Agent's 3D world dimension (AI 3D Model Generation, Real-Time WebGL 3D Scene Editor, 3D→2D Output Throughput, 2D→3D Reverse Throughput) and their positions within the Agent's Perception-Cognition-Action loop, with annotations on bidirectional data pathways between the 3D world dimension and the 2D node flow.

**Figure 10** — 3D Scene Editor Internal Architecture Diagram. Illustrating the core subsystems of the 3D scene editor — Scene Object System (primitives + figure system + AI model import), Cinematic Lighting System (preset structure + physical parameters + tone mapping pipeline), Multi-Camera Virtual Cinematography System (camera layout + lens simulation + DoF rendering + PiP viewfinder), Camera Motion System (three motion rig types + keyframes + animation tracks) — and the data interaction relationships between subsystems.

**Figure 11** — "AI Generation → 3D Editing → AI Re-Generation" Closed-Loop Pipeline Sequence Diagram. Illustrating the complete flow of Embodiment 4: Tripo3D AI model generation → auto-import into 3D scene editor → lighting preset selection and multi-camera deployment → snapshot/video rendering output → structured injection of lighting parameters into downstream image generation → 3D scene iterative modification driving 2D re-generation. Annotations on the Canvas Agent's perception, cognition, and action at each stage.

---

## 六、具体实施方式 / Detailed Description of Embodiments

### 6.1 实施例一：画布Agent对三节点跨模态创作管线的自主编排

**中文**：

本实施例详细展示画布Agent在一条包含"剧本分析→角色图像生成→视频生成"的三节点创作管线中，如何以感知-认知-行动的完整循环自主完成所有编排工作。

**环境设置**：

创作者在画布Agent上放置三个节点：
- 节点N1（剧本分析节点）：输入约2000字符的故事概览，分析深度设为"详细"
- 节点N2（图像生成节点）：输入"生成角色A的全身参考图"
- 节点N3（视频生成节点）：输入"角色A在场景中缓步走向镜头"

创作者用有向边连接 N1→N2 和 N2→N3。

**画布Agent的自主编排过程**：

**回合1 — 感知阶段**

画布Agent读取当前图拓扑：
```
拓扑快照:
  N1[类型:script.analyze] ──→ N2[类型:image.generate] ──→ N3[类型:video.generate]
  
  端口信息:
    N1.输出 = {character_profile, shot_list}
    N2.输入 = {prompt, character_profile, image}
    N2.输出 = {image, prompt}
    N3.输入 = {video, image, prompt}
  
  状态: N1=idle, N2=idle, N3=idle
```

Agent从拓扑中推理出："这是一个三阶段串行管线。N2依赖N1的角色信息，N3依赖N2生成的图像。N1是起点，目前所有节点均未开始。"

**回合2 — 创作者触发N1生成，Agent执行认知与行动**

创作者点击N1的"生成"按钮。

Agent的认知层（C1）：N1的节点类型为script.analyze，输入文本约2000字符，分析深度"详细"→ 推理："这是一个剧本分析任务，需要执行任务分离"。

Agent的认知层（C2）：执行语义分离，将分析任务拆分为四个子任务（角色提取A、场景提取B、声音设计C、分镜生成D）。执行依赖分析：A和B和C无相互依赖→并行组{A,B,C}；A→D（D需要A的character_profile输出）。生成调度计划：并行提交A、B、C；A完成后自动触发D。

Agent的行动层（A3）：并行提交子任务A、B、C，返回三个任务标识符。为每个子任务启动独立轮询通道。

Agent感知子任务A的轮询返回"completed"。Agent的认知层（C2）检测到D的前置依赖条件满足。Agent的行动层（A3）自动构建D的输入（完整剧本+角色提取结果），提交D，启动第四个轮询通道。

所有子任务完成后，Agent的行动层（A4）获取各子任务结果，组装为完整分析报告，更新N1的预览区域（四标签页展示），将character_profile和shot_list数据注册到N1的输出端口。

**回合3 — 创作者触发N2生成，Agent执行自动数据汇流**

创作者点击N2的"生成"按钮。

Agent的感知层（P1+P2）：
- 从N2沿入边向上游追溯 → 找到源节点N1
- 读取N1的输出端口 → character_profile类型数据（角色A的结构化外貌描述）+ shot_list类型数据（分镜表）
- N2的输入端口声明接受character_profile和prompt类型

Agent的认知层（C3）：
- 将N1的character_profile数据组装到参考上下文对象中
- 检测到上下文中有character_profile数据 → 将其作为"角色一致性约束"追加到创作者的提示词之后
- 读取创作者在N2参数面板选定的视觉风格参数（色彩倾向=暖调、光学特征=柔焦散景、介质风格=低颗粒度）
- 调用结构化前缀编译器，将参数编译为`[ColorTendency: warm] [OpticalCharacteristic: soft-focus-bokeh] [MediumStyle: low-grain]`格式的前缀，注入到合并后的提示词之前

Agent的行动层（A2）：
- 完整生成指令 = `[结构化参数前缀] + [创作者提示词] + [角色一致性约束: 角色A的外貌描述]`
- 通过Provider注册表查询image.generate能力，获取可用Provider，提交任务

生成完成后，Agent更新N2的预览区域（显示生成的角色图）和输出端口（注册image类型数据）。

**回合4 — 创作者触发N3生成，Agent再次执行自动数据汇流**

创作者点击N3的"生成"按钮。

Agent感知N3的入边源节点N2，读取N2的输出端口获得image数据（N2刚生成的图像URL）和prompt数据（实际使用的完整提示词）。Agent将这些数据注入N3的生成请求。N3的Provider以N2的图像为视觉条件生成视频。

**回合5 — 迭代调整（展示Agent的持续感知能力）**

创作者对视频不满意，修改N2的提示词（追加"面部特征：圆脸、大眼睛"），重新点击N2生成。Agent自动执行N2的数据汇流（N2的入边数据未变，但提示词变了）。N2生成新图像后，Agent自动将N2输出端口的数据从"旧图像URL"更新为"新图像URL"。创作者再次点击N3生成时，Agent自动汇入更新后的图像URL——整个过程创作者无需任何手动文件操作。

**本实施例的核心要点**：

在整个流程中，创作者只做了三件事：(1) 放置节点和连线（表达意图拓扑），(2) 写提示词（表达具体需求），(3) 点击"生成"按钮（触发执行）。所有其余工作——任务拆分、依赖分析、并行编排、数据收集、上下文组装、参数编译、提示词合并、任务路由、进度监控、结果更新——均由画布Agent自主完成。这就是"画布即Agent"的核心价值：**创作者表达what（想要什么），Agent自主完成how（怎么做到）**。

**English**:

**English**:

This embodiment describes the complete flow of a creator using the present system to complete a multi-modal creative pipeline including script analysis → character image generation → video generation through the Canvas Agent's autonomous orchestration. The Canvas Agent perceives the three-node topology (N1 script analysis → N2 image generation → N3 video generation), cognizes the three-stage serial pipeline with cross-node data dependencies, and acts by: submitting script analysis with task separation (four parallel sub-tasks with dependency triggering), automatically collecting N1's character_profile output and injecting it into N2's generation request with structured parameter prefix compilation, and automatically transferring N2's generated image to N3's video generation request. When the creator iteratively adjusts N2's prompt, the Agent automatically updates all downstream node inputs through the directed edges — requiring zero manual file operations. The core value demonstrated: the creator expresses **what** (intent topology + prompts), and the Agent autonomously completes **how** (all underlying orchestration).

---

### 6.2 实施例二：画布Agent执行五层结构约束精确提取

**中文**：

本实施例展示画布Agent在感知到创作者的"提取意图"后，如何利用五层结构约束认知能力对参考图进行精确分析并编译约束型提示词。

**输入条件**：
- 参考图：一张室内场景照片，画面中包含一个放置于木质边桌上的陶瓷花瓶、一把椅子、一扇窗户和若干装饰品
- 创作者在N2（图像生成节点）中输入："提取图中的花瓶，白色背景，多角度展示"
- 创作者通过@mention引用了包含该参考图的N1节点

**Agent的感知与认知过程**：

**第1步 — 意图感知与智能路由**

Agent的感知层（P4）对N2的提示词文本执行关键词模式匹配：
- "提取" ✓ → 命中提取意图关键词集
- 检测到对N1（image类型节点）的@mention引用 ✓

Agent的认知层（C1）推理：两个条件同时满足 → "创作者意图为视觉主体提取" → 选择"五层结构约束视觉提取管线"。

**第2步 — 五层结构约束认知分析**

Agent调用视觉提取子Agent对参考图执行自顶向下的五层认知分析。以下是Agent认知分析的结构化输出：

**第1层 — 类别定位**
```
目标物类别：陶瓷容器（ceramic vessel）
定位策略：使用最大外延功能性分类。避免使用"青花瓷瓶"、"装饰花瓶"等
窄化分类词——它们携带的形态偏见会干扰后续的精确约束锁定。
```

**第2层 — 功能结构约束**（不可变的"骨架"特征）
```
- 封闭结构：是（可用于盛放物品）
- 盖：无盖（顶部开口外露）
- 开口形状：圆形，开口直径 ≈ 瓶身最大直径 × 1/3（小口设计）
- 把手：无把手（瓶身两侧对称光滑，无可抓握的突出结构）
- 底部放置：平底，可独立稳定放置于平面
- 倾倒结构：无（非壶/瓶类器皿，无壶嘴或引流槽）
- 对称性：沿垂直中轴完全旋转对称
```

**第3层 — 形态结构约束**（几何描述，零审美词汇）
```
- 瓶身截面轮廓：S曲线型。从底部向上逐渐膨胀至中部偏下区域达到最大直径，
  然后向上逐渐收窄至瓶颈，瓶颈以上略微外扩至口沿
- 瓶颈与瓶身比例：瓶颈高度 ≈ 整体高度的 1/5
- 最大直径位置：整体高度的下部1/3处（偏低重心设计）
- 整体高宽比：高度:最大宽度 ≈ 2.5:1
- 底部收窄方式：从中部最大直径处向下逐渐均匀收窄，
  底部直径 ≈ 最大直径 × 2/3
- 口沿处理：平口，口沿处轻微加厚形成圆润唇边
- 肩部过渡：平滑弧线过渡，无锐利折角
```

**第4层 — 细节约束**（"指纹"特征，附参考图位置）
```
- 表面装饰布局（参考位置：瓶身正面中部区域）：
  横向分区装饰 —— 上部（瓶颈至口沿）单色无装饰；
  中部（瓶身主体）连续环绕的植物纹样（卷叶与花卉母题），
  上下以细线界定装饰区域边界；
  下部（瓶身下段至底部）单色无装饰
- 装饰颜色（参考位置：瓶身主体中部）：深蓝色（类似钴蓝）纹样，
  绘制于米白色底釉之上
- 标记（参考位置：底部中央，仅底部视图可见）：方形印记，可能为制造标记
- 表面光泽度（参考位置：瓶身整体）：中等光泽 —— 非镜面高光，
  有柔和的漫反射，典型上釉陶瓷光泽
- 材质纹理（参考位置：瓶身主体高光区域）：釉面均匀，
  肉眼可见极轻微的釉面气泡（手工施釉特征），瓶身表面无显著裂纹或修复痕迹
```

**第5层 — 排除约束**（"禁区"划定）
```
以下各项为该品类在市场和训练数据中的常见变体，
且从参考图中可明确判断其不存在：

NOT 双耳结构（瓶身两侧无对称把手）
  → 排除"双耳花瓶"变体（统计先验概率：约20%）
NOT 广口设计（开口直径显著小于瓶身最大直径）
  → 排除"广口花瓶"和"碗形花瓶"变体（统计先验概率：约15%）
NOT 透明/半透明材质
  → 排除"玻璃花瓶"变体（统计先验概率：约25%）
NOT 表面浮雕/立体装饰（装饰完全为釉下平面绘制）
  → 排除"浮雕花瓶"变体（统计先验概率：约10%）
NOT 多层/嵌套/组合结构
  → 排除"套瓶"和"多部件组合花瓶"变体
NOT 金属部件（瓶身、口沿、底部均无金属包边、提梁或底座）
  → 排除"金属件花瓶"变体
NOT 方形/多边形/异形截面（截面为圆形，旋转对称）
  → 排除"方形花瓶"和"异形截面花瓶"变体
NOT 表面冰裂纹/开片效果（釉面完整连续）
  → 排除"冰裂纹风格花瓶"变体
```

**第3步 — 约束编译与生成**

Agent将五层分析结果编译为结构约束型生成提示词（简要示意）：

```
[参考图直引声明]
以所附参考图为第一视觉来源，锁定图中目标陶瓷花瓶的所有视觉信息。

[约束项]
类别：陶瓷容器(ceramic vessel)
功能结构：无盖|小口(Φ=瓶身×1/3)|无把手|平底|旋转对称|无倾倒结构
形态结构：S曲线轮廓|瓶颈占比1/5|最大直径@下部1/3|高宽比2.5:1|底部收窄至×2/3|平口+圆唇边|平滑弧肩
细节：横向三区装饰(上单色+中蓝彩植物卷叶纹/细线边界+下单色)|钴蓝/米白|中等光泽(上釉陶瓷)|微气泡|底部印记(仅底视)
排除：NOT(双耳|广口|透明|浮雕|多层|金属件|异形截面|冰裂纹)

[场景]
白色无缝背景，均匀柔和摄影棚灯光，产品摄影风格，
三视图布局（正视图中央+侧视图右侧+俯视图右上小图）
```

提交生成后，返回三视图结果——花瓶的功能结构、形态比例、表面细节均与参考图一致，白色背景，排除约束完全生效（无把手、非广口、非透明、无浮雕等）。

**技术效果验证**：

使用同一参考图和"提取图中的花瓶"输入，分别走普通语义标签管线和五层约束管线，对比结果显示五层约束方法在功能结构一致性、形态比例偏差、细节保留度三个维度上均显著优于传统方法。排除约束层的加入使常见变体的误生成概率降至最低。

**English**:

**English**:

This embodiment demonstrates the complete execution of the five-layer structural constraint extraction method using "extracting a specific ceramic vase from an interior scene reference image" as an example. The Canvas Agent perceives the "extract" keyword + @mention reference to an image node → cognizes extraction intent → routes to the Visual Extraction pipeline. The Agent's five-layer cognitive analysis is detailed with concrete outputs for each layer: Layer 1 (Category Positioning: "ceramic vessel" — broadest functional classification), Layer 2 (Functional Structure: no lid, small opening at 1/3 of max diameter, no handles, flat base, rotationally symmetric), Layer 3 (Morphological Structure: S-curve profile, neck at 1/5 of total height, max diameter at lower 1/3, H:W ratio ≈ 2.5:1, bottom tapers to 2/3 of max diameter, flat rim with rounded lip, smooth arc shoulder), Layer 4 (Detail Constraints: horizontal tri-zone decoration with blue botanical scroll pattern on cream-white base, medium gloss glazed ceramic, visible micro-bubbles, square mark on base visible only from bottom view), Layer 5 (Negative Constraints: NOT dual-handled, NOT wide-mouth, NOT transparent/glass, NOT relief-decorated, NOT multi-layered/nested, NOT metal-fitted, NOT square/irregular cross-section, NOT crackle-glazed). A comparison table quantifies the difference between traditional semantic label methods and the five-layer constraint method across functional structure, morphological proportions, and detail feature dimensions.

---

### 6.3 实施例三：画布Agent对长文本剧本的分离式自主分析

**中文**：

本实施例展示画布Agent在面对约5000字符剧本（12场景/8台词角色/若干群众角色）时，如何利用任务分离异步并行认知能力自主完成分析。

**Agent的自主编排过程**：

**(1) 感知**：Agent感知N1（剧本分析节点）的输入文本规模和参数配置。文本约5000字符，分析深度设为"详细"。

**(2) 认知-语义分离**：Agent将整体分析任务按语义边界拆分为四个独立子任务：
- 子任务A：角色提取（关注"谁"→结构化角色清单）
- 子任务B：场景提取（关注"哪里"→结构化场景清单）
- 子任务C：分镜生成（关注"怎么拍"→结构化分镜表，依赖A的角色输出）
- 子任务D：声音设计（关注"什么声音"→配乐风格建议）

**(3) 认知-依赖分析**：Agent分析各子任务的输入/输出数据类型匹配关系。A和B的输出类型无交集→无相互依赖；C的输入需A的character_profile类型→C依赖A；D不依赖其他→独立。

**(4) 认知-调度计划生成**：Agent生成调度计划：并行组{A, B, D}同时提交；串行链A→C在A完成时自动触发。

**(5) 行动-并行提交**：Agent同时提交A、B、D，返回三个独立的任务标识符。为每个标识符启动独立轮询通道，轮询间隔根据各子任务类型的平均耗时动态选择。

**(6) 行动-依赖触发**：子任务A的轮询首次返回"completed"，Agent立即：(i)提取A的结构化角色清单；(ii)构建C的输入（完整剧本+A的输出）；(iii)提交C，启动第四个轮询通道。

**(7) 行动-结果组装**：全部四个子任务完成后，Agent将结果按类型合并为统一JSON，N1的预览区域以四个标签页展示。

**关键技术行为**：
- 若子任务B在轮询中返回"failed"（如网络波动），Agent仅对B执行独立重试——已完成的A、D、C结果不受影响，无需重新执行。
- 创作者在等待期间可以关闭页面。重新打开时，Agent从持久化文件中读取四个子任务标识符，恢复所有轮询——已完成的任务直接返回缓存结果，进行中的任务继续轮询。

**English**:

**English**:

This embodiment demonstrates the Canvas Agent's autonomous separated analysis of a script of approximately 5,000 characters (12 scenes, 8 speaking characters, multiple crowd characters). The Agent's semantic separation splits the task into four sub-tasks (Character Extraction A, Scene Extraction B, Storyboard Generation C, Sound Design D). Dependency analysis determines: A, B, D have no mutual dependency → submitted in parallel; C depends on A's character_profile output → triggered upon A's completion. The Agent autonomously submits A, B, D simultaneously with independent polling channels, detects A's completion event, and auto-triggers C with A's output injected as input. On completion of all four, results are assembled into a unified tabbed display. Key technical behaviors: if any sub-task fails, only that sub-task independently retries — other completed results are unaffected. If the creator closes the page during execution, upon reopening the Agent recovers all sub-task identifiers from the persistent state file and resumes polling — completed tasks return cached results, in-progress tasks continue polling.

---

### 6.4 实施例四：画布Agent的3D世界——从AI建模到3D场景构建的闭环管线

**中文**：

本实施例详细展示画布Agent如何在3D世界维度中，自主编排一条"AI生成3D模型→自动导入3D场景编辑器→布光与机位设置→渲染输出驱动2D生成"的完整闭环管线。

**步骤1：AI生成3D模型**

创作者在画布Agent上放置一个Tripo3D节点（AI建模节点），输入文本描述："一把中世纪风格的木质扶手椅，高靠背，雕花扶手，天鹅绒坐垫，深棕色橡木材质"。

Agent的认知层分析：输入为纯文本→选择文本到3D模式（Text-to-3D）。创作者选择高精度系列（约150万面，PBR材质，精细贴图质量）。

Agent通过Provider注册表查询3D模型生成能力，提交任务，启动轮询。生成完成后，Agent自动执行：(i) 将GLB模型文件保存至模型资产库；(ii) 在节点预览区展示模型的实时交互式3D预览（创作者可在预览区旋转、缩放、平移观察模型的每个角度）；(iii) 将模型URL和路径注册到节点的model_3d类型输出端口。

**步骤2：3D场景编辑器中的自动模型导入**

创作者在画布Agent上放置一个3D场景节点（Scene3DNode），并从Tripo3D节点的输出端口拖出有向边连接至3D场景节点的model-in输入端口。

Agent感知到有向边建立，执行端口兼容性校验——model_3d类型满足3D场景节点的model-in端口类型要求，连接批准。

创作者打开3D场景节点的全屏编辑器。Agent检测到creator打开编辑器，且model-in端口有可用数据（步骤1中生成的扶手椅模型），自动执行模型导入流程：

(1) 验证模型文件的URL可访问性（HEAD请求确认文件存在）；
(2) 将GLB模型加载至3D场景中，自动标准化材质（PBR标准材质，粗糙度/金属度参数映射）；
(3) 自动计算模型的包围盒，进行缩放适配，使模型在场景中的最大尺寸标准化为单位尺度；
(4) 将模型放置在场景原点；
(5) 在编辑器的模型面板中显示该模型的缩略图和诊断信息（三角面数、顶点数、预估GPU显存占用）。

创作者无需执行任何"下载→保存→导入"操作——画布Agent自动完成了整个导入管线。

**步骤3：电影级灯光与多机位设置**

创作者在3D场景编辑器中为扶手椅模型搭建展示场景：

**灯光设置**：创作者浏览Agent的灯光预设库，依次尝试"黄金时刻暖光"（暖色方向光+ACES色调映射，营造温馨的家居氛围）和"摄影棚三点布光"（主光+补光+轮廓光的经典产品摄影布光方案）。创作者选择后者——Agent即时更新场景中所有光源：设置主光（DirectionalLight，方位角45°、仰角30°、强度1.8、色温5500K、投射PCFSoft阴影）、补光（方位角-45°、仰角15°、强度0.8、色温4500K、无阴影）、轮廓光（方位角180°、仰角60°、强度1.2、色温6500K）。

Agent感知到灯光预设的切换事件，同时在3D场景中更新渲染管线的后期处理参数：色调映射切换为ACESFilmic，曝光调整为0.8。

**多机位设置**：创作者在场景中创建三个虚拟摄像机机位：
- 机位1（正面中景）：35mm镜头，T5.6光圈，正面偏上15°俯角——展示扶手椅的正面全景
- 机位2（45°特写）：85mm镜头，T2.8光圈——聚焦扶手椅的雕花扶手和天鹅绒坐垫细节，背景适度虚化
- 机位3（低角度仰拍）：24mm镜头，T8光圈——从低角度仰拍，强调扶手椅的高靠背和庄严感

Agent在编辑器的画中画（PiP）取景器中实时渲染当前选中机位的取景画面——创作者在PiP窗口中可以看到景深效果（机位2的T2.8大光圈产生显著的焦外虚化）。

**步骤4：3D→2D输出贯通**

创作者将三个机位的快照输出至下游节点：

**快照输出**：创作者的3D场景节点有一个image类型输出端口。当创作者在编辑器中触发"快照"操作（当前选中机位2），Agent：将3D场景从机位2的视角渲染为高分辨率PNG → 将渲染图像注册到3D场景节点的image输出端口 → 如果下游有图像生成节点通过有向边连接，该图像自动成为下游节点的参考输入。

**灯光参数的结构化注入**：Agent的认知层（C3）读取当前3D场景的灯光方案（摄影棚三点布光），编译为结构化文本描述："主光方向=右上方45°、色温=5500K(日光)、强度=高、影调=高对比度；补光=左方柔光、强度=中低；轮廓光=后方上方、色温=6500K(冷白)；整体氛围=专业产品摄影布光、ACES电影级色调映射"。

该结构化灯光描述通过有向边传递至下游图像生成节点——当创作者在该节点输入"生成这把扶手椅在豪华书房中的场景图"时，Agent将灯光描述作为风格约束注入提示词，使AI生成的2D图像在光照氛围上与3D场景保持一致。

**步骤5：摄像机运动与视频输出**

创作者为机位1设置环绕运动rig——摄像机围绕扶手椅做180°的半圆弧运动（半径3米、高度1.2米、速度曲线为缓入缓出），并在运动中叠加旋转关键帧（摄像机始终看向扶手椅中心）。

Agent的3D编辑器提供时间轴面板——创作者在时间轴上拖动播放头预览摄像机运动。创作完成后，创作者触发"录制"操作。Agent：在时间轴上逐帧渲染摄像机运动画面（30fps）→ 通过Canvas CaptureStream API捕获渲染帧 → 以高码率VP9编码封装为WebM视频 → 将视频URL注册到3D场景节点的video类型输出端口。

如果下游有视频生成节点通过有向边连接，录制的视频自动成为该节点的输入素材——Agent实现了从3D场景到AI视频生成的无缝数据传递。

**步骤6：迭代闭环**

创作者对AI生成的2D场景图不满意（"书房的光线太冷"），回到3D场景编辑器，将灯光预设从"摄影棚三点布光"切换为"经典好莱坞暖调"。Agent自动更新3D场景灯光，重新渲染快照，更新3D场景节点的image输出端口。创作者重新点击下游图像生成节点，Agent自动汇入更新后的快照和更新后的灯光描述——生成结果的光照氛围从冷调产品风格转为暖调电影风格。

**本实施例的核心要点**：

整条管线——"AI生成3D模型→自动导入3D场景→灯光/机位搭建→3D渲染输出→驱动2D AI生成"——在现有技术中需要至少四个独立工具和大量手动文件操作。在本发明中，画布Agent将全部步骤统一编排：(a) 3D生成和3D编辑是有向图中的相邻节点，而非独立应用；(b) AI生成的模型自动流入3D编辑器；(c) 3D场景的视觉产出（快照、视频、灯光参数）自动流入下游2D生成节点；(d) 迭代修改仅需调整上游节点参数并重新生成/渲染，整个管线自动更新。

**English**:

**English**:

This embodiment demonstrates the Canvas Agent autonomously orchestrating a complete closed-loop pipeline in the 3D world dimension: "AI 3D Model Generation → Auto-Import into 3D Scene Editor → Lighting and Camera Setup → Render Output Driving 2D Generation." Step 1: The creator places a Tripo3D node and inputs a text description of a medieval wooden armchair; the Agent selects Text-to-3D mode, submits the task, polls until completion, saves the GLB model to the asset library, displays an interactive WebGL 3D preview, and registers the model to the model_3d output port. Step 2: The creator connects the Tripo3D node to a Scene3DNode via directed edge; upon opening the 3D editor, the Agent auto-validates model file existence, loads the GLB model, standardizes PBR materials, computes bounding boxes and scales adaptively, and places the model at scene origin — requiring zero manual download/import operations. Step 3: The creator browses cinematic lighting presets (selecting Studio Three-Point Lighting) and deploys three virtual cameras with different lens/camera setups (35mm wide, 85mm telephoto with T2.8 DoF, 24mm low-angle). Step 4: The Agent renders snapshots from selected cameras to the image output port and structurally compiles the 3D lighting parameters into text descriptions injected into downstream image generation prompts — achieving cross-dimensional lighting consistency. Step 5: A 180° orbital camera motion rig is configured and recorded as WebM video, auto-registered to the video output port. Step 6: The creator iterates by switching lighting presets from Studio to Hollywood Warm — the Agent auto-updates the 3D scene, re-renders the snapshot, and all downstream nodes receive updated inputs automatically. This closed-loop pipeline ("AI Generation → 3D Editing → AI Re-Generation") would require at least four independent tools in prior art; in the present invention, it is autonomously orchestrated by the Canvas Agent as a single continuous workflow.

---

## 七、工业实用性 / Industrial Applicability

**中文**：

本发明具有明确的工业实用性，可在以下产业场景中直接应用：

1. **影视与广告行业**：画布Agent作为导演/美术指导/摄影师的智能创作伙伴，用于前期概念设计、分镜制作、角色设计和配乐风格定位。Agent的自主编排能力使跨模态视觉开发（Visual Development）工作流在统一平台上连贯执行。

2. **游戏开发行业**：用于角色概念设计、道具设计、场景氛围图和过场动画分镜。五层结构约束提取特别适用于从概念图中提取特定道具进行精细化三维建模的流水线。

3. **产品与工业设计行业**：用于产品概念图的AI辅助生成、从参考图中提取设计元素进行变体设计、AI驱动的3D模型快速原型生成、以及在3D场景编辑器中搭建产品展示环境（布光+多角度渲染）。结构化参数注入确保不同产品图之间的视觉风格一致性。画布Agent的3D世界维度使设计师可以在同一平台上完成"AI生成产品3D模型→3D场景布光→多角度渲染输出→2D AI场景图生成"的完整产品视觉开发管线。

4. **出版与漫画行业**：用于漫画分镜脚本的AI辅助编排、角色设定集的批量生成、场景透视参考图的快速生成。

5. **教育与培训行业**：作为AI创作教学平台，帮助学生理解多模态AI生成的Agent化工作流逻辑、提示词工程的结构化思维、以及视觉提取的约束方法论。

**English**:

The present invention has clear industrial applicability and can be directly applied in the following industrial scenarios:

1. **Film, Television, and Advertising Industry**: The Canvas Agent serves as an intelligent creative partner for directors, art directors, and cinematographers in pre-production concept design, storyboard creation, character design, and music scoring style positioning. The Agent's autonomous orchestration capability enables cross-modal Visual Development workflows to execute coherently on a unified platform.

2. **Game Development Industry**: Used for game character concept design, prop design, scene atmosphere images, and cutscene storyboards. The five-layer structural constraint extraction is particularly suited for pipelines extracting specific props from concept images for refined 3D modeling. The 3D world dimension's real-time scene editor and cinematic lighting system provide game developers with a rapid prototyping environment for scene composition and lighting design.

3. **Product and Industrial Design Industry**: Used for AI-assisted generation of product concept images, extracting design elements from reference images for variant design, AI-driven rapid 3D model prototyping, and building product presentation environments (lighting + multi-angle rendering) within the 3D scene editor. Structured parameter injection ensures visual style consistency across different product images. The Canvas Agent's 3D world dimension enables designers to complete the full product visual development pipeline — "AI generate product 3D model → 3D scene lighting → multi-angle render output → 2D AI scene image generation" — entirely on a single platform.

4. **Publishing and Comics Industry**: Used for AI-assisted orchestration of comic storyboard scripts, batch generation of character design sheets, and rapid generation of scene perspective reference images.

5. **Education and Training Industry**: Serves as an AI creation teaching platform, helping students understand the Agent-based workflow logic of multi-modal AI generation, structured thinking in prompt engineering, the constraint methodology of visual extraction, and the integration of 3D world construction with AI generation pipelines.

---

## 八、权利要求 / Claims

**中文**：

**权利要求1**：一种以无尽画布为智能Agent的多模态AI内容生成方法，其特征在于，所述无尽画布被设计为一个具有感知、认知和行动能力的智能Agent（以下简称"画布Agent"），所述方法包括以下步骤：

(a) 画布Agent的**感知步骤**——持续感知有向图中的以下信息维度：各节点的类型和端口数据类型标识、各节点之间的有向边连接拓扑关系、各节点的生成状态和进度、以及创作者在各节点中输入的提示词语义内容；其中，端口数据类型标识选自image、video、audio、prompt、character_profile、shot_list和model_3d；

(b) 画布Agent的**认知步骤**——基于感知信息执行以下推理：(i) 综合节点的类型、创作者的提示词语义和参考上下文的内容特征，推理创作意图并自主选择对应的后端生成管线；(ii) 当面对复杂分析任务时，将任务按语义边界拆分为独立子任务，分析子任务间的输入/输出数据类型依赖关系，生成并行-串行混合调度计划；(iii) 在生成请求提交前，自动收集目标节点所有上游节点的输出数据，按类型组装为参考上下文对象，并根据所选管线对上下文进行约束编译或参数注入；

(c) 画布Agent的**行动步骤**——基于认知结果执行以下行动：(i) 自动将参考上下文对象注入目标节点的生成请求；(ii) 根据管线选择结果，通过统一Provider抽象层将任务路由至对应的AI服务；(iii) 并行提交无依赖关系的子任务，在依赖条件满足时自动触发后续子任务；(iv) 为每个进行中任务维护独立的轮询通道和失败重试机制；(v) 在每次状态变更时触发增量同步，将变更实体差异集持久化至后端。

**权利要求2**：根据权利要求1所述的方法，其特征在于，所述认知步骤(iii)中，当画布Agent推理出创作者的意图为"视觉主体提取"时——即创作者提示词包含提取意图关键词（包括但不限于提取、抠出、单独、分离、三视图、建模预备）且参考上下文对象中同时包含image类型数据——Agent自动选择五层结构约束提取管线，执行以下认知分析：

- 第1层（类别定位）：使用最大外延的功能性分类词定位目标物类型，避免窄化分类词引入的形态偏见；
- 第2层（功能结构约束）：记录决定目标物使用功能的不可变结构特征，以二值属性或有限离散值描述；
- 第3层（形态结构约束）：以几何描述语言记录形状特征和比例关系，禁止使用审美风格词汇；
- 第4层（细节约束）：记录参考图中实际可见的细节元素、数量及位置，每项附带可验证性说明；
- 第5层（排除约束）：列举该类物品常见但参考图中确定不存在的变体特征，以否定形式标注，在生成模型概率空间中划定排除区域；

将五层分析结果编译为结构约束型生成提示词——该提示词以参考图直引声明开头，随后逐层列出约束项，排除约束采用否定标注格式。

**权利要求3**：根据权利要求1所述的方法，其特征在于，所述认知步骤(ii)中的任务分离包括：

- 将整体分析任务按语义边界拆分为多个独立子任务，每个子任务封装独立的系统提示词和输入输出格式规范；
- 对子任务集合执行依赖分析——两个子任务的输出数据类型无交集则无依赖关系、子任务A的输出数据类型被子任务B声明为输入则B依赖A——构建子任务依赖有向图；
- 无依赖关系的子任务归入并行组，Agent同时提交并行组内所有子任务；有依赖关系的子任务形成串行链，Agent在前置任务完成事件触发时自动提交后继任务；
- 所有子任务的任务标识符持久化至后端状态文件，支持画布Agent在客户端断开重连后恢复轮询而无需重新提交任务。

**权利要求4**：根据权利要求1所述的方法，其特征在于，所述认知步骤(iii)还包括：画布Agent维护一个独立于任何特定AI模型的视觉风格参数知识库，参数按成像设备特性、光学系统特征和感光介质特征三个维度分层组织，每条参数包含标准化标识符和结构化表达格式；在生成请求提交前，Agent读取创作者的参数选择，编译为结构化前缀字符串（格式为`[参数类别: 参数值]`），按设备→光学→介质的顺序注入创作者自然语言提示词之前。

**权利要求5**：根据权利要求1所述的方法，其特征在于，画布Agent的感知步骤(a)通过双通道机制感知创作者的跨节点参考意图：

- **自动数据流通道**：通过有向边连接的节点间，Agent自动将源节点生成完成后的输出端口数据注册为目标节点的可用参考资源，在目标节点触发生成时自动收集并注入；
- **语义引用通道**：创作者在提示词中通过触发符号引用其他节点，Agent在被引用节点处显示内联预览缩略图；生成提交时Agent解析所有引用标记，读取被引用节点的生成结果附加到请求中；
- Agent综合两个通道的信息执行意图推理——两个通道同时提供参考信息时，Agent推理为"参考图增强生成"意图；语义引用通道提供参考且提示词包含提取关键词时，Agent推理为"视觉提取"意图。

**权利要求6**：根据权利要求1所述的方法，其特征在于，所述行动步骤(ii)中的统一Provider抽象层包括：

- 标准化Provider接口定义，包含任务提交（接收标准化请求参数，返回任务标识符）、状态查询（接收任务标识符，返回状态和进度）和结果获取（接收任务标识符，返回生成产物）三个方法；
- 能力-服务映射的Provider注册表，每种生成能力下可注册多个Provider实例，支持画布Agent在执行任务路由时进行负载均衡或故障切换；
- 为每种任务类型维护独立的轮询策略配置，配置参数基于历史任务执行数据的统计分析进行动态优化。

**权利要求7**：根据权利要求1所述的方法，其特征在于，所述行动步骤(v)中的增量同步包括：

- 画布Agent在前端内存中使用Map数据结构存储有向图状态（以节点ID/边ID为键），提供O(1)的查找和更新性能；
- Agent维护一个变更计数器，每次节点或边的增删改操作递增计数器；
- Agent仅在计数器变化时执行增量同步——对比当前状态快照与上次同步快照，仅序列化并传输差异实体集（新增/修改/删除的节点和边）；
- 后端以结构化文件持久化完整状态快照，包括所有节点元数据、生成结果引用、边连接关系和进行中任务标识符；
- 服务重启时，Agent从持久化文件完整恢复画布状态，并自动恢复所有进行中任务的轮询。

**权利要求8**：根据权利要求1所述的方法，其特征在于，所述画布Agent内建一个三维世界维度，所述三维世界维度包括以下子能力且作为Agent感知-认知-行动循环的有机组成部分：

(a) **AI驱动3D模型生成的认知与行动**：Agent接收创作者的文本描述或参考图像，自动选择文本到3D或图像到3D生成模式，根据下游用途决策模型精度等级（高精度系列/低多边形系列）和PBR材质贴图配置；生成完成后，Agent自动将模型文件保存至模型资产库，在节点预览区提供基于WebGL的实时交互式3D预览，将模型URL和路径注册至model_3d类型输出端口；

(b) **实时WebGL 3D场景编辑器的感知与行动**：Agent在3D场景节点中提供完整的3D世界构建能力，包括基础几何体体系、人体角色系统（含预设姿态库和外部模型加载）、电影级物理灯光系统（包含多个预设灯光方案，每个预设定义方向光/辅助光/环境光/色调映射/曝光的完整参数集）、多机位虚拟摄影系统（每个机位具有独立三维位置、镜头规格和物理光圈景深参数）、摄像机运动系统（轨道/曲线/环绕三种运动rig，支持速度曲线和旋转关键帧）；Agent感知3D场景中所有对象、灯光和摄像机的状态变化，并在画中画取景器中实时渲染选定机位的取景画面；

(c) **3D→2D双向数据贯通**：Agent将3D场景节点的视觉产出自动汇入有向图数据流——快照输出（选定摄像机视角的高分辨率渲染图像，注册至image类型输出端口）、视频录制输出（摄像机运动rig的完整运动过程录制为视频，注册至video类型输出端口）、灯光参数的结构化注入（将3D场景的物理灯光方案编译为结构化文本描述，传递至下游图像生成节点作为风格约束）；Agent同时支持2D→3D逆向贯通——上游AI生成的3D模型通过有向边自动导入3D场景编辑器，上游生成的参考图像驱动灯光方案和摄像机角度的选择，上游分析的角色描述驱动3D角色的模型和姿态配置。

**权利要求9**：根据权利要求8所述的方法，其特征在于，所述电影级物理灯光系统与画布Agent的结构化参数注入认知能力（权利要求4）联合工作——Agent将3D场景中的灯光物理参数（包括色温、光照方向向量、强度比值、色调映射方案和氛围描述）编译为结构化风格前缀，通过有向边注入下游AI图像生成节点的提示词中，确保AI生成的2D图像在光照氛围上与3D场景保持跨维度一致性。

**权利要求10**：根据权利要求8所述的方法，其特征在于，所述3D场景编辑器中的AI模型自动导入流程包括：Agent感知到上游model_3d类型数据通过有向边到达3D场景节点的model-in输入端口时，自动执行文件存在性验证（HEAD请求）、加载GLB/FBX模型至场景、PBR材质标准化映射、包围盒计算与缩放适配、模型面板注册与诊断信息展示（三角面数/顶点数/预估显存占用），全程无需创作者执行手动下载、保存或导入操作。

**权利要求11**：一种以无尽画布为智能Agent的多模态AI内容生成系统，其特征在于，包括：

- **画布Agent前端模块**：用于执行权利要求1-10中任一项所述的方法，提供无限画布上的节点编排、有向边连接、双通道感知、自动数据汇流、增量状态同步、以及3D场景编辑器（含WebGL实时渲染、灯光系统、多机位系统和摄像机运动系统）功能；
- **画布Agent后端调度模块**：用于执行权利要求6所述的方法，提供统一Provider抽象、自适应任务调度和异步任务生命周期管理，所述Provider抽象层的注册能力包括AI 3D模型生成能力类型；
- **画布Agent认知模块**：用于执行权利要求2、3和4所述的方法，提供五层结构约束提取、任务分离异步并行管线和结构化参数注入的认知能力，其中所述结构化参数注入的认知编译能力进一步支持将3D场景的物理灯光参数编译为2D图像生成的风格约束。

**权利要求12**：根据权利要求11所述的系统，其特征在于，所述画布Agent前端模块、后端调度模块和认知模块协同工作构成画布Agent的感知-认知-行动完整闭环——前端模块负责感知层的图拓扑、端口类型、生成状态、语义意图以及3D场景状态（对象/灯光/摄像机/角色姿态）的信息采集；认知模块基于感知信息执行意图推理、管线选择、依赖分析、约束编译和3D→2D跨维度参数映射；后端调度模块根据认知决策执行任务提交、轮询调度和状态持久化；行动结果通过前端模块更新节点状态、3D场景渲染和预览区域，形成新的感知输入，完成闭环。

**权利要求13**：一种计算机可读存储介质，其上存储有计算机程序指令，该指令被处理器执行时实现权利要求1至10中任一项所述的方法。

---

**English**:

**Claim 1**: A multi-modal AI content generation method with an infinite canvas serving as an intelligent Agent...

**Claim 1**: A multi-modal AI content generation method with an infinite canvas serving as an intelligent Agent, characterized in that the infinite canvas is designed as an intelligent Agent with perception, cognition, and action capabilities (hereinafter referred to as the "Canvas Agent"), the method comprising: (a) a Perception Step — continuously perceiving the following information dimensions in a directed graph: types and port data type identifiers of each node, directed edge connection topology relationships between nodes, generation status and progress of each node, and semantic content of prompts entered by creators in each node, wherein port data type identifiers are selected from image, video, audio, prompt, character_profile, shot_list, and model_3d; (b) a Cognition Step — performing the following reasoning based on perceived information: (i) synthesizing node types, creator prompt semantics, and reference context content characteristics to infer creative intent and autonomously select corresponding backend generation pipelines; (ii) when facing complex analysis tasks, splitting tasks into independent sub-tasks along semantic boundaries, analyzing input/output data type dependency relationships between sub-tasks, and generating parallel-serial hybrid scheduling plans; (iii) before generation request submission, automatically collecting output data of all upstream nodes of a target node, assembling by type into a Reference Context Object, and performing constraint compilation or parameter injection on the context according to the selected pipeline; (c) an Action Step — executing the following actions based on cognition results: (i) automatically injecting the Reference Context Object into the target node's generation request; (ii) routing tasks to corresponding AI services through a unified Provider abstraction layer based on pipeline selection results; (iii) submitting independent sub-tasks in parallel, automatically triggering subsequent sub-tasks when dependency conditions are satisfied; (iv) maintaining independent polling channels and failure retry mechanisms for each in-progress task; (v) triggering incremental synchronization on each state change, persisting the differential entity set of changes to the backend.

**Claim 2**: The method according to Claim 1, characterized in that, in the cognition step (iii), when the Canvas Agent infers that the creator's intent is "visual subject extraction" — i.e., the creator's prompt contains extraction intent keywords (including but not limited to extract, isolate, separate, three-view, modeling preparation) and the Reference Context Object simultaneously contains image-type data — the Agent automatically selects a five-layer structural constraint extraction pipeline and executes the following cognitive analysis: Layer 1 (Category Positioning): using the broadest functional classification term to position the target object type, avoiding morphological bias introduced by narrow classification terms; Layer 2 (Functional Structure Constraints): recording immutable structural features determining the target object's use function, described as binary attributes or finite discrete values; Layer 3 (Morphological Structure Constraints): recording shape features and proportional relationships using geometric description language, prohibiting the use of aesthetic style vocabulary; Layer 4 (Detail Constraints): recording detail elements, quantities, and positions actually visible in the reference image, each with a verifiability annotation; Layer 5 (Negative Constraints): enumerating common variant features of this object category that are definitively absent from the reference image, annotated in negation format, delineating exclusion zones in the generation model's probability space; and compiling the five-layer analysis results into a structural constraint generation prompt beginning with a reference image direct citation declaration, followed by constraint items listed layer by layer, with negative constraints in negation annotation format.

**Claim 3**: The method according to Claim 1, characterized in that the task separation in cognition step (ii) comprises: splitting the overall analysis task into multiple independent sub-tasks along semantic boundaries, each sub-task encapsulating an independent system prompt and input-output format specification; performing dependency analysis on the sub-task set — two sub-tasks with disjoint output data types have no mutual dependency, and if sub-task A's output data type is declared as input by sub-task B, then B depends on A — constructing a sub-task dependency directed graph; grouping independent sub-tasks into parallel groups, with the Agent simultaneously submitting all sub-tasks within a parallel group, and dependent sub-tasks forming serial chains, with the Agent automatically submitting successor tasks upon predecessor task completion event triggering; persistently storing task identifiers of all sub-tasks to the backend state file, supporting the Canvas Agent to resume polling after client disconnection and reconnection without needing to resubmit tasks.

**Claim 4**: The method according to Claim 1, characterized in that the cognition step (iii) further comprises: the Canvas Agent maintaining a visual style parameter knowledge base independent of any specific AI model, with parameters hierarchically organized across three dimensions — imaging equipment characteristics, optical system characteristics, and photosensitive medium characteristics — each parameter containing a standardized identifier and structured expression format; before generation request submission, the Agent reads the creator's parameter selections, compiles them into a structured prefix string (format: `[ParamCategory: ParamValue]`), and injects it before the creator's natural language prompt in Equipment → Optics → Medium order.

**Claim 5**: The method according to Claim 1, characterized in that the Canvas Agent's perception step (a) perceives the creator's cross-node reference intent through a dual-channel mechanism: an Automatic Data Flow Channel — between nodes connected via directed edges, the Agent automatically registers source node output port data as available reference resources for target nodes after source node generation completes, automatically collecting and injecting upon target node generation triggering; a Semantic Reference Channel — the creator references other nodes through a trigger symbol in prompts, with the Agent displaying inline preview thumbnails at referenced nodes, and upon generation submission the Agent parses all reference markers, reads generation results of referenced nodes, and appends them to the request; the Agent synthesizes information from both channels to perform intent reasoning — when both channels provide reference information, the Agent infers "reference-enhanced generation" intent; when the semantic reference channel provides reference and the prompt contains extraction keywords, the Agent infers "visual extraction" intent.

**Claim 6**: The method according to Claim 1, characterized in that the unified Provider abstraction layer in action step (ii) comprises: a standardized Provider interface definition containing three methods — task submission (receiving standardized request parameters, returning a task identifier), status query (receiving a task identifier, returning status and progress), and result retrieval (receiving a task identifier, returning generation products); a capability-service mapping Provider Registry, with multiple Provider instances registrable under each generation capability, supporting load balancing or failover when the Canvas Agent performs task routing; maintaining independent polling strategy configurations for each task type, with configuration parameters dynamically optimized based on statistical analysis of historical task execution data.

**Claim 7**: The method according to Claim 1, characterized in that the incremental synchronization in action step (v) comprises: the Canvas Agent using a Map data structure in frontend memory to store directed graph state (keyed by node ID/edge ID), providing O(1) lookup and update performance; the Agent maintaining a change counter, incremented on each node or edge add/delete/modify operation; the Agent performing incremental synchronization only upon counter changes — comparing current state snapshots with previous synchronization snapshots, serializing and transmitting only the differential entity set (added/modified/deleted nodes and edges); the backend persisting complete state snapshots in structured files, including all node metadata, generation result references, edge connection relationships, and in-progress task identifiers; upon service restart, the Agent fully recovering canvas state from the persistence file and automatically resuming polling of all in-progress tasks.

**Claim 8**: The method according to Claim 1, characterized in that the Canvas Agent incorporates a three-dimensional world dimension comprising the following sub-capabilities operating as organic components of the Agent's Perception-Cognition-Action loop: (a) AI-Driven 3D Model Generation Cognition and Action — the Agent receives the creator's text descriptions or reference images, automatically selects Text-to-3D or Image-to-3D generation mode, decides model precision tier (high-precision series / low-polygon series) and PBR material map configuration based on downstream use; after generation completes, the Agent automatically saves the model file to the model asset library, provides a WebGL-based interactive real-time 3D preview in the node preview area, and registers the model URL and path to the model_3d type output port; (b) Real-Time WebGL 3D Scene Editor Perception and Action — the Agent provides complete 3D world construction capabilities within a 3D scene node, including a primitive geometry system, a human figure system (with preset pose library and external model loading), a cinematic physical lighting system (containing multiple preset lighting schemes, each defining a complete parameter set of directional light/auxiliary lights/ambient light/tone mapping/exposure), a multi-camera virtual cinematography system (each camera having independent 3D position, lens specification, and physical aperture depth-of-field parameters), and a camera motion system (three motion rig types — dolly/curved/orbit — supporting speed curves and rotation keyframes); the Agent perceives state changes of all objects, lights, and cameras in the 3D scene, and renders the selected camera's framed image in real time in a picture-in-picture viewfinder; (c) 3D↔2D Bidirectional Data Throughput — the Agent automatically merges the 3D scene node's visual outputs into the directed graph data flow: snapshot output (high-resolution rendered images from selected camera viewpoints, registered to image-type output ports), video recording output (complete camera motion rig process recorded as video, registered to video-type output ports), and structured injection of lighting parameters (compiling the 3D scene's physical lighting scheme into structured text descriptions, transmitted to downstream image generation nodes as style constraints); the Agent simultaneously supports 2D→3D reverse throughput — upstream AI-generated 3D models auto-import into the 3D scene editor via directed edges, upstream generated reference images drive lighting scheme and camera angle selection, and upstream analyzed character descriptions drive 3D figure model and pose configuration.

**Claim 9**: The method according to Claim 8, characterized in that the cinematic physical lighting system works jointly with the Canvas Agent's structured parameter injection cognitive capability (Claim 4) — the Agent compiles the 3D scene's lighting physical parameters (including color temperature, light direction vector, intensity ratio, tone mapping scheme, and atmosphere description) into a structured style prefix, injected into the prompts of downstream AI image generation nodes via directed edges, ensuring cross-dimensional consistency in lighting atmosphere between AI-generated 2D images and the 3D scene.

**Claim 10**: The method according to Claim 8, characterized in that the AI model auto-import flow in the 3D scene editor comprises: when the Agent perceives upstream model_3d type data arriving at the 3D scene node's model-in input port via a directed edge, the Agent automatically executes file existence validation (HEAD request), loads the GLB/FBX model into the scene, performs PBR material standardization mapping, bounding box computation and scale adaptation, and model panel registration with diagnostic information display (triangle count / vertex count / estimated GPU memory usage), with the entire process requiring no manual download, save, or import operations by the creator.

**Claim 11**: A multi-modal AI content generation system with an infinite canvas serving as an intelligent Agent, characterized by comprising: a Canvas Agent Frontend Module for executing the method according to any one of Claims 1-10, providing node orchestration, directed edge connection, dual-channel perception, automatic data confluence, incremental state synchronization, and 3D scene editor (including WebGL real-time rendering, lighting system, multi-camera system, and camera motion system) functions on an infinite canvas; a Canvas Agent Backend Scheduling Module for executing the method according to Claim 6, providing unified Provider abstraction, adaptive task scheduling, and async task lifecycle management, wherein the capability types registered in the Provider abstraction layer include AI 3D model generation capability; a Canvas Agent Cognition Module for executing the method according to Claims 2, 3, and 4, providing cognitive capabilities of five-layer structural constraint extraction, task-separated async parallel pipeline, and structured parameter injection, wherein the cognitive compilation capability of structured parameter injection further supports compiling 3D scene physical lighting parameters into 2D image generation style constraints.

**Claim 12**: The system according to Claim 11, characterized in that the Canvas Agent Frontend Module, Backend Scheduling Module, and Cognition Module work collaboratively to form the Canvas Agent's complete Perception-Cognition-Action closed loop — the frontend module is responsible for information collection in the perception layer covering graph topology, port types, generation status, semantic intent, and 3D scene state (objects/lights/cameras/figure poses); the cognition module executes intent reasoning, pipeline selection, dependency analysis, constraint compilation, and 3D→2D cross-dimensional parameter mapping based on perceived information; the backend scheduling module executes task submission, polling scheduling, and state persistence based on cognitive decisions; action results update node status, 3D scene rendering, and preview areas through the frontend module, forming new perception inputs and completing the closed loop.

**Claim 13**: A computer-readable storage medium having computer program instructions stored thereon, which when executed by a processor, implement the method according to any one of Claims 1 to 10.

---

## 九、发明关键点总结 / Summary of Key Invention Points

**中文**：

| 序号 | 关键点 | 创新性质 | 在画布Agent架构中的位置 |
|------|--------|----------|------------------------|
| 1 | **画布即Agent（Canvas-as-Agent）** — 将交互界面从被动工具容器升级为具有感知-认知-行动能力的智能Agent | 范式创新 | 整体架构 |
| 2 | 五层结构约束提取 — Agent的"精确视觉理解"认知能力，排除约束层为本领域首次提出 | 认知方法创新 | 认知层(C1+C3) |
| 3 | 任务分离异步并行管线 — Agent的"复杂任务分解"认知能力 | 认知方法创新 | 认知层(C2) |
| 4 | 结构化参数前缀注入 — Agent的"风格精确编译"认知能力，模型独立的参数知识库 | 认知工程创新 | 认知层(C3) |
| 5 | 双通道感知+意图驱动智能路由 — Agent综合有向边和@mention两种信息源进行意图推理 | 感知方法创新 | 感知层(P4)→认知层(C1) |
| 6 | 统一Provider抽象 — Agent的"多服务接入"行动能力，三方法标准接口+能力注册表 | 工程架构创新 | 行动层(A2) |
| 7 | 变更计数器增量同步 — Agent的"状态一致性维护"认知与行动能力 | 工程方法创新 | 感知层(P3)→行动层(A5) |
| 8 | **3D世界维度：AI模型生成** — Agent的"文本/图像到三维"认知与行动能力，双模式生成+精度自适应+PBR决策 | 认知与行动创新 | 认知层(C1)→行动层(A2) |
| 9 | **3D世界维度：实时WebGL场景编辑器** — Agent内建完整3D世界构建能力，含电影级灯光系统(8预设+物理参数+色调映射)、多机位虚拟摄影(镜头模拟+景深+PiP)、摄像机运动系统(3种rig+关键帧+动画轨道) | 工程与交互创新 | 感知层(P-3D)→行动层(A-3D) |
| 10 | **3D↔2D双向数据贯通** — Agent实现3D渲染输出(快照/视频/灯光参数)自动汇入2D节点流，以及AI生成模型自动导入3D场景，消除生成-编辑断裂 | 架构创新 | 认知层(C3)→行动层(A1) |

**English**:

| No. | Key Point | Innovation Nature | Position in Canvas Agent Architecture |
|-----|-----------|-------------------|--------------------------------------|
| 1 | **Canvas-as-Agent** — Upgrading the interaction interface from a passive tool container to an intelligent Agent with Perception-Cognition-Action capabilities | Paradigm Innovation | Overall Architecture |
| 2 | Five-Layer Structural Constraint Extraction — Agent's "Precise Visual Understanding" cognitive ability; Negative Constraints layer first proposed in this field | Cognitive Method Innovation | Cognition Layer (C1+C3) |
| 3 | Task-Separated Async Parallel Pipeline — Agent's "Complex Task Decomposition" cognitive ability | Cognitive Method Innovation | Cognition Layer (C2) |
| 4 | Structured Parameter Prefix Injection — Agent's "Precise Style Compilation" cognitive ability; model-independent parameter knowledge base | Cognitive Engineering Innovation | Cognition Layer (C3) |
| 5 | Dual-Channel Perception + Intent-Driven Intelligent Routing — Agent synthesizing directed edge and @mention information sources for intent reasoning | Perception Method Innovation | Perception Layer (P4) → Cognition Layer (C1) |
| 6 | Unified Provider Abstraction — Agent's "Multi-Service Integration" action capability; three-method standard interface + capability registry | Engineering Architecture Innovation | Action Layer (A2) |
| 7 | Change-Counter Incremental Synchronization — Agent's "State Consistency Maintenance" cognitive and action capability | Engineering Method Innovation | Perception Layer (P3) → Action Layer (A5) |
| 8 | **3D World: AI Model Generation** — Agent's "Text/Image to 3D" cognitive and action capability; dual-mode generation + adaptive precision + PBR decisions | Cognitive & Action Innovation | Cognition Layer (C1) → Action Layer (A2) |
| 9 | **3D World: Real-Time WebGL Scene Editor** — Agent's built-in complete 3D world construction capability, including cinematic lighting system (8 presets + physical parameters + tone mapping), multi-camera virtual cinematography (lens simulation + DoF + PiP), camera motion system (3 rig types + keyframes + animation tracks) | Engineering & Interaction Innovation | Perception Layer (P-3D) → Action Layer (A-3D) |
| 10 | **3D↔2D Bidirectional Data Throughput** — Agent achieving 3D render output (snapshots/video/lighting parameters) auto-merging into 2D node flow, and AI-generated models auto-importing into 3D scenes, eliminating the generation-editing disconnect | Architecture Innovation | Cognition Layer (C3) → Action Layer (A1) |

---

## 【附录 / Appendix】

### 附录A：画布Agent的感知-认知-行动能力映射表

| Agent能力 | 所属层次 | 输入信息 | 推理/行动过程 | 输出/效果 |
|-----------|----------|----------|-------------|----------|
| 图拓扑感知 | 感知(P1) | 节点列表+边列表 | 构建拓扑快照，标注端口类型 | 拓扑语义理解 |
| 端口兼容性校验 | 感知(P2)→行动 | 新建连接请求 | 查兼容性矩阵→批准/拒绝 | 非法连接实时阻止 |
| 意图推理与管线选择 | 认知(C1) | 提示词语义+节点类型+参考数据类型 | 关键词匹配+引用检测+类型推理 | 最优管线自主选择 |
| 五层结构约束提取 | 认知(C3) | 参考图+提取关键词 | 五层自顶向下分析→约束编译 | 结构约束型提示词 |
| 语义分离与依赖分析 | 认知(C2) | 复杂任务定义+子任务输入输出规范 | 语义边界切分+依赖图构建 | 最优调度计划 |
| 自动数据汇流 | 行动(A1) | 目标节点+入边拓扑 | 向上游递归→收集→组装→注入 | 参考上下文对象 |
| 并行任务编排 | 行动(A3) | 调度计划+子任务列表 | 并行组同时提交+依赖链触发 | 任务标识符集合 |
| 多通道轮询同步 | 行动(A4) | 任务标识符+策略配置 | 独立轮询→进度更新→结果获取 | 完成的生成结果 |
| 增量状态持久化 | 行动(A5) | 变更计数器+差异实体集 | 快照对比→差异序列化→合并→持久化 | 完整可恢复状态 |
| 断线恢复 | 行动(A5)→感知 | 持久化状态文件 | 加载状态→识别进行中任务→恢复轮询 | 画布完整恢复 |

### 附录B：端口类型兼容性矩阵

| 源端口 ↓ / 目标端口 → | image | video | audio | prompt | character_profile | shot_list | model_3d |
|----------------------|-------|-------|-------|--------|-------------------|-----------|----------|
| image | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| video | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| audio | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| prompt | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| character_profile | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ |
| shot_list | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| model_3d | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✓ |

注：✓ = Agent允许建立连接；✗ = Agent拒绝连接并返回不兼容说明

---

**编制日期 / Preparation Date**: 2026-06-26
**修订版本 / Revision Version**: 3.0 — 以"画布即Agent（Canvas-as-Agent）"为核心范式重写全部内容
**语言 / Languages**: 中文 & English (Bilingual)
**发明人 / Inventor**: 待填写
**申请人 / Applicant**: 待填写
**申请号 / Application No.**: 待填写
