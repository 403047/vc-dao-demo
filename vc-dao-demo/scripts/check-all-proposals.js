const { ethers } = require("hardhat");
const fs = require('fs');

async function checkAllProposalStatus() {
    console.log('🔍 Checking all proposal status...');
    
    // Check both old and new contracts
    const contracts = {
        old: {
            governor: "0xa55CF99bB905eBa0aa2F834d12932f4058F717a4",
            treasury: "0xBE76eC912B2d2c9b301Ec56c09e1fcba0A484297", 
            token: "0x4Dfa504761912588B2835Cf2A202C9a8c12ECB57"
        },
        new: {
            governor: "0xadFf6daF03cF22DA7888E826cAfDf19FFB4D1381",
            treasury: "0xB536C60466A66FEb4F08B0992ACB8D4A5C001C16",
            token: "0xd4F8BBc1Ac8dcd2d3893efdcc72a1c47F6B1D93D"
        }
    };
    
    const provider = new ethers.providers.JsonRpcProvider('https://coston-api.flare.network/ext/bc/C/rpc');
    const privateKey = process.env.PRIVATE_KEY || "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const governorABI = JSON.parse(fs.readFileSync('./abis/VCGovernor.json', 'utf8')).abi;
    
    for (const [contractType, addresses] of Object.entries(contracts)) {
        console.log(`\n📋 Checking ${contractType} contract: ${addresses.governor}`);
        
        const governorContract = new ethers.Contract(addresses.governor, governorABI, wallet);
        
        try {
            const proposalCount = await governorContract.proposalCount();
            console.log(`📊 Total proposals: ${proposalCount.toString()}`);
            
            for (let i = 0; i < proposalCount.toNumber(); i++) {
                const proposal = await governorContract.getProposal(i);
                const [id, proposer, title, description, recipient, amount, voteStart, voteEnd, yesVotes, noVotes, executed] = proposal;
                
                console.log(`\n🔸 Proposal ${i}:`);
                console.log(`  ID: ${id.toString()}`);
                console.log(`  Title: "${title}"`);
                console.log(`  Executed: ${executed}`);
                console.log(`  Vote Start: ${new Date(voteStart.toNumber() * 1000).toLocaleString()}`);
                console.log(`  Vote End: ${new Date(voteEnd.toNumber() * 1000).toLocaleString()}`);
                console.log(`  Yes Votes: ${ethers.utils.formatEther(yesVotes)}`);
                console.log(`  No Votes: ${ethers.utils.formatEther(noVotes)}`);
                console.log(`  Amount: ${ethers.utils.formatEther(amount)} CFLR`);
                console.log(`  Recipient: ${recipient}`);
                
                // Check if voting period ended
                const now = Math.floor(Date.now() / 1000);
                const votingEnded = now > voteEnd.toNumber();
                const proposalWon = parseFloat(ethers.utils.formatEther(yesVotes)) > parseFloat(ethers.utils.formatEther(noVotes));
                
                console.log(`  Voting Ended: ${votingEnded}`);
                console.log(`  Proposal Won: ${proposalWon}`);
                
                // Highlight proposal 4123
                if (title === "4123") {
                    console.log(`\n🎯 FOUND PROPOSAL #4123:`);
                    console.log(`  Contract: ${contractType}`);
                    console.log(`  Index: ${i}`);
                    console.log(`  Executed Status: ${executed}`);
                    console.log(`  Should be hidden from UI: ${executed}`);
                }
            }
            
        } catch (error) {
            console.error(`💥 Error checking ${contractType} contract:`, error.message);
        }
    }
}

checkAllProposalStatus().catch(console.error);