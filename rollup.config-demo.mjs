import terser from "@rollup/plugin-terser";

const development = process.env.BUILD === "development";

export default {
	input: "demo-src/index.js",
	output: [
		{
			file: "docs/index.js",
			format: "iife",
			exports: "none",
			plugins: development ? [] : [ terser() ],
		},
	],
};
