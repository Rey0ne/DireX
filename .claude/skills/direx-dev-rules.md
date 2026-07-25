---
name: direx-dev-rules
description: DireX 项目开发铁律——代码安全、协作风格、UI 规范、相机套件知识库
---

# DIREX DEVELOPMENT RULES

## 安全铁律

1. **禁止 git checkout 覆盖本地修改** — `git checkout <file>` 直接丢弃未提交改动，永远先 `git stash`
2. **禁止 Write 覆盖用户已编辑未保存的文件** — 优先用 Edit 精确替换，不要整文件重写
3. **破坏性操作前必须先备份** — 删除/覆盖/checkout/rebase 前：git stash 或 git diff > backup.patch
4. **增量开发而非推倒重来** — 在已有代码基础上叠加，不要"先还原再重新改"
5. **禁止全局杀 Node 进程** — `taskkill //F //IM node.exe` 会杀用户代理(Clash/V2Ray)。只杀特定端口：`netstat -ano | grep ':PORT'` → 只杀那个 PID
6. **大改前先 commit** — 避免丢失进度，方便回滚
7. **禁止未经确认的 git checkout/restore** — 会直接丢弃未提交改动。必须先问用户，优先用 Edit 精准回滚

## 协作风格

7. **先读代码再说话** — 不能凭记忆判断，grep/read 确认后再回复
8. **主动补充，不只是执行** — 用户说"加相机选择"，要想到镜头/焦段/光圈/胶片配套、Agent 接入、知识库数据，帮用户完善成完整方案
9. **不动已调好的部分** — 用户调好的布局/参数，不要反复改动
10. **图片/视频逻辑独立** — 默认模型、参数路径完全分开：图片默认 `GPT Image2`，视频默认 `Seedance 2.0`
11. **有证据时主动反驳** — API 文档、类型错误、日志输出都可以作为依据。不能默默执行不合理要求
12. **replace_all 前先 grep** — 全局替换容易误伤，必须确认影响范围
13. **不动用户的网络/代理** — git push 用 SSH 或让用户自己操作

## UI 规范

13. **精确到像素** — 字号 8px/10px/12px，高度 20px/24px，圆角 8px/12px，间距 4px/6px，分隔线 14px
14. **纯白 #fff 字体** — DropBtn 文字统一纯白，不使用 var(--tap-text-3)
15. **DropBtn 风格** — 透明背景，hover 显示 rgba(255,255,255,0.07)，无边框，无箭头
16. **发送键** — 玻璃框 50×20px + 白圆 16px ↑，立体阴影
17. **缩放方式** — 面板用 `transform: scale(${1.5/zoom})`，zoom 来自 `useStore(s => s.transform[2])`

## 后端约定

18. **Kling mode = 'std'** — Kie API 只接受 'std'/'pro'，不接受 '720p' 等分辨率值
19. **边 handle 校验** — fixEdgeHandles 自动修正不匹配的 handle ID（image-out vs video-out）
20. **相机套件注入 prompt** — camera/lens/focalLength/aperture/filmStock 拼成 `[Camera: X, Lens: Y, ...] ` 前缀

## 相机套件知识库

21. **设备数据来源** — `c:\Users\ROG\Desktop\kb_append.md` (DireX Color Science Knowledge Base v1.4)
22. **相机** — Sony Venice, Arri Alexa 35/65, Red V-Raptor, Panavision DXL2, Arricam LT, ArriFlex 435, IMAX Film Camera
23. **镜头** — Zeiss Ultra Prime, Arri Signature, Canon K-35, Cooke S4/Panchro/SF 1.8x, Helios 44-2, Panavision C-series/Primo, Hawk Class X
24. **焦段** — 8mm, 14mm, 24mm, 35mm, 50mm, 75mm, 125mm
25. **光圈** — f/1.4 (8 blades), f/4 (6 blades), f/11 (3 blades)
26. **胶片风格** — Kodak 2383 (暖调), Kodak 250D (日光), Kodak 500T (钨丝), Ektachrome (蓝绿), Fuji Eterna (冷调), Fuji Velvia (高饱和), Technicolor (三色带), Bleach Bypass (高反差), B&W Acros (黑白)
27. **图片路径** — `public/camera-kit/cam-*.png`, `lens-*.png`, `aperture-*.png`, `lut-*.png`

## 当前状态

- **分支**: direx-dev
- **工作区**: `c:\Users\ROG\direx-isolated`
- **前端**: Vite 5173
- **后端**: tsx server/src/index.ts 端口 3001
- **GitHub**: https://github.com/Rey0ne/tapnow-canvas (Private)

**How to apply:** 每次编辑代码前回顾此文件。结合 [[task-backlog]] [[safety-rules]] [[camera-lut-integration]] [[collaboration-style]]。
