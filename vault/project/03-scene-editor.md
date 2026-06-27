# 03 场景编辑器 (SceneEditor)

场景编辑器是 nunuStudio 编辑器的核心视图，提供 3D 视口编辑功能。

**文件位置：** `source/editor/gui/tab/scene-editor/`

## 1. SceneEditor.js — 主类

`source/editor/gui/tab/scene-editor/SceneEditor.js`

继承 `TabComponent`，是一个可关闭的标签页组件。

### 1.1 核心组成

```
SceneEditor
  ├── canvas (RendererCanvas)     — WebGL 渲染画布
  ├── camera (PerspectiveCamera)  — 编辑器相机（独立于项目相机）
  ├── scene (Scene 引用)          — 当前编辑的场景
  ├── mouse (Mouse)               — 绑定到 canvas 的鼠标输入
  ├── keyboard (Keyboard 引用)    — 全局键盘输入
  ├── raycaster (Raycaster)       — 3D 拾取射线
  ├── transform (TransformControls) — 变换操纵手柄
  ├── toolBar (ToolBar)           — 左上角工具栏
  ├── sideBar (SideBar)           — 右侧对象添加面板
  ├── orientationCube             — 右上角方向立方体
  └── helpers{}                   — 辅助可视化对象集合
```

### 1.2 辅助可视化系统 (Helpers)

SceneEditor 为不同类型的对象自动创建可视化辅助：

| 对象类型 | Helper | 作用 |
|---------|--------|------|
| DirectionalLight | DirectionalLightHelper | 方向光箭头 |
| PointLight | PointLightHelper | 点光源球体 |
| SpotLight | SpotLightHelper | 聚光灯锥体 |
| HemisphereLight | HemisphereLightHelper | 半球光指示器 |
| RectAreaLight | RectAreaLightHelper | 区域光矩形框 |
| LightProbe | LightProbeHelper | 光照探针球 |
| Camera | CameraHelper | 相机视锥体线框 |
| SkinnedMesh | SkeletonHelper | 骨骼线段 |
| Mesh | WireframeHelper | 线框叠加 |
| Line | LineHelper | 线段辅助 |
| Points | PointsHelper | 点云辅助 |
| PhysicsObject | PhysicsObjectHelper | 碰撞体线框 |
| 其他 Object3D | ObjectIconHelper | 图标 billboard |

辅助对象存储在独立的 `helperScene` 中渲染，不影响正式场景序列化。

### 1.3 渲染循环

`SceneEditor.prototype.render(delta)`:

```
render(delta)
  │
  ├── 1. 更新 Mouse 状态
  │     └── mouse.update()
  │
  ├── 2. 控制器更新
  │     └── controls.update(delta)  // OrbitControls/FreeControls/PlanarControls
  │
  ├── 3. 更新 TilesetObject
  │     └── 遍历 scene 找 TilesetObject → setCamera/setResolution/update
  │
  ├── 4. 渲染主场景
  │     └── renderer.render(scene, camera)
  │
  ├── 5. 渲染 Helper 场景
  │     └── renderer.render(helperScene, camera)  // 半透明叠加
  │
  ├── 6. 渲染 TransformControls
  │     └── transform.updateMatrixWorld() → 渲染手柄
  │
  ├── 7. 渲染方向立方体
  │     └── orientationCube.render(renderer, camera)
  │
  └── 8. 处理用户输入
       ├── 鼠标点击 → raycaster 拾取 → selectObject
       ├── 拖放资源 → 应用材质/纹理/替换几何体
       └── 键盘快捷键 → 焦点/复制/粘贴
```

### 1.4 拖放系统

SceneEditor 支持从 TreeView 或 AssetExplorer 拖放资源到 3D 视口：

