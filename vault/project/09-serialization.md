# 09 序列化与资源加载

## 1. 序列化格式

nunuStudio 项目支持两种文件格式：

| 格式 | 扩展名 | 特点 |
|------|--------|------|
| JSON | `.isp` | 人类可读，体积大，调试友好 |
| PSON | `.nsp` | 二进制压缩（@as-com/pson），体积小约 60%，默认格式 |

## 2. 保存流程

```
Editor.saveProgram(path, binary)
  │
  ├── 1. 序列化: json = Editor.program.toJSON()
  │     │
  │     └── Object3D.toJSON(meta) [monkey-patched]
  │          ├── 创建 meta 容器:
  │          │   meta = { geometries:{}, materials:{}, textures:{},
  │          │            images:{}, videos:{}, audio:{},
  │          │            fonts:{}, resources:{}, shapes:{} }
  │          │
  │          ├── 递归序列化场景树:
  │          │   对每个 Object3D 调用 toJSON(meta)
  │          │   → data.object = { uuid, type, name, position, rotation, scale,
  │          │                      visible, castShadow, children:[...], ... }
  │          │   → 类型特化字段 (mesh: geometry/material uuid,
  │          │                    camera: fov/near/far/composer,
  │          │                    light: color/intensity/shadow, ...)
  │          │
  │          ├── 资源序列化 (嵌入 meta):
  │          │   ├── Geometry → meta.geometries[uuid] = geometry.toJSON()
  │          │   ├── Material → meta.materials[uuid] = material.toJSON(meta)
  │          │   ├── Texture → meta.textures[uuid] = texture.toJSON(meta)
  │          │   │    └── 仅元数据, 不含图片数据
  │          │   ├── Image → meta.images[uuid] = { uuid, url: dataURL }
  │          │   ├── Video → meta.videos[uuid] = { uuid, data: base64 }
  │          │   ├── Audio → meta.audio[uuid] = { uuid, data: base64 }
  │          │   ├── Font → meta.fonts[uuid] = { uuid, data: dataURL }
  │          │   └── Resources → meta.resources[uuid] = { uuid, data: text }
  │          │
  │          └── 返回: { metadata:{version, type, generator}, object:{...}, 
  │                       geometries:[], materials:[], textures:[], images:[], ... }
  │
  ├── 2a. JSON 格式 (.isp):
  │     └── FileSystem.writeFile(path, JSON.stringify(json))
  │
  └── 2b. PSON 格式 (.nsp):
       └── StaticPair.encode(json) → Uint8Array
            └── FileSystem.writeFileArrayBuffer(path, buffer)
```

## 3. 加载流程

```
Editor.loadProgram(file, binary)
  │
  ├── 1. 读取文件数据
  │     ├── .isp → FileReader.readAsText → JSON.parse
  │     └── .nsp → FileReader.readAsArrayBuffer → StaticPair.decode
  │
  ├── 2. 反序列化: ObjectLoader.parse(json)
  │     │
  │     ├── 2a. 解析资源 (顺序依赖):
  │     │   ├── parseImages(json.images)
  │     │   │    └── new Image().fromJSON(data)
  │     │   ├── parseVideos(json.videos)
  │     │   ├── parseAudio(json.audio)
  │     │   ├── parseFonts(json.fonts)
  │     │   ├── parseResources(json.resources)
  │     │   ├── parseTextures(json.textures)
  │     │   │    └── TextureLoader.parse(data, images[])
  │     │   │         → 关联 texture.imageResource = images[uuid]
  │     │   ├── parseMaterials(json.materials)
  │     │   │    └── MaterialLoader.parse(data, textures[])
  │     │   │         → 关联 material.map = textures[uuid]
  │     │   └── parseGeometries(json.geometries)
  │     │        └── GeometryLoader.parse(data)
  │     │
  │     ├── 2b. 解析对象树 (递归):
  │     │   parseObjects(json.object, geometries, materials, textures, ...)
  │     │   │
  │     │   └── switch(data.type)
  │     │        ├── "Program" → new Program(), 恢复全局配置
  │     │        ├── "Scene" → new Scene(), 恢复物理参数
  │     │        ├── "Mesh" → new Mesh(geometries[uuid], materials[uuid])
  │     │        ├── "PerspectiveCamera" → new PerspectiveCamera(), 恢复 composer
  │     │        ├── "PointLight" → new PointLight(), 恢复阴影参数
  │     │        ├── "Script" → new Script(code), 恢复脚本代码
  │     │        ├── "TilesetObject" → new TilesetObject(url)
  │     │        ├── ... (约 30 种类型的 switch case)
  │     │        └── 递归处理 data.children
  │     │
  │     └── 2c. 恢复引用:
  │          ├── Program.defaultScene → uuid → 查找 Scene 子节点
  │          ├── Scene.defaultCamera → uuid → 查找 Camera
  │          ├── SkinnedMesh.skeleton → uuid → 恢复 Skeleton 引用
  │          └── EffectComposer.passes → 反序列化 Pass 链
  │
  └── 3. 设置编辑器状态:
       ├── Editor.program = program
       ├── Editor.history = new History(settings.historySize)
       └── Editor.resetEditor() → 刷新所有 GUI
```

