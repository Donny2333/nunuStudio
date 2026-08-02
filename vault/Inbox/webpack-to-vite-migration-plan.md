# Webpack → Vite 迁移计划（iStudio）

## 背景

当前构建工具链为 webpack 5，使用四个配置文件（`webpack.config.js`、`webpack.dev.js`、`webpack.prod.js`、`webpack.runtime.js`）。现有方案可工作，但开发循环较慢、配置比必要的更重。源码本身已是纯净 ESM（无 `require.context`、无动态 `import()`、无内联 loader、无 JSON 导入、无 JS 内 CSS 导入），因此本次迁移几乎全部是**配置翻译**，应用代码基本不动。

目标：用 Vite 完全替换 webpack，覆盖两个构建目标（编辑器 SPA 与运行时 UMD 库），同时严格保留 `docs/editor/` 的输出布局（它是 NW.js 应用根目录，也是编辑器导出时复制的来源）以及 `dist/` npm 库。Angular 的 `source/page` 已是死代码（目录已删除，仅 `docs/` 中保留了构建产物），**不在本次范围内**。

## 已确认的决策（与用户确认）

1. **第三方全局库**（CodeMirror、Tern、acorn、JSHint、draco_encoder 及拼接的 CSS）→ **预构建为静态文件**。新增 `scripts/build-vendor.js` 复刻当前 `MergeIntoSingleFilePlugin` 的拼接逻辑，输出到 `public/vendor/`。`index.html` 保留原有 `<script>`/`<link>` 标签。源码零改动。
2. **范围** → **完全替换**。删除所有 webpack 配置与 webpack 相关 devDependencies；编辑器与运行时都迁移到 Vite。
3. **THREE 全局变量** → **通过自定义 Vite 插件自动注入**（模拟 webpack 的 `ProvidePlugin`），源码零改动。

## 目标架构

Vite 不支持数组配置，因此使用两个配置文件：

| 配置文件 | 目标 | 入口 | 输出 | 模式 |
|---|---|---|---|---|
| `vite.config.js` | 编辑器 SPA（开发+生产） | `source/editor/index.html` | `docs/editor/`（`bundle.js` + vendor + files/） | app |
| `vite.config.runtime.js` | 运行时 UMD 库 | `source/core/Main.js` | `dist/istudio.min.js`（UMD，全局 `IStudio`）+ `dist/istudio.module.min.js` | lib |

共享逻辑（插件、别名）放在 `vite.shared.js`，被两个配置同时引用。

## 新增文件

### `vite.shared.js` —— 共享插件与别名

包含 4 个小插件 + 别名映射，两个配置共用：

1. **`injectThree()`** —— 替代 `ProvidePlugin({THREE, "window.THREE"})`。通过 `transform(code, id)` 钩子：对 `source/` 下引用了 `THREE` 但未导入它的文件，在顶部插入：
   - ESM 文件插入 `import * as THREE from "three";\n`；**或**
   - 唯一的 CJS 第三方文件 `source/core/lib/three-bmfont-text.js`（通过 `/require\(/` 检测）插入 `var THREE = require("three");\n`。

   这是唯一保留"魔法"的地方；按决策保持源码不动。

2. **`glslRaw()`** —— 替代 `.glsl` 的 `raw-loader` 规则。通过 `load` 钩子：对 `*.glsl` 返回 `` `export default ${JSON.stringify(content)}\n` ``。**源码零改动**（无需给 4 个导入文件加 `?raw`：`objects/text/TextBitmap.js`、`objects/particle/shaders/ParticleShaders.js`、`postprocessing/shaders/SSAOShader.js`、`editor/gui/preview/CubemapFlatRenderer.js`）。

