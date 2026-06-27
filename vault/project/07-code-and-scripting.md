# 07 代码编辑与脚本系统

## 1. CodeEditor — 代码编辑器

**文件位置：** `source/editor/gui/tab/code/CodeEditor.js`

### 1.1 打开方式

- 双击 TreeView 中的 Script 节点
- 双击 ScriptInspector

### 1.2 技术栈

基于 **CodeMirror v5.64**，集成以下功能：

| 功能 | 实现 |
|------|------|
| 语法高亮 | CodeMirror 内置 (JavaScript/Python/GLSL) |
| 代码补全 | CodeMirror hint + Tern.js 智能补全 |
| 错误检查 | ESLint (通过 CodeMirror lint addon) |
| 重构 | Tern.js (重命名、查找引用) |
| 搜索替换 | CodeMirror search addon |
| 快捷键映射 | 可配置 (default/vim/emacs) |

### 1.3 Tern.js 集成

编辑器在初始化时加载 3 个类型定义文件：
- `threejs.json` — Three.js API 自动补全
- `browser.json` — 浏览器 API
- `ecmascript.json` — ES5 标准库

脚本中可直接使用的全局对象（`THREE.*`、`scene`、`self` 等）都通过 Tern 定义获得智能提示。

### 1.4 代码同步

CodeEditor 持有一个 Script 对象引用，代码变更时：

```
用户编辑代码
  → CodeMirror onChange
    → 延迟 codemirror.getValue()
      → ChangeAction(script, "code", newCode)
        → 写入 Script.code 属性
```

关闭 Tab 或切换选中对象时自动同步。

### 1.5 右键菜单

```
右键 CodeEditor
  ├── 重构 →
  │    ├── 重命名 (Tern rename)
  │    └── 选择同名 (Tern selectName)
  ├── 搜索 (Ctrl+F)
  ├── 替换 (Ctrl+H)
  ├── 自动格式化
  ├── 文档 (查找 Tern 文档)
  └── 复制/粘贴
```

### 1.6 CodeMirror 配置

用户可在 Settings 中配置：

```javascript
{
  theme: "monokai",        // 主题
  keymap: "default",       // 快捷键模式 (default/vim/emacs)
  fontSize: 14,            // 字体大小
  lineNumbers: true,       // 行号
  lineWrapping: false,     // 自动换行
  autoCloseBrackets: true, // 自动关闭括号
  highlightActiveLine: true,
  tabSize: 4,
  indentWithTabs: true,
  smartIndent: true,
  matchBrackets: true,
  lint: true,              // ESLint 检查
  lintDelay: 200,          // lint 延迟 (ms)
  vimMode: false           // Vim 模式
}
```

## 2. Script 运行时系统

**文件位置：** `source/core/objects/script/Script.js`

### 2.1 脚本生命周期

```
项目运行 (Program.initialize)
  → Script.initialize()
    → 编译代码: new Function(code)
    → 建立上下文: self, scene, program, Keyboard, Mouse, THREE, CANNON, NUNU
    → 调用 initialize() 回调

每帧 (Program.update)
  → Script.update(delta)
    → 调用用户 update(delta) 回调
    → 如有 onMouseOver 且鼠标在子对象上 → 调用 onMouseOver(intersections)

窗口 resize
  → Script.resize(x, y)
    → 调用用户 onResize(x, y) 回调

项目停止 (Program.dispose)
  → Script.dispose()
    → 调用用户 dispose() 回调
```

### 2.2 脚本可用 API

脚本中可直接使用的全局变量：

| 变量 | 类型 | 说明 |
|------|------|------|
| `self` | Object3D | 脚本所在节点的引用 |
| `scene` | Scene | 当前场景 |
| `program` | Program | 项目根节点 |
| `Keyboard` | Keyboard | 键盘输入 |
| `Mouse` | Mouse | 鼠标输入 |
| `THREE` | module | Three.js 完整命名空间 |
| `CANNON` | module | cannon-es 物理引擎 |
| `NUNU` | module | nunuStudio 核心 API |

脚本可用的辅助方法：
- `include(path)` — 导入 TextFile 资源中的 JS 脚本
- `setScene(scene)` — 切换场景

### 2.3 脚本执行上下文

```javascript
// Script.prototype.initialize 内部伪代码
var context = {
  self: this,
  scene: this.scene,
  program: this.program,
  Keyboard: this.program.keyboard,
  Mouse: this.program.mouse,
  THREE: THREE,
  CANNON: CANNON,
  NUNU: NUNU,
  include: function(path) { ... }
};

var func = new Function("self", "scene", "program", "Keyboard", "Mouse",
  "THREE", "CANNON", "NUNU", "include",
  userCode);

func.call(this, context.self, context.scene, ...);
```

### 2.4 脚本包含模式

Script 支持两种代码加载模式：
- **Script mode**：完整脚本，包含生命周期回调定义
- **Evaluate mode**：直接执行的代码片段

### 2.5 PythonScript

`source/core/objects/script/PythonScript.js`

使用 **Brython** 将 Python 代码转译为 JavaScript 执行。提供与 JavaScript Script 相同的生命周期回调。

Brython 通过 webpack 打包，在运行时将 Python AST 编译为 JS。

### 2.6 NodeScript — 可视化脚本

`source/core/objects/script/NodeScript.js`

基于节点图的可视化编程系统：

节点类型 (`source/core/objects/script/nodes/`)：
- `BaseNode` — 节点基类
- `KeyboardEventNode` — 键盘事件节点
- `OperationNode` — 操作节点

对应编辑器：`source/editor/gui/tab/node-editor/` — 节点编辑器 Tab。

## 3. ConsoleTab — 控制台

**文件位置：** `source/editor/gui/tab/console/ConsoleTab.js`

提供编辑器内的日志输出面板：
- 拦截 `console.log/warn/error`
- 显示运行时脚本的输出
- 支持搜索过滤
- 不同日志级别颜色区分

## 4. 动画编辑器

**文件位置：** `source/editor/gui/tab/animation/AnimationTab.js`

用于编辑 AnimationClip 关键帧：
- 时间轴视图
- 关键帧添加/删除/移动
- 播放预览
- 支持骨骼动画和属性动画
