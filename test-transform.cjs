const esbuild = require('esbuild');

// Use the same TypeScript transformer as the plugin build, without Babel.
module.exports = {
  process(sourceText, sourcePath) {
    return {
      code: esbuild.transformSync(sourceText, {
        loader: /\.tsx$/.test(sourcePath) ? 'tsx' : /\.ts$/.test(sourcePath) ? 'ts' : 'js',
        format: 'cjs',
        target: 'es2018',
        sourcemap: 'inline',
        sourcefile: sourcePath,
      }).code,
    };
  },
};
