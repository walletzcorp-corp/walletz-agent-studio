// @nestjs/bullmq and @nestjs/bull-shared ship ESM-only ("type": "module"); jest runs CommonJS.
// Transpile just those packages to CommonJS with the TypeScript compiler we already depend on.
const ts = require('typescript');

module.exports = {
  process(sourceText, sourcePath) {
    const { outputText } = ts.transpileModule(sourceText, {
      fileName: sourcePath,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        allowJs: true,
        esModuleInterop: true,
      },
    });
    return { code: outputText };
  },
};
