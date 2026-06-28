# 01 核心引擎架构 (source/core/)

核心引擎是 iStudio 的运行时基础，可独立打包为 `dist/istudio.min.js` (UMD) 嵌入任意网页。

## 1. 入口与初始化

### Main.js — 模块导出注册

`source/core/Main.js` 不执行逻辑，纯粹 re-export 所有公开类。这是 `webpack.runtime.js` 的入口。外部使用 `import {App, Program, Scene} from "istudio"` 即可访问引擎全部能力。

### IStudio.js — Three.js 补丁加载 + 环境检测

`source/core/IStudio.js:1-15` 通过 15 行 bare import 加载所有 Three.js monkey-patch 文件（副作用 import，无导出值）。这些补丁在模块加载阶段覆盖 Three.js prototype 方法。

IStudio 类本身提供静态工具方法：
- `IStudio.webGLAvailable()` — WebGL 支持检测
- `IStudio.runningOnDesktop()` — NW.js 环境判断
- `IStudio.getQueryParameters()` — URL 参数解析

### App.js — 运行时容器

`App` 是面向外部嵌入的 runtime 控制器，管理：
- `this.program` — 当前加载的 Program 实例
- `this.renderer` — WebGLRenderer
- `this.canvas` — 渲染 canvas 元素
- `this.running` — 运行状态标记

生命周期方法：
```
loadProgram(file) → setProgram(program) → run() → update(每帧) → exit()
```

`App.loadProgram()` 内部使用 `ObjectLoader` 从 JSON/PSON 反序列化 Program。

## 2. 场景树核心对象

### Program — 项目根节点

`source/core/objects/Program.js`

继承链：`Program → ResourceManager → Object3D`

Program 是整个项目的根节点，承担两个角色：
1. **场景容器**：children 即为各 Scene 实例
2. **全局资源库**：继承 ResourceManager，存储 fonts/images/audios/videos 等

关键属性：
- `rendererConfig` (RendererConfiguration) — 渲染器配置（色调映射、抗锯齿等）
- `defaultScene` / `defaultCamera` — 默认场景和相机的 UUID
- `keyboard` / `mouse` — 全局输入设备实例
- `vr` / `ar` / `vrScale` — XR 配置
- `targetConfig` (TargetConfig) — 部署平台配置

初始化流程 (`Program.prototype.initialize`)：
1. 创建或绑定 Mouse / Keyboard
2. 查找 `defaultScene` UUID 对应的 Scene 子节点
3. 调用 `setScene()` 切换到目标场景
4. 锁定鼠标指针（如果配置了 lockPointer）
5. 启动 Clock

每帧更新 (`Program.prototype.update`)：
1. `mouse.update()` / `keyboard.update()` — 更新输入状态
2. `scene.update(delta)` — 更新当前场景（物理、脚本、动画等）

### Scene — 场景节点

`source/core/objects/Scene.js`

继承链：`Scene → THREE.Scene`

每个 Scene 是独立的 3D 世界，包含：
- `world` (cannon-es World) — 物理世界实例，默认重力 (0, -9.8, 0)
- `cameras[]` — 场景中所有相机的引用列表
- `defaultCamera` — 当前激活相机的 UUID
- `raycaster` — 射线检测器（用于鼠标交互）
- `useOctree` / `octree` — 可选的空间加速结构

初始化流程 (`Scene.prototype.initialize`)：
1. `this.program = this.parent` — 建立对 Program 的引用
2. 递归调用所有子对象的 `initialize()`
3. 收集场景中所有 Camera 到 `cameras[]`
4. 查找 `defaultCamera` 并激活

每帧更新 (`Scene.prototype.update`)：
1. 物理模拟 `world.step(delta)`
2. 递归调用所有子对象的 `update(delta)`
3. 更新 octree（如果启用）
4. 检测鼠标射线交互 → 触发 Script 的 `onMouseOver`

渲染 (`Scene.prototype.render`)：
1. 遍历 `cameras[]`，对每个相机：
   - 应用 Viewport 裁剪
   - 调用 `camera.composer.render()` (EffectComposer 后处理链)

## 3. 场景对象分类

### 3.1 Mesh 系列 (objects/mesh/)

| 类 | 继承自 | 描述 |
|----|--------|------|
| `Mesh` | THREE.Mesh | 基础网格，支持 geometry/material 自动序列化 |
| `SkinnedMesh` | THREE.SkinnedMesh | 骨骼蒙皮网格 |
| `InstancedMesh` | THREE.InstancedMesh | GPU 实例化渲染 |

Mesh 的 `toJSON` 覆写确保 geometry 和 material 注册到 meta 的资源表中。

