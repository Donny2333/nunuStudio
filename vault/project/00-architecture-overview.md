# iStudio 项目架构总览

## 一、系统定位

iStudio 是一个基于 Three.js 的 Web 3D/2D 游戏引擎 + 可视化编辑器。支持浏览器运行、NW.js 桌面端打包、Cordova 移动端打包。

## 二、顶层架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Webpack 构建层                                │
│  webpack.config.js (editor)  webpack.runtime.js (runtime library)   │
│  webpack.dev.js (HMR开发)    webpack.prod.js (生产编辑器)             │
│  ProvidePlugin: THREE → "three", window.THREE → "three"             │
└───────┬────────────────────────────────┬────────────────────────────┘
        │                                │
        ▼                                ▼
┌───────────────────┐          ┌─────────────────────┐
│  source/editor/   │          │   source/core/       │
│  可视化编辑器      │─引用──▶  │   运行时引擎          │
│  (~248 files)     │          │   (~159 files)       │
│  入口: Main.js    │          │   入口: Main.js      │
│  → Editor.init()  │          │   → UMD: istudio.min.js │
└───────────────────┘          └─────────────────────┘
        │                                │
        │  ┌─────────────────────────────┘
        ▼  ▼
┌───────────────────────────────────────────────────┐
│                 Three.js (r167)                    │
│  + source/core/three/ (15个 monkey-patch 文件)      │
│  通过 IStudio.js 的 bare import 加载补丁               │
└───────────────────────────────────────────────────┘
```

## 三、核心模块分层

```
┌─────────────── 编辑器层 (source/editor/) ───────────────┐
│                                                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │
│  │ GUI层   │  │ 历史系统  │  │ 加载器   │  │ 设置/   │  │
│  │ gui/    │  │ history/ │  │ loaders/ │  │ 国际化  │  │
│  │ 菜单栏  │  │ Action   │  │ AWD      │  │Settings │  │
│  │ 标签页  │  │ Undo/    │  │ Babylon  │  │Locale   │  │
│  │ 侧边栏  │  │ Redo     │  │          │  │Theme    │  │
│  │ 检查器  │  │          │  │          │  │         │  │
│  └─────────┘  └──────────┘  └──────────┘  └─────────┘  │
│                                                         │
│  ┌──────────────┐  ┌───────────────────┐                │
│  │ UI组件库     │  │ 工具/导出         │                │
│  │ components/  │  │ Loaders.js 资源   │                │
│  │ Button/Input │  │ Exporters.js 导出  │                │
│  │ Tab/Modal    │  │ ProjectExporters   │                │
│  └──────────────┘  └───────────────────┘                │
└─────────────────────────────────────────────────────────┘

┌─────────────── 引擎层 (source/core/) ───────────────────┐
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ 场景对象  │  │ 资源管理  │  │ 纹理系统  │  │ 加载器 │  │
│  │ objects/ │  │resources/│  │ texture/ │  │loaders/│  │
│  │ Program  │  │ Font     │  │ Texture  │  │Object  │  │
│  │ Scene    │  │ Image    │  │ Video    │  │Material│  │
│  │ Mesh     │  │ Audio    │  │ Canvas   │  │Texture │  │
│  │ Light    │  │ Video    │  │ Cube     │  │Geometry│  │
│  │ Camera   │  │ Model    │  │ Sprite   │  │ Font   │  │
│  │ Script   │  │ TextFile │  │ Sheet    │  │        │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ 输入系统  │  │ 后处理   │  │ 渲染配置  │  │ XR     │  │
│  │ input/   │  │postproc/ │  │renderer/ │  │ xr/    │  │
│  │ Keyboard │  │EffComposer│ │ Config   │  │VR/AR   │  │
│  │ Mouse    │  │ 15 Passes│  │ State    │  │Handler │  │
│  │ Gamepad  │  │ Shaders  │  │ CSS3D    │  │        │  │
│  │ Gyroscope│  │          │  │          │  │        │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ 工具     │  │ Three补丁│  │ 平台抽象 │              │
│  │ utils/   │  │ three/   │  │FileSystem│              │
│  │ Physics  │  │ 15 patch │  │ App.js   │              │
│  │ BSP      │  │ toJSON   │  │ IStudio.js  │              │
│  │ Timer    │  │ raycast  │  │          │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

## 四、对象继承体系

所有场景节点统一使用 ES5 函数 + `Reflect.construct` 模式继承 Three.js 的 ES6 class：

