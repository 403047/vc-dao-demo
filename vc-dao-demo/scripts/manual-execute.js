const { ethers } = require("hardhat");
const fs = require('fs');

async function manualExecute() {
    console.log('🔧 Manual Proposal Executor');
    
    // Load contract addresses
    const addresses = JSON.parse(fs.readFileSync('./abis/deployed-addresses-coston.json', 'utf8'));
    console.log('📋 Contract addresses:', addresses);
    
    // Setup provider và wallet
    const provider = new ethers.providers.JsonRpcProvider('https://coston-api.flare.network/ext/bc/C/rpc');
    const privateKey = process.env.PRIVATE_KEY || "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('💼 Executor wallet:', wallet.address);
    
    // Load ABIs
    const governorABI = JSON.parse(fs.readFileSync('./abis/VCGovernor.json', 'utf8')).abi;
    const governorContract = new ethers.Contract(addresses.governor, governorABI, wallet);
    
    try {
        // Get proposal count
        const proposalCount = await governorContract.proposalCount();
        console.log(`📊 Total proposals: ${proposalCount.toString()}`);
        
        // Check all proposals
        for (let i = 0; i < proposalCount.toNumber(); i++) {
            const proposal = await governorContract.getProposal(i);
            const [id, proposer, title, description, recipient, amount, voteStart, voteEnd, yesVotes, noVotes, executed] = proposal;
            
            console.log(`\n📋 Proposal ${i}:`);
            console.log(`  ID: ${id.toString()}`);
            console.log(`  Title: ${title}`);
            console.log(`  Recipient: ${recipient}`);
            console.log(`  Amount: ${ethers.utils.formatEther(amount)} CFLR`);
            console.log(`  Yes Votes: ${ethers.utils.formatEther(yesVotes)}`);
            console.log(`  No Votes: ${ethers.utils.formatEther(noVotes)}`);
            console.log(`  Executed: ${executed}`);
            
            // Check if this proposal can be executed
            if (!executed) {
                const now = Math.floor(Date.now() / 1000);
                const yesVotesNum = parseFloat(ethers.utils.formatEther(yesVotes));
                const noVotesNum = parseFloat(ethers.utils.formatEther(noVotes));
                
                const votingEnded = now > voteEnd.toNumber();
                const proposalWon = yesVotesNum > noVotesNum;
                const hasVotes = yesVotesNum > 0;
                
                console.log(`  Voting ended: ${votingEnded}`);
                console.log(`  Proposal won: ${proposalWon}`);
                console.log(`  Has votes: ${hasVotes}`);
                
                if (hasVotes && proposalWon) {
                    console.log(`🎯 Executing proposal ${i}...`);
                    
                    try {
                        const tx = await governorContract.executeProposal(i, {
                            gasLimit: 300000,
                            gasPrice: ethers.utils.parseUnits('30', 'gwei')
                        });
                        
                        console.log('📝 Transaction sent:', tx.hash);
                        const receipt = await tx.wait();
                        
                        if (receipt.status === 1) {
                            console.log('✅ Proposal executed successfully!');
                            console.log('💰 Funds transferred to recipient');
                        } else {
                            console.log('❌ Transaction failed');
                        }
                        
                    } catch (execError) {
                        console.error('💥 Execution error:', execError.message);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('💥 Error:', error);
    }
}

manualExecute().catch(console.error);