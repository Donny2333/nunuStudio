import path from "path";
import {defineConfig} from "vite";
import {aliases, brythonUmdWrap, glslRaw, injectGlobals, injectThree} from "./vite.shared.mjs";

// Runtime engine — UMD library (global `IStudio`) + ES module, published to dist/.
export default defineConfig(({command}) =>
{
	return {
		resolve: {alias: aliases, dedupe: ["three"]},
		plugins: [
			injectThree(),
			injectGlobals(command === "serve"),
			glslRaw(),
			brythonUmdWrap()
		],
		optimizeDeps: {exclude: ["brython"]},
		build: {
			lib: {
				entry: path.resolve(__dirname, "source/core/Main.js"),
				name: "IStudio",
				formats: ["umd", "es"],
				fileName: (format) => {return format === "es" ? "istudio.module.min.js" : "istudio.min.js";}
			},
			outDir: path.resolve(__dirname, "dist"),
			emptyOutDir: true,
			sourcemap: false,
			minify: "esbuild"
		}
	};
});
