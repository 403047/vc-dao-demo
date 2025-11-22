import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Web3Modal from 'web3modal';

// Create a single Web3Modal instance (only in browser)
const web3Modal = (typeof window !== 'undefined')
  ? new Web3Modal({ cacheProvider: true })
  : null;

export const useWeb3 = () => {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectWallet = async () => {
    try {
      if (!web3Modal) return;

      const connection = await web3Modal.connect();
      const provider = new ethers.providers.Web3Provider(connection);
      const signer = provider.getSigner();
      const account = await signer.getAddress();
      const network = await provider.getNetwork();

      setProvider(provider);
      setSigner(signer);
      setAccount(account);
      setChainId(network.chainId);
      setIsConnected(true);

      // Listen for account changes
      connection.on('accountsChanged', (accounts) => {
        setAccount(accounts[0]);
      });

      // Listen for chain changes
      connection.on('chainChanged', (chainId) => {
        setChainId(parseInt(chainId, 16));
        window.location.reload();
      });

    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnectWallet = async () => {
    setProvider(null);
    setSigner(null);
    setAccount('');
    setChainId(null);
    setIsConnected(false);
  };

  useEffect(() => {
    // In development, clear cached provider and DAO localStorage keys to force fresh connection
    try {
      if (process.env.NODE_ENV === 'development' && web3Modal) {
        // Clear Web3Modal cached provider so it won't auto-connect to previous wallet
        web3Modal.clearCachedProvider();
        try { localStorage.removeItem('WEB3_CONNECT_CACHED_PROVIDER'); } catch(e) {}

        // Clear DAO-related cached keys that may hold old addresses/proposals
        const daoKeys = [
          'abis_addresses', 'earlyWinProposals', 'earlyWinTimestamps', 'userRoundVotes',
          'proposalVoters', 'executedProposals', 'governor_address'
        ];
        daoKeys.forEach(k => { try { localStorage.removeItem(k); } catch(e) {} });
      }
    } catch (e) {
      console.warn('Error clearing cached provider/localStorage', e);
    }

    // Do not auto-connect; require user to click Connect to ensure they choose the desired wallet
  }, []);

  return {
    account,
    provider,
    signer,
    chainId,
    isConnected,
    connectWallet,
    disconnectWallet
  };
};