import fs from "fs";
import path from "path";
import {execSync} from "child_process";

const root = process.cwd();
const sourceSep = path.sep + "source" + path.sep;

const MIME = {
	".html": "text/html",
	".js": "text/javascript",
	".mjs": "text/javascript",
	".css": "text/css",
	".json": "application/json",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".ico": "image/x-icon",
	".webm": "video/webm",
	".mp3": "audio/mpeg",
	".mp4": "video/mp4",
	".wasm": "application/wasm",
	".dds": "application/octet-stream",
	".dae": "application/xml",
	".c4d": "application/octet-stream",
	".txt": "text/plain",
	".glsl": "text/plain"
};

function copyDirRecursive(from, to)
{
	fs.mkdirSync(to, {recursive: true});
	for (const entry of fs.readdirSync(from, {withFileTypes: true}))
	{
		const src = path.join(from, entry.name);
		const dest = path.join(to, entry.name);
		if (entry.isDirectory()) {copyDirRecursive(src, dest);}
		else {fs.copyFileSync(src, dest);}
	}
}

// Copies `srcDir` into `destRel` (relative to outDir) at build time, and serves it
// at `/<destRel>/*` during dev. Replaces CopyWebpackPlugin for the source/files tree.
export function copyStatic(srcDir, destRel)
{
	const src = path.resolve(root, srcDir);
	const prefix = "/" + destRel + "/";

	return {
		name: "istudio:copy-static",
		configureServer: function(server)
		{
			server.middlewares.use((req, res, next) =>
			{
				const url = req.url || "";
				if (!url.startsWith(prefix)) {return next();}

				const rel = decodeURIComponent(url.slice(prefix.length).split("?")[0]);
				const file = path.resolve(src, rel);

				if (!file.startsWith(src) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {return next();}

				res.setHeader("Content-Type", MIME[path.extname(file).toLowerCase()] || "application/octet-stream");
				fs.createReadStream(file).pipe(res);
			});
		},
		writeBundle: function(options)
		{
			copyDirRecursive(src, path.resolve(options.dir, destRel));
			console.log("copy-static: " + src + " -> " + path.resolve(options.dir, destRel));
		}
	};
}

// Resolve aliases that webpack configured. The bare `three` / `three$` aliases
// are redundant (Vite resolves `three` natively), so only the two load-bearing ones remain.
// `three-bmfont-text` uses an exact-match regex so deep imports like
// `three-bmfont-text/lib/vertices` still resolve from node_modules (only the bare
// specifier is redirected to the vendored fork).
export const aliases = [
	{find: "three/addons", replacement: path.resolve(root, "node_modules/three/examples/jsm")},
	{find: /^three-bmfont-text$/, replacement: path.resolve(root, "source/core/lib/three-bmfont-text.js")}
];

function inSource(id)
{
	return id.replace(/\\/g, "/").includes("/source/");
}

// Replaces webpack ProvidePlugin({THREE: "three", "window.THREE": "three"}).
// Source references bare `THREE` without importing it; inject the import per file.
// CJS vendored files (e.g. three-bmfont-text.js) get a require() instead of an ESM import.
export function injectThree()
{
	return {
		name: "istudio:inject-three",
		transform: function(code, id)
		{
			if (!inSource(id)) {return null;}
			if (!/\bTHREE\b/.test(code)) {return null;}
			if (/import\b[^;]*\bTHREE\b/.test(code)) {return null;}
			if (/\bTHREE\b\s*=\s*require\s*\(\s*["']three["']/.test(code)) {return null;}

			const isCjs = /(?:^|[\n;])\s*(?:var|const|let)?\s*\w+\s*=\s*require\s*\(/.test(code) || /module\.exports\b/.test(code);
			const injection = isCjs ? `var THREE = require("three");\n` : `import * as THREE from "three";\n`;

			return injection + code;
		}
	};
}

// Build-time constants that webpack injected globally via DefinePlugin.
// Scoped to source files only (via per-file `var` declarations) so dependencies
// that happen to use a bare `VERSION`/`TIMESTAMP` identifier are never clobbered.
function globalValues(dev)
{
	let branch = "";
	let commit = "";

	try
	{
		branch = execSync("git rev-parse --abbrev-ref HEAD").toString().trim();
		commit = execSync("git rev-parse HEAD").toString().trim();
	}
	catch (e)
	{
		// git not available
	}

	const pkg = JSON.parse(fs.readFileSync(path.resolve(root, "package.json"), "utf-8"));

	return {
		VERSION: JSON.stringify(pkg.version),
		TIMESTAMP: JSON.stringify(new Date().toISOString()),
		REPOSITORY_BRANCH: JSON.stringify(branch),
		REPOSITORY_COMMIT: JSON.stringify(commit),
		DEVELOPMENT: JSON.stringify(dev)
	};
}

export function injectGlobals(dev)
{
	const values = globalValues(dev);
	const names = Object.keys(values);

	return {
		name: "istudio:inject-globals",
		transform: function(code, id)
		{
			if (!inSource(id)) {return null;}

			const declarations = [];
			for (const name of names)
			{
				if (!new RegExp(`\\b${name}\\b`).test(code)) {continue;}
				if (new RegExp(`\\b(?:const|var|let|function|class)\\s+${name}\\b`).test(code)) {continue;}
				declarations.push(`var ${name} = ${values[name]};`);
			}

			if (!declarations.length) {return null;}

			return declarations.join("\n") + "\n" + code;
		}
	};
}

// Replaces the raw-loader rule for .glsl files. Zero source edits (no `?raw` suffix needed).
export function glslRaw()
{
	return {
		name: "istudio:glsl-raw",
		load: function(id)
		{
			const file = id.replace(/\?.*$/, "");
			if (!file.endsWith(".glsl")) {return null;}
			const content = fs.readFileSync(file, "utf-8");
			return `export default ${JSON.stringify(content)};\n`;
		}
	};
}

// Replaces @shoutem/webpack-prepend-append wrapping of brython.
// brython.js is a sloppy-mode classic script: it uses top-level `this` and un-`new`ed
// constructors that rely on `this` falling back to the global object. ESM modules are
// strict-mode (`this` is undefined), so the body is wrapped in a `new Function` (sloppy
// by default) called with this=window — matching the original UMD factory. Used by the
// RUNTIME library build so brython is bundled into dist/istudio.min.js. Zero source edits.
export function brythonUmdWrap()
{
	return {
		name: "istudio:brython-wrap",
		load: function(id)
		{
			const file = id.replace(/\?.*$/, "");
			if (!file.replace(/\\/g, "/").includes("/node_modules/brython/brython.js")) {return null;}
			const body = fs.readFileSync(file, "utf-8");

			return [
				"var __brythonFactory = new Function(",
				"\t\"var process = {release: {name: ''}};\\n\" +",
				"\t" + JSON.stringify(body) + " +",
				"\t\"\\nreturn __BRYTHON__;\"",
				");",
				"var __B = __brythonFactory.call(typeof window !== \"undefined\" ? window : globalThis);",
				"if (typeof window !== \"undefined\") {window.__BRYTHON__ = __B;}",
				"export default __B;",
				"export const python_to_js = __B.python_to_js;"
			].join("\n");
		}
	};
}

// EDITOR build: brython is shipped pre-wrapped as a classic public/vendor/brython.js <script>
// (set up by scripts/build-vendor.js), which defines window.__BRYTHON__ in sloppy mode. This
// virtual module re-exports that global so `import * as Brython from "brython"` keeps working
// without importing brython from node_modules (keeps it out of Vite's dep-optimizer cache).
const BRYTHON_VIRTUAL_ID = "\0istudio:brython-shim";
export function brythonGlobalShim()
{
	return {
		name: "istudio:brython-shim",
		enforce: "pre",
		resolveId: function(source)
		{
			if (source === "brython") {return BRYTHON_VIRTUAL_ID;}
			return null;
		},
		load: function(id)
		{
			if (id !== BRYTHON_VIRTUAL_ID) {return null;}
			return [
				"var B = (typeof window !== \"undefined\") ? window.__BRYTHON__ : undefined;",
				"if (typeof B === \"undefined\") {console.warn(\"brython global not found — did vendor/brython.js load?\");}",
				"export default B;",
				"export const python_to_js = B ? B.python_to_js : function () { throw new Error(\"brython not loaded\"); };"
			].join("\n");
		}
	};
}