## 4. ObjectLoader — 核心反序列化器

`source/core/loaders/ObjectLoader.js`

### 4.1 类型注册

ObjectLoader 通过 import 注册所有可序列化类型，`parseObjects` 中的 switch-case 约 30 个分支覆盖所有对象类型。

### 4.2 阴影数据恢复

`ObjectLoader.applyShadowData(shadow, data)`：由于 Three.js r167 移除了 `LightShadow.fromJSON`，nunuStudio 自行实现阴影数据恢复逻辑，手动设置 bias/radius/mapSize/camera 参数。

### 4.3 EffectComposer 反序列化

Camera 的后处理 Pass 链在 JSON 中存储为 passes 数组，每个 Pass 的 type 字段用于查找对应构造函数（通过 EffectComposer 中的 import 注册表）。

## 5. Three.js 序列化补丁

### 5.1 Texture.toJSON 补丁

`source/core/three/textures/Texture.js`

覆写 `THREE.Texture.prototype.toJSON`，跳过图片数据（图片存储在 meta.images 中通过 UUID 引用），仅序列化纹理参数：mapping、repeat、offset、center、rotation、wrap、filter、format、colorSpace 等。

### 5.2 Material.toJSON 补丁

`source/core/three/materials/Material.js`

扩展材质序列化，增加 nunuStudio 特有字段。移除了已废弃的 skinning/morphTargets/morphNormals 字段（r152+ 不再存在）。

### 5.3 Object3D.toJSON 补丁

`source/core/three/core/Object3D.js`

扩展对象序列化，支持 nunuStudio 的自定义回调参数。修复了 `object.isObject3D` 检查（从错误的 `object.isTHREE.Object3D` 修正）。

## 6. 各类型 Loader

| Loader | 功能 |
|--------|------|
| `FontLoader` | 解析 typeface.js 格式字体 |
| `ImageLoader` | 解析 Image 资源（base64 DataURL） |
| `VideoLoader` | 解析 Video 资源 |
| `AudioLoader` | 解析 Audio 资源 |
| `MaterialLoader` | 解析 Material + 恢复纹理引用 |
| `TextureLoader` | 解析 Texture + 恢复 imageResource 引用 |
| `GeometryLoader` | 解析 BufferGeometry (委托 Three.js BufferGeometryLoader) |
| `LegacyGeometryLoader` | 兼容旧版 Geometry 格式（返回空 BufferGeometry） |

## 7. 资源去重

序列化时，所有资源通过 UUID 去重。同一个材质/纹理/几何体被多个对象共享时，只序列化一次，其他位置通过 UUID 引用。

反序列化时，先解析所有资源到 `{uuid: instance}` 字典，然后对象根据 UUID 查找已解析的资源实例。
