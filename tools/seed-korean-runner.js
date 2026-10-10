process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: 'commonjs', moduleResolution: 'node', rootDir: '.' });
require('ts-node/register');
require('./seed-korean.ts');
