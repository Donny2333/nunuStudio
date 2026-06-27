# 05 树视图与资产管理

## 1. TreeView — 场景树视图

**文件位置：** `source/editor/gui/tab/tree-view/`

### 1.1 TreeView.js

继承 `TabComponent`，以树形结构展示当前 Program 的完整对象层级。

结构：
```
TreeView
  ├── SearchBox     — 顶部搜索栏，按名称过滤节点
  └── root (TreeNode) — 根节点，对应 Program
       ├── TreeNode → Scene 1
       │    ├── TreeNode → Mesh
       │    ├── TreeNode → Light
       │    └── TreeNode → Group
       │         └── TreeNode → ...
       └── TreeNode → Scene 2
            └── ...
```

### 1.2 TreeNode.js — 树节点

`source/editor/gui/tab/tree-view/TreeNode.js`

每个 TreeNode 对应一个 Object3D，提供：

**显示**：
- 对象图标（通过 `ObjectIcons.get(type)` 获取）
- 对象名称
- 展开/折叠箭头（有子节点时）
- 选中高亮

**交互**：
- 单击 → `Editor.selectObject(this.object)`
- 双击 → 根据类型打开对应编辑 Tab（Scene→SceneEditor, Script→CodeEditor, Camera→CameraEditor, Material→MaterialEditor 等）
- 右键 → 弹出上下文菜单
- 拖放 → 重排场景层级（MoveAction）

**右键菜单**：
```
右键 TreeNode
  ├── 重命名 (F2)
  ├── 删除 (DEL)
  ├── 复制 / 粘贴 / 剪切
  ├── 复制对象
  ├── 锁定/解锁
  ├── 添加子对象 →
  │    ├── Mesh 子菜单
  │    ├── Light 子菜单
  │    ├── Camera 子菜单
  │    ├── Script 子菜单
  │    └── ...（同 SideBar 分类）
  └── 特殊操作（根据对象类型）
       ├── Scene → 设为默认场景
       ├── Camera → 设为默认相机
       └── SpineAnimation → 打开 Spine 资源
```

### 1.3 搜索功能

`TreeView.selectByName(search)`:
- 递归遍历所有 TreeNode
- 名称包含搜索文本的节点高亮选中
- 不匹配的节点取消选中

### 1.4 刷新机制

```
Editor.updateSelectionGUI()
  → TreeView.updateSelection()
    → 高亮选中节点
    → 展开到选中节点的路径

Editor 场景结构变更时
  → TreeView.updateView()
    → 销毁并重建所有 TreeNode
    → 递归遍历 Program → 为每个 Object3D 创建 TreeNode
```

## 2. AssetExplorer — 资产管理器

**文件位置：** `source/editor/gui/tab/asset/`

### 2.1 AssetExplorer.js

继承 `TabComponent`，网格展示项目中所有资源。

显示内容：
```
AssetExplorer
  ├── 搜索栏 (SearchBox)
  ├── 分类菜单 (AssetExplorerMenu) — 右键弹出
  └── 资源网格
       ├── MaterialAsset → 材质缩略图
       ├── TextureAsset → 纹理缩略图
       ├── GeometryAsset → 几何体缩略图
       ├── FontAsset → 字体预览
       ├── ImageAsset → 图片缩略图
       ├── VideoAsset → 视频缩略图
       ├── AudioAsset → 音频图标
       └── FileAsset → 通用文件图标
```

### 2.2 Asset 基类与子类

`source/editor/gui/tab/asset/asset/Asset.js` 是所有资源卡片的基类：
- 显示缩略图 + 名称
- 支持拖放（设置 `DragBuffer` 供 SceneEditor 接收）
- 双击打开对应编辑 Tab
- 右键上下文菜单

各资源类型的 Asset 子类：

| 类 | 资源类型 | 双击行为 |
|----|---------|---------|
| `MaterialAsset` | Material | 打开 MaterialEditor Tab |
| `TextureAsset` | Texture | 打开 TextureEditor Tab |
| `GeometryAsset` | BufferGeometry | Inspector 中显示 |
| `FontAsset` | Font | Inspector 中显示 |
| `ImageAsset` | Image | Inspector 中预览 |
| `VideoAsset` | Video | Inspector 中播放 |
| `AudioAsset` | Audio | Inspector 中播放 |
| `FileAsset` | TextFile/Model | 对应操作 |

### 2.3 资产拖放

拖放资源到 SceneEditor 3D 视口的流程：

```
AssetExplorer 中拖起资源
  → asset.element.ondragstart
    → DragBuffer.set(uuid, resource)  // 缓存到全局拖拽缓冲

SceneEditor canvas.ondrop
  → DragBuffer.get(uuid)  // 读取拖拽的资源
  → 根据资源类型执行操作（见 SceneEditor 拖放系统）
```

### 2.4 DragBuffer — 拖拽缓冲

`source/editor/gui/DragBuffer.js`

全局静态类，用于跨组件拖放通信：
- `DragBuffer.set(uuid, object)` — 开始拖动时设置
- `DragBuffer.get(uuid)` — 放下时获取
- `DragBuffer.clear(uuid)` — 拖动结束清除

### 2.5 资源刷新

`AssetExplorer.prototype.updateSelection()`:
```
遍历 Editor.program 的所有资源分类
  → 对每个分类 (materials/textures/geometries/fonts/images/videos/audio/resources)
    → 创建对应的 Asset 卡片
    → 按名称排序
    → 支持搜索过滤
```

### 2.6 AssetExplorerMenu — 右键菜单

右键空白处弹出，提供资源创建/导入操作：
- 从文件导入（调用 `Loaders.*` 方法）
- 新建材质（MeshStandard/MeshPhong/MeshBasic 等预设）
- 新建纹理
- 管理操作（全选、清理未使用资源）

## 3. ObjectIcons — 对象图标注册

`source/editor/utils/ObjectIcons.js`

维护 `type → icon path` 的映射表：

```javascript
["Mesh", "icons/models/cube.png"],
["PointLight", "icons/lights/point.png"],
["PerspectiveCamera", "icons/camera/camera.png"],
["Script", "icons/script/script.png"],
["TilesetObject", "icons/misc/tileset.png"],
// ... 等约 30 种类型
```

TreeNode 和 ObjectIconHelper（3D 视口中的 billboard 图标）都使用此注册表。

## 4. Preview — 资源预览渲染

`source/editor/gui/preview/` 目录包含各资源类型的小型预览渲染器：

用于 AssetExplorer 中生成资源缩略图。MaterialAsset 使用独立的小型 WebGLRenderer 在离屏 canvas 上渲染材质球预览。
