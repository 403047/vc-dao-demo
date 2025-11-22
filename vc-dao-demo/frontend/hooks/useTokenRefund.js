import { useCallback } from 'react';
import { ethers } from 'ethers';

// Hook cho phép user refund token VCDAO để nhận lại 90% CFLR theo tỉ lệ cố định
// Yêu cầu Treasury.sol có hàm refund(uint256 tokenAmount) và GovernanceToken có burnFrom
// CFLR luôn trả về msg.sender (không cần recipient)
export function useTokenRefund(contracts, account, setStatus, setIsLoading, proposals = [], onSuccess = null) {
  const refund = useCallback(async ({ tokenAmount }) => {
    if (!contracts?.treasury || !contracts?.token) {
      setStatus && setStatus('❌ Contracts chưa sẵn sàng');
      return null;
    }
    if (!account) {
      setStatus && setStatus('❌ Vui lòng kết nối ví');
      return null;
    }

    // Kiểm tra có proposal đang trong thời gian vote không
    // Chỉ cấm rút tiền khi có proposal ĐANG VOTE (active), không cấm khi đã thắng/thua
    const now = new Date();
    const activeProposal = proposals.find(p => {
      const isPending = now < p.voteStart;
      const isVoting = now >= p.voteStart && now <= p.voteEnd;
      return (isPending || isVoting) && !p.executed;
    });

    if (activeProposal) {
      setStatus && setStatus('❌ Không thể rút tiền khi có đề xuất đang vote');
      return null;
    }

    try {
      const amountNum = parseFloat(String(tokenAmount || '').trim());
      if (!amountNum || amountNum <= 0) {
        setStatus && setStatus('❌ Nhập số VCDAO > 0');
        return null;
      }

      // Kiểm tra user có đủ token
      const decimals = 18;
      const tokenAmountWei = ethers.utils.parseUnits(amountNum.toString(), decimals);
      const bal = await contracts.token.balanceOf(account);
      if (bal.lt(tokenAmountWei)) {
        setStatus && setStatus('❌ Vượt quá số VCDAO đang sở hữu');
        return null;
      }

      // Ước tính số CFLR nhận về chỉ để hiển thị: 1 VCDAO = 0.001 CFLR => refund 90%
      const cflr = amountNum * 0.001 * 0.9;
      setStatus && setStatus(`🔄 Đang hoàn tiền ~ ${cflr} CFLR...`);

      setIsLoading && setIsLoading(true);

      // Approve cho Treasury nếu cần
      const allowance = await contracts.token.allowance(account, contracts.treasury.address);
      if (allowance.lt(tokenAmountWei)) {
        const txApprove = await contracts.token.approve(contracts.treasury.address, tokenAmountWei);
        setStatus && setStatus(`⏳ Approve TX: ${txApprove.hash}`);
        await txApprove.wait();
      }

      // Gọi refund trên Treasury
      const tx = await contracts.treasury.refund(tokenAmountWei, { gasLimit: 300000 });
      setStatus && setStatus(`⏳ Refund TX: ${tx.hash}`);
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setStatus && setStatus('✅ Hoàn tiền thành công');
        if (onSuccess) {
          await onSuccess();
        }
        return receipt;
      } else {
        setStatus && setStatus('❌ Giao dịch thất bại');
        return null;
      }
    } catch (e) {
      console.error('Refund error:', e);
      if (e.code === 4001) {
        setStatus && setStatus('❌ Bạn đã hủy giao dịch');
      } else if (e.reason) {
        // Ethers v5 revert reason
        setStatus && setStatus(`❌ Contract revert: ${e.reason}`);
      } else if (e?.error?.message) {
        setStatus && setStatus(`❌ Lỗi: ${e.error.message}`);
      } else if (e.message && e.message.includes('insufficient funds')) {
        setStatus && setStatus('❌ Treasury không đủ CFLR để hoàn tiền');
      } else if (e.message && e.message.includes('execution reverted')) {
        // Extract revert reason if possible
        const match = e.message.match(/execution reverted: (.+?)"/);
        const reason = match ? match[1] : 'Contract execution failed';
        setStatus && setStatus(`❌ ${reason}`);
      } else {
        setStatus && setStatus(`❌ Lỗi: ${e.message || e}`);
      }
      return null;
    } finally {
      setIsLoading && setIsLoading(false);
    }
  }, [contracts, account, setStatus, setIsLoading, proposals, onSuccess]);

  return { refund };
}

export default useTokenRefund;
