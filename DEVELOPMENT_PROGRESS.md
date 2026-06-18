# DireX 开发进度文档

> 最后更新: 2026-06-18 18:30  
> 分支: direx-dev  
> 最新提交: `04a40d5` Chore: 保存进度 — UI重构完成

---

## 一、项目概览

**DireX** — 无尽画布创意工具，核心能力：
- ReactFlow 无限画布 + 节点式工作流
- 3D 世界编辑器（React Three Fiber）
- 多模型 AI 集成（Kie.ai 等）
- Blender 后端自动绑骨

### 关键路径
| 路径 | 说明 |
|------|------|
| `C:\Users\ROG\direx-isolated\` | **主开发目录** |
| `C:\Users\ROG\tapnow-canvas\` | 旧画布项目（不再使用） |
| `D:\Blander\` | Blender 5.1.2 安装位置 |

### 启动命令
```bash
# 前端 (端口自动分配，通常 5173)
cd C:\Users\ROG\direx-isolated
npx vite --host

# 后端 (端口 3001)
cd C:\Users\ROG\direx-isolated\server
npx tsx src/index.ts
```

---

## 二、当前架构

### 前端关键文件

| 文件 | 大小 | 说明 |
|------|------|------|
| `src/components/nodes/Scene3DNode.tsx` | ~82KB | **3D 编辑器主文件（单体）** |
| `src/components/nodes/ModelPanel.tsx` | 1.4KB | 模型区面板模块 |
| `src/components/ColorPicker.tsx` | 3.3KB | PS 风格取色器 |
| `src/App.tsx` | 主应用 | ReactFlow + 路由 |
| `src/store/useCanvasStore.ts` | 状态管理 | Zustand |
| `src/main.tsx` | 入口 | - |

### 后端关键文件

| 文件 | 说明 |
|------|------|
| `server/src/index.ts` | Express 主入口 |
| `server/src/routes/blender.ts` | Blender API (auto-rig 异步任务) |
| `server/blender/auto_rig.py` | Blender headless 绑骨脚本 |
| `server/src/systems/db/store.ts` | 数据持久化 |
| `server/src/systems/ai/kie-provider.ts` | Kie.ai 模型集成 |

### 3D 编辑器架构（Scene3DNode.tsx）
- `FullscreenEditor` 组件 — 全屏 3D 编辑器（createPortal 到 document.body）
- `SceneContent` — 3D 场景渲染（天空/地面/光照/模型/轨道）
- PiP 取景器 — 辅助 Canvas，显示虚拟相机画面
- 轨道系统 — 直线推轨/曲线轨道/环绕轨道 + 速度曲线 + 旋转关键帧
- 动画系统 — FBX/GLB 动画播放 + 动画轨道

---

## 三、最近完成（2026-06-18）

### 3D 编辑器 UI 重构

1. **PiP 取景器常驻显示**
   - 移除 `showCam` 条件控制
   - 无相机时显示 "请添加相机" 提示
   - 始终可见，尺寸 680x424（380 画布 + 44 标题栏）

2. **底部三区统一布局**
   - 共享 `#141416` 背景
   - 左: ModelPanel（260px 宽）
   - 中: 时间轴（flex 自适应）
   - PiP: 绝对定位在底部栏上方右侧（bottom:408）

3. **8 机位 + 轨道组选择器**
   - `addCamera()` 自动命名「机位1」~「机位8」
   - `camNames` ref 存储名称，上限 8 个相机
   - 下拉菜单选择当前机位
   - 时长输入框 + 轨道类型按钮组
   - `rigCamId` + `trackDur` 状态变量

4. **颜色面板**
   - 左侧面板「颜色」区，10 个预设色块
   - 点击直接修改选中模型颜色
   - 当前选中颜色高亮（白色边框）

5. **信息栏**
   - PiP 上方半透明白底横条
   - 显示：类型（中文）/ 颜色色块 / X/Y/Z 坐标 / 复位按钮

6. **光照滑块**
   - 集成到 PiP 标题栏右侧
   - 太阳方位角 + 仰角实时调节

7. **轨道标签简化**
   - 直线推轨 -> 直线
   - 曲线轨道 -> 曲线
   - 环绕轨道 -> 环绕

### 关键提交
```
04a40d5 Chore: 保存进度 — UI重构完成，canvas状态备份
ac9cd6a UI: 全面重构 — PiP常驻/三区底部栏/8机位轨道组/着色面板/信息栏
9fdfb32 UI: Info bar + lighting sliders + camera-track group + shorter labels
ce83f17 ModelPanel模块：底部模型区+基础模型+4列网格
```

---

## 四、Blender 后端

### 已实现
- `POST /api/blender/auto-rig` — 提交绑骨任务（modelBase64 + format -> jobId）
- `GET /api/blender/job/:id` — 查询结果（status/boneCount/outputModel base64 GLB）
- `GET /api/blender/status` — 检查 Blender 可用性
- Blender 5.1.2 本地运行于 `D:\Blander\blender.exe`
- 异步任务队列（内存 Map），5 分钟超时，1 分钟后清理临时文件
- Rigify 自动绑骨：导入 -> 添加 Human Metarig -> 缩放匹配 -> 生成 Rig -> 自动权重 -> 导出 GLB
- 已有骨骼模型跳过绑骨，仅添加骨骼可视化球/锥
- 鉴权：Bearer Token (`SHARED_API_KEY`)

### 待完成
- [ ] 前端 AutoRigButton 集成（按钮调用 API -> 轮询 -> 替换模型）
- [ ] 骨骼可视化在前端的渲染

---

## 五、待开发任务

### 高优先级
- [ ] **21:9 主画面比例** — 3D 视图区约束为 21:9 宽高比
- [ ] **模型颜色着色** — GLB/FBX 导入模型也支持颜色 tint
- [ ] **轨道系统完善** — 8 条独立轨道对应 8 个机位（当前只有 1 个 rig）
- [ ] **动画时长准确识别** — 当前固定 15 秒导致重复

### 中优先级
- [ ] 前端 AutoRig 按钮集成
- [ ] 相机显示在模型区（当前过滤掉）
- [ ] 模型区拖入文件显示文件名（无后缀）
- [ ] ColorPicker 弹窗集成（已有组件，需连线）

### 低优先级
- [ ] Docker Blender 部署（之前 Docker Hub 不可达）
- [ ] 骨骼前端可视化（已放弃）

---

## 六、开发规则（铁律）

1. **禁止覆盖已有内容** — 破坏性操作前先创建备份副本
2. **单体文件谨慎操作** — Scene3DNode.tsx 是 82KB 单体，JSX 花括号匹配极其脆弱
3. **先查代码再说话** — 改动前先 Read/Grep 确认当前状态
4. **优先使用模块文件** — 新 UI 组件用独立文件（如 ModelPanel.tsx），不往单体里塞
5. **改动后必须验证构建** — `npx vite build` 0 错误才算通过
6. **不动的部分不要碰** — 天空球、地面、WASD 移动等已调好的环境功能

### 备份策略
- 每次重大改动前: `cp Scene3DNode.tsx Scene3DNode.tsx.bak.YYYYMMDD-HHMM`
- 已在 `src/components/nodes/Scene3DNode.tsx.bak.20260618-1815` 保存干净副本

---

## 七、已知问题

1. **Scene3DNode.tsx 是单体文件** — 约 250 行 JSX，任何花括号不匹配都会导致 Vite 500 错误
2. **FBX 导入** — 使用 `FileReader.readAsArrayBuffer -> Blob -> URL.createObjectURL` 避免 base64 问题
3. **重复 ID** — 全项目使用全局 `_oid` 计数器 (`let _oid=Date.now()`)
4. **ColorPicker** — 使用 refs 而非 `e.currentTarget`，因为 window mousemove 传的是原生 MouseEvent
5. **时间轴 rig 依赖** — 当前用 `{rig&&<>...</>}` 包裹避免 null 崩溃

---

## 八、目录结构速查