```
canvas.ondrop(event)
  → DragBuffer.get(uuid)  // 获取拖拽中的资源对象
  → raycaster.intersectObjects()  // 射线检测落点
  │
  ├── Material → 应用到目标 Mesh
  │    └── Editor.addAction(ChangeAction(object, "material", material))
  │
  ├── Texture → 创建新材质并应用
  │    └── MeshStandardMaterial({map: texture})
  │    └── ActionBundle([AddResourceAction, ChangeAction])
  │
  ├── Image → 创建 Texture → 同上
  │
  ├── CubeTexture → 设置环境贴图
  │    └── ChangeAction(material, "envMap", cubeTexture)
  │
  ├── Audio → 创建 AudioEmitter
  │    └── Editor.addObject(new AudioEmitter(audio))
  │
  ├── Video → 创建 VideoTexture → 应用材质
  │
  ├── Font → 创建 TextMesh
  │
  ├── Geometry → 替换目标 Mesh 几何体
  │    └── ChangeAction(object, "geometry", geometry)
  │
  └── 无交叉点 → 放置到场景原点
```

## 2. TransformControls — 变换操纵器

`source/editor/gui/tab/scene-editor/transform/TransformControls.js`

基于 Three.js TransformControls 大幅定制，提供三种操作模式：

| 模式 | 快捷键 | Gizmo |
|------|--------|-------|
| Translate | W | 三轴箭头 + 平面移动手柄 |
| Rotate | E | 三环旋转手柄 |
| Scale | R | 三轴缩放手柄 |

切换空间：
- **World** 空间：Gizmo 对齐世界坐标轴
- **Local** 空间：Gizmo 对齐对象自身坐标轴

操作流程：
```
mouseDown → 记录初始变换
  → mouseDrag → 实时更新对象 position/rotation/scale
    → mouseUp → 创建 ChangeAction 记录到 History
```

## 3. 视口控制器 (controls/)

三种编辑器相机控制模式：

### EditorOrbitControls
- 鼠标左键拖动旋转
- 中键/滚轮缩放
- 右键拖动平移
- 双击对象居中

### EditorFreeControls
- WASD 移动
- 鼠标右键旋转
- 类 FPS 控制

### EditorPlanarControls
- 2D 平面模式（正交投影）
- 支持 6 个视图方向：Left/Right/Front/Back/Top/Bottom

## 4. ToolBar — 工具栏

`source/editor/gui/tab/scene-editor/toolbar/ToolBar.js`

左上角垂直工具栏，包含操作模式按钮：
- Select (Q)
- Move (W)
- Rotate (E)
- Scale (R)
- 以及导航模式切换

## 5. SideBar — 侧边栏

`source/editor/gui/tab/scene-editor/sidebar/SideBar.js`

右侧对象创建面板，使用 `ButtonDrawer`（可折叠抽屉按钮组）组织：

| 抽屉分类 | 可添加对象 |
|---------|-----------|
| Mesh | Box, Sphere, Cylinder, Torus, Plane, Circle, Ring, Cone, Capsule, Terrain, 以及自定义几何体 |
| Light | Ambient, Point, Spot, Directional, Hemisphere, RectArea, LightProbe |
| Camera | Perspective, Orthographic |
| Script | JavaScript, Python, NodeScript |
| Physics | Box, Sphere, Cylinder, Plane, Particle 物理体 |
| Audio | AudioEmitter, PositionalAudio |
| Text | TextMesh, TextBitmap, TextSprite |
| Effects | Sky, LensFlare, ParticleEmitter, HTMLView, TilesetObject |
| Controls | OrbitControls, FirstPersonControls |

每个按钮的点击处理：
```
button.onClick = function() {
  Editor.addObject(new SomeObject());
}
```

## 6. OrientationCube — 方向立方体

右上角的 3D 方向指示器，显示当前视角方向（类似 Blender 的导航立方体）。点击立方体的面可以快速切换到正交视图。

## 7. GridHelper — 网格地面

`source/editor/gui/tab/scene-editor/helpers/GridHelper.js`

可配置的网格辅助线，显示在 XZ 平面上，参数通过 `Editor.settings.editor` 控制：
- `gridSize` — 网格大小
- `gridSpacing` — 网格间距
- `gridEnabled` — 是否显示
