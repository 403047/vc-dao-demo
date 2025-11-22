const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("🚀 Deploying to Songbird Coston with fixed high gas price...");
    
    const provider = ethers.provider;
    const network = await provider.getNetwork();
    console.log("Network chainId:", network.chainId);
    
    const accounts = await ethers.getSigners();
    if (accounts.length === 0) {
      throw new Error("No accounts found. Please check your PRIVATE_KEY in .env file.");
    }
    const deployer = accounts[0];
    console.log("Deployer:", deployer.address);
    
    const balance = await deployer.getBalance();
    console.log("Balance:", ethers.utils.formatEther(balance), "CFLR");
    
    if (balance.eq(0)) {
      console.log("⚠️  Warning: Deployer balance is 0. Get testnet CFLR from https://faucet.flare.network/");
    }
    
    // Sử dụng gas price cao cố định: 30 Gwei
    const fixedGasPrice = ethers.utils.parseUnits("30", "gwei");
    console.log("Using fixed gas price:", ethers.utils.formatUnits(fixedGasPrice, 'gwei'), "Gwei");

    console.log("\n1. Deploying Treasury (placeholder for token)...");
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy("VC DAO Treasury", ethers.constants.AddressZero, {
      gasPrice: fixedGasPrice,
      gasLimit: 3000000
    });
    await treasury.deployed();
    console.log("✅ Treasury:", treasury.address);

    console.log("\n2. Deploying GovernanceToken with Treasury address...");
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    const token = await GovernanceToken.deploy(treasury.address, {
      gasPrice: fixedGasPrice,
      gasLimit: 3000000
    });
    await token.deployed();
    console.log("✅ GovernanceToken:", token.address);

    console.log("\n3. Setting token address in Treasury...");
    // Treasury cần biết token address để burn khi refund
    const setTokenTx = await treasury.setToken(token.address, {
      gasPrice: fixedGasPrice,
      gasLimit: 200000
    });
    await setTokenTx.wait();
    console.log("✅ Treasury token set");

    console.log("\n4. Deploying VCGovernor...");
    const VCGovernor = await ethers.getContractFactory("VCGovernor");
    const governor = await VCGovernor.deploy(
      token.address, 
      treasury.address,
      {
        gasPrice: fixedGasPrice,
        gasLimit: 4000000
      }
    );
    await governor.deployed();
    console.log("✅ VCGovernor:", governor.address);

    console.log("\n5. Transferring Treasury ownership...");
    const transferTx = await treasury.transferOwnership(governor.address, {
      gasPrice: fixedGasPrice,
      gasLimit: 200000
    });
    await transferTx.wait();
    console.log("✅ Ownership transferred");

    // Save addresses
    const addresses = {
      token: token.address,
      treasury: treasury.address,
      governor: governor.address,
      network: "coston",
      chainId: 16
    };

    const abisDir = path.join(__dirname, "..", "abis");
    if (!fs.existsSync(abisDir)) {
      fs.mkdirSync(abisDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(abisDir, "deployed-addresses-coston.json"),
      JSON.stringify(addresses, null, 2)
    );

    console.log("\n🎉 Deployment successful!");
    console.log("📋 Addresses saved to abis/deployed-addresses-coston.json");

    return addresses;
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    
    if (error.message.includes("underpriced")) {
      console.log("💡 Try increasing gas price even more (40-50 Gwei)");
    }
    
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });