// Config compartilhada do monorepo. O plugin do Tailwind fica de fora enquanto não for
// declarado como dependência (adicioná-lo exige atualizar o pnpm-lock.yaml).
const { plugins: _plugins, ...shared } = require('./packages/config/prettier');

module.exports = { ...shared, endOfLine: 'auto' };
