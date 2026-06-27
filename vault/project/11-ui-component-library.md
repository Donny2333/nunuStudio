# 11 UI 组件库

**文件位置：** `source/editor/components/`

nunuStudio 编辑器使用自研的纯 DOM UI 组件库，不依赖任何 UI 框架（React/Vue 等）。所有组件直接操作 DOM 元素。

## 1. Component 基类

`source/editor/components/Component.js`

所有 UI 组件的根基类，封装 DOM 元素管理。

### 1.1 核心模型

```javascript
function Component(parent, type) {
  this.parent = parent;              // 父组件
  this.element = document.createElement(type || "div");  // DOM 元素
  this.size = new Vector2(0, 0);     // 尺寸
  this.position = new Vector2(0, 0); // 位置
  this.visible = true;               // 可见性
  
  // 挂载到父 DOM
  if (parent !== undefined) {
    parent.element.appendChild(this.element);
  }
}
```

### 1.2 布局系统

组件使用 CSS absolute 定位，通过 `position` + `size` 手动布局：

```javascript
Component.prototype.updateInterface = function() {
  this.element.style.top = this.position.y + "px";
  this.element.style.left = this.position.x + "px";
  this.element.style.width = this.size.x + "px";
  this.element.style.height = this.size.y + "px";
};
```

定位锚点常量：
```javascript
Component.TOP_LEFT = 0;
Component.TOP_RIGHT = 1;
Component.BOTTOM_LEFT = 2;
Component.BOTTOM_RIGHT = 3;
```

### 1.3 生命周期

```
new Component(parent)
  → 创建 DOM 元素, 挂载到父 DOM
    → updateInterface()  // 应用尺寸/位置
      → ... 用户交互 ...
        → destroy()  // 从 DOM 移除
```

## 2. 容器组件

### Division

`source/editor/components/Division.js`

基础 div 容器，可包含子组件。用于布局分组。

### DocumentBody

`source/editor/components/DocumentBody.js`

特殊容器，代表 `document.body`。作为最顶层组件的 parent。

### DualContainer

`source/editor/components/containers/DualContainer.js`

双面板容器，可水平或垂直分割。支持拖拽调整分割比例 (`tabPosition`)。

### DualDivision

`source/editor/components/containers/DualDivision.js`

简化版双分区布局。

## 3. 标签页系统 (tabs/)

### 3.1 TabGroup

`source/editor/components/tabs/TabGroup.js`

标签组容器，管理一组可切换的标签页。

```
TabGroup
  ├── 标签按钮行 (TabButton[])
  │    ├── [Scene] [Code] [Material]
  │    └── 点击切换活动标签
  └── 内容区域
       └── 当前活动 Tab 的内容
```

方向常量：
```javascript
TabGroup.TOP = 0;     // 标签在上
TabGroup.BOTTOM = 1;  // 标签在下
TabGroup.LEFT = 2;    // 标签在左
TabGroup.RIGHT = 3;   // 标签在右
```

### 3.2 TabComponent

`source/editor/components/tabs/TabComponent.js`

所有标签页内容的基类。SceneEditor、CodeEditor、MaterialEditor 等都继承此类。

关键方法：
- `activate()` — 标签被选中时调用
- `deactivate()` — 标签被取消选中时
- `isAttached(object)` — 检查此 Tab 是否关联了特定对象
- `updateSelection()` — Editor 选择变更时回调
- `updateValues()` — 属性值刷新
- `close()` — 关闭标签

### 3.3 可拆分标签系统 (tabs/splittable/)

`TabContainer` / `TabGroupSplit` / `TabDualContainer`

支持标签拖拽拆分的增强版标签系统：
- 拖动标签到区域边缘 → 拆分为双面板
- 关闭最后一个标签 → 自动合并面板

这是编辑器主界面布局的基础（左侧场景编辑器 + 右上树视图 + 右下检查器 + 底部资产/控制台）。

## 4. 按钮组件 (buttons/)

| 组件 | 描述 |
|------|------|
| `Button` | 基础按钮 |
| `ButtonText` | 文本按钮 |
| `ButtonIcon` | 图标按钮 |
| `ButtonIconToggle` | 可切换状态的图标按钮 |
| `ButtonToggle` | 切换按钮 |
| `ButtonDrawer` | 抽屉按钮（点击展开子按钮列表，SideBar 使用） |

