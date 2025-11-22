const { ethers } = require("hardhat");
const fs = require('fs');

async function executeOldProposal() {
    console.log('🔧 Executing proposal on old contract...');
    
    // Contract addresses cũ từ UI
    const oldAddresses = {
        governor: "0xa55CF99bB905eBa0aa2F834d12932f4058F717a4", // From old UI
        treasury: "0xBE76eC912B2d2c9b301Ec56c09e1fcba0A484297", // From old UI  
        token: "0x4Dfa504761912588B2835Cf2A202C9a8c12ECB57" // From old UI
    };
    
    console.log('📋 Old contract addresses:', oldAddresses);
    
    // Setup provider và wallet
    const provider = new ethers.providers.JsonRpcProvider('https://coston-api.flare.network/ext/bc/C/rpc');
    const privateKey = process.env.PRIVATE_KEY || "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d";
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('💼 Executor wallet:', wallet.address);
    
    // Load ABIs
    const governorABI = JSON.parse(fs.readFileSync('./abis/VCGovernor.json', 'utf8')).abi;
    const treasuryABI = JSON.parse(fs.readFileSync('./abis/Treasury.json', 'utf8')).abi;
    
    const oldGovernorContract = new ethers.Contract(oldAddresses.governor, governorABI, wallet);
    const oldTreasuryContract = new ethers.Contract(oldAddresses.treasury, treasuryABI, wallet);
    
    try {
        // Fund old treasury first
        console.log('\n💰 Funding old treasury...');
        const fundTx = await wallet.sendTransaction({
            to: oldAddresses.treasury,
            value: ethers.utils.parseEther("0.2"), // 0.2 CFLR
            gasLimit: 100000,
            gasPrice: ethers.utils.parseUnits('50', 'gwei')
        });
        await fundTx.wait();
        console.log('✅ Old treasury funded!');
        
        // Get proposal count
        const proposalCount = await oldGovernorContract.proposalCount();
        console.log(`📊 Total proposals on old contract: ${proposalCount.toString()}`);
        
        // Find proposal #4123 (should be the last one)
        for (let i = 0; i < proposalCount.toNumber(); i++) {
            const proposal = await oldGovernorContract.getProposal(i);
            const [id, proposer, title, description, recipient, amount, voteStart, voteEnd, yesVotes, noVotes, executed] = proposal;
            
            console.log(`\n📋 Proposal ${i}:`);
            console.log(`  ID: ${id.toString()}`);
            console.log(`  Title: ${title}`);
            console.log(`  Executed: ${executed}`);
            
            // Check if this is proposal with title "4123" and not executed
            if (title === "4123" && !executed) {
                console.log(`🎯 Found proposal with title "4123"! Executing...`);
                
                try {
                    const execTx = await oldGovernorContract.executeProposal(i, {
                        gasLimit: 500000,
                        gasPrice: ethers.utils.parseUnits('50', 'gwei')
                    });
                    
                    console.log('📝 Transaction sent:', execTx.hash);
                    const receipt = await execTx.wait();
                    
                    if (receipt.status === 1) {
                        console.log('✅ Proposal #4123 executed successfully!');
                        console.log('💰 Funds transferred to recipient!');
                        console.log('🔗 Transaction hash:', receipt.transactionHash);
                        return true;
                    } else {
                        console.log('❌ Transaction failed');
                        return false;
                    }
                    
                } catch (execError) {
                    console.error('💥 Execution error:', execError.message);
                    return false;
                }
            }
        }
        
        console.log('❌ Proposal #4123 not found or already executed');
        return false;
        
    } catch (error) {
        console.error('💥 Error:', error.message);
        return false;
    }
}

executeOldProposal().catch(console.error);