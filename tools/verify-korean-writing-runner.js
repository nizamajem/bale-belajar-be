process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'commonjs', rootDir: '.' });
require('ts-node/register');
require('./verify-korean-writing.ts');
