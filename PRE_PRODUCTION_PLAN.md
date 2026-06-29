# DireX 大规模测试前补强计划

> 制定日期：2026-06-29 | 当前评分：84/100 → 目标：95+/100
> 参考：ComfyUI / Runway / Meshy / Tripo / Figma / Canva 的线上经验

---

## 一、对标分析：已上线产品踩过的坑

### ComfyUI 的教训
| 坑 | DireX 当前状态 |
|---|-------------|
| v17 模型缓存回归导致 OOM | 🟡 Scene3D LRU 缓存只有 20 条，无 GPU 内存监控 |
| WebSocket 死客户端崩溃服务端 | 🔴 DireX 无 WebSocket 但 HTTP 无超时保护 |
| 单线程无法生产用 | 🔴 后端无队列，图片/视频/3D 生成直接阻塞 |
| 无内置认证 | ✅ authMiddleware 已实现 |
| 自定义节点兼容性爆炸 | ✅ 模块独立设计已规避 |

### Runway 的教训
| 坑 | DireX 当前状态 |
|---|-------------|
| GPU 静态分区浪费 | N/A（DireX 不自己管理 GPU） |
| 预抢占需要检查点 | 🔴 异步任务（视频/3D）无断点续传 |
| 研究与生产代码分离 | 🟡 前后端分离但无 staging 环境 |

### Meshy/Tripo 的教训
| 坑 | DireX 当前状态 |
|---|-------------|
| 自动绑定成功率 33% | 🟡 TripoNode 有绑定流程但无成功率统计 |
| Shader 不匹配（GLB→引擎） | 🟡 Scene3D 直接加载无 shader 转换 |
| UV 碎片化不可用 | ✅ Tripo API 返回的模型外部处理 |
| 面数过高无自动 LOD | 🟡 Scene3D 有 LOD 但仅限 figure 组件 |

### 节点画布的教训
| 坑 | DireX 当前状态 |
|---|-------------|
| 拖动时撤销栈污染 | 🔴 DireX 每次拖拽都写历史 |
| JSON 膨胀（base64 内嵌图片） | 🔴 已经发生——persistence.ts 剥离 >5000 字符只是临时方案 |
| 无限响应式循环 | 🟡 使用 Zustand 选择器但未做 equality guard |
| 并发生成状态碰撞 | 🔴 全局 status 而非 per-node request map |
| Agent 破坏性写入 | 🟡 AgentPanel 可创建节点但无确认门 |
| LLM 空响应/畸形调用 | 🔴 无 token 限制管理，无 fallback |

### Figma/Canva 的教训
| 坑 | DireX 当前状态 |
|---|-------------|
| DOM 渲染 5000+ 元素崩溃 | 🟡 ReactFlow 用 Canvas 渲染但 64 节点未压力测试 |
| WebGL 全局状态 bug | 🔴 Scene3DNode @ts-nocheck 覆盖了这些 |
| 无运行时降级（WebGPU→WebGL） | N/A（DireX 只用 WebGL） |
| 纹理池未复用 | 🟡 Scene3D 无纹理池 |

---

## 二、补强计划（按优先级排列）

### P0 — 不修不能大规模测试（阻塞发布）

#### P0-1：JSON 膨胀彻底解决
**现状**：persistence.ts 剥离 >5000 字符的 data URL，但 base64 图片仍在 state 中传播。
**方案**：Blob 分离架构
- 所有二进制数据（图片/视频/音频/3D 模型）存储到 IndexedDB blob store
- Canvas state JSON 只存 `blobKey` 引用
- 渲染时按需从 blob store 加载
- 同步到服务器时只传 JSON + manifest，二进制按需上传
**工作量**：3–4 天
**风险**：涉及 persistence.ts / useCanvasStore / 所有节点组件的 data 结构改造

