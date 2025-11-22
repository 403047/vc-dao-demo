const { ethers } = require("hardhat");
const fs = require('fs');

// Auto-executor service để tự động execute winning proposals
class AutoExecutor {
    constructor() {
        this.isRunning = false;
        this.contracts = {};
        this.provider = null;
        this.wallet = null;
    }

    async initialize() {
        console.log('🚀 Initializing Auto-Executor Service...');
        
        // Setup provider và wallet
        this.provider = new ethers.providers.JsonRpcProvider('https://coston-api.flare.network/ext/bc/C/rpc');
        
        // Sử dụng private key từ environment hoặc hardhat config
        const privateKey = process.env.PRIVATE_KEY || "0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d"; // Default hardhat key
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        
        console.log('💼 Auto-executor wallet:', this.wallet.address);

        // Load contract addresses
        const addressesPath = './abis/deployed-addresses-coston.json';
        if (!fs.existsSync(addressesPath)) {
            throw new Error('Contract addresses not found. Deploy contracts first.');
        }
        
        const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
        console.log('📋 Loaded contract addresses:', addresses);

        // Load ABIs và create contract instances
        const governorABI = [
            'function proposalCount() view returns (uint256)',
            'function getProposal(uint256) view returns (uint256,address,string,string,address,uint256,uint256,uint256,uint256,uint256,bool)',
            'function getVoterCounts(uint256) view returns (uint256,uint256)',
            'function executeProposal(uint256) external',
            'function owner() view returns (address)',
            'function updateEligibleHoldersCount(uint256) external'
        ];
        const treasuryABI = [
            'function getBalance() view returns (uint256)',
            'function owner() view returns (address)'
        ];
        const tokenABI = [
            'function totalSupply() view returns (uint256)'
        ];
        
        this.contracts.governor = new ethers.Contract(addresses.governor, governorABI, this.wallet);
        this.contracts.treasury = new ethers.Contract(addresses.treasury, treasuryABI, this.wallet);
        this.contracts.token = new ethers.Contract(addresses.token, tokenABI, this.wallet);
        
        console.log('✅ Contracts initialized successfully');
    }

    async startListening() {
        if (this.isRunning) {
            console.log('⚠️ Auto-executor is already running');
            return;
        }

        this.isRunning = true;
        console.log('👂 Event listener disabled (minimal ABI). Using periodic checks instead...');

        // Check proposals existing mỗi 60 giây để tránh spam
        setInterval(async () => {
            await this.sleep(2000); // Sleep 2s trước mỗi check
            await this.checkExistingProposals();
        }, 60000);

        // Định kỳ đồng bộ số người đủ điều kiện vote (>=1%) mỗi 5 phút
        setInterval(async () => {
            try {
                await this.syncEligibleHoldersCount();
            } catch (e) {
                console.error('syncEligibleHoldersCount error:', e.message || e);
            }
        }, 5 * 60 * 1000);

        console.log('✅ Auto-executor service is now running!');
        console.log('💡 Press Ctrl+C to stop the service');
        
        // Check existing proposals ngay khi start
        console.log('🔄 Checking existing proposals on startup...');
        await this.checkExistingProposals();

        // Đồng bộ eligible holders ngay khi start
        console.log('🔧 Syncing eligible holders count on startup...');
        try {
            await this.syncEligibleHoldersCount();
        } catch (e) {
            console.error('Initial syncEligibleHoldersCount failed:', e.message || e);
        }
    }