3. **`brythonUmdWrap()`** —— 替代 brython 的 `@shoutem/webpack-prepend-append`。通过 `transform`/`load` 钩子（按 brython 模块路径匹配），应用**与当前 `webpack.config.js` 完全一致的 prepend/append 字符串**（`process = {release:{name:''}}` 的 prepend 与 `window.__BRYTHON__ = __BRYTHON__; return __BRYTHON__;` 的 append）。*实现备注：实现时确认 brython 在源码中的导入位置（它是为编辑器内 Python 脚本而加载的依赖）；插件针对解析后的 brython 模块 id 生效。*

4. **`defineGlobals({ dev })`** —— 返回替代 `DefinePlugin` 的 Vite `define` 映射：
   ```js
   import { execSync } from "child_process";
   const VERSION   = pkg.version;
   const TIMESTAMP = new Date().toISOString();
   const BRANCH    = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
   const COMMIT    = execSync("git rev-parse HEAD").toString().trim();
   define: {
     VERSION: JSON.stringify(VERSION),
     TIMESTAMP: JSON.stringify(TIMESTAMP),
     REPOSITORY_BRANCH: JSON.stringify(BRANCH),
     REPOSITORY_COMMIT: JSON.stringify(COMMIT),
     DEVELOPMENT: JSON.stringify(dev)   // serve 为 true，build 为 false
   }
   ```
   使用裸标识符作为键（与 DefinePlugin 一致）。注意：esbuild 的 `define` 只替换独立的标识符 `VERSION`，**不会**替换 `obj.VERSION` 这类属性访问，与当前行为一致。

5. **别名**（`resolve.alias`）：
   ```js
   { find: "three/addons",      replacement: "<root>/node_modules/three/examples/jsm" },
   { find: "three-bmfont-text", replacement: "<root>/source/core/lib/three-bmfont-text.js" },
   ```
   （webpack 中的裸 `three`/`three$` 别名是冗余的——Vite 原生即可把 `three` 解析到 `node_modules/three`——故删除。）`patches/three+0.170.0.patch`（FBXLoader 补丁）仍通过现有的 `postinstall: patch-package` 生效，保留不动。

### `vite.config.js` —— 编辑器

```js
export default defineConfig(({ command }) => ({
  root: "source/editor",
  publicDir: "../../public",          // 提供 /vendor/* 与 favicon
  plugins: [
    injectThree(), glslRaw(), brythonUmdWrap(),
    viteStaticCopy({                  // dev 下提供 /files/*，build 时复制
      targets: [{ src: "../../source/files", dest: "files" }]
    })
  ],
  resolve: { alias: aliases },
  define: defineGlobals({ dev: command === "serve" }),
  server: { port: 8080, host: true, https: false /* --https 由 CLI 传入 */ },
  build: {
    outDir: "../../docs/editor",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: "bundle.js",              // 为 NW.js 保留扁平文件名
        chunkFileNames: "chunks/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  }
}));
```
- `root: "source/editor"`，使 `index.html` 成为 Vite 入口、`./Main.js` 作为同级文件解析。
- `publicDir: "../../public"`，把 `public/vendor/*` 暴露到 `/vendor/*`。
- `vite-plugin-static-copy` 把 `source/files/` 复制到 `files/`（dev 下提供服务、build 时复制）。运行时库的可选复制放到 `scripts/sync-runtime.js`（见下），因为 dev 下 `dist/` 可能不存在。

### `vite.config.runtime.js` —— 运行时 UMD 库

```js
export default defineConfig(({ command }) => ({
  plugins: [injectThree(), glslRaw(), brythonUmdWrap()],
  resolve: { alias: aliases },
  define: defineGlobals({ dev: command === "serve" }),  // 运行时原本未定义这些——无副作用
  build: {
    lib: {
      entry: path.resolve(__dirname, "source/core/Main.js"),
      name: "IStudio",
      formats: ["umd", "es"],
      fileName: (f) => f === "es" ? "istudio.module.min.js" : "istudio.min.js"
    },
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    minify: "esbuild"
  }
}));
```
- 产出 `dist/istudio.min.js`（UMD，全局 `IStudio`）—— 被 `source/files/runtime/index.html` 以 `new IStudio.App()` 方式消费。
- `istudio.module.min.js`：当前 webpack 在此处输出的是**无名 UMD**（很怪——UMD 没有全局名）。Vite/Rollup 的 UMD 必须有 `name`，故忠实且现代的等价物是 **ES** 构建。**实现时确认**是否有消费者依赖旧的无名 UMD 形态；默认采用 ES。

