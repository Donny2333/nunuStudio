# 10 后处理管线

**文件位置：** `source/core/postprocessing/`

## 1. 整体架构

```
PerspectiveCamera / OrthographicCamera
  └── composer (EffectComposer)
       ├── passes[0]: RenderPass (必须，渲染场景)
       ├── passes[1]: SSAOPass (可选)
       ├── passes[2]: UnrealBloomPass (可选)
       ├── passes[3]: FXAAPass (可选)
       └── ...
       
渲染流程:
  inputBuffer ←→ outputBuffer (乒乓切换)
  │
  RenderPass: 场景渲染 → outputBuffer
  │
  SSAOPass: inputBuffer(上一步输出) → 处理 → outputBuffer
  │
  UnrealBloomPass: inputBuffer → 处理 → outputBuffer
  │
  FXAAPass: inputBuffer → 处理 → 直接输出到屏幕 (最后一个 pass)
```

## 2. EffectComposer

`source/core/postprocessing/EffectComposer.js`

### 2.1 关键属性

```javascript
{
  uuid: string,           // 唯一标识
  passes: Pass[],         // 有序 Pass 列表
  inputBuffer: WebGLRenderTarget,   // 读取缓冲
  outputBuffer: WebGLRenderTarget,  // 写入缓冲
  width: number,          // 渲染分辨率
  height: number
}
```

### 2.2 渲染方法

`EffectComposer.prototype.render(renderer, scene, camera, delta)`:

```
render(renderer, scene, camera, delta)
  │
  ├── 保存 renderer 状态 (RendererState)
  │
  ├── 遍历 passes:
  │     for each pass:
  │       if (pass.enabled):
  │         pass.render(renderer, inputBuffer, outputBuffer, delta)
  │         if (pass.needsSwap):
  │           swap(inputBuffer, outputBuffer)  // 乒乓切换
  │
  └── 恢复 renderer 状态
```

### 2.3 序列化

```javascript
EffectComposer.prototype.toJSON = function() {
  var data = {
    uuid: this.uuid,
    passes: []
  };
  for (var i = 0; i < this.passes.length; i++) {
    data.passes.push(this.passes[i].toJSON());
  }
  return data;
};
```

## 3. Pass 基类

`source/core/postprocessing/Pass.js`

```javascript
{
  uuid: string,
  type: string,       // 用于反序列化类型匹配
  enabled: boolean,    // 是否启用
  needsSwap: boolean,  // 是否需要交换输入/输出缓冲
  clear: boolean,      // 渲染前是否清除缓冲
  renderToScreen: boolean  // 是否直接渲染到屏幕（最后一个 pass 设为 true）
}
```

接口方法：
- `render(renderer, writeBuffer, readBuffer, delta)` — 执行渲染
- `setSize(width, height)` — 调整分辨率
- `dispose()` — 释放资源
- `toJSON()` — 序列化参数

## 4. 内置 Pass 详解

### 4.1 RenderPass — 基础场景渲染

`source/core/postprocessing/RenderPass.js`

将 3D 场景渲染到缓冲区。通常是 Pass 链的第一个。

参数：无特殊配置。

### 4.2 FXAAPass — 快速抗锯齿

`source/core/postprocessing/pass/antialiasing/FXAAPass.js`

NVIDIA FXAA 算法的后处理实现。

参数：无（自动适配分辨率）。

### 4.3 SSAOPass / SSAONOHPass — 环境光遮蔽

两种 SSAO 实现：
- `SSAOPass` — 标准 SSAO（基于 Three.js 示例）
- `SSAONOHPass` — 无高光遮蔽变体

参数：
```javascript
{
  kernelRadius: number,  // 采样半径
  minDistance: number,    // 最小距离
  maxDistance: number,    // 最大距离
  kernelSize: number     // 采样核大小
}
```

### 4.4 UnrealBloomPass — 泛光

虚幻引擎风格的泛光效果。

参数：
```javascript
{
  strength: number,     // 泛光强度
  radius: number,       // 泛光半径
  threshold: number     // 亮度阈值
}
```

### 4.5 BloomPass — 基础泛光

简单泛光效果。

### 4.6 BokehPass — 景深

镜头散景景深模糊效果。

参数：
```javascript
{
  focus: number,      // 焦点距离
  aperture: number,   // 光圈大小
  maxblur: number     // 最大模糊量
}
```

### 4.7 FilmPass — 胶片效果

模拟胶片颗粒和扫描线。

参数：
```javascript
{
  grayscale: boolean,  // 灰度化
  noiseIntensity: number,  // 噪声强度
  scanlinesIntensity: number,  // 扫描线强度
  scanlinesCount: number  // 扫描线数量
}
```

### 4.8 其他 Pass

| Pass | 效果 |
|------|------|
| `DotScreenPass` | 网点化 |
| `SobelPass` | Sobel 边缘检测 |
| `ColorifyPass` | 颜色滤镜覆盖 |
| `TechnicolorPass` | 旧式彩色电影 |
| `HueSaturationPass` | 色相/饱和度调节 |
| `AfterimagePass` | 运动残影 |
| `CopyPass` | 无处理拷贝（调试用） |
| `AdaptiveToneMappingPass` | 自适应色调映射 |

## 5. ShaderPass — 通用着色器 Pass

`source/core/postprocessing/ShaderPass.js`

将任意 Three.js shader 对象（含 uniforms/vertexShader/fragmentShader）包装为后处理 Pass。大多数内置 Pass 都是 ShaderPass 的封装。

## 6. GLSL 着色器

`source/core/postprocessing/shaders/`

包含 SSAOShader 等自定义着色器源码。所有着色器使用 GLSL1 语法（`texture2D`、`gl_FragColor`、`varying`），依赖 WebGLRenderer 的自动转换层。

**技术债 (P3-4)**：未来 Three.js 移除 GLSL1 兼容层时需批量迁移到 GLSL3。

## 7. RendererState

`source/core/renderer/RendererState.js`

保存和恢复 WebGLRenderer 状态的工具类。在 EffectComposer 渲染前后使用，防止后处理 Pass 影响后续渲染调用的 renderer 状态。

保存的状态包括：autoClear、clearColor、clearAlpha、viewport 等。
