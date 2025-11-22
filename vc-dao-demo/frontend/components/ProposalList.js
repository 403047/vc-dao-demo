import React, { useState, useEffect } from 'react';
import { formatAddress } from '../utils/format';

export default function ProposalList({
  proposals = [],
  getProposalStatus,
  voteOnProposal,
  isLoading = false,
  onCreateClick,
  circulatingSupply = 0,
  hasUserVoted = () => false,
  canUserVote = () => true,
  getUserOwnership = () => Promise.resolve({ percentage: 0, meetsMinimum: false }),
  getVotingEligibility = () => Promise.resolve({ canVote: false, reason: 'unknown' }),
  getCurrentRound = () => null,
  shouldHideProposal = () => false,
  refreshTrigger = 0,
  getVoterCount = () => 0,
  // new props for end-round control
  onEndRound = null,
  governorOwner = null,
  connectedAccount = null,
}) {
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userOwnership, setUserOwnership] = useState({ percentage: 0, meetsMinimum: false });
  const [votingEligibility, setVotingEligibility] = useState({});
  const [currentRound, setCurrentRound] = useState(null);

  // Update time every second for real-time countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Load user ownership information
  useEffect(() => {
    const loadOwnership = async () => {
      try {
        const ownership = await getUserOwnership();
        setUserOwnership(ownership);
      } catch (error) {
        console.error('Error loading ownership:', error);
      }
    };

    loadOwnership();
  }, [getUserOwnership]);

  // Load voting eligibility for proposals
  useEffect(() => {
    const loadEligibility = async () => {
      const eligibilityMap = {};
      for (const proposal of proposals) {
        try {
          const eligibility = await getVotingEligibility(proposal.id);
          eligibilityMap[proposal.id] = eligibility;
        } catch (error) {
          console.error(`Error loading eligibility for proposal ${proposal.id}:`, error);
          eligibilityMap[proposal.id] = { canVote: false, reason: 'error' };
        }
      }
      setVotingEligibility(eligibilityMap);
    };

    if (proposals.length > 0) {
      loadEligibility();
    }
  }, [proposals, getVotingEligibility, refreshTrigger]);

  // Load current investment round info
  useEffect(() => {
    const loadCurrentRound = () => {
      const round = getCurrentRound();
      setCurrentRound(round);
    };

    loadCurrentRound();
    
    // Update round info every 5 seconds
    const interval = setInterval(loadCurrentRound, 5000);
    return () => clearInterval(interval);
  }, [getCurrentRound, proposals, refreshTrigger]);

  const handleVote = async () => {
    if (selectedProposal !== null) {
      try {
        await voteOnProposal(selectedProposal, true, circulatingSupply); // Luôn vote đồng ý với tổng số holders
        // Reset selection after voting
        setSelectedProposal(null);
      } catch (error) {
        console.error('Vote error:', error);
        // Keep selection so user can try again
      }
    }
  };
  
  const handleNuclearClear = () => {
    if (confirm('⚠️ XÓA TOÀN BỘ CACHE?\n\nĐiều này sẽ:\n- Xóa tất cả proposals cũ\n- Reset voting history\n- Xóa early-win records\n- Khởi động lại đợt đề xuất mới\n\nBạn có chắc chắn?')) {
      // Xóa TẤT CẢ localStorage (toàn bộ cache)
      // XÓA TOÀN BỘ localStorage
      localStorage.clear();
      
      // RELOAD NGAY LẬP TỨC (không setTimeout)
      window.location.reload(true); // Force reload from server
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Đề Xuất Đầu Tư</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleNuclearClear}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm font-semibold transition-all duration-200"
            title="Xóa toàn bộ cache và khởi động lại"
          >
            💣 Nuclear Clear
          </button>

          {/* End current investment round button: always visible, disabled for non-owner */}
          {typeof window !== 'undefined' && typeof onEndRound === 'function' && (
            <button
              onClick={async () => {
                if (!governorOwner) {
                  if (!confirm('Chưa xác định owner của Governor. Tiếp tục vẫn có thể thử, nhưng giao dịch có thể revert. Tiếp tục?')) return;
                }
                if (confirm('Bạn chắc chắn muốn kết thúc đợt đầu tư ngay lập tức? (chỉ owner mới có quyền thực thi trên chuỗi)')) {
                  try {
                    await onEndRound();
                  } catch (e) {
                    console.error('End round error:', e);
                    alert('Lỗi khi kết thúc đợt: ' + (e.message || e));
                  }
                }
              }}
              className={`px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm font-semibold transition-all duration-200`}
              title={governorOwner ? `Chỉ owner (${governorOwner}) có thể thực thi thành công on-chain. Bạn đang kết nối: ${connectedAccount}` : 'Đang xác định owner...'}
            >
              ⏱️ Kết thúc đợt đầu tư
            </button>
          )}

          <button
            onClick={onCreateClick}
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg font-semibold hover:from-green-600 hover:to-blue-600 transition-all duration-200"
          >
            + Đề Xuất Mới
          </button>
        </div>
      </div>
      
      {/* Voting Instructions */}
      {proposals.some(p => getProposalStatus(p, circulatingSupply) === 'active') && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start space-x-3">
            <span className="text-xl">ℹ️</span>
            <div className="flex-1">
              <p className="text-blue-400 font-semibold mb-1">Cách Thức Bỏ Phiếu</p>
              <p className="text-blue-400/80 text-sm">
                Trong 1 đợt đầu tư, bạn chỉ có thể vote <span className="text-yellow-400 font-semibold">1 đề xuất duy nhất</span>. 
                <span className="text-orange-400 font-semibold">Mỗi người = 1 phiếu</span> (không phụ thuộc số token sở hữu).
                Đợt kết thúc khi: <span className="text-green-400 font-semibold">hết 7 ngày từ đề xuất đầu tiên</span> hoặc <span className="text-green-400 font-semibold">≥50% người sở hữu đồng ý 1 đề xuất</span>
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Debug Info */}
      {proposals.length === 0 && (
        <div className="mb-4 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
          <div className="text-xs text-gray-400 space-y-1">
            <div>🔍 <strong>Debug Info:</strong></div>
            <div>• Governor Address: {typeof window !== 'undefined' && localStorage.getItem('governor_address')?.substring(0, 20)}...</div>
            <div>• Total Proposals Loaded: {proposals.length}</div>
            <div>• Current Round: {currentRound ? 'Active' : 'None'}</div>
            <div className="mt-2 text-yellow-400">
              💡 Nếu thấy proposals cũ, hãy nhấn <strong>"💣 Nuclear Clear"</strong> để reset
            </div>
          </div>
        </div>
      )}
      
      {/* Investment Round Status */}
      {currentRound && (
        <div className="bg-blue-900 rounded-lg p-4 mb-4 border border-blue-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🏦</span>
              <div>
                <h3 className="text-sm font-medium text-white">Đợt Đầu Tư Hiện Tại</h3>
                <p className="text-xs text-blue-300">
                  {currentRound.proposals.length} đề xuất • 
                  Bắt đầu: {new Date(currentRound.startTime).toLocaleString('vi-VN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })} • 
                  Kết thúc: {new Date(currentRound.endTime).toLocaleString('vi-VN', {
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
            <div className="text-right">
              {currentRound.isFinished ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  🔒 Đã kết thúc
                </span>
              ) : (
                <div className="text-xs text-blue-300">
                  <div>Kết thúc: {new Date(currentRound.endTime).toLocaleString('vi-VN')}</div>
                  <div className="text-green-400">🟢 Đang diễn ra</div>
                  <div className="text-gray-400">
                    Còn: {(() => {
                      const timeLeft = currentRound.endTime - currentTime.getTime();
                      if (timeLeft <= 0) return 'Đã hết hạn';
                      
                      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
                      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                      
                      if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
                      if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
                      if (minutes > 0) return `${minutes}m ${seconds}s`;
                      return `${seconds}s`;
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
          {currentRound.earlyWinner && (
            <div className="mt-2 text-xs text-yellow-300">
              🏆 Kết thúc sớm - Đề xuất #{currentRound.earlyWinner.id} đã thắng
              <div className="text-gray-400">
                Thời gian: {new Date(currentRound.actualEndTime).toLocaleString('vi-VN')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* User Ownership Status */}
      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">👤</span>
            <div>
              <h3 className="text-sm font-medium text-white">Quyền Vote Của Bạn</h3>
              <p className="text-xs text-gray-400">
                Sở hữu: <span className="text-yellow-400 font-semibold">{userOwnership.formattedPercentage || '0%'}</span> VCDAO
              </p>
            </div>
          </div>
          <div className="text-right">
            {userOwnership.meetsMinimum ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✅ Được phép vote
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                🚫 Cần ≥1% để vote
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {(() => {
          // Lọc bỏ các proposals đã thắng (đã chuyển sang tab riêng) và các proposals trong đợt đã có early-win
          const activeProposals = proposals.filter(p => {
            const status = getProposalStatus(p, circulatingSupply);
            const shouldHide = shouldHideProposal(p);
            return status !== 'succeeded' && status !== 'executed' && status !== 'early-win' && !shouldHide;
          });

          if (activeProposals.length === 0 && proposals.length === 0) {
            return (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Chưa Có Đề Xuất Nào</h3>
                <p className="text-gray-400 mb-4">Hãy là người đầu tiên tạo đề xuất đầu tư</p>
                <button onClick={onCreateClick} className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg font-semibold">
                  Tạo Đề Xuất Đầu Tiên
                </button>
              </div>
            );
          }

          if (activeProposals.length === 0 && proposals.length > 0) {
            return (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl">🏆</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Tất cả đề xuất đã kết thúc</h3>
                <p className="text-gray-400 mb-4">Các đề xuất đã thắng có thể xem trong tab "Đã Thắng"</p>
                <button onClick={onCreateClick} className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg font-semibold">
                  Tạo Đề Xuất Mới
                </button>
              </div>
            );
          }

          return activeProposals.map((proposal) => (
            <div key={proposal.id} className="bg-gray-700 rounded-xl p-6 border border-gray-600">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{proposal.title}</h3>
                  <p className="text-gray-400">{proposal.description}</p>
                </div>
                <div className="text-right">
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      getProposalStatus(proposal, circulatingSupply) === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : getProposalStatus(proposal, circulatingSupply) === 'early-win'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : getProposalStatus(proposal, circulatingSupply) === 'succeeded'
                        ? 'bg-blue-500/20 text-blue-400'
                        : getProposalStatus(proposal, circulatingSupply) === 'executed'
                        ? 'bg-purple-500/20 text-purple-400'
                        : getProposalStatus(proposal, circulatingSupply) === 'pending'
                        ? 'bg-orange-500/20 text-orange-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {(() => {
                      const status = getProposalStatus(proposal, circulatingSupply);
                      if (status === 'early-win') return '🚀 THẮNG SỚM';
                      if (status === 'executed') return '✅ ĐÃ CHUYỂN TIỀN';
                      if (status === 'succeeded') return '🏆 THẮNG CUỘC';
                      if (status === 'pending') return '⏳ CHỜ BẮT ĐẦU';
                      if (status === 'active') return '🗳️ ĐANG VOTE';
                      if (status === 'defeated') return '❌ THUA CUỘC';
                      return status.toUpperCase();
                    })()}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">Proposal #{proposal.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-400">Số Tiền</p>
                  <p className="font-semibold">{(parseFloat(proposal.amount) / Math.pow(10, 18)).toLocaleString(undefined, {maximumFractionDigits: 6})} CFLR</p>
                </div>
                <div>
                  <p className="text-gray-400">Người Nhận</p>
                  <p className="font-mono">{formatAddress(proposal.recipient)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Người Đề Xuất</p>
                  <p className="font-mono">{formatAddress(proposal.proposer)}</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Đồng ý: <span className="text-green-400 font-semibold">{getVoterCount(proposal.id)} người</span></span>
                  <span>Tỷ lệ support: <span className="text-blue-400 font-semibold">
                    {circulatingSupply > 0 ? ((getVoterCount(proposal.id) / parseFloat(circulatingSupply)) * 100).toFixed(1) : 0}%
                  </span></span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full transition-all duration-500 relative"
                    style={{
                      width: `${
                        circulatingSupply > 0
                          ? Math.min((getVoterCount(proposal.id) / parseFloat(circulatingSupply)) * 100, 100)
                          : 0
                      }%`
                    }}
                  >
                    {/* 50% threshold indicator */}
                    <div className="absolute top-0 left-1/2 w-0.5 h-full bg-yellow-400 opacity-60"></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span className="text-yellow-400">50% (thắng sớm)</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="flex space-x-3">
                {(() => {
                  const status = getProposalStatus(proposal, circulatingSupply);
                  const eligibility = votingEligibility[proposal.id];
                  const canVote = status === 'active' && eligibility?.canVote === true;
                  const isWon = status === 'early-win' || status === 'succeeded';
                  const isPending = status === 'pending';
                  
                  if (isPending) {
                    // Show exact countdown for any waiting time with real-time updates
                    const now = currentTime;
                    const timeUntilStart = proposal.voteStart - now;
                    const totalSeconds = Math.max(0, Math.floor(timeUntilStart / 1000));
                    const hours = Math.floor(totalSeconds / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    const seconds = totalSeconds % 60;
                    
                    const formatTime = () => {
                      if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
                      if (minutes > 0) return `${minutes}m ${seconds}s`;
                      return `${seconds}s`;
                    };
                    
                    return (
                      <div className="flex-1">
                        <div className={`p-4 border rounded-lg ${
                          totalSeconds <= 10 
                            ? 'bg-green-500/10 border-green-500/30' 
                            : 'bg-orange-500/10 border-orange-500/30'
                        }`}>
                          <div className="text-center">
                            <div className={`flex items-center justify-center space-x-2 mb-2 ${
                              totalSeconds <= 10 ? 'text-green-400' : 'text-orange-400'
                            }`}>
                              <span className="text-xl">{totalSeconds <= 10 ? '⚡' : '⏳'}</span>
                              <span className="font-semibold">
                                {totalSeconds <= 0 
                                  ? 'Có thể vote ngay!' 
                                  : `Còn ${formatTime()} để bắt đầu vote`
                                }
                              </span>
                            </div>
                            <div className="text-sm text-gray-400 mb-3">
                              <p>Bắt đầu: {proposal.voteStart.toLocaleString('vi-VN')}</p>
                              <p>Hiện tại: {now.toLocaleString('vi-VN')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  if (status === 'active' || isWon) {
                    return (
                      <div className="flex-1 space-y-3">
                        {/* Radio Button Selection */}
                        <div className={`flex items-center space-x-4 p-3 rounded-lg ${
                          canVote ? 'bg-gray-800' : 'bg-gray-900 opacity-60'
                        }`}>
                          <input
                            type="radio"
                            id={`select-${proposal.id}`}
                            name="selectedProposal"
                            checked={selectedProposal === proposal.id}
                            onChange={() => {
                              if (canVote) setSelectedProposal(proposal.id);
                            }}
                            disabled={!canVote}
                            className="w-4 h-4 text-blue-500 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <label htmlFor={`select-${proposal.id}`} className="text-sm font-medium flex-1">
                            {(() => {
                              const eligibility = votingEligibility[proposal.id];
                              if (!eligibility) return 'Đang kiểm tra điều kiện vote...';
                              
                              switch (eligibility.reason) {
                                case 'already_voted':
                                  return <span className="text-yellow-400">✅ Bạn đã vote cho đề xuất này</span>;
                                case 'already_voted_in_round':
                                  return <span className="text-red-400">🚫 Bạn đã vote đề xuất khác trong đợt này</span>;
                                case 'proposal_won':
                                  return <span className="text-green-400">🏆 Đề xuất đã thắng - không thể vote thêm</span>;
                                case 'insufficient_ownership':
                                  return (
                                    <div className="space-y-1">
                                      <span className="text-red-400">🚫 Cần sở hữu ít nhất 1% VCDAO để vote</span>
                                      <div className="text-xs text-gray-400">
                                        Bạn đang sở hữu: {eligibility.ownershipInfo?.formattedPercentage || '0%'}
                                      </div>
                                    </div>
                                  );
                                case 'eligible':
                                  return 'Chọn đề xuất này để vote';
                                default:
                                  return 'Không thể vote - vui lòng thử lại';
                              }
                            })()}
                          </label>
                        </div>
                        
                        {/* Vote Buttons - Only show if this proposal is selected and can vote */}
                        {selectedProposal === proposal.id && canVote && (
                          <div className="space-y-2">
                            <button
                              onClick={handleVote}
                              disabled={isLoading}
                              className="w-full py-3 px-4 rounded-lg font-bold text-lg transition-colors bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isLoading ? 'Đang Vote...' : '✅ ĐỒNG Ý VỚI ĐỀ XUẤT NÀY'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