### `scripts/build-vendor.js` —— 复刻 `MergeIntoSingleFilePlugin`

Node 脚本，按文件拼接后写入 `public/vendor/`。**严格对照当前 `webpack.config.js` 中 `MergeIntoSingleFilePlugin` 块的文件清单**（作为唯一事实来源）。输出：
- `public/vendor/acorn.js` ← `acorn/dist/acorn.js` + `acorn-loose/dist/acorn-loose.js` + `acorn-walk/dist/walk.js`
- `public/vendor/tern.js` ← 6 个 `tern/lib/*` 文件 + `plugin/doc_comment.js`
- `public/vendor/codemirror.js` ← 28 个 CodeMirror 文件（核心 + sublime/emacs/vim 键映射 + python/js/css/xml/htmlmixed 模式 + 约 15 个 addon）。示例：`codemirror/lib/codemirror.js`、`addon/hint/show-hint.js`、`mode/javascript/javascript.js`……
- `public/vendor/codemirror.css` ← `codemirror/lib/codemirror.css` + `codemirror/theme/**/*.css` + 5 个 addon CSS
- `public/vendor/jshint.js` ← `jshint/dist/jshint.js`
- `public/vendor/draco_encoder.js` ← `source/lib/draco_encoder.js`
- `public/vendor/styles.css` ← `source/editor/style.css` + `source/editor/theme/dark.css`

**把 `public/vendor/` 提交到 git**，这样全新克隆后 `npm start` 即可工作，无需先跑脚本。升级 codemirror/tern/acorn/jshint 后重跑 `npm run build-vendor`。

### `scripts/sync-runtime.js` —— 编辑器内运行时的构建后复制

`build-runtime` 产出 `dist/istudio.min.js` 后，将其复制到 `docs/editor/files/runtime/istudio.min.js`（编辑器的 `ProjectExporters` 读取 `Global.RUNTIME_PATH = "./files/runtime/"`）。同时把根 `package.json` 复制到 `docs/editor/package.json`（NW.js 应用清单，之前由 `MergeIntoSingleFilePlugin` 输出）。

## 修改的文件

### `source/editor/index.html`
- 新增编辑器入口（原本由 HtmlWebpackPlugin 注入）：`<script type="module" src="./Main.js"></script>`。
- 把 vendor 标签改为绝对路径 `/vendor/...`（由 `publicDir` 提供）：
  ```html
  <script src="/vendor/acorn.js"></script>
  <script src="/vendor/tern.js"></script>
  <script src="/vendor/codemirror.js"></script>
  <script src="/vendor/jshint.js"></script>
  <script src="/vendor/draco_encoder.js"></script>
  <link rel="stylesheet" href="/vendor/codemirror.css">
  <link rel="stylesheet" href="/vendor/styles.css">
  ```
- 修正 favicon：把 `source/favicon.ico` 引用改为 `/favicon.ico`（在 `public/` 放一份副本）—— 在 `root: source/editor` 下原路径 `./source/favicon.ico` 无法解析。

### `package.json` —— scripts
```json
"start": "vite",
"start-https": "vite --host 0.0.0.0 --https",
"build-vendor": "node scripts/build-vendor.js",
"build-runtime": "vite build --config vite.config.runtime.js",
"build-editor": "npm run build-vendor && npm run build-runtime && vite build && node scripts/sync-runtime.js",
"build": "npm version --no-commit-hooks patch && npm run build-runtime && npm run build-editor",
"start-nwjs": "npm run build-editor && run --with-ffmpeg --mirror https://dl.nwjs.io/ ./docs/editor",
"start-docker": "http-server ./docs/editor -p 8081 --cors -o",
"serve": "http-server . -p 8081 --cors -o"
```
保持不变：`lint`、`lint-fix`、`docs`、`docs-jsdoc`、`pub`、`build-nwjs`、`build-nwjs-win`。已失效的 `start-page` / `build-page`（其 `cd ./source/page` 目标已不存在）保持原样 / 不在范围内；从 `build` 链中移除 `build-page`（见上）。