#### P0-2：并发生成隔离
**现状**：节点生成使用全局状态切换，多个节点同时生成会互相覆盖。
**方案**：Per-node request map
```typescript
const runningRequests = new Map<string, AbortController>();
function generate(nodeId: string, params: GenerateParams) {
  runningRequests.get(nodeId)?.abort(); // 取消旧请求
  const ctrl = new AbortController();
  runningRequests.set(nodeId, ctrl);
  // ... 生成完成后 runningRequests.delete(nodeId)
}
```
**工作量**：2 天
**风险**：需要改造 gateway.ts 的所有生成函数支持 AbortSignal

#### P0-3：撤销栈防污染
**现状**：拖拽节点时每次 setState 都写历史，导致撤销行为不可预测。
**方案**：
- 拖拽期间 `pauseHistory()`
- 拖拽结束 `resumeHistory()` 并写入单个合并快照
- 历史栈限制 50 步 + 180ms 合并窗口
**工作量**：1 天
**风险**：Zustand middleware 改造，要保证不丢数据

#### P0-4：异步任务超时 + 断点续传
**现状**：视频/3D 轮询无硬超时，无限等待。
**方案**：
- 每个异步任务设硬超时（Kling 30min, Tripo 15min, Suno 10min）
- 超时后标记 failed + 提供重试按钮
- 轮询进度持久化到 IndexedDB（页面刷新不丢）
**工作量**：2 天
**风险**：需改 persistence schema

#### P0-5：后端队列化
**现状**：生成请求直接处理，无排队/限流/重试。
**方案**：
- 引入 BullMQ + Redis 或简单的内存队列
- 合理并发限制（图片 3 并发，视频 1 并发，3D 2 并发）
- 队列状态面板（前端可见排队位置）
**工作量**：3 天
**风险**：引入新依赖（Redis/BullMQ），或先用内存队列过渡

---

### P1 — 影响用户体验（建议修）

#### P1-1：干掉 @ts-nocheck × 2（ShotNode + ImageGenerateNode）
**现状**：两个文件 `@ts-nocheck` 跳过类型检查，改代码无保护。
**方案**：逐个清理死代码后移除注释
- ShotNode：删除 `_shot` / `_getSound` / `_clickSpace` / `_clickProp`
- ImageGenerateNode：删除 11 项未调用的函数/ref/样式
- 修复路径：先删死代码 → 移除 @ts-nocheck → 逐项修真实类型错误
**工作量**：2–3 天
**风险**：可能暴露隐藏的类型错误，需逐项修复

#### P1-2：Scene3D 多实例隔离
**现状**：模块级 `let` 变量 (`animMixers`, `fbxCache`, `_modelStats`) 在多 Scene3D 节点间共享。
**方案**：
- 改为 `Map<nodeId, SessionState>` 
- 或使用 React Context 为每个 FullscreenEditor 提供独立 scope
- GPU 资源按 nodeId 隔离 dispose
**工作量**：2 天
**风险**：改动范围大但已有 `resetScene3DSession` 模式打底

#### P1-3：节点错误恢复
**现状**：ErrorBoundary 存在但未验证效果，节点崩溃后无恢复路径。
**方案**：
- ErrorBoundary 加 "重试" / "重置节点" 按钮
- 崩溃前自动保存节点状态快照
- localStorage 记录崩溃次数，连续 3 次建议用户删除重建
**工作量**：1.5 天

#### P1-4：Prompt Compiler 健壮性
**现状**：中文→英文编译在 LLM 返回异常时给出 "Please provide the Chinese prompt to translate"，用户困惑。
**方案**：
- LLM 调用加 timeout（15s）
- 超时或异常时 fallback 到原始 prompt（不做翻译）
- 加入重试逻辑（最多 2 次）
- 编译失败时前端显示警告而非静默
**工作量**：1 天

---

### P2 — 性能与体验（优化项）

#### P2-1：ReactFlow 虚拟化 + 视口裁剪
- 只渲染视口内的节点（RBush R-tree 索引）
- 离屏节点挂起而非销毁
**工作量**：2 天

