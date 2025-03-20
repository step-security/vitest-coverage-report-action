const { build } = require("esbuild");

build({
  bundle: true,
  minify: true,
  sourcemap: true,
  platform: "node",
  entryPoints: ["src/index.ts"],
  outfile: "dist/index.js",
  target: "node16",
  external: ["@actions/core", "@actions/github", "@octokit/request-error", "axios", "common-tags"],
}).catch(() => process.exit(1));
