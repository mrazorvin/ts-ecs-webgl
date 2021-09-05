const build = require("esbuild");
const Module = require("module");
const compile = Module.prototype._compile;

require.extensions[".ts"] = require.extensions[".js"];

Module.prototype._compile = function (content, filename) {
  const self = this;
  const { code } = build.transformSync(content, {
    loader: "ts",
    format: "cjs",
    sourcemap: "inline",
    sourcefile: filename,
  });
  return compile.call(self, code, filename);
};

const ENTRY = process.env["ENTRY"] ?? "./index.ts";
const FE_ENTRY = process.env["FE_ENTRY"] ?? "./browser.tsx";
const WK_ENTRY = process.env["WK_ENTRY"] ?? "./worker.ts";

let finish_app = require(ENTRY)();

build.build({
  entryPoints: [ENTRY],
  outfile: "dist/server.js",
  bundle: true,
  watch: {
    onRebuild: () => {
      finish_app();
      for (const key in require.cache) delete require.cache[key];
      finish_app = require(ENTRY)();
    },
  },
});

build.serve(
  { servedir: "www", port: 1234 },
  {
    entryPoints: [FE_ENTRY, WK_ENTRY],
    outdir: "www/js",
    bundle: true,
    jsxFactory: "h",
    jsxFragment: "Fragment",
  }
);
