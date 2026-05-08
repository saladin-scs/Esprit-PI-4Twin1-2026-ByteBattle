const base = require('./.eslintrc.js');

module.exports = {
  ...base,
  parserOptions: {
    ...(base.parserOptions || {}),
    project: 'tsconfig.spec.json',
  },
  rules: {
    ...(base.rules || {}),
    'prettier/prettier': 'off',
  },
};
