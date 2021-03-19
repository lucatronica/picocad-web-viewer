import {terser} from "rollup-plugin-terser";

export default {
	input: "demo-src/index.js",
	output: [
		{
			file: "docs/index.js",
			format: "iife",
			exports: "none",
			plugins: [ terser() ],
		},
	],
};
