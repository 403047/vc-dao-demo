import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { READONLY_PROVIDER_URL } from '../src/config/daoContracts';

export function useDaoBalances(setStatus) {
  const [tokenBalance, setTokenBalance] = useState('0');
  const [treasuryBalance, setTreasuryBalance] = useState('0');
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  const loadBalances = useCallback(async (tokenContract, treasuryContract, account) => {
    if (!tokenContract || !account) return;
    setIsLoadingBalances(true);
    try {
      try {
        const tokenBal = await tokenContract.balanceOf(account);
        setTokenBalance(ethers.utils.formatUnits(tokenBal, 18));
      } catch (e) {
        try {
          const ro = new ethers.providers.JsonRpcProvider(READONLY_PROVIDER_URL);
          const roToken = new ethers.Contract(tokenContract.address, ['function balanceOf(address) view returns (uint256)'], ro);
          const tokenBal = await roToken.balanceOf(account);
          setTokenBalance(ethers.utils.formatUnits(tokenBal, 18));
        } catch (e2) {
          console.error('Token balance error:', e2);
          setTokenBalance('0');
        }
      }
      if (treasuryContract) {
        try {
          const treasuryBal = await treasuryContract.getBalance();
          setTreasuryBalance(ethers.utils.formatEther(treasuryBal));
        } catch (e) {
          try {
            const ro = new ethers.providers.JsonRpcProvider(READONLY_PROVIDER_URL);
            const bal = await ro.getBalance(treasuryContract.address);
            setTreasuryBalance(ethers.utils.formatEther(bal));
          } catch (e2) {
            console.error('Treasury balance error:', e2);
            setTreasuryBalance('0');
          }
        }
      }
    } catch (error) {
      console.error('Load balances fatal:', error);
      setStatus && setStatus('Lỗi tải số dư: ' + error.message);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [setStatus]);

  return { tokenBalance, treasuryBalance, isLoadingBalances, loadBalances, setTokenBalance };
}

// Auto-reload helper: call `loadBalances` when token/treasury contract or account changes
export function useAutoReloadBalances(tokenContract, treasuryContract, account, loadBalances) {
  const tokenAddr = tokenContract && tokenContract.address ? tokenContract.address : null;
  const treasuryAddr = treasuryContract && treasuryContract.address ? treasuryContract.address : null;
  useEffect(() => {
    if (!loadBalances) return;
    if (tokenContract && account) {
      loadBalances(tokenContract, treasuryContract, account);
    }
  }, [tokenAddr, treasuryAddr, account]);

  return null;
}
