const { ethers } = require("hardhat");

async function main() {
  console.log("💰 Funding Treasury with initial CFLR...\n");
  
  const [deployer] = await ethers.getSigners();
  console.log("Funding from:", deployer.address);
  
  // Load deployed addresses
  const fs = require('fs');
  const deployedAddresses = JSON.parse(
    fs.readFileSync('./abis/deployed-addresses-coston.json', 'utf8')
  );
  
  const treasuryAddress = deployedAddresses.treasury;
  const fundAmount = ethers.utils.parseEther("20"); // 20 CFLR
  
  console.log("Treasury address:", treasuryAddress);
  console.log("Fund amount:", ethers.utils.formatEther(fundAmount), "CFLR\n");
  
  // Kiểm tra balance trước
  const balanceBefore = await ethers.provider.getBalance(treasuryAddress);
  console.log("Treasury balance before:", ethers.utils.formatEther(balanceBefore), "CFLR");
  
  // Gửi CFLR vào Treasury
  const tx = await deployer.sendTransaction({
    to: treasuryAddress,
    value: fundAmount,
    gasLimit: 100000
  });
  
  console.log("\n⏳ Transaction sent:", tx.hash);
  await tx.wait();
  console.log("✅ Transaction confirmed!");
  
  // Kiểm tra balance sau
  const balanceAfter = await ethers.provider.getBalance(treasuryAddress);
  console.log("\nTreasury balance after:", ethers.utils.formatEther(balanceAfter), "CFLR");
  console.log("🎉 Treasury funded successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
