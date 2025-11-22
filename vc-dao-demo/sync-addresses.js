const fs = require('fs');
const path = require('path');

// Đọc deployed addresses từ hardhat deployment
const deployedPath = path.join(__dirname, 'abis', 'deployed-addresses-coston.json');
const deployed = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));

// Đọc file config frontend
const configPath = path.join(__dirname, 'frontend', 'src', 'config', 'daoContracts.js');
let config = fs.readFileSync(configPath, 'utf8');

// Replace DEFAULT_ADDRESSES
const oldPattern = /const DEFAULT_ADDRESSES = \{[^}]+\};/s;
const newAddresses = `const DEFAULT_ADDRESSES = {
  token: '${deployed.token}',
  treasury: '${deployed.treasury}',
  governor: '${deployed.governor}'
};`;

config = config.replace(oldPattern, newAddresses);

// Write back
fs.writeFileSync(configPath, config, 'utf8');

console.log('✅ Frontend config updated with new contract addresses:');
console.log(`   Token:    ${deployed.token}`);
console.log(`   Treasury: ${deployed.treasury}`);
console.log(`   Governor: ${deployed.governor}`);
console.log('\n🔄 Please restart the frontend dev server (npm run dev)');
