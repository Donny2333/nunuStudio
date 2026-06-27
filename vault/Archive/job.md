# Three.js 升级 + 3D Tiles 集成 — 任务拆分方案

## 前提

MVP 完成后交付：Three.js r167 编辑器可运行，3d-tiles-renderer 基础集成。此状态作为**分支基线**，各开发者从此 fork。

## MVP（4 个工作日）

| 步骤 | 工作量 | 内容 |
|------|--------|------|
| 升级 three + 构建通过 | 1 天 | 升级 package.json，Math→MathUtils，删除 JSONLoader/LegacyGeometryLoader/WebGL1Renderer，webpack 编译通过 |
| 渲染管线最小修复 | 1 天 | gammaFactor→outputColorSpace，texture.encoding→colorSpace，删 physicallyCorrectLights，Geometry 工具函数改 BufferGeometry |
| 序列化补丁快速修复 | 1 天 | 15 个 three/ 补丁跑通（新建场景能保存/加载即可） |
| 集成 3d-tiles-renderer | 1 天 | 安装包，新建 TilesetObject 类，场景编辑器中可添加并渲染瓦片 |

**交付物：** 编辑器可启动，新建场景 → 添加 Tileset 节点 → 配置瓦片 URL → 视口中看到瓦片渲染。

---

## 并行开发角色分工（3 人）

### Dev A — 编辑器稳定化

专注修复升级后的存量功能回归，不涉及新功能。

| 任务 | 天数 |
|------|------|
| 后处理 Pass 修复（~20 个，逐个验证构造签名） | 2 |
| XR 模块重写（删 WebVR，纯 WebXR） | 1 |
| 全 Tab 回归测试 + 零散兼容修复 | 2 |

**产出：** 编辑器全功能可用，无控制台报错，后处理效果正常渲染。

---

### Dev B — Tileset 编辑体验

在 MVP 的 TilesetObject 基础上做完整的编辑器集成。

| 任务 | 天数 |
|------|------|
| Inspector 面板（URL、LOD、geometric error 参数） | 1.5 |
| Tileset 节点序列化（toJSON/fromJSON，项目存取） | 1 |
| 场景树图标、右键菜单、拖拽支持 | 0.5 |
| 加载状态 UX（进度条、错误提示、包围盒可视化） | 1 |
| 多数据源支持（Cesium Ion / 本地路径 / 自定义服务） | 1 |

**产出：** 用户可通过 GUI 完整添加、配置、保存、加载 Tileset 节点。

---

### Dev C — 地理空间基础 + r170 升级

为 three-geospatial 集成铺路，做坐标系和相机体系。

| 任务 | 天数 |
|------|------|
| Three.js r167 → r170 增量升级 | 1 |
| WGS84 ↔ 场景坐标转换模块 | 1.5 |
| 地理相机 Controls（地球级别缩放 + 地表漫游） | 2 |
| 集成 @takram/three-geospatial 核心 API | 1.5 |

**产出：** 瓦片可按地理坐标定位，相机支持经纬度导航。

---

## 时间线

```
         Day 1     Day 3      Day 5       Day 7      Day 10
          │         │          │           │           │
Dev A ────┤ Pass修复 ├── XR ────┤ 回归测试 ──┤           │
          │         │          │           │           │
Dev B ────┤ Inspector面板 ├─ 序列化 ─┤─ UX打磨 ──┤ 多数据源 ─┤
          │         │          │           │           │
Dev C ────┤ r170升级 ├─ 坐标转换 ┤─ 相机Controls─┤ geospatial┤
          │         │          │           │           │
          ▼         ▼          ▼           ▼           ▼
         CP0       CP1        CP2         CP3         CP4
```

---

## 核心交付检查点

| 检查点 | 时间 | 验收标准 | 合并条件 |
|--------|------|----------|----------|
| **CP0** | Day 0 | MVP 分支基线锁定 | 编辑器启动 + 瓦片可渲染 |
| **CP1** | Day 3 | A: 后处理全部修复；B: Inspector 面板可配置瓦片参数；C: r170 构建通过 | 各自分支 CI lint 通过 |
| **CP2** | Day 5 | A: XR 模块重写完成；B: 项目保存/加载含 Tileset；C: 坐标转换模块单元验证 | A 合入主分支（无新功能依赖） |
| **CP3** | Day 7 | A: 全量回归完成 ✅ 合并；B: 完整编辑 UX 可演示；C: 地理相机可按经纬度定位 | B + C 基于 A 的主分支 rebase |
| **CP4** | Day 10 | B: 多数据源支持；C: three-geospatial 集成完成；集成测试：瓦片按地理坐标加载 + 编辑器全功能 | 全员合入，集成验收 |

---

## 合并策略 & 冲突规避

| 规则 | 原因 |
|------|------|
| A 最先合入（CP2-CP3） | 稳定化改动面广但不影响新功能 API |
| B 和 C 互不修改对方文件 | B 在 `editor/gui/` + `core/objects/`，C 在 `core/xr/` + 新增 `core/geo/` |
| C 负责 three.js 版本升级 | 避免 A/B 同时改 package.json 冲突 |
| 每日同步 rebase 主分支 | 防止 Day 10 合并地狱 |

---

## 风险点

| 风险 | 归属 | 缓解 |
|------|------|------|
| 后处理 Pass 某些依赖内部 API 变动大 | Dev A | 对无法修复的 Pass 暂时标记禁用，不阻塞其他人 |
| Tileset 序列化与 three/ 补丁冲突 | Dev B | MVP 阶段确认补丁格式后锁定接口 |
| three-geospatial 对 r170 有未文档化依赖 | Dev C | 预留 Day 9-10 作为 buffer，必要时降级到部分集成 |
