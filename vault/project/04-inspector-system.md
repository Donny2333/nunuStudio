# 04 Inspector 检查器系统

Inspector 面板用于显示和编辑选中对象的属性。

**文件位置：** `source/editor/gui/tab/inspector/`

## 1. InspectorContainer — 分发容器

`source/editor/gui/tab/inspector/InspectorContainer.js`

继承 `TabComponent`，作为 Inspector 面板的容器。核心职责是根据选中对象的类型，实例化对应的 Inspector 面板。

### 1.1 类型分发逻辑

`InspectorContainer.prototype.updateSelection()` 中根据 `instanceof` 匹配：

```
选中对象
  │
  ├── Program         → ProgramInspector
  ├── Scene           → SceneInspector
  │
  ├── PerspectiveCamera  → PerspectiveCameraInspector
  ├── OrthographicCamera → OrthographicCameraInspector
  ├── CubeCamera        → CubeCameraInspector
  │
  ├── PointLight        → PointLightInspector
  ├── SpotLight         → SpotLightInspector
  ├── DirectionalLight  → DirectionalLightInspector
  ├── AmbientLight      → AmbientLightInspector
  ├── HemisphereLight   → HemisphereLightInspector
  ├── RectAreaLight     → RectAreaLightInspector
  ├── LightProbe        → LightProbeInspector
  │
  ├── Script            → ScriptInspector
  ├── PhysicsObject     → PhysicsInspector
  ├── SpineAnimation    → SpineInspector
  ├── ParticleEmitter   → ParticleEmitterInspector
  │
  ├── Sky               → SkyInspector
  ├── TilesetObject     → TilesetObjectInspector
  │
  ├── TextMesh          → TextMeshInspector
  ├── TextBitmap        → TextBitmapInspector
  ├── TextSprite        → TextSpriteInspector
  │
  ├── InstancedMesh     → InstancedMeshInspector
  ├── SkinnedMesh / Mesh → MeshInspector
  │
  ├── OrbitControls     → OrbitControlsInspector
  ├── FirstPersonControls → FirstPersonControlsInspector
  │
  ├── Audio             → AudioEmitterInspector
  │
  ├── Object3D (默认)   → ObjectInspector
  │
  │── locked 对象       → LockedInspector
  │
  ├── Material          → MaterialInspector
  ├── Texture           → TextureInspector
  ├── Image             → ImageInspector
  ├── Video             → VideoInspector
  ├── BufferGeometry    → GeometryInspector
  ├── Resource (通用)   → ResourceInspector
  └── Audio (资源)      → AudioInspector
```

### 1.2 Inspector 切换机制

```
Editor.selectObject(obj)
  → Editor.updateSelectionGUI()
    → InspectorContainer.updateSelection()
      → 清除当前 inspector (destroy)
      → 根据类型创建新 inspector
      → inspector.attach(obj)  // 绑定数据
      → inspector.updateValues()  // 刷新显示
```

## 2. ObjectInspector — 基础对象检查器

`source/editor/gui/tab/inspector/objects/ObjectInspector.js`

所有对象 Inspector 的基类，提供通用的 Object3D 属性编辑：

| 属性分组 | 控件 | 字段 |
|---------|------|------|
| 名称 | TextBox | name |
| UUID | TextBox (只读) | uuid |
| 类型 | Text (只读) | type |
| 位置 | VectorBox(x,y,z) | position |
| 旋转 | VectorBox(x,y,z) | rotation (欧拉角) |
| 缩放 | VectorBox(x,y,z) | scale |
| 可见 | CheckBox | visible |
| 投射阴影 | CheckBox | castShadow |
| 接收阴影 | CheckBox | receiveShadow |
| 视锥裁剪 | CheckBox | frustumCulled |
| 渲染顺序 | NumberBox | renderOrder |
| 静态 | CheckBox | matrixAutoUpdate |

每个属性变更都通过 `ChangeAction` 记录到历史系统：
```javascript
this.name.setOnChange(function() {
  Editor.addAction(new ChangeAction(self.object, "name", self.name.getText()));
});
```

## 3. 特定类型 Inspector

### 3.1 SceneInspector

编辑 Scene 的属性：
- 背景颜色/纹理
- 雾效（Fog / FogExp2）
- 物理世界参数（重力、求解器）
- 默认相机选择

### 3.2 ProgramInspector

编辑 Program 的全局设置：
- 项目名称、描述、作者、版本
- 默认场景/相机
- 锁定鼠标指针
- VR/AR 开关
- 渲染器配置 (RendererConfigurationFormSnippet)

### 3.3 MeshInspector

在 ObjectInspector 基础上增加：
- 几何体选择 (geometry)
- 材质选择 (material)
- 双击材质/几何体可打开对应编辑 Tab

### 3.4 Camera Inspector

- FOV / near / far 参数
- Viewport 设置 (left/bottom/width/height)
- 后处理 Pass 链管理

### 3.5 Light Inspector (各类型)

各灯光类型各自的参数编辑：
- 颜色、强度
- 阴影参数（mapSize, bias, near, far）
- 类型特有属性（SpotLight: angle/penumbra, DirectionalLight: shadow camera bounds）

### 3.6 PhysicsInspector

- 物理体类型（Box/Sphere/Cylinder/Plane）
- 质量、阻尼
- 碰撞形状参数

### 3.7 ScriptInspector

- 脚本语言选择
- 双击打开 CodeEditor Tab

## 4. 资源类 Inspector

### MaterialInspector

从 AssetExplorer 双击材质触发，显示材质属性和纹理贴图预览。

### TextureInspector

纹理属性编辑：wrap/filter/format/flipY 等。

### GeometryInspector

几何体信息查看 + 修改器应用（TwistModifier、SimplifyModifier）。

### ImageInspector / VideoInspector / AudioInspector

资源预览 + 元数据编辑。

## 5. FormSnippet — 可复用表单片段

`source/editor/gui/form-snippet/` 目录包含可嵌入任何 Inspector 的表单模块：

| Snippet | 用途 |
|---------|------|
| `RendererConfigurationFormSnippet` | 渲染器配置（色调映射、抗锯齿、阴影） |
| 其他 FormSnippet | 材质贴图选择、变换参数等 |

这些 Snippet 被多个 Inspector 共享，避免重复代码。
