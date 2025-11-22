const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("🔧 Updating voting settings to remove delay...");
    
    // Load deployed addresses
    const addressesPath = path.join(__dirname, "..", "abis", "deployed-addresses-coston.json");
    if (!fs.existsSync(addressesPath)) {
      throw new Error("Deployed addresses not found. Please deploy contracts first.");
    }
    
    const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
    console.log("Governor address:", addresses.governor);
    
    // Connect to governor contract
    const VCGovernor = await ethers.getContractFactory("VCGovernor");
    const governor = VCGovernor.attach(addresses.governor);
    
    const deployer = (await ethers.getSigners())[0];
    console.log("Updating as:", deployer.address);
    
    // Check current settings
    const currentDelay = await governor.votingDelay();
    const currentPeriod = await governor.votingPeriod();
    const currentQuorum = await governor.quorumPercentage();
    
    console.log("Current settings:");
    console.log("- Voting delay:", currentDelay.toString(), "seconds");
    console.log("- Voting period:", currentPeriod.toString(), "seconds");
    console.log("- Quorum:", currentQuorum.toString(), "%");
    
    // Update settings: 0 delay, 7 days period, 10% quorum
    const newDelay = 0;
    const newPeriod = 7 * 24 * 60 * 60; // 7 days in seconds
    const newQuorum = 10;
    
    console.log("\nUpdating to:");
    console.log("- Voting delay:", newDelay, "seconds (no delay)");
    console.log("- Voting period:", newPeriod, "seconds (7 days)");
    console.log("- Quorum:", newQuorum, "%");
    
    const fixedGasPrice = ethers.utils.parseUnits("30", "gwei");
    
    const tx = await governor.updateVotingSettings(
      newDelay,
      newPeriod, 
      newQuorum,
      {
        gasPrice: fixedGasPrice,
        gasLimit: 200000
      }
    );
    
    console.log("Transaction hash:", tx.hash);
    await tx.wait();
    
    console.log("✅ Voting settings updated successfully!");
    console.log("🎉 Proposals can now be voted immediately after creation!");
    
  } catch (error) {
    console.error("❌ Update failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });