import { useMemo, useCallback } from 'react';

// Kiểm tra quyền tạo đề xuất:
// - Nếu circulatingSupply < 1000: KHÔNG cho phép tạo đề xuất (chưa đủ token)
// - Nếu circulatingSupply >= 1000: chỉ 2 holder lớn nhất được tạo đề xuất
export function useProposalPermission(tokenBalance, circulatingSupply, onFail, tokenHolders, account) {
  const percentage = useMemo(() => {
    const user = parseFloat(tokenBalance || '0');
    const circ = parseFloat(circulatingSupply || '0');
    if (!isFinite(user) || !isFinite(circ) || circ <= 0) return 0;
    return (user / circ) * 100;
  }, [tokenBalance, circulatingSupply]);

  const checkProposalPermission = useCallback(() => {
    const circ = parseFloat(circulatingSupply || '0');
    const userBalance = parseFloat(tokenBalance || '0');
    
    if (circ === 0 || userBalance === 0) {
      onFail && onFail();
      return false;
    }

    // Nếu circulatingSupply < 1000: KHÔNG cho phép tạo đề xuất
    if (circ < 1000) {
      onFail && onFail();
      return false;
    }

    // Nếu circulatingSupply >= 1000: chỉ 2 holder lớn nhất được phép
    if (!tokenHolders || tokenHolders.length === 0 || !account) {
      onFail && onFail();
      return false;
    }
    
    // Sắp xếp holders theo balance giảm dần
    const sortedHolders = [...tokenHolders].sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
    
    // Lấy 2 holder lớn nhất
    const top2 = sortedHolders.slice(0, 2);
    const isTop2 = top2.some(holder => holder.address.toLowerCase() === account.toLowerCase());
    
    if (!isTop2) {
      onFail && onFail();
      return false;
    }
    return true;
  }, [circulatingSupply, tokenBalance, onFail, tokenHolders, account]);

  return { percentage, checkProposalPermission };
}