```
THREE.Object3D (ES6 class)
 ├── Program (extends ResourceManager extends Object3D)
 │    └── 项目根节点，管理全局资源、场景切换、输入设备
 ├── Scene (extends THREE.Scene)
 │    └── 场景节点，管理物理世界(cannon-es)、相机列表
 ├── Mesh / SkinnedMesh / InstancedMesh
 ├── PerspectiveCamera / OrthographicCamera / CubeCamera
 ├── PointLight / SpotLight / DirectionalLight / AmbientLight / ...
 ├── AudioEmitter / PositionalAudio
 ├── Script / NodeScript / PythonScript
 ├── ParticleEmitter
 ├── PhysicsObject (cannon-es Body 封装)
 ├── SpineAnimation (spine-threejs)
 ├── TextMesh / TextBitmap / TextSprite
 ├── Sky / Group / LensFlare / HTMLView / TilesetObject
 ├── OrbitControls / FirstPersonControls
 ├── Sprite / CanvasSprite
 └── UICanvas / UIImage

THREE.Texture (ES6 class)
 ├── Texture (iStudio 封装，含 imageResource 属性)
 │    ├── CanvasTexture
 │    ├── VideoTexture / WebcamTexture
 │    ├── SpriteSheetTexture
 │    └── DataTexture / CompressedTexture / CubeTexture
```

## 五、数据流概览

### 5.1 编辑态数据流

```
用户操作 → SceneEditor/Inspector/TreeView
  → Editor.addAction(Action)
    → History.add(action)
      → action.apply()  // 修改 Editor.program 对象树
        → Editor.updateSelectionGUI()  // 刷新所有 Tab
```

### 5.2 运行态数据流

```
Editor.runProject()
  → Program.toJSON() → JSON.parse(JSON.stringify()) → 深拷贝
    → ObjectLoader.parse(json) → 新 Program 实例
      → program.initialize()
        → Scene.initialize()  // 初始化物理世界、脚本
          → 各子对象 initialize()
      → program.update(delta)  // 每帧循环
        → scene.update(delta)
          → physics.step()
          → 各子对象 update()
        → camera.composer.render()  // 后处理链渲染
```

### 5.3 序列化流程

```
保存: Editor.program.toJSON()
  → Object3D.toJSON(meta) [monkey-patched]
    → 递归遍历场景树，收集 geometries/materials/textures/images
    → 每个对象写入 data.object，资源写入 meta 对应分类
  → JSON → PSON 二进制压缩 → .nsp 文件
  (或直接 JSON → .isp 文件)

加载: ObjectLoader.parse(json)
  → parseImages → parseTextures → parseMaterials
  → parseGeometries → parseObjects (递归)
    → 根据 object.type switch case 创建对应类实例
    → 恢复引用关系 (uuid → 已解析对象)
```

## 六、构建产物

| 构建命令 | 入口 | 产物 | 用途 |
|---------|------|------|------|
| `npm start` | `source/editor/Main.js` | dev-server:8080 | 开发调试 |
| `npm run build-editor` | `source/editor/Main.js` | `docs/editor/bundle.js` | 编辑器发布 |
| `npm run build-runtime` | `source/core/Main.js` | `dist/istudio.min.js` (UMD) | 嵌入式运行时 |
| `npm run build-nwjs` | 同 editor | NW.js 桌面包 | 桌面应用 |

## 七、关键技术约束

1. **ES5 代码风格**：全项目使用 `function` + `prototype`，不用 ES6 class/箭头函数
2. **Reflect.construct 继承**：~50 个文件使用此模式继承 Three.js ES6 class
3. **Monkey-patch 补丁**：15 个文件通过 `IStudio.js` bare import 覆盖 Three.js 原型方法（主要是 toJSON）
4. **全局 THREE**：webpack ProvidePlugin 注入 `THREE` 和 `window.THREE`
5. **无测试套件**：仅依赖 ESLint + 手动测试

## 八、详细模块文档索引

- [01-core-engine.md](./01-core-engine.md) — 核心引擎架构
- [02-editor-main.md](./02-editor-main.md) — 编辑器主控与生命周期
- [03-scene-editor.md](./03-scene-editor.md) — 场景编辑器（3D 视口）
- [04-inspector-system.md](./04-inspector-system.md) — Inspector 检查器系统
- [05-tree-and-assets.md](./05-tree-and-assets.md) — 树视图与资产管理
- [06-material-texture-editor.md](./06-material-texture-editor.md) — 材质/纹理编辑器
- [07-code-and-scripting.md](./07-code-and-scripting.md) — 代码编辑与脚本系统
- [08-history-system.md](./08-history-system.md) — 历史记录与撤销重做
- [09-serialization.md](./09-serialization.md) — 序列化与资源加载
- [10-postprocessing.md](./10-postprocessing.md) — 后处理管线
- [11-ui-component-library.md](./11-ui-component-library.md) — UI 组件库
