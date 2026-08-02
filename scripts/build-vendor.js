// Replaces webpack's MergeIntoSingleFilePlugin: concatenates the vendored libraries
// that source/editor/index.html loads as flat <script>/<link> globals (acorn, tern,
// codemirror, jshint, draco_encoder) plus the editor stylesheets.
//
// Outputs to public/vendor/. Run once after install / when codemirror|tern|acorn|jshint bumps.
"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const outDir = path.resolve(root, "public/vendor");

function read(rel)
{
	const file = path.resolve(root, rel);
	if (!fs.existsSync(file))
	{
		throw new Error("build-vendor: missing file " + rel);
	}
	return fs.readFileSync(file, "utf-8");
}

function concat(files)
{
	return files.map(read).join("\n");
}

function write(name, content)
{
	fs.writeFileSync(path.join(outDir, name), content);
}

function collectThemeCss()
{
	const dir = path.resolve(root, "node_modules/codemirror/theme");
	return fs.readdirSync(dir)
		.filter((f) => {return f.endsWith(".css");})
		.sort()
		.map((f) => {return "node_modules/codemirror/theme/" + f;});
}

fs.mkdirSync(outDir, {recursive: true});

write("acorn.js", concat([
	"node_modules/acorn/dist/acorn.js",
	"node_modules/acorn-loose/dist/acorn-loose.js",
	"node_modules/acorn-walk/dist/walk.js"
]));

write("tern.js", concat([
	"node_modules/tern/lib/signal.js",
	"node_modules/tern/lib/tern.js",
	"node_modules/tern/lib/def.js",
	"node_modules/tern/lib/comment.js",
	"node_modules/tern/lib/infer.js",
	"node_modules/tern/plugin/doc_comment.js"
]));

write("codemirror.js", concat([
	"node_modules/codemirror/lib/codemirror.js",
	"node_modules/codemirror/keymap/sublime.js",
	"node_modules/codemirror/keymap/emacs.js",
	"node_modules/codemirror/keymap/vim.js",
	"node_modules/codemirror/mode/python/python.js",
	"node_modules/codemirror/mode/javascript/javascript.js",
	"node_modules/codemirror/mode/css/css.js",
	"node_modules/codemirror/mode/xml/xml.js",
	"node_modules/codemirror/mode/htmlmixed/htmlmixed.js",
	"node_modules/codemirror/addon/edit/closebrackets.js",
	"node_modules/codemirror/addon/edit/matchbrackets.js",
	"node_modules/codemirror/addon/scroll/annotatescrollbar.js",
	"node_modules/codemirror/addon/search/search.js",
	"node_modules/codemirror/addon/search/searchcursor.js",
	"node_modules/codemirror/addon/search/jump-to-line.js",
	"node_modules/codemirror/addon/search/match-highlighter.js",
	"node_modules/codemirror/addon/search/matchesonscrollbar.js",
	"node_modules/codemirror/addon/hint/show-hint.js",
	"node_modules/codemirror/addon/hint/anyword-hint.js",
	"node_modules/codemirror/addon/dialog/dialog.js",
	"node_modules/codemirror/addon/selection/mark-selection.js",
	"node_modules/codemirror/addon/selection/active-line.js",
	"node_modules/codemirror/addon/selection/selection-pointer.js",
	"node_modules/codemirror/addon/lint/lint.js",
	"node_modules/codemirror/addon/lint/javascript-lint.js",
	"node_modules/codemirror/addon/tern/tern.js",
	"node_modules/codemirror/addon/runmode/colorize.js",
	"node_modules/codemirror/addon/runmode/runmode.js"
]));

write("codemirror.css", concat([
	"node_modules/codemirror/lib/codemirror.css",
	...collectThemeCss(),
	"node_modules/codemirror/addon/search/matchesonscrollbar.css",
	"node_modules/codemirror/addon/tern/tern.css",
	"node_modules/codemirror/addon/dialog/dialog.css",
	"node_modules/codemirror/addon/lint/lint.css",
	"node_modules/codemirror/addon/hint/show-hint.css"
]));

write("jshint.js", read("node_modules/jshint/dist/jshint.js"));
write("draco_encoder.js", read("source/lib/draco_encoder.js"));

// brython is a sloppy-mode classic script (uses top-level `this`); ship it pre-wrapped as
// a global <script> so it runs correctly and the editor never imports it from node_modules
// (which would otherwise go through Vite's fragile dep-optimizer cache).
write("brython.js",
	"var process = {release: {name: ''}};\n" +
	read("node_modules/brython/brython.js") +
	"\nwindow.__BRYTHON__ = __BRYTHON__;\n");

write("styles.css", concat([
	"source/editor/style.css",
	"source/editor/theme/dark.css"
]));

console.log("build-vendor: wrote acorn.js, tern.js, codemirror.js, codemirror.css, jshint.js, draco_encoder.js, brython.js, styles.css -> public/vendor/");
