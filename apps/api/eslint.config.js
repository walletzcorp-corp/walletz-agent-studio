const nest = require('@walletz/config/eslint/nest');

module.exports = [
  ...nest,
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', '**/*.js'],
  },
];
