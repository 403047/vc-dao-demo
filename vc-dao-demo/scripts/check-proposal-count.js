const hre = require('hardhat');
const fs = require('fs');

async function main() {
  // Read deployed addresses
  const addresses = JSON.parse(fs.readFileSync('abis/deployed-addresses-coston.json', 'utf8'));
  
  console.log('📊 Checking Governor Contract:', addresses.governor);
  
  const Governor = await hre.ethers.getContractAt('VCGovernor', addresses.governor);
  
  const count = await Governor.proposalCount();
  console.log('✅ Total proposals on contract:', count.toString());
  
  if (count.toNumber() > 0) {
    console.log('\n📋 Loading proposals:');
    for (let i = 0; i < count.toNumber(); i++) {
      try {
        const proposal = await Governor.getProposal(i);
        console.log(`\nProposal ${i}:`);
        console.log('  Title:', proposal[2]);
        console.log('  Executed:', proposal[10]);
      } catch (e) {
        console.error(`Error loading proposal ${i}:`, e.message);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
