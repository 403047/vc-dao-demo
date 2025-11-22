import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';

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
        console.error('Token balance error:', e);
        setTokenBalance('0');
      }
      if (treasuryContract) {
        try {
          const treasuryBal = await treasuryContract.getBalance();
          setTreasuryBalance(ethers.utils.formatEther(treasuryBal));
        } catch (e) {
          console.error('Treasury balance error:', e);
          setTreasuryBalance('0');
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
