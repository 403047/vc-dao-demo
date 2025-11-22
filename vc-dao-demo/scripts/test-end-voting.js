const { ethers } = require("hardhat");

async function main() {
  const [deployer, alice, bob] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("Alice:", alice.address);
  console.log("Bob:", bob.address);

  // Deploy Treasury (name, token=address(0))
  const Treasury = await ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy("VC DAO Treasury Test", ethers.constants.AddressZero);
  await treasury.deployed();
  console.log("Treasury:", treasury.address);

  // Deploy GovernanceToken with treasury address
  const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
  const token = await GovernanceToken.deploy(treasury.address);
  await token.deployed();
  console.log("Token:", token.address);

  // set token on treasury
  await treasury.setToken(token.address);
  console.log("Treasury token set");

  // Deploy Governor
  const VCGovernor = await ethers.getContractFactory("VCGovernor");
  const governor = await VCGovernor.deploy(token.address, treasury.address);
  await governor.deployed();
  console.log("Governor:", governor.address);

  // Transfer ownership of treasury to governor
  await treasury.transferOwnership(governor.address);
  console.log("Treasury ownership -> Governor");

  // Show initial treasury balance
  console.log("Treasury balance before sales:", (await ethers.provider.getBalance(treasury.address)).toString());

  // Alice and Bob buy tokens so they have voting power
  const buyValue = ethers.utils.parseEther("1.0"); // 1 ETH -> many tokens
  await token.connect(alice).buyTokens({ value: buyValue });
  console.log("Alice bought tokens");
  await token.connect(bob).buyTokens({ value: buyValue });
  console.log("Bob bought tokens");

  console.log("Total supply:", (await token.totalSupply()).toString());
  console.log("Alice balance:", (await token.balanceOf(alice.address)).toString());
  console.log("Bob balance:", (await token.balanceOf(bob.address)).toString());
  console.log("Treasury balance after sales:", (await ethers.provider.getBalance(treasury.address)).toString());

  // Alice creates a proposal to withdraw 0.5 ETH to Bob
  const amount = ethers.utils.parseEther("0.5");
  const txCreate = await governor.connect(alice).createProposal(
    "Test payout",
    "Payout for testing",
    bob.address,
    amount
  );
  const rc = await txCreate.wait();
  // Read ProposalCreated event to get id
  const createdEvent = rc.events.find(e => e.event === 'ProposalCreated');
  let proposalId = null;
  if (createdEvent) {
    proposalId = createdEvent.args.proposalId.toNumber();
  } else {
    // fallback: proposalCount
    proposalId = (await governor.proposalCount()).toNumber();
  }
  console.log("Proposal created id:", proposalId);

  // Both vote YES
  await governor.connect(alice).castVote(proposalId, true);
  console.log("Alice voted YES");
  await governor.connect(bob).castVote(proposalId, true);
  console.log("Bob voted YES");

  // Check votes
  const p = await governor.getProposal(proposalId);
  console.log("Proposal yesVotes:", p[8].toString(), "noVotes:", p[9].toString());

  // Now deployer (owner of governor) ends voting immediately
  console.log("Governor owner (should be deployer):", await governor.owner());
  await governor.connect(deployer).endVotingNow(proposalId);
  console.log("Called endVotingNow by owner");

  // Wait a bit then check if executed
  const p2 = await governor.getProposal(proposalId);
  console.log("After endVotingNow - executed:", p2[10]);

  // Check treasury balance to see if funds transferred
  const treasuryBal = await ethers.provider.getBalance(treasury.address);
  console.log("Treasury balance after execution attempt:", treasuryBal.toString());

  // If not executed automatically, attempt explicit execute by anyone with signer (owner or anyone)
  if (!p2[10]) {
    try {
      await governor.connect(deployer).executeProposal(proposalId);
      console.log("Explicit executeProposal called by deployer");
    } catch (e) {
      console.log("Explicit execute failed:", e.message);
    }
  }

  const p3 = await governor.getProposal(proposalId);
  console.log("Final executed state:", p3[10]);
  console.log("Final treasury balance:", (await ethers.provider.getBalance(treasury.address)).toString());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
