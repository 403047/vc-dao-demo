const { ethers } = require("hardhat");
const fs = require('fs');

async function voteOnOldProposal() {
    console.log('🗳️ Voting on old proposal...');
    
    const oldAddresses = {
        governor: "0xa55CF99bB905eBa0aa2F834d12932f4058F717a4",
        treasury: "0xBE76eC912B2d2c9b301Ec56c09e1fcba0A484297", 
        token: "0x4Dfa504761912588B2835Cf2A202C9a8c12ECB57"
    };
    
    const provider = new ethers.providers.JsonRpcProvider('https://coston-api.flare.network/ext/bc/C/rpc');
    const privateKey = process.env.PRIVATE_KEY || "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const governorABI = JSON.parse(fs.readFileSync('./abis/VCGovernor.json', 'utf8')).abi;
    const tokenABI = JSON.parse(fs.readFileSync('./abis/GovernanceToken.json', 'utf8')).abi;
    
    const oldGovernorContract = new ethers.Contract(oldAddresses.governor, governorABI, wallet);
    const oldTokenContract = new ethers.Contract(oldAddresses.token, tokenABI, wallet);
    
    try {
        // Check if user has tokens
        const tokenBalance = await oldTokenContract.balanceOf(wallet.address);
        console.log(`💰 Token balance: ${ethers.utils.formatEther(tokenBalance)} tokens`);
        
        if (tokenBalance.eq(0)) {
            console.log('📈 Buying tokens first...');
            
            // Buy tokens (send 0.1 CFLR to get tokens)
            const buyTx = await oldTokenContract.buyTokens({
                value: ethers.utils.parseEther("0.1"),
                gasLimit: 200000,
                gasPrice: ethers.utils.parseUnits('50', 'gwei')
            });
            await buyTx.wait();
            
            const newBalance = await oldTokenContract.balanceOf(wallet.address);
            console.log(`✅ New token balance: ${ethers.utils.formatEther(newBalance)} tokens`);
        }
        
        // Vote YES on proposal index 1 (title "4123")
        console.log('🗳️ Voting YES on proposal...');
        const voteTx = await oldGovernorContract.castVote(1, true, {
            gasLimit: 300000,
            gasPrice: ethers.utils.parseUnits('50', 'gwei')
        });
        
        console.log('📝 Vote transaction sent:', voteTx.hash);
        await voteTx.wait();
        console.log('✅ Vote confirmed!');
        
        // Check proposal status again
        const proposal = await oldGovernorContract.getProposal(1);
        const [id, proposer, title, description, recipient, amount, voteStart, voteEnd, yesVotes, noVotes, executed] = proposal;
        
        console.log('\n📊 Updated proposal status:');
        console.log(`  Yes Votes: ${ethers.utils.formatEther(yesVotes)} tokens`);
        console.log(`  No Votes: ${ethers.utils.formatEther(noVotes)} tokens`);
        console.log(`  Proposal won: ${parseFloat(ethers.utils.formatEther(yesVotes)) > parseFloat(ethers.utils.formatEther(noVotes))}`);
        
        // Try to execute immediately (early win)
        if (parseFloat(ethers.utils.formatEther(yesVotes)) > 0) {
            console.log('🎯 Attempting to execute (early win)...');
            try {
                const execTx = await oldGovernorContract.executeProposal(1, {
                    gasLimit: 500000,
                    gasPrice: ethers.utils.parseUnits('50', 'gwei')
                });
                
                console.log('📝 Execute transaction sent:', execTx.hash);
                const receipt = await execTx.wait();
                
                if (receipt.status === 1) {
                    console.log('✅ Proposal executed successfully!');
                    console.log('💰 Funds automatically transferred!');
                    return true;
                } else {
                    console.log('❌ Execute transaction failed');
                }
            } catch (execError) {
                console.error('💥 Execute error:', execError.message);
            }
        }
        
    } catch (error) {
        console.error('💥 Error:', error.message);
    }
}

voteOnOldProposal().catch(console.error);