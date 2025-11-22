import React from 'react';
import { formatNumber, formatTokenBalance } from '../utils/format';
import StatCard from './stats/StatCard';

export default function DashboardStats({
  cfrlBalance = 0,
  tokenBalance = 0,
  circulatingSupply = 0,
  totalSupply = 0,
  proposals = [],
  getProposalStatus,
  shouldHideProposal = () => false,
  tokenHolders = [],
}) {
  // Sử dụng số lượng token holders thay vì circulating supply để tính early-win
  const totalHolders = Array.isArray(tokenHolders) ? tokenHolders.length : 0;
  
  // LOGIC MỚI: Đếm proposals trong đợt đầu tư hiện tại
  
  // 1. Tìm latest winning proposal để xác định đợt mới
  const winningProposals = proposals.filter((p) => {
    const status = getProposalStatus && getProposalStatus(p, totalHolders);
    return status === 'succeeded' || status === 'executed' || status === 'early-win';
  }).sort((a, b) => b.voteStart - a.voteStart);

  const latestWin = winningProposals[0];
  // Use consistent millisecond precision
  const newRoundStartTime = latestWin ? new Date(latestWin.voteStart.getTime() + 1000) : new Date(0); // +1 second

  // 2. Đếm proposals active trong đợt mới (không bao gồm proposals bị ẩn vì đợt có early-win)
  const newRoundActiveProposals = proposals.filter((p) => {
    const status = getProposalStatus && getProposalStatus(p, totalHolders);
    const isActive = status === 'active' || status === 'pending';
    const isInNewRound = p.voteStart >= newRoundStartTime;
    const shouldHide = shouldHideProposal && shouldHideProposal(p);
    
    return isActive && isInNewRound && !shouldHide;
  });
  
  // 3. Kiểm tra đợt mới có early-win không
  const newRoundHasEarlyWin = newRoundActiveProposals.some((p) => {
    const status = getProposalStatus && getProposalStatus(p, totalHolders);
    return status === 'early-win';
  });
  
  // 4. Đếm active proposals để hiển thị
  const activeCount = newRoundHasEarlyWin ? 0 : newRoundActiveProposals.length;
  
  // 3. Đếm winning proposals
  const winningCount = proposals.filter((p) => {
    const status = getProposalStatus && getProposalStatus(p, totalHolders);
    return status === 'succeeded' || status === 'executed' || status === 'early-win';
  }).length;

  const circPercent = ((parseFloat(circulatingSupply || '0') / parseFloat(totalSupply || '1')) * 100).toFixed(1);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <StatCard
        label="Số Dư CFLR"
        value={`${formatNumber(cfrlBalance, 4)} CFLR`
        }
        icon="⛽"
        color="blue"
      />
      <StatCard
        label="Quyền Biểu Quyết"
        value={`${formatTokenBalance(tokenBalance)} VCDAO`}
        subLabel={`Raw: ${tokenBalance}`}
        icon="⚡"
        color="green"
      />
      <StatCard
        label="Token Đang Lưu Hành"
        value={`${formatTokenBalance(circulatingSupply)} VCDAO`}
        subLabel={`${circPercent}% tổng supply`}
        icon="💫"
        color="yellow"
      />
      <StatCard
        label="Đề Xuất Đang Hoạt Động"
        value={activeCount}
        subLabel={`${winningCount} đã thắng cuộc`}
        icon="📊"
        color="purple"
      />
    </div>
  );
}
