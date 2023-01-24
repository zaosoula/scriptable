module.exports = function requireToImportModule() {
  return {
    visitor: {
      Identifier(path) {
        // in this example change all the variable `n` to `x`
        if (path.isIdentifier({ name: 'require' })) {
          path.node.name = 'importModule';
        }
      },
    },
  };
}
