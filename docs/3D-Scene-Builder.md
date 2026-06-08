# ViewLab 3D 场景构建器 — 技术方案
## 轻量级 Web 3D 编辑器，替代 UE5 的前端方案

---

## 一、核心理念

**不替代 UE5，而是做一个"3D 构图草稿纸"。**

UE5 是摄影棚级别的专业工具 → 留给专业用户和后台内容生产。
ViewLab 3D 构建器是草图级别的轻量工具 → 所有用户都能用。

```
UE5（后台/专业）              3D Scene Builder（前台/大众）
  照片级渲染                      基础几何体 + 白模
  复杂材质编辑器                   纯色/线框
  骨骼动画实时控制                  预设姿态切换
  Pixel Streaming 云部署           浏览器本地 WebGL 渲染
  学习曲线：周/月                   学习曲线：分钟
```

---

## 二、技术选型

### 为什么选 React Three Fiber

| 方案 | 渲染 | 成本 | 部署 | 学习曲线 |
|------|------|------|------|---------|
| **React Three Fiber** | WebGL 本地 | 零服务器成本 | 打包进前端 | 拖拽即用 |
| UE5 Pixel Streaming | GPU 云渲染 | 高 | 云实例+信令 | 需要学 UE5 |
| Babylon.js | WebGL 本地 | 零 | 打包进前端 | API 略复杂 |

**React Three Fiber** 优势：
- 和 React 组件树天然融合，可以直接嵌套在 ViewLab 的节点组件里
- @react-three/drei 提供开箱即用的 OrbitControls、TransformControls、Gizmo
- 生态成熟，npm 可装
- 用户浏览器本地渲染，不增加服务器成本

### 安装的包

```json
{
  "three": "^0.170.0",
  "@react-three/fiber": "^9.0.0",
  "@react-three/drei": "^9.0.0"
}
```

---

## 三、用户交互设计

### 3.1 节点外观

```
┌─────────────────────────────────────────┐
│  🎬 3D 场景                       [×]   │
├─────────────────────────────────────────┤
│                                         │
│          ┌─────────────────┐            │
│          │                 │            │
│          │   3D 视口       │            │
│          │   (WebGL)       │            │
│          │                 │            │
│          │  🟫 📦 🧍       │            │
│          │                 │            │
│          └─────────────────┘            │
│                                         │
│  [＋立方体] [＋球体] [＋圆柱] [＋平面]    │
│  [＋人物 ▾]  站姿 | 坐姿 | 蹲姿 | ...   │
│                                         │
│  💡 灯光: [暖光 ▾]  📷 [截图] [重置]    │
└─────────────────────────────────────────┘
```

### 3.2 操作方式

```
鼠标左键点击物体 ................ 选中（高亮边框）
鼠标左键拖动 Gizmo .............. 移动 / 旋转 / 缩放
鼠标右键拖动 .................... 旋转视角（Orbit）
鼠标中键拖动 .................... 平移视角
滚轮 ............................ 缩放视角
选中物体 + Delete ............... 删除物体
点击空白区域 .................... 取消选中
W / E / R ....................... 切换 移动/旋转/缩放 工具
```

### 3.3 物体属性面板

选中物体后，在节点侧边出现迷你属性面板：

```
┌──────────────┐
│ 📦 立方体     │
│              │
│ 位置 X: [0]  │
│      Y: [0]  │
│      Z: [0]  │
│              │
│ 缩放 X: [1]  │
│      Y: [1]  │
│      Z: [1]  │
│              │
│ 旋转 Y: [0°] │
│              │
│ [复制] [删除] │
└──────────────┘
```

---

## 四、组件架构

