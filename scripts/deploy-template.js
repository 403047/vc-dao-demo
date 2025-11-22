// Template hardhat deploy script. Adjust contract names and constructor args before running.
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", (await deployer.getBalance()).toString());

  // Replace the factory names below with the actual contract names in your repo
  // and add constructor parameters if required.
  // Example: const Token = await hre.ethers.getContractFactory("VCDAOToken");
  const Token = await hre.ethers.getContractFactory("VCDAOToken"); // <-- adjust
  const token = await Token.deploy(/* constructor args if any */);
  await token.deployed();
  console.log("Token deployed to:", token.address);

  const Treasury = await hre.ethers.getContractFactory("Treasury"); // <-- adjust
  const treasury = await Treasury.deploy(/* constructor args if any */);
  await treasury.deployed();
  console.log("Treasury deployed to:", treasury.address);

  const Governor = await hre.ethers.getContractFactory("Governor"); // <-- adjust
  const governor = await Governor.deploy(/* constructor args if any, e.g. token.address */);
  await governor.deployed();
  console.log("Governor deployed to:", governor.address);

  console.log("\nDeployment complete. Run the update script to write addresses to frontend config:");
  console.log(`node ./scripts/update-addresses.js ${hre.network.name} ${token.address} ${treasury.address} ${governor.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
