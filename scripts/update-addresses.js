const fs = require('fs');
const path = require('path');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

try {
  const repoRoot = __dirname.replace(/\\scripts$/, '');
  const deployedPath = path.join(repoRoot, 'abis', 'deployed-addresses-coston.json');
  if (!fs.existsSync(deployedPath)) {
    throw new Error('Missing abis/deployed-addresses-coston.json. Run deployment first.');
  }
  const deployed = readJson(deployedPath);

  const frontendJsonPath = path.join(repoRoot, 'frontend', 'src', 'config', 'contract-addresses.json');
  if (!fs.existsSync(frontendJsonPath)) {
    throw new Error('Missing frontend/src/config/contract-addresses.json');
  }

  const cfg = readJson(frontendJsonPath);
  cfg.coston = cfg.coston || {};
  cfg.coston.token = deployed.token;
  cfg.coston.treasury = deployed.treasury;
  cfg.coston.governor = deployed.governor;

  writeJson(frontendJsonPath, cfg);

  console.log('Updated frontend addresses (coston):');
  console.log('  token   ', deployed.token);
  console.log('  treasury', deployed.treasury);
  console.log('  governor', deployed.governor);
  console.log('\nTip: Reload the dev server or refresh the page to pick up changes.');
} catch (e) {
  console.error('update-addresses failed:', e.message || e);
  process.exit(1);
}
