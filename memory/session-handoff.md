# Session Handoff — 2026-07-09

## 上次会话
- **分支**: `fix/infinite-canvas-refactor`
- **板块**: ProjectSelector 3D 手风琴书 — 卡片无缝连接

## 当前状态
- **文件**: `src/components/ProjectSelector.tsx` — 单一文件，~515 行
- **编译**: `npx tsc --noEmit` — 零错误 ✅

## 已完成的核心改动

### 问题根因
每个卡片有独立的 `perspective(900px)` 变换，各自由不同的虚拟相机投射 → 相邻卡片边缘无法对齐。另外 `overflow: scroll` 容器强制 `transform-style: flat`，3D 上下文被切断。

### 解决方案
1. **JS 驱动滚动** — 用 `bookOffset` state + spring 动画替代原生 scroll
2. **共享 3D 上下文** — 所有卡片共享同一个 perspective（arc wrapper 的 `perspective(2000px)`），通过 `preserve-3d` 链传递
3. **移除 `overflow: hidden`** — 外层 panel 的 `overflow: hidden` 会强制 `transform-style: flat`，已移除
4. **移除所有独立 `perspective()`** — 卡片/panel 不再使用 `perspective(900px)` 在 transform 内

### 3D 上下文链
```
overflow:hidden (clip viewport, 非 3D 层级)
  → perspective:1400px
    → 动画 div
      → arc wrapper: perspective(2000px) rotateX(5deg) + preserve-3d
        → book wrapper: translateX(-bookOffset) + preserve-3d
          → [cards]: rotateY(fanAngle) + preserve-3d
            → folded body: preserve-3d
              → 外层 panel: rotateY(±mFold) + preserve-3d ✅
                → 内层 panel: rotateY(∓vFold) + preserve-3d ✅
```

## 待验证/下一步
- [ ] **浏览器验证** — 卡片是否真正无缝连接（共享 3D 上下文后）
- [ ] **拖拽性能** — JS 驱动的 setBookOffset 在 pointerMove 中每帧触发 React re-render，可能卡顿。如果卡 → 改为 ref + 直接 DOM 操作
- [ ] 内层 valley fold 是否真的需要（可能不用内层，光外层 mountain fold 就已经满足无缝连接）
- [ ] 弧形/扇形效果微调
- [ ] 纸本手账装饰恢复（washi tape, 纸纹理）
- [ ] 分页圆点指示器是否正确更新（currentPage 计算）

## 禁止做的
- ❌ 不要改回原生 scroll
- ❌ 不要在 panel 上加 `overflow: hidden`（会断 3D 链）
- ❌ 不要在 panel 上加独立 `perspective()` 在 transform 内
- ❌ 不要改端口号
