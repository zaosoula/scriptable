/* eslint-disable */
const commonjs = require('@rollup/plugin-commonjs');
const glob = require('glob');
const fs = require('fs');
const { terser } = require('rollup-plugin-terser');

const input = glob.sync('src/*.js', {
  absolute: true,
});

module.exports = {
  input,
  output: {
    dir: 'dist',
    format: 'cjs',
    plugins: [
      {
        generateBundle: (_, bundles) => Object.fromEntries(Object.entries(bundles).map(([name, bundle]) => {
          const entry = Object.keys(bundle.modules).find((x) => input.includes(x));
          const topComments = bundle.modules[entry].code.match(/(\/\/(.*)\n)+/m)[0];
          bundle.code = topComments + bundle.code;
          return [name, bundle];
        })),
      },
    ],
  },
  plugins: [
    terser(),
    commonjs(),
  ],
};