### 3.2 Camera 系列 (objects/cameras/)

| 类 | 继承自 | 额外能力 |
|----|--------|---------|
| `PerspectiveCamera` | THREE.PerspectiveCamera | composer (EffectComposer)、viewport (Viewport) |
| `OrthographicCamera` | THREE.OrthographicCamera | 同上 |
| `CubeCamera` | THREE.Object3D | 环境贴图捕获 |

每个 Camera 持有独立的 `EffectComposer`，管理后处理 Pass 链。`Viewport` 定义了该相机渲染的屏幕区域（NDC 坐标的 left/bottom/width/height）。

### 3.3 Light 系列 (objects/lights/)

7 种灯光类型：Ambient / Directional / Hemisphere / Point / Spot / RectArea / LightProbe。
每种灯光封装 Three.js 对应类，增加 `toJSON` 序列化覆写。阴影参数通过 `LightShadow.toJSON` 补丁序列化。

### 3.4 Audio 系列 (objects/audio/)

- `AudioEmitter` — 非空间化音频（全局声音）
- `PositionalAudio` — 3D 空间化音频（衰减/方向性）

依赖 Web Audio API，音频资源引用 `core/resources/Audio`。

### 3.5 Script 系列 (objects/script/)

- `Script` — JavaScript 脚本节点。存储源代码字符串，运行时通过 `new Function()` 动态编译。脚本可访问 `self`(当前对象)、`scene`、`program`、`Keyboard`、`Mouse`、`THREE`、`CANNON` 等全局变量
- `PythonScript` — Python 脚本，通过 Brython 转译执行
- `NodeScript` — 可视化节点编程（nodes/ 目录）

脚本生命周期回调：`initialize` → `update(delta)` → `dispose`，以及 `onMouseOver`、`onResize`、`onAppData` 事件。

### 3.6 其他对象 (objects/misc/)

| 类 | 描述 |
|----|------|
| `Group` | 空容器节点 |
| `Sky` | 天空盒（动态大气散射着色器） |
| `LensFlare` | 镜头光晕效果 |
| `HTMLView` | 嵌入 HTML/iframe 内容 |
| `TilesetObject` | 地理瓦片渲染（高德卫星影像） |
| `ParticleEmitter` | GPU 粒子系统 |
| `SpineAnimation` | Spine 2D 骨骼动画 |
| `PhysicsObject` | cannon-es 刚体封装 |

### 3.7 Text 系列 (objects/text/)

| 类 | 渲染方式 |
|----|---------|
| `TextMesh` | 3D 几何体文字（挤出字体轮廓） |
| `TextBitmap` | BMFont 位图文字 (three-bmfont-text) |
| `TextSprite` | Canvas 2D 绘制 → 纹理贴片 |

### 3.8 UI 系列 (objects/ui/)

- `UICanvas` — 2D UI 画布容器
- `UIImage` — UI 图片组件

### 3.9 Controls 系列 (objects/controls/)

- `OrbitControls` — 运行时轨道控制器
- `FirstPersonControls` — 第一人称控制器

注意：这些是**运行时**控制器（序列化到项目中），区别于编辑器的 `EditorOrbitControls`/`EditorFreeControls`。

## 4. 资源管理系统 (resources/)

### ResourceContainer — 资源存储基类

定义标准资源分类（静态属性 `libraries`）：
```
images, videos, audio, fonts, materials, textures, geometries, resources(TextFile/Model等)
```
每个分类是一个 `{uuid: resource}` 字典。

### ResourceManager — 对象化资源管理

继承 Object3D + 混入 ResourceContainer。Program 通过继承 ResourceManager 成为整个项目的资源仓库。

### 资源类型

| 类 | 文件类型 | 存储方式 |
|----|---------|---------|
| `Image` | png/jpg/bmp/gif/tga | base64 DataURL |
| `Video` | mp4/webm | base64 DataURL |
| `Audio` | mp3/ogg/wav | base64 DataURL |
| `Font` | ttf/otf/woff | base64 DataURL + typeface.js 格式 |
| `TextFile` | js/json/txt | 原始文本 |
| `Model` | 3D 模型文件 | arraybuffer |
| `VideoStream` | RTSP/HLS URL | URL 引用 |

所有资源通过 UUID 引用，序列化时存入 meta 的对应分类。

## 5. 纹理系统 (texture/)

