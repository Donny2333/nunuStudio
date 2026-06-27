# nunuStudio 架构文档

## 项目总体架构
nunuStudio 是一个基于 Three.js 和 WebGL 的网页端 3D 游戏引擎和场景编辑器。项目支持运行态(Runtime)和编辑态(Editor)分离，并且可以通过 nw.js 等工具打包成跨平台应用。

整体分为三大部分：
1. **Core (运行引擎核心, `source/core/`)**
   提供底层的 Three.js 封装、场景树管理、资源加载与解析、渲染管线控制、输入系统处理、音频和物理等运行时需要的核心能力。不依赖于编辑器的 UI 代码。
   主要类: 
   - `App`: 运行时核心逻辑
   - `Program`: 整个场景根节点、内部含有场景管理器与资源管理器
   - `Scene`: 单个场景实例
   - `ResourceManager`: 全局资源分配加载和内存控制

2. **Editor (可视化编辑器, `source/editor/`)**
   提供可视化的节点树、属性面板、资源管理器、视图编辑、脚本编辑器、动画编辑、历史记录(Undo/Redo)等。基于一套自定义的组件化轻量级 DOM UI 构建。
   
3. **Page (官网/展示层, `source/page/`)**
   Angular 构建的外部展示官网，用于用户展示。

---

## Editor 编辑器模块详细描述

### 1. 入口与初始化
**文件**: `source/editor/Main.js`, `source/editor/Editor.js`
- `Main.js` 是 Webpack 入口，负责初始化启动环境。
- `Editor.js` 为编辑器单例核心 `Editor`。负责初始化整个页面 UI (`Editor.gui`)、设置主题、快捷键事件监听、加载默认程序树(Program/Scene)，并对接渲染循环、窗口大小调整 (resize) 等系统级回调。

### 2. 界面与布局框架 (GUI)
**文件**: `source/editor/gui/Interface.js`, `source/editor/gui/MainMenu.js`, `source/editor/components/`
- **组件系统 (`components/`)**: 不使用 Vue/React 等框架，封装了一套纯原生 DOM 组件。如 `Canvas`, `TabGroup`, `TableForm`, `Button`, `Slider`, `CheckBox`, `VectorBox` 等，通过 OOP 的继承方式构造，所有组件均挂载至 `element` 属性。
- **Interface.js**: 编辑器主布局管理，它实例化了一个主分栏 (`TabGroup` 和 `SplitContainer` 结构)，将屏幕划分为顶部菜单、左侧(通常为 Scene 结构树)、中央(场景编辑区/代码编辑器)、右侧(属性 Inspector)、底部(资源面板 Assets/Console) 等区域。
- **MainMenu.js**: 负责顶部文件、编辑、项目、帮助等菜单栏操作的事件绑定，如打开本地项目、导出工程等。

### 3. 多标签页视图系统 (Tabs)
**目录**: `source/editor/gui/tab/`
整个编辑器基于多 Tab 系统，允许在同一面板中打开不同种类的视图。

#### 3.1 场景编辑器 (Scene Editor)
**目录**: `source/editor/gui/tab/scene-editor/`
- **SceneEditor.js**: 最核心的可视化交互区域。它维护了一个独立的 `WebGLRenderer` 画布。通过 `SceneEditor.render()` 执行编辑态下的渲染(含网格、辅助线 Helper、选中态高亮轮廓)。
- **交互控制 (Transform/Select)**: 使用 `TransformControls` 处理三维物体的位移/旋转/缩放操作。内部实现射线检测 (Raycasting) 用于鼠标拾取物体。

#### 3.2 节点树视图 (Tree View)
**目录**: `source/editor/gui/tab/tree-view/`
- **TreeView.js**: 动态递归渲染当前 `Program` 及其下的 `Scene` 及其 `Object3D` 子节点。支持拖拽改变物体层级(Parenting)。它监听 `Editor` 上的树结构变更事件来刷新节点列表。

#### 3.3 属性检查器 (Inspector)
**目录**: `source/editor/gui/tab/inspector/`
- **Inspector.js**: 响应用户的选中事件(通过 `Editor.selection`)。动态读取所选对象类型，加载对应的表单面板。
- **对象/材质拆分**: 包含 `objects/` (各种 Object3D 类型，如 Mesh、Light、Camera、Sky 等)、`materials/`、`resources/` 的表单构建。使用了大量组件如 `VectorBox` (三维向量), `NumberBox` 来直接操作并同步回对象实例的属性上。

#### 3.4 资源管理面板 (Asset)
**目录**: `source/editor/gui/tab/asset/`
- **Asset.js & 各种 XXXAsset**: 管理 `Program` 中的 `ResourceManager` (图片, 视频, 音频, 模型，纹理, 字体等)。
- 它不仅展示略缩图(使用 `gui/preview` 模块动态生成渲染图标)，还允许资源拖拽。用户可以拖拽资源至 `SceneEditor` 内直接创建节点，或拖拽至 `Inspector` 为材质或对象赋值。

#### 3.5 代码编辑器 (Code / Scripting)
**目录**: `source/editor/gui/tab/code/`
- 封装了 **CodeMirror** 提供 JS 脚本的高亮和补全(通过 TernJS 注入引擎 API 定义)。
- 负责编写依附于对象的 `Script` 节点的 update/initialize 等生命周期代码。

#### 3.6 动画与粒子 (Animation & Particles)
- **animation/**: 处理 `KeyframeTrack`，支持轨道关键帧可视化的增删改，关联模型骨骼与形变目标。
- **particle-editor/**: 对 `ParticleEmitter` 参数的精细化调整和实时预览。

### 4. 撤销/重做与历史系统 (History)
**目录**: `source/editor/history/`
- **History.js**: 维护一个撤销操作栈。
- **Action (`history/action/`)**: 所有对场景有状态修改的操作(如属性改变 `ChangeAction`, 节点增删 `AddAction`/`RemoveAction`, 资源添加 `AddResourceAction`)都被抽象为实现了 `undo()` 和 `redo()` 的 Command 模式类。

### 5. 序列化与文件系统
**文件**: `source/editor/Exporters.js`, `source/editor/ProjectExporters.js`, `source/editor/Loaders.js`
- **项目保存**: 调用引擎底层的导出。整个 `Program` 被序列化为 JSON 格式 (`.isp`) 或者 PSON (二进制格式 `.nsp`)，也支持含资源的 ZIP 打包打包。
- **平台兼容**: 由于考虑了 NW.js 和网页端，使用抽象的文件读取保存流，在浏览器中触发 A 标签下载，在 nwjs 中调用 node.js 原生 API 持久化。
- **模型支持**: 支持拖拽引入 glTF, OBJ, FBX, Collada 并在编辑器中转换回底层 Three.js 对象。

---
**小结**:
后续进行 bug 排查和二次开发时：
- 修改 **UI 交互和表单** -> 查阅 `source/editor/components/` 和 `source/editor/gui/tab/inspector/`
- 修改 **核心渲染/对象挂载机制** -> 查阅 `source/core/` 对应的对象
- 修改 **三维视图框交互/拾取** -> 查阅 `source/editor/gui/tab/scene-editor/SceneEditor.js`
- 修改 **回退栈(Undo无法生效)** -> 查阅 `source/editor/history/` 是否对某处修改包裹了 `Editor.addAction(...)`
