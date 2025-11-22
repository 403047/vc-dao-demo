const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function exists(p) {
  try { return fs.existsSync(p); } catch { return false; }
}

const cwd = process.cwd();
const binDir = path.join(cwd, 'node_modules', '.bin');
const candidates = [
  { name: 'react-scripts', args: ['start'] },
  { name: 'vite', args: [] },
  { name: 'next', args: ['dev'] },
  { name: 'parcel', args: ['serve'] },
  { name: 'webpack-dev-server', args: [] }
];

for (const c of candidates) {
  const exe = process.platform === 'win32' ? `${c.name}.cmd` : c.name;
  if (exists(path.join(binDir, exe))) {
    const cmd = path.join(binDir, exe);
    const args = c.args;
    console.log(`Starting ${c.name} -> ${cmd} ${args.join(' ')}`.trim());
    const p = spawn(cmd, args, { stdio: 'inherit', cwd, env: process.env });
    p.on('exit', code => process.exit(code));
    p.on('error', err => {
      console.error('Failed to start dev server:', err.message || err);
      process.exit(1);
    });
    return;
  }
}

// fallback: inspect package.json for hint
let pkg = {};
try { pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8')); } catch {}
const deps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {});
const hints = [];
if (deps['react-scripts']) hints.push('react-scripts (create-react-app)');
if (deps['vite']) hints.push('vite');
if (deps['next']) hints.push('next');
if (deps['parcel']) hints.push('parcel');
if (deps['webpack-dev-server']) hints.push('webpack-dev-server');

console.error('No dev server binary found in node_modules/.bin.');
if (hints.length) {
  console.error('Detected dependencies:', hints.join(', '));
  console.error('Try running: npm install && npm start');
} else {
  console.error('No known framework detected. To proceed:');
  console.error('1) Install a dev server, e.g.:');
  console.error('   npm install --save-dev react-scripts      # for CRA');
  console.error('   npm install --save-dev vite               # for Vite');
  console.error('   npm install next react react-dom          # for Next.js (then use "next dev")');
  console.error('2) Then run: npm start');
}
process.exit(1);
