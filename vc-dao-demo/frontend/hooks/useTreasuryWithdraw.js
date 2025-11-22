import { useCallback } from 'react';
import { ethers } from 'ethers';

// Hook rút tiền từ Treasury (giả sử hàm withdraw(address,uint256,string) hoặc withdrawFunds)
// Điều chỉnh tên hàm theo ABI thực tế của Treasury.sol (trong repo: withdrawFunds(address payable, uint256, string))
// Ở đây ta yêu cầu thêm mô tả ngắn để khớp với ABI deploy.
export function useTreasuryWithdraw(contracts, account, setStatus, setIsLoading) {
  const withdraw = useCallback(async ({ to, amount, description = 'Withdraw' }) => {
    if (!contracts?.treasury) {
      setStatus && setStatus('❌ Treasury contract chưa sẵn sàng');
      return;
    }
    try {
      // Chỉ owner Treasury mới được gọi withdrawFunds theo contract
      const treasuryOwner = await contracts.treasury.owner();
      if (!account || treasuryOwner?.toLowerCase() !== account.toLowerCase()) {
        setStatus && setStatus('⛔ Chỉ chủ Treasury (owner) mới có thể rút qua withdrawFunds');
        return;
      }
    } catch (e) {
      console.error('Owner check error:', e);
    }
    if (!to || !ethers.utils.isAddress(to)) {
      setStatus && setStatus('❌ Địa chỉ nhận không hợp lệ');
      return;
    }
    const amtStr = String(amount || '').trim();
    if (!amtStr || isNaN(Number(amtStr)) || Number(amtStr) <= 0) {
      setStatus && setStatus('❌ Số CFLR phải > 0');
      return;
    }
    try {
      setIsLoading && setIsLoading(true);
      setStatus && setStatus('🔄 Đang gửi giao dịch rút tiền...');
      const valueWei = ethers.utils.parseEther(amtStr);
      // Kiểm tra số dư Treasury đủ chi trả
      try {
        const treBal = await contracts.treasury.getBalance();
        if (treBal.lt(valueWei)) {
          setStatus && setStatus('❌ Treasury không đủ số dư để rút');
          return null;
        }
      } catch {}
      // Hàm theo Treasury.sol trong repo: withdrawFunds(address payable,uint256,string)
      const tx = await contracts.treasury.withdrawFunds(to, valueWei, description, { gasLimit: 300000 });
      setStatus && setStatus(`⏳ TX gửi: ${tx.hash}`);
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setStatus && setStatus('✅ Rút tiền thành công');
        return receipt;
      } else {
        setStatus && setStatus('❌ Giao dịch thất bại');
        return null;
      }
    } catch (e) {
      console.error('Withdraw error:', e);
      if (e.code === 4001) {
        setStatus && setStatus('❌ Người dùng đã hủy giao dịch');
      } else {
        setStatus && setStatus(`❌ Lỗi: ${e.message || e}`);
      }
      return null;
    } finally {
      setIsLoading && setIsLoading(false);
    }
  }, [contracts, setStatus, setIsLoading]);

  return { withdraw };
}

export default useTreasuryWithdraw;