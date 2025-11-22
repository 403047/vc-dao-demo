// Central config & ABIs extracted from index.js
export const NETWORK_CONFIG = {
  chainId: '0x10', // 16 in decimal
  chainName: 'Songbird Testnet Coston',
  nativeCurrency: {
    name: 'CFLR',
    symbol: 'CFLR',
    decimals: 18
  },
  rpcUrls: ['https://coston-api.flare.network/ext/C/rpc'],
  blockExplorerUrls: ['https://coston-explorer.flare.network/']
};

// Load addresses from deployed JSON for Coston (preferred), then env, then fallback
import CONTRACTS_JSON from './contract-addresses.json';
const abisAddresses = {
  token: CONTRACTS_JSON?.coston?.token,
  treasury: CONTRACTS_JSON?.coston?.treasury,
  governor: CONTRACTS_JSON?.coston?.governor,
};

const ENV_ADDRESSES = {
  token: process.env.NEXT_PUBLIC_TOKEN_ADDRESS?.trim(),
  treasury: process.env.NEXT_PUBLIC_TREASURY_ADDRESS?.trim(),
  governor: process.env.NEXT_PUBLIC_GOVERNOR_ADDRESS?.trim()
};

const DEFAULT_ADDRESSES = {
  // Default addresses for local/hardhat testing (updated after local deploy)
  token: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  treasury: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  governor: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9'
};

export const CONTRACT_ADDRESSES = {
  token: ENV_ADDRESSES.token || abisAddresses.token || DEFAULT_ADDRESSES.token,
  treasury: ENV_ADDRESSES.treasury || abisAddresses.treasury || DEFAULT_ADDRESSES.treasury,
  governor: ENV_ADDRESSES.governor || abisAddresses.governor || DEFAULT_ADDRESSES.governor
};

if (typeof window !== 'undefined') {
  Object.entries(CONTRACT_ADDRESSES).forEach(([key, value]) => {
    if (!ENV_ADDRESSES[key] && !abisAddresses[key]) {
      console.warn(`[daoContracts] Using fallback ${key} address ${value}. Define NEXT_PUBLIC_${key.toUpperCase()}_ADDRESS in .env.local or update src/config/contract-addresses.json.`);
    }
  });
}

export const GOVERNANCE_TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function buyTokens() payable',
  'function totalSupply() view returns (uint256)',
  'function calculateTokenAmount(uint256) view returns (uint256)',
  'function getTokenPrice() view returns (uint256)',
  'function getOwnerBalance() view returns (uint256)',
  'function owner() view returns (address)',
  'function transfer(address to, uint256 value) returns (bool)',
  'function approve(address spender, uint256 value) returns (bool)',
  'function transferFrom(address from, address to, uint256 value) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount)'
];

export const TREASURY_ABI = [
  'function getBalance() view returns (uint256)',
  'function name() view returns (string)',
  'function owner() view returns (address)',
  'function token() view returns (address)',
  'function deposit(string) payable',
  'function withdrawFunds(address payable, uint256, string) external',
  'function refund(uint256) external',
  'event FundsDeposited(address indexed from, uint256 amount, string description)',
  'event FundsWithdrawn(address indexed to, uint256 amount, string description)',
  'event Refunded(address indexed user, uint256 tokenAmount, uint256 cflrReturned)'
];

export const GOVERNOR_ABI = [
  'function owner() view returns (address)',
  'function proposalCount() view returns (uint256)',
  'function createProposal(string, string, address, uint256) external returns (uint256)',
  'function endVotingNow(uint256) external',
  'function updateEligibleHoldersCount(uint256) external',
  'function eligibleHoldersCount() view returns (uint256)',
  'function castVote(uint256, bool) external',
  'function executeProposal(uint256) external',
  'function getProposal(uint256) view returns (uint256, address, string, string, address, uint256, uint256, uint256, uint256, uint256, bool)',
  'function getProposalState(uint256) view returns (uint8)',
  'function hasVoted(uint256, address) view returns (bool)',
  'function getVoterCounts(uint256) view returns (uint256, uint256)',
  'function governanceToken() view returns (address)',
  'function treasury() view returns (address)',
  'event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, uint256 amount, address recipient)',
  'event VoteCast(address indexed voter, uint256 indexed proposalId, uint8 support, uint256 weight)'
];
export const READONLY_PROVIDER_URL = NETWORK_CONFIG.rpcUrls[0];
