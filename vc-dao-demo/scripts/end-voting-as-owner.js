const hre = require('hardhat');

async function main() {
  const [owner] = await hre.ethers.getSigners();
  console.log('Using owner address:', owner.address);

  // Load deployed addresses (hardhat/local)
  const fs = require('fs');
  const path = require('path');
  const addrPath = path.join(__dirname, '..', 'abis', 'deployed-addresses-hardhat.json');
  if (!fs.existsSync(addrPath)) {
    console.error('Deployed addresses file not found:', addrPath);
    process.exit(1);
  }
  const addrs = require(addrPath);
  const govAddr = addrs.governor;
  console.log('Governor at', govAddr);

  const gov = await hre.ethers.getContractAt('VCGovernor', govAddr, owner);

  const countBn = await gov.proposalCount();
  const count = countBn.toNumber();
  console.log('Proposal count:', count);

  for (let i = 1; i <= count; i++) {
    try {
      console.log('Ending voting for proposal', i);
      const tx = await gov.endVotingNow(i);
      const receipt = await tx.wait();
      console.log('Tx ok for', i, 'status', receipt.status);
    } catch (e) {
      console.error('Failed to end voting for', i, e && e.message ? e.message : e);
    }
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
