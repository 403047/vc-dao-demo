const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

function readEnvLocal(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const txt = fs.readFileSync(envPath, 'utf8');
  const lines = txt.split(/\r?\n/);
  const out = {};
  for (const l of lines) {
    const m = l.match(/^\s*([^=\s]+)=(.+)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

(async () => {
  try {
    const frontendDir = path.join(__dirname, '..');
    const repoRoot = path.join(frontendDir, '..');

    const env = readEnvLocal(path.join(frontendDir, '.env.local'));
    const deployed = JSON.parse(fs.readFileSync(path.join(repoRoot, 'abis', 'deployed-addresses-coston.json'), 'utf8'));

    const tokenAddr = env.NEXT_PUBLIC_TOKEN_ADDRESS || deployed.token;
    const treasuryAddr = env.NEXT_PUBLIC_TREASURY_ADDRESS || deployed.treasury;
    const governorAddr = env.NEXT_PUBLIC_GOVERNOR_ADDRESS || deployed.governor;

    console.log('Addresses used by frontend:');
    console.log('  token:   ', tokenAddr);
    console.log('  treasury:', treasuryAddr);
    console.log('  governor:', governorAddr);

    // RPC: attempt to read from frontend daoContracts.js, fallback to known URL
    let rpcUrl = 'https://coston-api.flare.network/ext/C/rpc';
    try {
      const daoPath = path.join(frontendDir, 'src', 'config', 'daoContracts.js');
      if (fs.existsSync(daoPath)) {
        const daoTxt = fs.readFileSync(daoPath, 'utf8');
        const m = daoTxt.match(/rpcUrls\s*:\s*\[\s*['\"]([^'\"]+)['\"]/);
        if (m) rpcUrl = m[1];
      }
    } catch (e) {
      // ignore
    }

    console.log('\nUsing RPC:', rpcUrl);

    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const gt = JSON.parse(fs.readFileSync(path.join(repoRoot, 'abis', 'GovernanceToken.json'), 'utf8'));
    const treasuryAbi = JSON.parse(fs.readFileSync(path.join(repoRoot, 'abis', 'Treasury.json'), 'utf8'));
    const govAbi = JSON.parse(fs.readFileSync(path.join(repoRoot, 'abis', 'VCGovernor.json'), 'utf8'));

    const token = new ethers.Contract(tokenAddr, gt.abi, provider);
    const treasury = new ethers.Contract(treasuryAddr, treasuryAbi.abi, provider);
    const governor = new ethers.Contract(governorAddr, govAbi.abi, provider);

    console.log('\nQuerying contracts... (may take a few seconds)');

    try {
      const name = await token.name();
      const symbol = await token.symbol();
      const owner = await token.owner();
      const totalSupply = await token.totalSupply();
      const decimals = await token.decimals();
      console.log('\nToken:');
      console.log('  name:       ', name);
      console.log('  symbol:     ', symbol);
      console.log('  owner:      ', owner);
      console.log('  totalSupply:', ethers.utils.formatUnits(totalSupply, decimals));
    } catch (e) {
      console.error('\nToken query failed:', e.message || e);
    }

    try {
      const tOwner = await treasury.owner();
      let balance = null;
      // prefer contract view getBalance if exists
      try {
        const b = await treasury.getBalance();
        balance = ethers.utils.formatEther(b);
      } catch (e) {
        // fallback to provider.getBalance
        const b = await provider.getBalance(treasuryAddr);
        balance = ethers.utils.formatEther(b);
      }
      console.log('\nTreasury:');
      console.log('  owner:   ', tOwner);
      console.log('  balance: ', balance);
    } catch (e) {
      console.error('\nTreasury query failed:', e.message || e);
    }

    try {
      const gOwner = await governor.owner();
      const proposalCount = await governor.proposalCount();
      console.log('\nGovernor:');
      console.log('  owner:         ', gOwner);
      console.log('  proposalCount: ', proposalCount.toString());
    } catch (e) {
      console.error('\nGovernor query failed:', e.message || e);
    }

    // Print guidance
    console.log('\nIf any owner/address looks unexpected, check `frontend/.env.local` and `abis/deployed-addresses-coston.json`.');
  } catch (err) {
    console.error('Script failed:', err);
    process.exit(1);
  }
})();
