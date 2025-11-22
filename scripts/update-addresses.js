// Usage: node update-addresses.js <network> <token> <treasury> <governor>
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 4) {
  console.error('Usage: node scripts/update-addresses.js <network> <token> <treasury> <governor>');
  process.exit(1);
}
const [network, token, treasury, governor] = args;

const frontendPath = path.join(__dirname, '..', 'vc-dao-demo', 'frontend', 'src', 'config', 'contract-addresses.json');
let cfg = {};
try {
  cfg = JSON.parse(fs.readFileSync(frontendPath, 'utf8'));
} catch (e) {
  console.error('Failed to read existing contract-addresses.json:', e.message || e);
  process.exit(1);
}

cfg[network] = Object.assign({}, cfg[network] || {}, {
  token,
  treasury,
  governor
});

cfg.meta = Object.assign({}, cfg.meta || {}, {
  lastUpdated: new Date().toISOString(),
  deployedBy: process.env.DEPLOYER || null,
  note: 'Addresses updated by scripts/update-addresses.js'
});

fs.writeFileSync(frontendPath, JSON.stringify(cfg, null, 2), 'utf8');
console.log('Updated frontend contract-addresses.json at', frontendPath);
console.log('New addresses:', { network, token, treasury, governor });
