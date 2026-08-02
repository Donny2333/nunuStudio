// After build-runtime produces dist/istudio.min.js, place copies where the editor needs them:
//   - docs/editor/files/runtime/istudio.min.js  (ProjectExporters copies from ./files/runtime/)
//   - docs/editor/package.json                   (NW.js app manifest, previously emitted by MergeIntoSingleFilePlugin)
"use strict";

const fs = require("fs");
const path = require("path");

const root = process.cwd();

function copy(src, dest)
{
	const from = path.resolve(root, src);
	const to = path.resolve(root, dest);

	if (!fs.existsSync(from))
	{
		console.warn("sync-runtime: skipping (missing source) " + src);
		return;
	}

	fs.mkdirSync(path.dirname(to), {recursive: true});
	fs.copyFileSync(from, to);
	console.log("sync-runtime: " + src + " -> " + dest);
}

copy("dist/istudio.min.js", "docs/editor/files/runtime/istudio.min.js");
copy("package.json", "docs/editor/package.json");
