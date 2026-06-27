# Three.js r170 → r171 升级方案

> 评估日期：2026-06-27
> 当前版本：three@0.170.0
> 目标版本：three@0.171.0

## 总体评级

**低风险**（引擎核心） / **中风险**（第三方依赖）

## r171 主要变更

| 变更 | 对本项目影响 |
|------|-------------|
| WebGL/WebGPU 入口代码拆分 | 无 — `import "three"` 仍导出 WebGLRenderer |
| TSL blend 函数重命名 (burn→blendBurn 等) | 无 — 不使用 TSL |
| `storageObject()` 废弃 | 无 — WebGPU 专用 |
| 材质静态类型回退 | 正面 — 修复 r170 兼容性问题 |
| WebGLRenderer / 标准材质 / 几何体 / 序列化格式 | 无破坏性变更 |

## 项目内部风险点

### 高关注：`three/src/` 内部路径导入

`source/core/three/lights/LightShadow.js:1` 使用了：

```js
import {LightShadow} from "three/src/lights/LightShadow.js";
```

r171 代码拆分可能影响此路径。升级时需验证文件是否仍存在，如失效改为从 `"three"` 导入。

### 中关注：prototype monkey-patch（15 个文件）

`source/core/three/` 下 15 个文件修改了 three.js 原型（toJSON、dispose、raycast 等）。r171 未修改这些方法签名，本次升级安全。但后续大版本升级需持续关注。

涉及文件：
- `core/Object3D.js` — folded/locked 属性、initialize/update/dispose 生命周期、toJSON
- `core/BufferAttribute.js` / `InstancedBufferAttribute.js` / `InterleavedBuffer.js` / `InterleavedBufferAttribute.js` — 自定义 toJSON
- `textures/Texture.js` — 完全覆盖 toJSON
- `materials/Material.js` — 覆盖 dispose 和 toJSON
- `objects/Skeleton.js` — 自定义 toJSON
- `objects/Points.js` — 覆盖 raycast
- `lights/LightShadow.js` — 自定义 toJSON/fromJSON
- `cameras/Camera.js` — 添加 render 方法
- `animation/AnimationClip.js` / `KeyframeTrack.js` — 扩展属性和序列化
- `scenes/Fog.js` — 添加静态常量
- `loaders/BufferGeometryLoader.js` — 覆盖 parse

### 低关注

- **examples/jsm 模块**（~40 个）：r171 仅 bug fix，无破坏性变更
- **GLSL 着色器**：后处理管线使用 GLSL1 语法，WebGLRenderer 仍支持

## 第三方依赖兼容性

| 包 | 当前版本 | 兼容 r171？ | 操作 | 优先级 |
|---|---|---|---|---|
| `@esotericsoftware/spine-threejs` | 4.0.14 | **否** (three@^0.132) | 升级到 4.3.x（需同步升级 spine-core） | **高** |
| `three-to-cannon` | 3.1.0 | **否** (^0.115.0) | 升级到 5.0.x | **高** |
| `three-bmfont-text` | 3.0.1 | 无约束，2020 年停维护 | 仔细测试，考虑用 troika 替代 | **中** |
| `@takram/three-geospatial` | ^0.9.1 | 是 (>=0.170.0) | 无需操作 | - |
| `troika-three-text` | 0.44.0 | 是 (>=0.103.0) | 可选升级到 0.52.x | 低 |
| `3d-tiles-renderer` | ^0.4.28 | 是 (>=0.167.0) | 无需操作 | - |

## 升级步骤

1. **升级 spine-threejs 4.0 → 4.3**（API 可能变动，需同步升级 spine-core）
2. **升级 three-to-cannon 3.1 → 5.0**（跨两个大版本，review API 变更）
3. **升级 three 0.170 → 0.171**
4. **验证 `three/src/lights/LightShadow.js` 路径**，如失效改为从 `"three"` 导入
5. **全量回归测试**：
   - 后处理管线（Bloom、SSAO、FXAA 等所有 pass）
   - 项目序列化/反序列化（.nsp / .isp 加载保存）
   - Spine 动画播放
   - 物理碰撞体生成（three-to-cannon）
   - BMFont 文本渲染
   - 灯光阴影

## 预估工作量

1-2 天，主要耗时在依赖升级（spine、three-to-cannon）和回归测试。
