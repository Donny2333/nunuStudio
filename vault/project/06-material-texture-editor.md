# 06 材质与纹理编辑器

## 1. MaterialEditor — 材质编辑器

**文件位置：** `source/editor/gui/tab/material/`

### 1.1 打开方式

- 双击 AssetExplorer 中的材质缩略图
- 双击 MeshInspector 中的材质属性

### 1.2 编辑器结构

```
MaterialEditor (TabComponent)
  ├── RendererCanvas      — 材质球实时预览
  │    └── 独立 scene + light + camera + mesh
  │    └── 实时更新材质属性后重新渲染
  │
  └── TableForm           — 属性表单
       ├── 通用属性 (MaterialEditor 基类)
       │    ├── 名称 (TextBox)
       │    ├── 面 (DropdownList: FrontSide/BackSide/DoubleSide)
       │    ├── 深度测试/深度写入 (CheckBox)
       │    ├── 透明/透明度 (CheckBox + Slider)
       │    ├── alpha测试阈值 (NumberBox)
       │    └── 混合模式 (DropdownList)
       │
       └── 类型特定属性 (子类)
```

### 1.3 材质类型子编辑器

| 子编辑器 | 材质类型 | 目录 |
|---------|---------|------|
| `MeshMaterialEditor` | MeshStandard/MeshPhong/MeshLambert/MeshPhysical 等 | `material/mesh/` |
| `LineMaterialEditor` | LineBasicMaterial/LineDashedMaterial | `material/line/` |
| `PointsMaterialEditor` | PointsMaterial | `material/points/` |
| `SpriteMaterialEditor` | SpriteMaterial | `material/sprite/` |

### 1.4 MeshMaterialEditor 详解

`source/editor/gui/tab/material/mesh/MeshMaterialEditor.js`

在 MaterialEditor 基础上扩展网格材质特有属性：

| 属性组 | 控件 |
|--------|------|
| ~~Skinning~~ | ~~CheckBox~~ (已废弃，r152+ 无效，P2-1 待清理) |
| ~~MorphTargets~~ | ~~CheckBox~~ (已废弃，同上) |
| Wireframe | CheckBox |
| Wireframe宽度 | NumberBox |
| 颜色 | ColorChooser |
| 粗糙度 | Slider |
| 金属度 | Slider |
| 自发光颜色 | ColorChooser |
| 自发光强度 | NumberBox |
| Map (漫反射贴图) | TextureChooser |
| Normal Map | TextureChooser + NumberBox(强度) |
| Bump Map | TextureChooser + NumberBox(缩放) |
| Displacement Map | TextureChooser + NumberBox(缩放/偏移) |
| Roughness Map | TextureChooser |
| Metalness Map | TextureChooser |
| AO Map | TextureChooser + NumberBox(强度) |
| Emissive Map | TextureChooser |
| Alpha Map | TextureChooser |
| Environment Map | CubeTextureBox + NumberBox(强度) |

每个属性变更均通过 `ChangeAction` 记录：
```javascript
this.roughness.setOnChange(function() {
  Editor.addAction(new ChangeAction(self.material, "roughness", self.roughness.getValue()));
});
```

### 1.5 TextureChooser / TextureForm

`source/editor/components/input/TextureChooser.js`

贴图选择组件，提供：
- 纹理缩略图预览
- 点击打开资源选择对话框
- 拖放纹理到此处替换
- 清除按钮（设为 null）

## 2. TextureEditor — 纹理编辑器

**文件位置：** `source/editor/gui/tab/texture/`

### 2.1 打开方式

- 双击 AssetExplorer 中的纹理缩略图
- 双击 TextureInspector
- 双击 TextureChooser

### 2.2 编辑内容

| 属性 | 控件 |
|------|------|
| 名称 | TextBox |
| WrapS / WrapT | DropdownList (Repeat/ClampToEdge/MirroredRepeat) |
| MinFilter / MagFilter | DropdownList |
| Repeat | VectorBox(x,y) |
| Offset | VectorBox(x,y) |
| Center | VectorBox(x,y) |
| Rotation | NumberBox |
| FlipY | CheckBox |
| Anisotropy | NumberBox |
| ColorSpace | DropdownList |
| Format | Text (只读) |
| Mapping | DropdownList |
| 图片预览 | Canvas |

### 2.3 纹理类型支持

项目中所有 Texture 子类都共享同一个 TextureEditor，类型由创建时决定：

| 纹理类型 | 创建入口 |
|---------|---------|
| Texture (普通 2D) | Loaders.loadTexture → Image 资源 |
| VideoTexture | Loaders.loadVideoTexture |
| CanvasTexture | Script 代码创建 |
| CubeTexture | 6 张 Image 组合 |
| SpriteSheetTexture | 手动配置帧数 |
| CompressedTexture | 加载 DDS/PVR/KTX |

## 3. CameraEditor — 相机编辑器

**文件位置：** `source/editor/gui/tab/camera/`

### 3.1 结构

```
CameraEditor (TabComponent)
  ├── RendererCanvas — 相机视角实时预览
  └── TableForm — 属性 + 后处理 Pass 管理
       ├── 相机参数 (FOV/near/far/aspect 等)
       └── 后处理 Pass 列表
            ├── PassNode → 每个 Pass 的参数面板
            ├── 添加 Pass 按钮
            └── 删除/重排 Pass
```

### 3.2 后处理 Pass 管理

`source/editor/gui/tab/camera/postprocessing/PassNode.js`

每个 PassNode 显示一个 Pass 的参数面板。添加新 Pass 时弹出类型选择器，列出所有内置 Pass 类型（FXAA/SSAO/Bloom/Bokeh 等）。

Pass 的添加/删除/重排都通过 ChangeAction 记录到历史，可撤销。