    async executeProposal(proposalId) {
        try {
            console.log(`\n🔄 Attempting to auto-execute proposal ${proposalId}...`);

            // Verify proposal exists first
            const proposalCount = await this.contracts.governor.proposalCount();
            const total = proposalCount.toNumber();
            
            if (proposalId >= total) {
                console.log(`⚠️ Proposal ${proposalId} does not exist (total: ${total}). Skipping...`);
                return;
            }

            // Check if proposal is already executed
            const proposal = await this.contracts.governor.getProposal(proposalId);
            
            // Verify proposal has valid data (not empty)
            if (!proposal.proposer || proposal.proposer === '0x0000000000000000000000000000000000000000') {
                console.log(`⚠️ Proposal ${proposalId} has no proposer (empty proposal). Skipping...`);
                return;
            }
            
            if (proposal.executed) {
                console.log(`⏭️ Proposal ${proposalId} already executed`);
                return;
            }

            // Execute the proposal
            console.log('⚡ Executing proposal...');
            const tx = await this.contracts.governor.executeProposal(proposalId, {
                gasLimit: 300000, // Set reasonable gas limit
                gasPrice: ethers.utils.parseUnits('30', 'gwei') // Same as deployment
            });

            console.log('📝 Transaction sent:', tx.hash);
            console.log('⏳ Waiting for confirmation...');

            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                console.log('✅ Proposal executed successfully!');
                console.log('💰 Funds transferred automatically to recipient');
                console.log('🔗 Transaction hash:', receipt.transactionHash);
                console.log('⛽ Gas used:', receipt.gasUsed.toString());
            } else {
                console.log('❌ Transaction failed');
            }

        } catch (error) {
            console.error('💥 Error executing proposal:', error.message);
            
            if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
                console.log('⚠️ Gas estimation failed - proposal may already be executed or invalid');
            } else if (error.message.includes('Voting not ended')) {
                console.log('⏰ Voting period not yet ended');
            } else if (error.message.includes('Already executed')) {
                console.log('✅ Proposal already executed');
            } else if (error.message.includes('invalid BigNumber')) {
                console.log('⚠️ Invalid proposal data - proposal may not exist');
            }
        }
    }

    async checkExistingProposals() {
        try {
            const proposalCount = await this.contracts.governor.proposalCount();
            const total = proposalCount.toNumber();
            
            console.log(`\n🔍 Checking ${total} existing proposals...`);

            for (let i = 0; i < total; i++) {
                const proposal = await this.contracts.governor.getProposal(i);
                
                if (!proposal.executed) {
                    const now = Math.floor(Date.now() / 1000);
                    const yesVotes = parseFloat(ethers.utils.formatEther(proposal.yesVotes));
                    const noVotes = parseFloat(ethers.utils.formatEther(proposal.noVotes));
                    
                    // Check winning conditions
                    const votingEnded = now > proposal.voteEnd.toNumber();
                    const proposalWon = yesVotes > noVotes;
                    const hasVotes = yesVotes > 0;
                    
                    if (hasVotes && proposalWon && (votingEnded || yesVotes > 0)) {
                        console.log(`🎯 Found winning proposal ${i} - auto-executing...`);
                        await this.executeProposal(i);
                    }
                }
            }
        } catch (error) {
            console.error('Error checking existing proposals:', error.message);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async syncEligibleHoldersCount() {
        try {
            if (!this.contracts || !this.contracts.token || !this.contracts.governor) return;

            const tokenAddr = this.contracts.token.address;
            const totalSupply = await this.contracts.token.totalSupply();
            const decimals = 18;
            const total = parseFloat(ethers.utils.formatUnits(totalSupply, decimals));
            if (total === 0) {
                console.log('⚠️ Total supply is 0; skipping eligible holders sync');
                return;
            }

            let holders = [];
            try {
                const url = `https://coston-explorer.flare.network/api/v2/tokens/${tokenAddr}/holders`;
                const res = await fetch(url);
                const data = await res.json();
                const list = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);
                holders = list.map(h => ({
                    address: h.address || h.holder || h.account || '',
                    balance: typeof h.balance === 'string' ? parseFloat(h.balance) : (h.balance || 0)
                }));
            } catch (e) {
                console.error('Explorer holders fetch failed:', e.message || e);
            }

            if (!holders.length) {
                console.log('⚠️ No holders from explorer; skipping eligible sync');
                return;
            }

            const eligibleCount = holders.filter(h => ((h.balance / total) * 100) >= 1).length;

            const currentOwner = await this.contracts.governor.owner();
            if (currentOwner.toLowerCase() !== this.wallet.address.toLowerCase()) {
                console.log('⚠️ Wallet is not governor owner; cannot update eligible holders');
                return;
            }

            const fixedGasPrice = ethers.utils.parseUnits('30', 'gwei');
            const tx = await this.contracts.governor.updateEligibleHoldersCount(eligibleCount, {
                gasPrice: fixedGasPrice,
                gasLimit: 200000
            });
            await tx.wait();
            console.log(`✅ Synced eligible holders count to ${eligibleCount}`);
        } catch (e) {
            console.error('syncEligibleHoldersCount error:', e.message || e);
        }
    }

    stop() {
        this.isRunning = false;
        console.log('🛑 Auto-executor service stopped');
        process.exit(0);
    }
}

// Main execution
async function main() {
    const autoExecutor = new AutoExecutor();
    
    try {
        await autoExecutor.initialize();
        await autoExecutor.startListening();

        // Graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n👋 Shutting down Auto-Executor Service...');
            autoExecutor.stop();
        });

        process.on('SIGTERM', () => {
            console.log('\n👋 Shutting down Auto-Executor Service...');
            autoExecutor.stop();
        });

        // Keep the process running
        while (autoExecutor.isRunning) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
    } catch (error) {
        console.error('💥 Failed to start auto-executor:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = { AutoExecutor };