```
Scene3DNode (节点容器)
  │
  ├── Canvas (@react-three/fiber)
  │     │
  │     ├── SceneContent
  │     │     ├── GroundPlane (地面网格参考)
  │     │     ├── Primitive objects[] (立方体/球体/圆柱/平面)
  │     │     │     └── TransformControls (Gizmo)
  │     │     └── PoseFigure[] (姿态白模人物)
  │     │           └── TransformControls (Gizmo)
  │     │
  │     ├── Lighting
  │     │     ├── DirectionalLight (主光)
  │     │     ├── AmbientLight (环境光)
  │     │     └── HemisphereLight (天空/地面反射)
  │     │
  │     └── Camera rig
  │           ├── PerspectiveCamera
  │           └── OrbitControls
  │
  ├── Toolbar (添加物体 / 灯光预设 / 截图)
  └── PropertyPanel (选中物体的属性)
```

### Scene3DNode 的数据结构（存入 ViewLab Canvas store）

```typescript
interface Scene3DData {
  objects: SceneObject[];
  camera: {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
  };
  lighting: {
    preset: 'warm' | 'cool' | 'neutral' | 'dramatic';
  };
}

interface SceneObject {
  id: string;
  type: 'box' | 'sphere' | 'cylinder' | 'plane' | 'figure';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];     // 任意调整比例
  // 如果是人物
  figurePose?: 'stand' | 'walk' | 'run' | 'sit' | 'squat' | 'lie' | 
               'fight_stance' | 'punch' | 'kick' | 'defend';
}
```

---

## 五、人物白模方案

### 5.1 原理

不是骨骼动画，不是实时绑定，是**预设姿态的静态 3D 模型**。

```
同一个基础人体模型
  → 在 Blender 里手动摆好姿态（站/坐/蹲/跑/武术...）
  → 导出为独立的 .glb 文件
  → ViewLab 根据用户选择的姿态，加载对应的 .glb
  → 用户看到的就是那个姿态的静态白模
```

**用户操作的只是"选姿态"→ 换模型，不涉及骨骼/绑定/动画。**

### 5.2 姿态清单

| 分类 | 姿态 | 文件名 | 优先级 |
|------|------|--------|--------|
| **基础** | 站立 | figure_stand.glb | P0 |
| | 行走 | figure_walk.glb | P0 |
| | 跑步 | figure_run.glb | P1 |
| **日常** | 坐姿 | figure_sit.glb | P0 |
| | 蹲姿 | figure_squat.glb | P1 |
| | 卧躺 | figure_lie.glb | P1 |
| **武术** | 格斗站姿 | figure_fight_stance.glb | P1 |
| | 出拳 | figure_punch.glb | P2 |
| | 踢腿 | figure_kick.glb | P2 |
| | 防御 | figure_defend.glb | P2 |

### 5.3 白模的来源

**方案 A：Blender 手动制作（推荐）**
- 下载一个免费的基础人体模型（MakeHuman / CC0 资源）
- 在 Blender 中摆 8-12 个姿态
- 导出为 GLB（每个约 100-500KB）
- 应用纯白/浅灰材质
- **一次性工作，半天即可完成全部姿态**

**方案 B：使用程序化 Stick Figure（最快原型）**
- 用圆柱体 + 球体拼出火柴人
- 每个姿态用代码定义各关节角度
- 不依赖任何外部模型文件
- 3D 效果不如方案 A，但可以零依赖上线

**方案 C：从 Mixamo 自动生成**
- 上传基础模型到 mixamo.com
- 选择动画姿态 → 下载单帧 GLB
- 快速、质量好、但依赖外部服务

### 5.4 白模在场景中的效果

```
选中人物 → 属性面板：
┌──────────────────┐
│ 🧍 人物           │
│                  │
│ 姿态: [站立 ▾]   │
│       │ 站立     │
│       │ 行走     │
│       │ 坐姿     │
│       │ 蹲姿     │
│       │ 卧躺     │
│       │ ————     │
│       │ 格斗站姿  │
│       │ 出拳     │
│       │ 踢腿     │
│                  │
│ 缩放: [1.0]      │
│ 旋转: [0°]       │
│                  │
│ [＋复制] [删除]   │
└──────────────────┘

选择"坐姿" → 模型立即切换为坐着的白模
```

---

## 六、快照导出

