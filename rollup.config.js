import {terser} from "rollup-plugin-terser";

export default {
	input: "src/index.js",
	output: [
		{
			file: "dist/pico-cad-viewer.esm.js",
			format: "esm",
		},
		{
			file: "dist/pico-cad-viewer.min.js",
			format: "iife",
			name: "PicoCadViewer",
			plugins: [ terser() ],
		},
	],
};
