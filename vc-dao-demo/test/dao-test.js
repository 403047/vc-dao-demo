const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VC DAO", function () {
  let governanceToken, treasury, governor;
  let owner, investor1, investor2, startup;

  beforeEach(async function () {
    [owner, investor1, investor2, startup] = await ethers.getSigners();

    // Deploy Governance Token
    const GovernanceToken = await ethers.getContractFactory("GovernanceToken");
    governanceToken = await GovernanceToken.deploy();
    await governanceToken.deployed();

    // Deploy Treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    treasury = await Treasury.deploy("VC DAO Test Treasury");
    await treasury.deployed();

    // Deploy Governor
    const VCGovernor = await ethers.getContractFactory("VCGovernor");
    governor = await VCGovernor.deploy(governanceToken.address, treasury.address);
    await governor.deployed();

    // Transfer Treasury ownership to Governor
    await treasury.transferOwnership(governor.address);

    // Transfer some tokens to investors
    await governanceToken.transfer(investor1.address, ethers.utils.parseEther("1000"));
    await governanceToken.transfer(investor2.address, ethers.utils.parseEther("1000"));
  });

  describe("Token Purchase", function () {
    it("Should allow buying tokens with ETH", async function () {
      const initialBalance = await governanceToken.balanceOf(investor1.address);
      
      await governanceToken.connect(investor1).buyTokens({
        value: ethers.utils.parseEther("0.1")
      });

      const finalBalance = await governanceToken.balanceOf(investor1.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });

  describe("Proposal Creation", function () {
    it("Should allow token holders to create proposals", async function () {
      await expect(
        governor.connect(investor1).createProposal(
          "Invest in Startup XYZ",
          "This is a great investment opportunity",
          startup.address,
          ethers.utils.parseEther("5")
        )
      ).to.emit(governor, "ProposalCreated");
    });
  });

  describe("Voting", function () {
    it("Should allow token holders to vote", async function () {
      // Create proposal
      await governor.connect(investor1).createProposal(
        "Test Proposal",
        "Test Description",
        startup.address,
        ethers.utils.parseEther("1")
      );

      // Wait for voting to start
      await ethers.provider.send("evm_increaseTime", [60]); // 1 minute
      await ethers.provider.send("evm_mine");

      // Vote
      await expect(
        governor.connect(investor1).castVote(1, true)
      ).to.emit(governor, "VoteCast");
    });
  });
});