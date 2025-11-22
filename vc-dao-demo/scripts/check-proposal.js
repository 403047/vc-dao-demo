const { ethers } = require("hardhat");
const fs = require('fs');

async function checkProposalDetails() {
    console.log('🔍 Checking proposal details on old contract...');
    
    const oldAddresses = {
        governor: "0xa55CF99bB905eBa0aa2F834d12932f4058F717a4",
        treasury: "0xBE76eC912B2d2c9b301Ec56c09e1fcba0A484297", 
        token: "0x4Dfa504761912588B2835Cf2A202C9a8c12ECB57"
    };
    
    const provider = new ethers.providers.JsonRpcProvider('https://coston-api.flare.network/ext/bc/C/rpc');
    const privateKey = process.env.PRIVATE_KEY || "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const governorABI = JSON.parse(fs.readFileSync('./abis/VCGovernor.json', 'utf8')).abi;
    const oldGovernorContract = new ethers.Contract(oldAddresses.governor, governorABI, wallet);
    
    try {
        const proposalCount = await oldGovernorContract.proposalCount();
        console.log(`📊 Total proposals: ${proposalCount.toString()}`);
        
        // Check proposal với title "4123"
        for (let i = 0; i < proposalCount.toNumber(); i++) {
            const proposal = await oldGovernorContract.getProposal(i);
            const [id, proposer, title, description, recipient, amount, voteStart, voteEnd, yesVotes, noVotes, executed] = proposal;
            
            if (title === "4123") {
                console.log(`\n📋 Found Proposal "${title}":`);
                console.log(`  Index: ${i}`);
                console.log(`  ID: ${id.toString()}`);
                console.log(`  Proposer: ${proposer}`);
                console.log(`  Recipient: ${recipient}`);
                console.log(`  Amount: ${ethers.utils.formatEther(amount)} CFLR`);
                console.log(`  Vote Start: ${new Date(voteStart.toNumber() * 1000)}`);
                console.log(`  Vote End: ${new Date(voteEnd.toNumber() * 1000)}`);
                console.log(`  Yes Votes: ${ethers.utils.formatEther(yesVotes)} tokens`);
                console.log(`  No Votes: ${ethers.utils.formatEther(noVotes)} tokens`);
                console.log(`  Executed: ${executed}`);
                
                const now = Math.floor(Date.now() / 1000);
                console.log(`  Current time: ${new Date()}`);
                console.log(`  Voting ended: ${now > voteEnd.toNumber()}`);
                console.log(`  Proposal won: ${parseFloat(ethers.utils.formatEther(yesVotes)) > parseFloat(ethers.utils.formatEther(noVotes))}`);
                
                // Try to get proposal state
                try {
                    const state = await oldGovernorContract.getProposalState(id);
                    console.log(`  State: ${state}`);
                } catch (stateError) {
                    console.log(`  State: Unable to get state`);
                }
                
                // Check treasury balance
                const treasuryBalance = await provider.getBalance(oldAddresses.treasury);
                console.log(`  Treasury Balance: ${ethers.utils.formatEther(treasuryBalance)} CFLR`);
                
                return { proposalIndex: i, proposal };
            }
        }
        
    } catch (error) {
        console.error('💥 Error:', error.message);
    }
}

checkProposalDetails().catch(console.error);