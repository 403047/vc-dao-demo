const hre = require('hardhat');
const fs = require('fs');

async function main() {
  const addresses = JSON.parse(fs.readFileSync('abis/deployed-addresses-coston.json', 'utf8'));
  
  console.log('📊 Debugging Proposal Data\n');
  console.log('Governor:', addresses.governor);
  
  const Governor = await hre.ethers.getContractAt('VCGovernor', addresses.governor);
  
  const count = await Governor.proposalCount();
  console.log('\n✅ Total proposals:', count.toString());
  
  if (count.toNumber() > 0) {
    // Try different indices
    for (let i = 0; i <= count.toNumber(); i++) {
      console.log(`\n--- Trying index ${i} ---`);
      try {
        const proposal = await Governor.getProposal(i);
        console.log('ID:', proposal[0].toString());
        console.log('Proposer:', proposal[1]);
        console.log('Title:', proposal[2]);
        console.log('voteStart (raw):', proposal[6].toString());
        console.log('voteStart (date):', new Date(proposal[6].toNumber() * 1000).toISOString());
        console.log('voteEnd (raw):', proposal[7].toString());
        console.log('voteEnd (date):', new Date(proposal[7].toNumber() * 1000).toISOString());
        console.log('Executed:', proposal[10]);
      } catch (e) {
        console.log('Error:', e.message);
      }
    }
  }
  
  console.log('\n⏰ Current block timestamp:', (await hre.ethers.provider.getBlock('latest')).timestamp);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
