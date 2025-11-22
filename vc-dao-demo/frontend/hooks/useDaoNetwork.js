import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { NETWORK_CONFIG, CONTRACT_ADDRESSES, GOVERNANCE_TOKEN_ABI, TREASURY_ABI, GOVERNOR_ABI } from '../src/config/daoContracts';

export function useDaoNetwork(setStatus) {
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [cfrlBalance, setCfrlBalance] = useState('0');
  const [contracts, setContracts] = useState({});

  const addCostonNetwork = useCallback(async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [NETWORK_CONFIG],
      });
      setStatus && setStatus('Đã thêm mạng Songbird Coston thành công!');
    } catch (error) {
      console.error('Error adding network:', error);
      setStatus && setStatus('Lỗi khi thêm mạng: ' + error.message);
    }
  }, [setStatus]);

  const switchToCostonNetwork = useCallback(async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: NETWORK_CONFIG.chainId }],
      });
      setStatus && setStatus('Đã chuyển sang mạng Songbird Coston!');
    } catch (error) {
      if (error.code === 4902) {
        await addCostonNetwork();
      } else {
        setStatus && setStatus('Lỗi khi chuyển mạng: ' + error.message);
      }
    }
  }, [addCostonNetwork, setStatus]);

  const refreshCflrBalance = useCallback(async (targetAccount) => {
    try {
      if (!window.ethereum) return;
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const addr = targetAccount || account;
      if (!addr) return;
      const balance = await provider.getBalance(addr);
      setCfrlBalance(ethers.utils.formatEther(balance));
    } catch (e) {
      console.error('Error loading CFLR balance:', e);
    }
  }, [account]);

  const initContracts = useCallback((signer) => {
    const token = new ethers.Contract(CONTRACT_ADDRESSES.token, GOVERNANCE_TOKEN_ABI, signer);
    const treasury = new ethers.Contract(CONTRACT_ADDRESSES.treasury, TREASURY_ABI, signer);
    const governor = new ethers.Contract(CONTRACT_ADDRESSES.governor, GOVERNOR_ABI, signer);
    const c = { token, treasury, governor };
    setContracts(c);
    return c;
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) {
        setStatus && setStatus('Chưa cài đặt MetaMask!');
        return null;
      }

      await switchToCostonNetwork();

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        setStatus && setStatus('Không tìm thấy tài khoản trong MetaMask!');
        return null;
      }

      const currentAccount = accounts[0];
      setAccount(currentAccount);
      setIsConnected(true);
      setStatus && setStatus(`Kết nối thành công với ${currentAccount.slice(0,6)}...${currentAccount.slice(-4)} trên Songbird Coston!`);

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const c = initContracts(signer);
      await refreshCflrBalance(currentAccount);

      return { provider, signer, account: currentAccount, contracts: c };
    } catch (error) {
      console.error('Connection error:', error);
      setStatus && setStatus('Lỗi: ' + (error.message || 'Không thể kết nối ví'));
      return null;
    }
  }, [initContracts, refreshCflrBalance, setStatus, switchToCostonNetwork]);

  // Auto-connect on mount if already authorized and on correct network
  useEffect(() => {
    const checkConnection = async () => {
      if (!window.ethereum) return;
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== NETWORK_CONFIG.chainId) return;
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const currentAccount = accounts[0];
          setAccount(currentAccount);
          setIsConnected(true);
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          initContracts(signer);
          await refreshCflrBalance(currentAccount);
        }
      } catch (e) {
        console.error('Auto-connect error:', e);
      }
    };
    checkConnection();
  }, [initContracts, refreshCflrBalance]);

  // Listeners
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        refreshCflrBalance(accounts[0]);
      } else {
        setIsConnected(false);
        setAccount('');
      }
    };

    const handleChainChanged = (chainId) => {
      if (chainId === NETWORK_CONFIG.chainId) {
        window.location.reload();
      } else {
        setStatus && setStatus('Please switch to Songbird Coston network');
        setIsConnected(false);
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [refreshCflrBalance, setStatus]);

  return {
    account,
    isConnected,
    cfrlBalance,
    contracts,
    connectWallet,
    switchToCostonNetwork,
    addCostonNetwork,
    refreshCflrBalance,
  };
}
