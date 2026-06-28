# 02 编辑器主控与生命周期 (source/editor/)

## 1. 启动入口

### Main.js — 编辑器入口

webpack 入口文件 `source/editor/Main.js`，功能极简：
1. 注册 CodeMirror 的 GLSL 插件
2. `document.body.onload` 时调用 `Editor.initialize()`
3. `document.body.onresize` 绑定 `Editor.resize`
4. 设置 `window.Buffer = window.ArrayBuffer`（兼容 Node.js Buffer API）

### Editor.js — 编辑器全局单例

`Editor` 是一个静态工厂类（`function Editor() {}`），所有成员方法和属性都是静态的，全局唯一。

## 2. Editor.initialize() 启动流程

路径：`source/editor/Editor.js:57`

```
Editor.initialize()
  │
  ├── 1. WebGL 支持检查
  │     └── 不支持 → 弹框退出
  │
  ├── 2. 加载 Settings
  │     └── Editor.settings = new Settings()
  │     └── Editor.settings.load()  // 从 LocalStorage 或文件读取
  │
  ├── 3. 加载 Tern 定义文件
  │     └── threejs.json / browser.json / ecmascript.json
  │     └── 用于代码编辑器的自动补全
  │
  ├── 4. 配置 document.body 样式
  │     └── overflow:hidden, 字体, 禁止右键菜单
  │
  ├── 5. 平台特化初始化
  │     ├── NW.js桌面: 绑定窗口关闭事件, 自动更新检查
  │     └── 浏览器: 设置虚拟剪贴板, 禁用默认快捷键, 页面离开警告
  │
  ├── 6. 文件拖放处理
  │     └── document.body.ondrop → 识别 .isp/.nsp 项目文件或文本文件
  │
  ├── 7. 初始化编辑器状态
  │     ├── Editor.selection = []      // 当前选中对象列表
  │     ├── Editor.program = null      // 当前项目
  │     └── Editor.history = null      // 撤销历史
  │
  ├── 8. 创建 GUI
  │     └── Editor.gui = new Interface()
  │     └── Editor.gui.updateInterface()
  │
  ├── 9. 加载命令行/URL参数指定的项目
  │     └── 检查 Editor.args 中 .isp/.nsp 后缀文件
  │
  ├── 10. 如无项目则新建
  │      └── Editor.createNewProgram()
  │
  └── 11. 注册全局快捷键
       ├── Ctrl+S → 保存
       ├── Ctrl+L → 加载
       ├── Ctrl+Z → 撤销
       ├── Ctrl+Y → 重做
       ├── Ctrl+W/F4 → 关闭当前 Tab
       ├── Ctrl+Tab / PageDown → 切换 Tab
       ├── DEL → 删除选中对象
       ├── F2 → 重命名
       └── F5 → 运行项目
```

## 3. 核心静态方法

### 项目管理

| 方法 | 功能 |
|------|------|
| `createNewProgram()` | 创建空白 Program + 默认 Scene + AmbientLight |
| `loadProgram(file, binary)` | 从文件加载项目（binary=true 表示 .nsp PSON 格式） |
| `saveProgram(path, binary)` | 保存项目到文件 |
| `resetEditor()` | 重置编辑器状态（切换到新项目后） |

### 选择管理

| 方法 | 功能 |
|------|------|
| `selectObject(object)` | 单选对象，清除旧选择 |
| `addToSelection(object)` | 追加选择（多选） |
| `unselectObject(object)` | 取消选择某个对象 |
| `clearSelection()` | 清空所有选择 |
| `hasObjectSelected()` | 检查是否有选中对象 |
| `isSelected(object)` | 检查某对象是否选中 |
| `updateSelectionGUI()` | 通知所有 Tab 刷新选择状态 |

选择变更时的 GUI 刷新流程：
```
Editor.selectObject(obj)
  → Editor.selection = [obj]
  → 设置 TreeNode 高亮
  → Editor.updateSelectionGUI()
    → 遍历所有打开的 Tab
      → tab.updateSelection()  // Inspector/SceneEditor/TreeView 等各自更新
```

