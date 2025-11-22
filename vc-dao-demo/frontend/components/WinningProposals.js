import React, { useState, useEffect } from 'react';

export default function WinningProposals({
  proposals = [],
  getProposalStatus,
  isLoading = false,
  circulatingSupply = 0,
  getVoterCount = () => 0
}) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second for real-time countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Lọc các proposals đã thắng
  const winningProposals = proposals.filter(p => {
    const status = getProposalStatus(p, circulatingSupply);
    return status === 'succeeded' || status === 'executed' || status === 'early-win';
  }).sort((a, b) => {
    // Sort by execution status first (executed last), then by vote end date
    if (a.executed !== b.executed) {
      return a.executed ? 1 : -1; // unexecuted first
    }
    return new Date(b.voteEnd) - new Date(a.voteEnd); // newest first
  });

  if (winningProposals.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-gray-700 rounded-full mx-auto mb-6 flex items-center justify-center">
          <span className="text-4xl">🏆</span>
        </div>
        <h3 className="text-xl font-semibold mb-3 text-gray-300">Chưa có đề xuất nào thắng cuộc</h3>
        <p className="text-gray-400 mb-6">
          Các đề xuất thắng cuộc sẽ được hiển thị tại đây
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">🏆 Đề Xuất Đã Thắng Cuộc</h2>
        <div className="text-sm text-gray-400">
          {winningProposals.length} đề xuất thắng cuộc
        </div>
      </div>
      
      <div className="space-y-4">
        {winningProposals.map((proposal) => {
          const status = getProposalStatus(proposal, circulatingSupply);
          const isEarlyWin = status === 'early-win';
          const isExecuted = proposal.executed;
          
          return (
            <div 
              key={proposal.id} 
              className={`bg-gradient-to-r ${
                isExecuted 
                  ? 'from-green-900/30 to-emerald-800/30 border-green-500/50' 
                  : 'from-yellow-900/30 to-orange-800/30 border-yellow-500/50'
              } border-2 rounded-xl p-6 transition-all duration-200`}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">
                      {isExecuted ? '✅' : isEarlyWin ? '⚡' : '🏆'}
                    </span>
                    <h3 className="text-xl font-semibold">{proposal.title}</h3>
                  </div>
                  <p className="text-gray-400">{proposal.description}</p>
                </div>
                <div className="text-right">
                  <div
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      isExecuted
                        ? 'bg-green-500/20 text-green-400'
                        : isEarlyWin
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}
                  >
                    {isExecuted ? '✅ ĐÃ CHUYỂN TIỀN' : isEarlyWin ? '🚀 THẮNG SỚM' : '🏆 THẮNG CUỘC'}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-400">Người Đề Xuất</p>
                  <p className="font-mono text-blue-400">{proposal.proposer}</p>
                </div>
                <div>
                  <p className="text-gray-400">Số Tiền</p>
                  <p className="font-semibold text-yellow-400">
                    {(parseFloat(proposal.amount) / Math.pow(10, 18)).toLocaleString(undefined, {maximumFractionDigits: 6})} CFLR
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Người Nhận</p>
                  <p className="font-mono text-green-400">{proposal.recipient}</p>
                </div>
              </div>

              {/* Vote Results */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-green-400">
                    ✅ Đồng ý: {getVoterCount(proposal.id)} người
                  </span>
                  <span className="text-red-400">
                    ❌ Không đồng ý: 0 người
                  </span>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-400 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${(() => {
                        const yesCount = getVoterCount(proposal.id);
                        // Since we only allow YES votes, no count is always 0
                        const total = yesCount;
                        return total > 0 ? 100 : 0; // Always 100% if there are votes since we only allow YES votes
                      })()}%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>
                    {(() => {
                      const yesCount = Math.floor(parseFloat(proposal.yesVotes) / Math.pow(10, 21));
                      const noCount = Math.floor(parseFloat(proposal.noVotes) / Math.pow(10, 21));
                      const total = yesCount + noCount;
                      return total > 0 ? `${((yesCount / total) * 100).toFixed(1)}% đồng ý` : '0% đồng ý';
                    })()}
                  </span>
                  {isEarlyWin && circulatingSupply > 0 && (
                    <span className="text-yellow-400">
                      Trên 50% người sở hữu đồng ý
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <p className="text-gray-400">Trạng Thái</p>
                  <p className="font-semibold text-green-400">
                    {proposal.executed ? 'Đã Chuyển Tiền' : 'Thắng Sớm'}
                  </p>
                </div>
              </div>

              {/* Execute Button or Status */}
              <div className="pt-4 border-t border-green-600">
                {proposal.executed ? (
                  <div className="flex items-center justify-center space-x-2 text-green-400">
                    <span className="text-2xl">✅</span>
                    <span className="font-semibold">Đã chuyển tiền thành công</span>
                  </div>
                ) : (() => {
                  const now = currentTime;
                  const status = getProposalStatus(proposal, circulatingSupply);
                  // New contract allows early execution for early-win proposals
                  const canExecute = status === 'early-win' || now > proposal.voteEnd;
                  
                  return (
                    <div className="space-y-3">
                      <div className={`flex items-center justify-center space-x-2 ${
                        canExecute ? 'text-green-400' : 'text-orange-400'
                      }`}>
                        <span className="text-2xl">{canExecute ? '⚡' : '⏰'}</span>
                        <span className="font-semibold">
                          {canExecute 
                            ? status === 'early-win' 
                              ? 'Thắng sớm - tự động chuyển tiền!'
                              : 'Tự động chuyển tiền'
                            : 'Chờ kết thúc voting'
                          }
                        </span>
                      </div>
                      <p className="text-center text-sm text-gray-400 mt-3">
                        {canExecute 
                          ? `Hệ thống tự động chuyển ${(parseFloat(proposal.amount) / Math.pow(10, 18)).toFixed(4)} CFLR từ Treasury sang ${proposal.recipient}`
                          : `Có thể thực hiện sau khi kết thúc voting`
                        }
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
