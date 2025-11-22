const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);



  // Deploy Treasury với name và token address = address(0)
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy("VC DAO Treasury", ethers.constants.AddressZero);
  await treasury.deployed();
  console.log("Treasury deployed to:", treasury.address);

  // Deploy Governance Token, truyền địa chỉ treasury vào constructor
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const token = await GovernanceToken.deploy(treasury.address);
  await token.deployed();
  console.log("GovernanceToken deployed to:", token.address);

  // Set lại token address cho Treasury
  await treasury.setToken(token.address);

  // Deploy Governor
  const VCGovernor = await ethers.getContractFactory("VCGovernor");
  const governor = await VCGovernor.deploy(token.address, treasury.address);
  await governor.deployed();
  console.log("VCGovernor deployed to:", governor.address);

  // Chuyển quyền sở hữu Treasury cho Governor
  await treasury.transferOwnership(governor.address);
  console.log("Treasury ownership transferred to Governor");

  // Lưu addresses để sử dụng trong frontend
  // Ghi network và chainId động dựa trên Hardhat runtime
  const networkName = hre.network ? hre.network.name : process.env.HARDHAT_NETWORK || "unknown";
  let chainId = (hre.network && hre.network.config && hre.network.config.chainId) || null;
  if (!chainId) {
    const net = await hre.ethers.provider.getNetwork();
    chainId = net.chainId;
  }

  const addresses = {
    token: token.address,
    treasury: treasury.address,
    governor: governor.address,
    network: networkName,
    chainId: chainId
  };

  console.log("Deployed addresses:", JSON.stringify(addresses, null, 2));

  // Ghi ra file abis/deployed-addresses-coston.json để frontend tự động lấy địa chỉ mới
  const fs = require('fs');
  const abisDir = __dirname.replace('scripts', 'abis');
  // đặt tên file theo network để dễ nhận diện
  const abisPath = abisDir + `/deployed-addresses-${networkName}.json`;
  fs.writeFileSync(abisPath, JSON.stringify(addresses, null, 2));
  console.log('Đã ghi địa chỉ mới vào', abisPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });