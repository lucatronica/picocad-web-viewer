import terser from "@rollup/plugin-terser";

const development = process.env.BUILD === "development";

export default [
	// Main script.
	{
		input: "demo-src/index.js",
		output: [
			{
				file: "docs/index.js",
				format: "iife",
				exports: "none",
				plugins: development ? [] : [ terser() ],
			},
		],
	},
	// Worker script.
	{
		input: "demo-worker-src/index.js",
		output: [
			{
				file: "docs/worker.js",
				format: "iife",
				exports: "none",
				plugins: development ? [] : [ terser() ],
			},
		],
	},
];