### 对象操作

| 方法 | 功能 |
|------|------|
| `addObject(object, parent)` | 添加对象到场景，自动提取资源 → ActionBundle |
| `addObjects(objects, parent)` | 批量添加对象 |
| `deleteObject(object)` | 删除对象 + 清理资源引用 |
| `renameObject(object)` | 弹框重命名 |
| `runProject()` | 运行项目（打开/关闭 RunProject Tab） |

### 历史操作

| 方法 | 功能 |
|------|------|
| `addAction(action)` | 添加操作到历史 → 自动执行 |
| `undo()` | 撤销最近操作 |
| `redo()` | 重做最近撤销 |

## 4. 关键属性

```
Editor.program     : Program     — 当前打开的项目
Editor.history     : History     — 撤销/重做历史栈
Editor.selection   : Array       — 当前选中的对象列表
Editor.gui         : Interface   — GUI 根容器
Editor.settings    : Settings    — 用户配置
Editor.clipboard   : Clipboard   — 系统剪贴板(NW.js) 或 VirtualClipboard
Editor.openFile    : string|null — 当前已保存文件路径
Editor.manager     : EventManager — 全局事件管理器
Editor.args        : Array       — 启动参数
```

## 5. Settings.js — 配置管理

`source/editor/Settings.js`

存储所有用户可配置项，分为以下分类：

```javascript
this.general = {
  autoUpdate, theme, filePreviewSize, showStats, showUUID,
  showType, immediateMode, historySize, ignorePixelRatio
};

this.editor = {
  snap, snapAngle, gridSize, gridSpacing, gridEnabled,
  axisEnabled, cameraRotationCube, lockMouse,
  transformationSpace, navigation
};

this.render = {
  followProject, antialiasing, shadows, shadowsType,
  toneMapping, toneMappingExposure, toneMappingWhitePoint
};

this.code = {
  theme, keymap, fontSize, lineNumbers, lineWrapping,
  autoCloseBrackets, highlightActiveLine, showMatchesOnScrollbar,
  dragDrop, indentWithTabs, tabSize, indentUnit, vimMode,
  smartIndent, matchBrackets, lint, lintDelay
};
```

持久化方式：
- **NW.js**：读写 `config.json` 文件
- **浏览器**：`LocalStorage.set("iStudio-settings")`

## 6. Global.js — 全局常量

```javascript
Global.FILE_PATH = "files/";  // 静态资源路径前缀
```

通过 webpack 注入的 `DEVELOPMENT` 全局变量区分开发/生产模式。

## 7. Loaders.js — 资源导入调度

`source/editor/Loaders.js` 是编辑器的资源导入枢纽，提供按文件类型分发的加载方法：

| 方法 | 支持格式 | 使用的 Loader |
|------|---------|--------------|
| `loadTexture(file)` | png/jpg/bmp/gif/dds/pvr/ktx/tga | TGALoader, DDSLoader 等 |
| `loadVideoTexture(file)` | mp4/webm | 原生 Video |
| `loadAudio(file)` | mp3/ogg/wav | 原生 AudioContext |
| `loadFont(file)` | ttf/otf/woff | opentype.js |
| `loadModel(file)` | obj/fbx/gltf/glb/stl/ply/3ds/3mf/dae/... | 各格式 Three.js loader |
| `loadText(file)` | js/json/txt | FileReader |

3D 模型加载流程：
```
Loaders.loadModel(file)
  → 根据扩展名选择 Loader (GLTFLoader/FBXLoader/OBJLoader/...)
  → loader.parse(data)
  → 遍历结果对象树，提取材质/纹理/几何体到 Program 资源库
  → Editor.addObject(result)  // 添加到场景
```

## 8. Exporters.js / ProjectExporters.js — 导出

| 导出方式 | 目标 |
|---------|------|
| 项目文件 | .isp (JSON) / .nsp (PSON 二进制) |
| Web 部署 | HTML + bundle.js + 资源 |
| NW.js 桌面 | Windows/Mac/Linux 原生应用 |
| GLTF/OBJ/STL | 3D 模型导出 |
