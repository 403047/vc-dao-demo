import { useCallback } from 'react';
import { ethers } from 'ethers';
import { GOVERNANCE_TOKEN_ABI, CONTRACT_ADDRESSES } from '../src/config/daoContracts';

export function useTokenPurchase(contracts, account, setStatus, setIsLoading, refreshBalances) {
  // Primary buy function
  const buyTokens = useCallback(async (amount = 0.01) => {
    if (!window.ethereum) {
      setStatus && setStatus('Chưa cài đặt MetaMask!');
      return;
    }
    setIsLoading && setIsLoading(true);
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const currentAccount = accounts[0];
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      const balance = await provider.getBalance(currentAccount);
      const amountInWei = ethers.utils.parseEther(amount.toString());
      if (balance.lt(amountInWei)) {
        throw new Error(`Không đủ CFLR. Cần ${amount} CFLR`);
      }

      const tokenContract = contracts?.token || new ethers.Contract(CONTRACT_ADDRESSES.token, GOVERNANCE_TOKEN_ABI, signer);
      const tx = await tokenContract.buyTokens({ value: amountInWei, gasLimit: 300000 });
      setStatus && setStatus(`Giao dịch đã gửi: ${tx.hash}`);
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        const tokenAmount = (amount * 1000).toFixed(0);
        setStatus && setStatus(`Đã mua thành công ${tokenAmount} token VCDAO!`);
        refreshBalances && refreshBalances(currentAccount);
      } else {
        throw new Error('Giao dịch thất bại');
      }
      return receipt;
    } catch (error) {
      console.error('Buy tokens error:', error);
      if (error.code === 4001) {
        setStatus && setStatus('Giao dịch bị hủy bởi người dùng');
      } else {
        setStatus && setStatus(`Lỗi: ${error.message}`);
      }
      return null;
    } finally {
      setIsLoading && setIsLoading(false);
    }
  }, [contracts, setStatus, setIsLoading, refreshBalances]);

  return { buyTokens };
}
