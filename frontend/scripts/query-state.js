const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  const rpc = process.argv[2] || process.env.RPC_URL || "https://rpc.coston.org"; // thay nếu cần
  const targetAddress = process.argv[3] || "0x0000000000000000000000000000000000000000"; // địa chỉ để kiểm votes
  const cfgPath = path.join(__dirname, "..", "src", "config", "contract-addresses.json");
  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  const provider = new ethers.providers.JsonRpcProvider(rpc);

  const tokenAddress = cfg.coston.token;
  const governorAddress = cfg.coston.governor;

  // minimal ERC20 ABI fragment for totalSupply & decimals
  const erc20 = [
    "function totalSupply() view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function name() view returns (string)",
    "function symbol() view returns (string)"
  ];

  // minimal Governor ABI fragment for getVotes (OpenZeppelin-style)
  const governor = [
    "function getVotes(address) view returns (uint256)",
    "function name() view returns (string)"
  ];

  const token = new ethers.Contract(tokenAddress, erc20, provider);
  const gov = new ethers.Contract(governorAddress, governor, provider);

  try {
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      token.name().catch(() => null),
      token.symbol().catch(() => null),
      token.decimals().catch(() => 18),
      token.totalSupply()
    ]);
    const votes = await gov.getVotes(targetAddress).catch(() => null);
    const govName = await gov.name().catch(() => null);

    console.log("RPC:", rpc);
    console.log("Token:", tokenAddress, name ? `${name} (${symbol})` : "");
    console.log("Decimals:", decimals.toString());
    console.log("TotalSupply:", ethers.utils.formatUnits(totalSupply, decimals));
    console.log("Governor:", governorAddress, govName ? `${govName}` : "");
    console.log("Votes for", targetAddress, ":", votes ? ethers.utils.formatUnits(votes, decimals) : "N/A");
    console.log("\nNote: If values above are non-zero/unchanged, update must be done on-chain (redeploy or call admin functions).");
  } catch (err) {
    console.error("Error querying contracts:", err.message || err);
    process.exit(1);
  }
}

main();
