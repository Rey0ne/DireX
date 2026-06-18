# 3D Clip Sequencer — 2-Day Sprint Plan

## 现状

- `b820ee3` 已拆分 scene3d/ 为 15 个模块文件 → 后被回退删除 → **可恢复**
- `8b30532` Phase 1 骨骼可视化已做：SkeletonOverlay + BoneController
- `2b64133` Phase 2 Clip 提取已做：FBX → AnimationClip[]
- 当前 `Scene3DNode.tsx` 是 97KB 单体，需要恢复到模块化版本

---

## Day 1：恢复模块化 + Clip Sequencer 核心

### 上午（3-4h）

| # | 任务 | 说明 |
|---|------|------|
| 1 | **恢复 scene3d/ 模块** | Git restore `b820ee3` 的 scene3d/ 目录，删除 Scene3DNode.tsx 单体 |
| 2 | **恢复 Phase 1-2** | Git cherry-pick `8b30532` + `2b64133` 骨骼可视化 + Clip 提取 |
| 3 | **验证编译** | `npx tsc --noEmit`，确保零新增错误 |
| 4 | **清理未用文件** | 删除 `.bak`、`.stable`、`UE5Node.tsx`、未用 imports |

### 下午（4-5h）

| # | 任务 | 说明 |
|---|------|------|
| 5 | **Timeline 多轨改造** | 当前 Timeline 只有一条相机轨道 → 新增 Clip 轨道区域，显示 clip block 条 |
| 6 | **Clip Block 拖拽** | 动画库面板的 clip 卡片可拖入时间轴，生成 ClipBlock |
| 7 | **播放引擎** | AnimationMixer 顺序播放 clip blocks，crossFade 过渡 |

### 验证点
- [ ] 导入 Mixamo FBX → 看到骨骼叠加层
- [ ] 动画库显示已提取的 clip 列表
- [ ] 拖一个 clip 到时间轴 → 显示 block 条
- [ ] 点播放 → 角色按 clip 顺序动

---

## Day 2：交互增强 + 打磨

### 上午（3-4h）

| # | 任务 | 说明 |
|---|------|------|
| 8 | **框选改造** | 左键拖 = 框选（SelectionRect overlay），右键拖 = 旋转 |
| 9 | **滚轮缩放增强** | Timeline 上限 500%，Ctrl+滚轮 1% 微调 |
| 10 | **Clip 编辑弹窗** | 双击 block → 弹窗：重复次数 / 速度 / 过渡时长 / 根偏移 |

### 下午（3-4h）

| # | 任务 | 说明 |
|---|------|------|
| 11 | **多段融合（Bake）** | 多个 blocks → 烘焙成一段长 AnimationClip |
| 12 | **双层进度条** | 融合后：顶部完整进度条，底部原 block 条变灰参考 |
| 13 | **整体测试 + 提交** | 每个功能独立 commit |

### 验证点
- [ ] 框选多个物体正常
- [ ] Timeline 缩放流畅到 500%
- [ ] 双击 block 打开编辑弹窗
- [ ] 编辑 repeat/timeScale 后播放正确
- [ ] Bake 3 段 clip → 输出一段融合动画

---

## 不做（延后）

- 服务端 Blender 自动绑骨 → 后端任务，非前端 3D
- 多机位虚拟拍摄 → 需要相机轨道系统重构
- 动画库缩略图预渲染 → P2，不是核心路径
- UE 风格资源浏览器 → 合并到动画库面板后续做

---

## 提交策略

每完成一个验证点 → 一个 commit：
```
Feat(3D): Restore scene3d/ modular architecture
Feat(3D): Clip block drag-drop into timeline
Feat(3D): Playback engine with crossFade
Feat(3D): Selection rect + right-click orbit
Feat(3D): Clip editor popup (repeat/speed/offset)
Feat(3D): Multi-clip bake to single animation
```