```
direx-isolated/
├── src/
│   ├── components/
│   │   ├── nodes/
│   │   │   ├── Scene3DNode.tsx      <- 3D 编辑器主文件(82KB)
│   │   │   ├── ModelPanel.tsx       <- 模型面板模块
│   │   │   ├── ImageGenerateNode.tsx
│   │   │   ├── VideoGenerateNode.tsx
│   │   │   └── ShotNode.tsx
│   │   ├── ColorPicker.tsx          <- PS风格取色器
│   │   ├── CreditPanel.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ProjectSelector.tsx
│   │   └── shared/
│   ├── store/
│   │   └── useCanvasStore.ts        <- Zustand 状态管理
│   ├── api/
│   │   └── gateway.ts
│   ├── styles/
│   ├── types/
│   │   └── graph.ts
│   ├── App.tsx
│   └── main.tsx
├── server/
│   ├── src/
│   │   ├── index.ts                 <- Express 入口
│   │   ├── routes/
│   │   │   ├── blender.ts           <- Blender API
│   │   │   └── auth.ts
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   └── systems/
│   │       ├── ai/
│   │       │   ├── kie-provider.ts
│   │       │   └── gemini.ts
│   │       ├── agent/
│   │       │   ├── pipeline.ts
│   │       │   ├── profiles.ts
│   │       │   └── compiler.ts
│   │       └── db/
│   │           ├── store.ts
│   │           ├── user-store.ts
│   │           └── credit-store.ts
│   └── blender/
│       └── auto_rig.py              <- Blender 绑骨脚本
├── shared/
│   └── api-types.ts
├── patch-full-ui.js                 <- UI 重构补丁脚本（可复用）
├── DEVELOPMENT_PROGRESS.md          <- 本文件
└── package.json
```

---

## 九、如何在新对话中继续

将此文件内容粘贴给 AI：
```
请先阅读 C:\Users\ROG\direx-isolated\DEVELOPMENT_PROGRESS.md 了解项目进度，
然后切换到 direx-dev 分支继续开发。
工作目录: C:\Users\ROG\direx-isolated
```

或者直接说：
```
继续 DireX 开发，先读 DEVELOPMENT_PROGRESS.md
```

---

## 十、上下文窗口预警 🚨

### 预警阈值
| 用量 | 状态 | 建议操作 |
|------|------|----------|
| < 200K tokens | 🟢 安全 | 正常开发 |
| 200K - 350K | 🟡 注意 | 准备保存节点，整理进度文档 |
| 350K - 450K | 🟠 警告 | 完成当前任务即保存，准备新开窗口 |
| > 450K | 🔴 危险 | 立即保存，**不要开始新任务**，新开窗口 |

### 检查方法
在新对话中随时问我：
```
当前上下文用了多少？
```

### 保存清单（达到 🟡 时执行）
1. 确保最新代码已 commit: `git add -A && git commit -m "Chore: 保存进度"`
2. 更新 DEVELOPMENT_PROGRESS.md（本文件）
3. 更新 C:\Users\ROG\.claude\projects\c--Users-ROG-tapnow-canvas\memory\task-backlog.md
4. 备份 Scene3DNode.tsx: `cp Scene3DNode.tsx Scene3DNode.tsx.bak.$(date +%Y%m%d-%H%M)`

### 新开窗口恢复
```
继续 DireX 开发。
工作目录: C:\Users\ROG\direx-isolated
分支: direx-dev
先读 DEVELOPMENT_PROGRESS.md 了解进度
```

---

## 2026-06-19 更新

### 景深系统 (Depth of Field)
- PiP 取景器集成 `@react-three/postprocessing` DepthOfField
- 物理公式: `bokehScale = (3/光圈) × (焦段/35) × (40/距离²)` 上限18
- 光圈T1.3→强虚化, T22→全景深
- 焦段24mm→深景深, 135mm→浅景深（符合真实光学）
- 距离越近景深越浅（50/d² 平方衰减）
- 焦平面平滑lerp 0.25，消除帧间跳动
- playTime更新500ms→30ms，消除0.5s闪烁

### 地面
- 主画面：40×40棋盘格，`#c0c0c0`/`#b0b0b8`，保留ExtrudeGeometry倒角
- PiP：低对比棋盘格CanvasTexture，带砖缝线
- 阴影恢复soft，地砖1600块(40×40)

### 色彩系统
- FBX/GLB模型支持颜色着色 (tintModel遍历材质clone)
- 全链路传递color: LODFigure→SafeModel→FBXModel/GLBModel→PiPFigure

### PiP录制
- DPR固定2x (1360×760)
- 视频码率20Mbps
- 输出到video.generate节点

### 其他修复
- ReactFlow水印隐藏
- 相机初始位置统一[0,0.5,0]（地面中央）
- 模型刷新后base64持久化不丢失
- 全模型投射阴影
- auth路由注册修复
- 测试账号 test@direx.io / direx888