#### P2-2：Scene3D 纹理池
- 纹理复用而非每次加载
- 多模型共享材质
**工作量**：1.5 天

#### P2-3：Scene3D 自动 LOD 生成
- 导入模型时自动生成 3–4 级 LOD
- 根据屏幕占比自动切换
**工作量**：2 天

#### P2-4：Agent 操作确认门
- 批量节点操作前弹确认对话框
- 自动保存 `agentUndoSnapshot`
- 操作日志可视化（显示每一步做了什么）
**工作量**：1.5 天

---

### P3 — 基础设施（长期）

| 项 | 内容 | 工作量 |
|---|------|--------|
| 自动化冒烟测试 | Cypress/Playwright 跑 7 条管线创建→生成路径 | 5 天 |
| CI/CD | GitHub Actions: lint + tsc + test + build | 3 天 |
| Staging 环境 | 独立部署 + 测试数据隔离 | 2 天 |
| 错误监控 | Sentry/自建 + 前端错误上报 | 2 天 |
| 性能监控 | Prometheus + Grafana GPU/API 延迟面板 | 3 天 |

---

## 三、分阶段执行路线

### Phase A：P0 阻塞项（预计 11 天）
```
Day 1–3   → JSON 膨胀彻底解决 (Blob 分离)
Day 4–5   → 并发生成隔离 (per-node AbortController)
Day 6     → 撤销栈防污染
Day 7–8   → 异步超时 + 断点续传
Day 9–11  → 后端队列化
```

### Phase B：P1 体验项（预计 8 天）
```
Day 12–14 → 干掉 @ts-nocheck ×2
Day 15–16 → Scene3D 多实例隔离
Day 17     → 节点错误恢复
Day 18–19  → Prompt Compiler 健壮性
```

### Phase C：P2 优化项（预计 7 天）
```
Day 20–21 → ReactFlow 虚拟化
Day 22     → Scene3D 纹理池
Day 23–24 → Scene3D LOD
Day 25–26 → Agent 确认门
```

### Phase D：P3 基础设施（预计 15 天）
```
Day 27–31 → 冒烟测试
Day 32–34 → CI/CD
Day 35–36 → Staging
Day 37–38 → 错误监控
Day 39–41 → 性能监控
```

---

## 四、你现在没考虑到的问题（来自对标产品）

| # | 问题 | 来源 | 严重度 |
|---|------|------|--------|
| 1 | **拖拽时撤销栈会堆满半成品状态** | 节点画布通用坑 | 🔴 |
| 2 | **多个 3D 场景同时打开 GPU 会崩** | ComfyUI VRAM 经验 | 🔴 |
| 3 | **IndexedDB 满了用户不知道** | 对标 Figma 存储管理 | 🔴 |
| 4 | **视频生成 30 分钟用户关了页面回来状态丢了** | Runway 异步经验 | 🟡 |
| 5 | **Agent 一口气删掉半张画布** | 节点画布坑 | 🟡 |
| 6 | **GLB 导入后 shader/材质不兼容** | Meshy 上线教训 | 🟡 |
| 7 | **用户不知道生成排队到哪了** | ComfyUI 队列缺失 | 🟡 |
| 8 | **中文 prompt 编译失败静默回退英文** | LLM 可靠性 | 🟡 |
| 9 | **base64 图片塞进 JSON 导致同步卡死** | Canvas 通用坑 | 🔴 |
| 10 | **浏览器 tab 切后台时 WebGL 上下文丢失** | Figma 经验 | 🟡 |

---

## 五、最小可行补强（MVP）

如果时间紧，至少完成这 5 项就能做小规模内测：

1. ✅ JSON 膨胀 → Blob 分离
2. ✅ 并发生成隔离
3. ✅ 撤销栈防污染
4. ✅ 异步超时保护
5. ✅ IndexedDB 容量监控

**预计周期：7 天 → 达到 88/100，可支撑 5–10 人内测**
