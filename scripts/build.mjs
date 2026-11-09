// dist/ 에 묶어 내기: src/main.ts → main.js, index.html·public 복사
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
await build({ entryPoints: ['src/main.ts'], bundle: true, format: 'esm', target: 'es2022', minify: true, outfile: 'dist/main.js', loader: { '.ts': 'ts' } });
cpSync('index.html', 'dist/index.html');
cpSync('public', 'dist', { recursive: true });
console.log('dist 준비됨');
