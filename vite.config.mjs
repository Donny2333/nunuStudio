import path from "path";
import {defineConfig} from "vite";
import {aliases, brythonGlobalShim, copyStatic, glslRaw, injectGlobals, injectThree} from "./vite.shared.mjs";

// Editor SPA — dev server + production build into docs/editor/.
export default defineConfig(({command}) =>
{
	return {
	// Relative base for the build (portable: works at NW.js file://, subpaths, and domain root);
	// absolute "/" for the dev server (Vite needs an absolute base to serve modules).
		base: command === "build" ? "./" : "/",
		root: path.resolve(__dirname, "source/editor"),
		publicDir: path.resolve(__dirname, "public"),
		plugins: [
			injectThree(),
			injectGlobals(command === "serve"),
			glslRaw(),
			brythonGlobalShim(),
			copyStatic("source/files", "files")
		],
		resolve: {alias: aliases, dedupe: ["three"]},
		// brython resolves to the brythonGlobalShim virtual module (not node_modules), so keep it
		// out of the dep optimizer — otherwise the scanner pre-bundles it and serves a strict-mode copy.
		optimizeDeps: {exclude: ["brython"]},
		server: {port: 8080},
		build: {
			outDir: path.resolve(__dirname, "docs/editor"),
			emptyOutDir: true,
			sourcemap: false,
			rollupOptions: {
				output: {
					entryFileNames: "bundle.js",
					chunkFileNames: "chunks/[name].js",
					assetFileNames: "assets/[name][extname]"
				}
			}
		}
	};
});