### `package.json` —— 依赖
- **新增**：`vite`、`vite-plugin-static-copy`。
- **删除**（全部未使用或 webpack 专属）：`webpack`、`webpack-cli`、`webpack-dev-server`、`webpack-merge`、`webpack-merge-and-include-globally`、`copy-webpack-plugin`、`html-webpack-plugin`、`raw-loader`、`git-revision-webpack-plugin`、`@shoutem/webpack-prepend-append`、`webpack-node-externals`、`webpack-cleanup-plugin`、`uglifyjs-webpack-plugin`、`css-loader`、`style-loader`、`babel-loader`、`babel-polyfill`、`@babel/core`、`@babel/plugin-transform-classes`、`@babel/preset-env`、`@babel/runtime`、`@types/webpack`。（Babel 从未接入任何配置——已确认是死依赖。）保留 `@types/node`、`ajv`、`patch-package`、`http-server` 等。

## 删除的文件
`webpack.config.js`、`webpack.dev.js`、`webpack.prod.js`、`webpack.runtime.js`。

## 验证

1. **Lint**：`npm run lint` —— ESLint 配置不变，应通过。
2. **开发服务器**：`npm start` → 打开 `http://localhost:8080`。确认：编辑器启动、场景视口渲染（three.js）、**Code** 标签页显示带语法高亮 + Tern 自动补全的 CodeMirror（验证第三方全局库已加载）、主题为暗色（`styles.css`）、About 标签页显示正确的 `VERSION`/`TIMESTAMP`（验证 `define`）。用浏览器预览工具（`preview_console_logs`、`preview_snapshot`）排查错误。
3. **编辑器生产构建**：`npm run build-editor` → `docs/editor/` 包含 `index.html`、`bundle.js`、`vendor/`、`files/`（含 `files/runtime/index.html`、`istudio.min.js`）、`package.json`。用 `npm run start-docker` 或 NW.js 启动，重复验证开发项。
4. **运行时构建**：`npm run build-runtime` → `dist/istudio.min.js` + `dist/istudio.module.min.js`。测试方式：将其与 `source/files/runtime/index.html` + 一个 `app.nsp` 复制到临时目录，确认 `new IStudio.App()` 能加载并运行项目。
5. **导出流程**（从编辑器）：测试 ProjectExporters 的 Web / NWJS / Cordova 导出——它们从 `./files/runtime/` 复制，因此同步后的 `istudio.min.js` 必须存在。（注意：`npm start` 开发模式**不会**运行 `sync-runtime.js`；要在开发模式下测试导出，需先跑一次 `npm run build-runtime`。）
6. **NW.js**：`npm run start-nwjs` 启动打包后的编辑器。

## 风险 / 待办
- **brython 包装插件**：必须精准命中 brython 模块 id；实现时确认源码中的导入位置，并确保 prepend/append 字符串与当前行为一致。
- **`three-bmfont-text.js`** 是 CJS——注入插件必须对其走 `require("three")` 分支，而非 ESM import。已覆盖，但需验证构建后编辑器能渲染位图文字。
- **`istudio.module.min.js` 格式**：从无名 UMD 改为 ES 是行为变更。确认没有消费者依赖旧形态；必要时回退为带 `name` 的第二个 UMD。
- **开发模式导出注意**：`npm start` 下 `files/runtime/istudio.min.js` 缺失，直到跑过一次 `build-runtime`。需文档化或加开发态回退。
- **Vite 版本**：锁定到最新的稳定版 Vite 5 或 6；验证 `vite-plugin-static-copy` 兼容性。
