import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "index.ts",
    "capture-policy/index": "capture-policy.js",
  },
  format: ["esm"],
  outDir: "dist",
  bundle: true,
  minify: true,
  sourcemap: true,
  splitting: false,
  outExtension: () => ({ js: ".mjs" }),
  clean: true,
  dts: false,
  noExternal: [/.*/],
  banner: {
    js: `import{createRequire}from"module";const require=createRequire(import.meta.url);`,
  },
});