### 6.1 "截图"按钮的核心逻辑

```
用户点 [📷 截图]
  → Three.js 渲染器渲染当前帧到 Canvas
  → canvas.toDataURL('image/png')
  → 得到 base64 图片数据
  → 存储到 Scene3DNode 的 data 里
  → 自动连线到下游 ImageGenerateNode
  → Agent Pipeline 用这张空间参考图生成成品
```

```typescript
// 核心代码（简化）
const takeSnapshot = useCallback(() => {
  const canvas = gl.domElement;
  const dataUrl = canvas.toDataURL('image/png');
  // 存入 ViewLab store
  onSnapshot(dataUrl); // 传给父组件
}, [gl]);
```

### 6.2 快照质量

```
分辨率：当前视口大小（约 600-800px）
        ↑ 对 AI 参考来说完全够用
格式：  PNG（保留透明背景可选）
速度：  即时（本地 WebGL，无需联网）
成本：  零
```

---

## 七、与 Agent Pipeline 的对接

```
用户操作用 3D 节点：
  ① 拖几个立方体搭出"房间"空间结构
  ② 拉长一个圆柱体当"柱子"
  ③ 放一个坐姿白模在角落
  ④ 旋转视角找到想要的构图
  ⑤ 点"截图"
  → 快照出现在 Scene3DNode 的预览区

  ⑥ 连线到 ImageGenerate 节点
  ⑦ 在 ShotNode 里写："赛博朋克风格，霓虹灯光，雨夜氛围"
  ⑧ 点"生成"
  
  → Agent Pipeline 收到：
    • 空间参考图（构图、透视、人物位置、比例 → 全部确定）
    • 创意描述（风格、氛围、细节 → AI 自由发挥）
  → 生成结果：构图精准 + 风格到位的成品图
```

---

## 八、实现路线

### 阶段 1：最小可用（1-2 周）

```
✅ React Three Fiber 3D 视口嵌入节点
✅ 放置基础几何体（立方体、球体、圆柱、平面）
✅ 选中 + TransformControls（移动/旋转/缩放）
✅ 自由调整物体比例（任意 scale）
✅ OrbitControls（旋转/平移/缩放视角）
✅ 基础灯光（方向光 + 环境光）
✅ "截图"按钮 → Canvas.toDataURL
✅ 数据存入 Canvas store（可序列化/恢复）
```

### 阶段 2：人物系统（1 周）

```
✅ 方案 B 先上线：程序化火柴人（圆柱+球体）
✅ 姿态切换下拉菜单
✅ 放置和移动人物
✅ 方案 A 并行：在 Blender 做 8 个姿态白模
✅ 逐步替换为 GLB 白模
```

### 阶段 3：场景增强（1 周）

```
✅ 灯光预设（暖/冷/中性/戏剧）
✅ 地面网格参考线
✅ 线框/实体显示切换
✅ 场景模板（空房间/户外/影棚 → 预设几何体布局）
✅ 快照分辨率选项
```

### 阶段 4：连接 Pipeline（并行）

```
✅ 快照自动注入到连线节点的参考图列表
✅ ShotNode 元数据 → 补充 Prompt 描述
✅ 端到端测试：3D场景 → 快照 → Agent → 生成
```

---

## 九、要不要现在就做

**建议：先做一个小 Demo 验证核心体验。**

花 1-2 天搭一个最小原型：
- 一个独立页面，不是嵌入节点
- 几个立方体 + 一个火柴人
- 能拖拽、旋转、缩放
- 能截图

自己亲手用一下，感受：用几何体搭场景 → 截图 → 喂 AI，这个过程到底顺不顺、值不值。

如果感受好，再按上面的阶段 1 开始正式开发。
如果感觉不对，及时止损，换其他方向。

---

*配合阅读：*
- *[UE5-AI-Spatial-Controller.md](./UE5-AI-Spatial-Controller.md) — 商业论证*
- *[UE5-Learning-Path.md](./UE5-Learning-Path.md) — UE5 实操教程*
