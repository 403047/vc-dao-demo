import { ethers } from 'ethers';
// Re-use centralized config to avoid drift. Also expose legacy aliases for backward compatibility.
import {
  CONTRACT_ADDRESSES as CENTRAL_ADDRESSES,
  GOVERNANCE_TOKEN_ABI,
  TREASURY_ABI,
  GOVERNOR_ABI
} from '../src/config/daoContracts';

export const CONTRACT_ABIS = {
  token: GOVERNANCE_TOKEN_ABI,
  treasury: TREASURY_ABI,
  governor: GOVERNOR_ABI
};

// Preferred export
export const CONTRACT_ADDRESSES = CENTRAL_ADDRESSES;

// Legacy aliases used by some older components
export const contractAddresses = CENTRAL_ADDRESSES;
export const abi = {
  token: GOVERNANCE_TOKEN_ABI,
  treasury: TREASURY_ABI,
  governor: GOVERNOR_ABI
};

export const getContract = (address, abi, signerOrProvider) => {
  return new ethers.Contract(address, abi, signerOrProvider);
};