ButtonDrawer 示例：
```
[Mesh ▶]  点击展开:
   ├── Box
   ├── Sphere
   ├── Cylinder
   └── ...
```

## 5. 输入组件 (input/)

| 组件 | 描述 | 用途 |
|------|------|------|
| `TextBox` | 单行文本输入 | 名称、路径等 |
| `TextArea` | 多行文本输入 | 代码、描述 |
| `NumberBox` | 数字输入（支持拖拽调节） | 坐标、尺寸、参数 |
| `NumberRow` | 多列数字输入行 | 向量/矩阵 |
| `VectorBox` | 三分量向量输入 (x,y,z) | position/rotation/scale |
| `Slider` | 滑动条 (0~1) | 透明度、强度 |
| `CheckBox` | 复选框 | 布尔属性 |
| `DropdownList` | 下拉选择框 | 枚举属性 |
| `ColorChooser` | 颜色选择器 | 颜色属性 |
| `ColorGradientChooser` | 渐变颜色选择器 | 粒子颜色 |
| `ImageChooser` | 图片选择器 | 图标、预览图 |
| `TextureChooser` | 纹理选择器 (缩略图+选择) | 材质贴图 |
| `TextureForm` | 纹理属性表单 | 纹理详情编辑 |
| `CubeTextureBox` | 立方体纹理选择器 | 环境贴图 |
| `Graph` | 曲线图编辑器 | 粒子属性曲线 |
| `CodeInput` | 小型代码输入框 | shader 片段 |

### NumberBox 拖拽调节

NumberBox 支持鼠标拖拽直接调节数值：
- 左右拖动改变值
- 按住 Shift 精细调节
- 按住 Ctrl 粗略调节

## 6. 下拉菜单组件 (dropdown/)

| 组件 | 描述 |
|------|------|
| `DropdownMenu` | 菜单栏下拉菜单（MainMenu 使用） |
| `ContextMenu` | 右键上下文菜单 |
| `ButtonMenu` | 按钮式菜单 |

DropdownMenu 支持多级子菜单：
```
File ▶
  ├── New
  ├── Open
  ├── Save
  ├── Export ▶
  │    ├── Web
  │    ├── Desktop
  │    └── GLTF
  └── Exit
```

## 7. 媒体组件 (media/)

| 组件 | 描述 |
|------|------|
| `AudioPlayer` | 音频播放器（播放/暂停/进度条） |
| `VideoPlayer` | 视频播放器 |
| `Media` | 媒体基类 |

## 8. 其他组件

| 组件 | 描述 |
|------|------|
| `TableForm` | 表格式表单（label + input 两列布局） |
| `Form` | 流式表单布局 |
| `Canvas` | HTML Canvas 封装 |
| `RendererCanvas` | WebGL 渲染画布（封装 WebGLRenderer + resize） |
| `Text` | 文本标签 |
| `SearchBox` | 搜索输入框 |
| `ImageContainer` | 图片显示容器 |
| `PasswordBox` | 密码输入框 |
| `LoadingModal` | 加载遮罩弹框 |

### RendererCanvas

`source/editor/components/RendererCanvas.js`

核心渲染组件，封装 WebGLRenderer：
- 管理 canvas 元素和 WebGL 上下文
- 自动处理 resize（devicePixelRatio 适配）
- 支持上下文丢失恢复
- SceneEditor、CameraEditor、MaterialEditor、RunProject 都使用此组件

## 9. 主题系统

`source/editor/theme/ThemeManager.js`

通过 CSS 变量实现主题切换：
```css
:root {
  --bar-color: #333;
  --panel-color: #222;
  --font-main-color: #fff;
  --font-main-family: "Segoe UI", ...;
  --font-main-size: 12px;
  /* ... */
}
```

Settings 中配置 `theme: "dark"` 切换暗色/亮色主题。

## 10. 国际化

`source/editor/locale/`

- `LocaleManager.js` — 语言管理器
- `LocaleEN.js` — 英文字符串表

所有 UI 文本通过 `Locale.xxx` 引用，支持多语言扩展。
