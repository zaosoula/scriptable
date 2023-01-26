/* eslint-disable */
const commonjs = require('@rollup/plugin-commonjs');
const glob = require('glob');
const { terser } = require('rollup-plugin-terser');
const fs = require('fs');
const os = require('os');
const path = require('path');
const typescript = require('@rollup/plugin-typescript');

const scriptableIcloudPath = path.join(os.homedir(), 'Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents');

const input = glob.sync('src/*.[tj]s', {
  absolute: true,
});

const keepScriptableVars = (input) => ({
  generateBundle: (_, bundles) => Object.fromEntries(Object.entries(bundles).map(([name, bundle]) => {
    console.log(input);
    const entry = Object.keys(bundle.modules).find((x) => Array.isArray(input) ? input.includes(x) : input === x);
    const code = fs.readFileSync(entry, { encoding: 'utf-8'});
    let topComments = code.match(/(\/\/(.*)\n)+/m)[0];
    topComments += `// Build at ${new Date().toISOString()}\n`;
    bundle.code = topComments + bundle.code;
    return [name, bundle];
  })),
});

const cjsOutput = (dir) => ({
  dir,
  format: 'cjs',
  plugins: [ keepScriptableVars(input) ],
})


module.exports = {
  input,
  output: [
    cjsOutput(scriptableIcloudPath),
    cjsOutput('dist')
  ],
  plugins: [
    typescript(),
    terser(),
    // commonjs(),
  ],
};
