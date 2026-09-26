module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' }, modules: 'commonjs' }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  plugins: [
    function replaceImportMeta() {
      return {
        visitor: {
          MetaProperty(path) {
            const { node } = path
            if (
              node.meta &&
              node.meta.name === 'import' &&
              node.property &&
              node.property.name === 'meta'
            ) {
              path.replaceWithSourceString('({ env: process.env })')
            }
          },
        },
      }
    },
  ],
}
