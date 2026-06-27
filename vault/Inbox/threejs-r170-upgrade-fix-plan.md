# Three.js r170 升级遗留问题修复计划

按风险优先级排序，P0 = 功能崩溃，P1 = 数据错误，P2 = 无效 UI / 误导，P3 = 技术债。

---

## ~~P0-1：SpriteSheetTexture 继承链修复~~ ✅ 已验证无问题

**结论：** 经 Node.js 模拟测试和编辑器实际运行验证，`Reflect.construct` 链继承正常工作。原 Archive 计划中标注的"待修复"是过度担忧。

**验证结果：**
- instanceof 检查正确（SpriteSheet → NTexture → THREE.Texture）
- prototype 方法（step/dispose/toJSON）正常调用
- Object.defineProperties（framesHorizontal/framesVertical/totalFrames）getter/setter 工作正常
- 编辑器零报错启动

---

## ~~P0-2：Texture.toJSON 中 VERSION 未定义~~ ✅ 已修复

**修复内容：** 导入 `REVISION` from "three"，将 `version: VERSION` 改为 `version: REVISION`。

**修改文件：** `source/core/three/textures/Texture.js`

---

## ~~P1-1：AWDLoader / BabylonLoader 旧 API 引用~~ ✅ 已修复

**修复内容：**
- AWDLoader.parseMeshPoseAnimation：`geom.morphTargets = []` + `.push({array})` 改为使用 `geom.morphAttributes.position` + `BufferAttribute` 数组（BufferGeometry 标准 API）
- BabylonLoader：审查确认无旧 API 引用，已使用 BufferGeometry + setAttribute，无需修改

**修改文件：** `source/editor/loaders/AWDLoader.js`

---

## ~~P0-3：AWDLoader 使用 Loader.call() 调用 ES6 class — 崩溃~~ ✅ 已修复

**修复内容：** 移除 `Loader.call(this, manager)`，改为手动初始化 Loader 的基础属性（manager、crossOrigin、withCredentials、path、resourcePath、requestHeader）。AWDLoader 仅使用 Loader 的简单属性，无需完整继承。

**修改文件：** `source/editor/loaders/AWDLoader.js`

---

## ~~P1-2：LensFlare DataTexture 缓冲区大小与格式不匹配~~ ✅ 已修复

**修复内容：** 将 `new Uint8Array(16 * 16 * 3)` 改为 `new Uint8Array(16 * 16 * 4)`，匹配 RGBAFormat 的 4 bytes/pixel 要求。

**修改文件：** `source/core/objects/misc/LensFlare.js`

---

## P2-1：MeshMaterialEditor 废弃属性 UI

**问题：** 材质编辑器中 `skinning` 和 `morphTargets` 复选框仍存在，但这两个属性在 r152+ 已从 Material 中移除。UI 控件无实际效果，误导用户。

**修复方案：**
1. 删除 `skinning` 复选框及对应的 ChangeAction 绑定
2. 删除 `morphTargets` 复选框及对应的 ChangeAction 绑定
3. 删除 `updateValues()` 中的 `skinning.setValue` / `morphTargets.setValue`
4. 清理 LocaleEN.js 中对应的本地化字符串

**涉及文件：**
- `source/editor/gui/tab/material/mesh/MeshMaterialEditor.js`
- `source/editor/locale/LocaleEN.js`

---

## P2-2：SkinnedWireframeHelper 材质属性无效

**问题：** `SkinnedWireframeHelper.js:9` 创建材质时设置 `skinning: true`，该属性在 r152+ 无效。蒙皮网格的线框辅助渲染可能不正确（不跟随骨骼变形）。

**修复方案：**
1. 移除 `skinning: true`
2. 验证 r167+ 中 ShaderMaterial / MeshBasicMaterial 是否自动支持蒙皮（r152+ 已内置）
3. 若线框不跟随骨骼，需改用其他方式（如 `material.wireframe = true` 直接在 SkinnedMesh 上）

**涉及文件：**
- `source/editor/gui/tab/scene-editor/helpers/SkinnedWireframeHelper.js`

---

## P3-1：LightShadow 内部路径导入

**问题：** `source/core/three/lights/LightShadow.js` 导入 `three/src/lights/LightShadow.js`（three.js 内部非公开路径）。当前可用，但任何 three.js 版本更新都可能破坏。

**修复方案：**
1. 改为从公开 API 导入：`import {LightShadow} from "three";`
2. 如果需要访问内部属性，检查是否有公开替代

**涉及文件：**
- `source/core/three/lights/LightShadow.js`

---

## P3-2：three-bmfont-text 本地 patch 维护

**问题：** `source/core/lib/three-bmfont-text.js` 是上游 three-bmfont-text 的本地 fork，已与上游分叉。无法获取 bug 修复，且 ES6 class 继承 patch 可能不完整。

**修复方案：**
1. 评估是否可替换为 troika-three-text（已在项目中，功能更强）
2. 如需保留 BMFont 支持，记录 patch 内容，方便未来同步
3. 低优先级，仅在 BMFont 文本渲染出错时处理

**涉及文件：**
- `source/core/lib/three-bmfont-text.js`

---

## P3-3：spine-threejs / three-to-cannon 版本滞后

**问题：**
- spine-threejs 4.0.14 需升级到 4.3.x 才能完全适配 r167+
- three-to-cannon 3.1.0 需升级到 5.0.x

**修复方案：**
1. spine-threejs：检查 4.0.14 → 4.3.x changelog，评估 breaking changes（Spine runtime API 变化较大）
2. three-to-cannon：检查 3.1.0 → 5.0.x changelog，主要关注 BufferGeometry API 适配
3. 均为独立升级任务，可单独排期

**涉及文件：**
- `package.json`
- `source/core/objects/spine/` — spine 相关
- `source/core/utils/PhysicsGenerator.js` — three-to-cannon 相关

---

## P3-4：后处理 GLSL1 shader 技术债

**问题：** 所有后处理 pass 使用 GLSL1 语法（`texture2D`, `gl_FragColor`, `varying`）。WebGLRenderer 当前仍自动转换，但属于 deprecated 兼容层。

**修复方案：** 暂不处理。待 three.js 移除 GLSL1 兼容层时再批量迁移到 GLSL3（`texture`, `out vec4 fragColor`, `in/out`）。

---

## 执行顺序建议

| 序号 | 任务 | 预估工时 | 状态 |
|------|------|----------|------|
| ~~1~~ | ~~P0-1 SpriteSheetTexture 修复~~ | — | ✅ 已验证无问题 |
| ~~2~~ | ~~P0-2 Texture.toJSON VERSION 修复~~ | — | ✅ 已修复 |
| ~~3~~ | ~~P1-1 AWDLoader morphTargets 修复~~ | — | ✅ 已修复 |
| ~~4~~ | ~~P0-3 AWDLoader Loader.call() 崩溃~~ | — | ✅ 已修复 |
| ~~5~~ | ~~P1-2 LensFlare DataTexture 缓冲区大小~~ | — | ✅ 已修复 |
| 6 | P2-1 MeshMaterialEditor 清理 | 30min | 待处理 |
| 7 | P2-2 SkinnedWireframeHelper 修复 | 30min | 待处理 |
| 8 | P3-1 LightShadow 内部路径 | 15min | 待处理 |
| 9 | P3-2 three-bmfont-text 替换评估 | 1h | 待处理 |
| 10 | P3-3 spine/three-to-cannon 升级 | 单独排期 | 待处理 |
| 11 | P3-4 GLSL shader 迁移 | 未来版本 | 暂不处理 |