| 类 | 继承自 | 功能 |
|----|--------|------|
| `Texture` | THREE.Texture | 基础纹理，关联 `imageResource`(Image资源引用) |
| `VideoTexture` | Texture | 视频纹理 |
| `CanvasTexture` | THREE.CanvasTexture | Canvas 2D 动态纹理 |
| `WebcamTexture` | Texture | 摄像头纹理 |
| `CubeTexture` | THREE.CubeTexture | 立方体贴图（6面） |
| `DataTexture` | THREE.DataTexture | 原始数据纹理 |
| `CompressedTexture` | THREE.CompressedTexture | GPU 压缩纹理 (DDS/PVR/KTX) |
| `SpriteSheetTexture` | Texture | 精灵表动画纹理 |

注意 iStudio 的 `Texture.imageResource`（原名 `.source`，r167 升级后重命名以避免与 THREE.Texture.source 冲突）。

## 6. 后处理系统 (postprocessing/)

`EffectComposer` 管理渲染 Pass 链，每个 Camera 持有独立实例。

### Pass 基类

所有 Pass 继承 `Pass` 基类，实现 `render(renderer, writeBuffer, readBuffer, delta)` 方法。

### 内置 Pass 列表

| Pass | 效果 |
|------|------|
| `RenderPass` | 基础场景渲染（必须为第一个 Pass） |
| `FXAAPass` | 快速近似抗锯齿 |
| `SSAOPass` / `SSAONOHPass` | 屏幕空间环境光遮蔽 |
| `UnrealBloomPass` / `BloomPass` | 泛光/辉光 |
| `BokehPass` | 景深模糊 |
| `FilmPass` | 胶片颗粒效果 |
| `DotScreenPass` | 网点效果 |
| `SobelPass` | 边缘检测 |
| `ColorifyPass` | 颜色滤镜 |
| `TechnicolorPass` | 旧式彩色电影效果 |
| `HueSaturationPass` | 色相/饱和度调节 |
| `AfterimagePass` | 残影效果 |
| `CopyPass` | 直接拷贝（调试用） |
| `AdaptiveToneMappingPass` | 自适应色调映射 |

所有 Pass 的 GLSL 着色器使用 GLSL1 语法（`texture2D`/`gl_FragColor`/`varying`），依赖 WebGLRenderer 自动转换。

## 7. 输入系统 (input/)

| 类 | 功能 |
|----|------|
| `Keyboard` | 键盘状态管理，支持按下/释放/长按检测 |
| `Mouse` | 鼠标状态 + 位置 + 滚轮 + 指针锁定 |
| `Gamepad` | Gamepad API 封装 |
| `Gyroscope` | 设备方向传感器 |
| `Key` | 单个按键状态封装 |

每帧 `update()` 刷新状态。全局实例挂在 `Program.keyboard` / `Program.mouse` 上。

## 8. Three.js 补丁层 (three/)

15 个文件通过 `IStudio.js` 加载，直接覆写 Three.js 原型方法：

| 文件 | 覆写内容 | 目的 |
|------|---------|------|
| `core/Object3D.js` | `toJSON` | 增加 iStudio 自定义字段序列化 |
| `materials/Material.js` | `toJSON` | 增加材质自定义属性序列化 |
| `textures/Texture.js` | `toJSON` | 跳过图片数据，仅序列化元数据 |
| `core/BufferAttribute.js` | `toJSON` | 自定义缓冲区序列化 |
| `core/InterleavedBuffer.js` | `toJSON` | 交错缓冲区序列化 |
| `objects/Skeleton.js` | `toJSON` + `fromJSON` | 骨骼序列化/反序列化 |
| `lights/LightShadow.js` | `toJSON` + `fromJSON` | 阴影参数持久化 |
| `cameras/Camera.js` | helper render | 相机辅助渲染 |
| `objects/Points.js` | `raycast` | 增强点云射线检测 |
| `loaders/BufferGeometryLoader.js` | `parse` | 兼容 iStudio 格式 |
| 其余 5 个 | 各种 toJSON | 补充序列化细节 |

## 9. 平台抽象

### FileSystem.js

统一 I/O API，适配三套运行环境：
- **NW.js**：直接使用 Node.js fs 模块
- **浏览器**：使用 `<input type="file">` + `FileReader` + `<a download>`
- **Cordova**：使用 cordova-plugin-file

### App.js

运行时容器，封装 canvas 创建、渲染器初始化、resize 处理、全屏切换、项目加载/卸载。

## 10. 物理引擎集成

通过 `cannon-es` 实现：
- `Scene.world` — 每个场景独立物理世界
- `PhysicsObject` — 刚体封装节点
- `PhysicsGenerator` — 从 BufferGeometry 自动生成碰撞体形状
- 每帧 `scene.update()` 中调用 `world.step(delta)`
