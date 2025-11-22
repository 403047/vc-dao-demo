import { useState, useEffect, useRef, useCallback } from 'react';
import { ethers } from 'ethers';
import StatusToast from '../components/StatusToast';
import PermissionModal from '../components/PermissionModal';
// Removed unused CONTRACT_ADDRESSES and ABIs from page-level
import { formatNumber } from '../utils/format';
import { useTokenHolders, useAutoReloadTokenHolders } from '../hooks/useTokenHolders';
import { useProposals } from '../hooks/useProposals';
import { useForceRefresh } from '../hooks/useForceRefresh';
import HoldersSection from '../components/HoldersSection';
import ProposalList from '../components/ProposalList';
import CreateProposalForm from '../components/CreateProposalForm';
import WinningProposals from '../components/WinningProposals';
import { useDaoNetwork } from '../hooks/useDaoNetwork';
import { useAutoReloadBalances } from '../hooks/useDaoBalances';
import { useTokenPurchase } from '../hooks/useTokenPurchase';
import { useProposalPermission } from '../hooks/useProposalPermission';
import { useDaoBalances } from '../hooks/useDaoBalances';
import DashboardStats from '../components/DashboardStats';
import InvestSection from '../components/InvestSection';
import RefundSection from '../components/RefundSection';
import HeaderBar from '../components/HeaderBar';
import FooterBar from '../components/FooterBar';
import WelcomeSection from '../components/WelcomeSection';
import NavigationTabs from '../components/NavigationTabs';
import { useTreasuryWithdraw } from '../hooks/useTreasuryWithdraw';
import { useTokenRefund } from '../hooks/useTokenRefund';



export default function Home() {
  const [account, setAccount] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [contracts, setContracts] = useState({});
  const [status, setStatus] = useState('');
  const { tokenBalance, treasuryBalance, loadBalances } = useDaoBalances(setStatus);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [cfrlBalance, setCfrlBalance] = useState('0'); // Sẽ được override bởi hook useDaoNetwork
  
  // Force refresh functionality
  useForceRefresh(contracts);
  const [isLoading, setIsLoading] = useState(false); // đặt trước khi dùng trong hooks khác
  
  // Token holders state managed by hook - MUST BE BEFORE useProposals
  const {
    tokenHolders,
    totalSupply,
    ownerAddress,
    ownerBalance,
    circulatingSupply,
    isLoadingHolders,
    hasLoadedHolders,
    loadTokenHolders
  } = useTokenHolders(setStatus);
  
  // Proposals managed by hook (cần isLoading và tokenHolders trước)  
  const { proposals, loadProposals, createProposal, voteOnProposal, executeProposal, getProposalStatus, getProposalCreatedTime, findWinningProposal, canUserVote, getUserOwnership, getVotingEligibility, getInvestmentRounds, getCurrentRound, canTradeTokens, shouldHideProposal, getVoterCount, refreshTrigger, reloadProposals, investmentRounds, endCurrentRound } = useProposals(
    contracts, 
    account, 
    setStatus, 
    setIsLoading, 
    (proposalId, voteResult) => {
      setVotedProposals(prev => new Set([...prev, proposalId]));
      
      // Nếu đề xuất thắng sớm, chuyển sang tab winners
      if (voteResult === 'early-win') {
        setTimeout(() => {
          setActiveTab('winners');
        }, 1500); // Delay một chút để user thấy thông báo
      }
    },
    () => {
      // Reset form sau khi tạo proposal thành công
      setNewProposal({
        title: '',
        description: '',
        recipient: '',
        amount: ''
      });
    },
    async () => {
      // Reload balances sau khi execute proposal
      await loadBalances(contracts.token, contracts.treasury, account);
    },
    (Array.isArray(tokenHolders) ? tokenHolders.filter(h => parseFloat(h.percentage || '0') >= 1).length : 0)
  );
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    recipient: '',
    amount: ''
  });
  const [votedProposals, setVotedProposals] = useState(new Set()); // Track proposals user đã vote
  // Network & wallet management
  const dao = useDaoNetwork(setStatus);
  // Auto-reload balances and holders when dao.contracts or dao.account change
  useAutoReloadBalances(dao.contracts?.token, dao.contracts?.treasury, dao.account, loadBalances);
  useAutoReloadTokenHolders(dao.contracts?.token, dao.account, activeTab, loadTokenHolders);
  useEffect(() => {
    // Sync from hook to local state for minimal changes downstream
    setAccount(dao.account);
    setIsConnected(dao.isConnected);
    setContracts(dao.contracts);
    setCfrlBalance(dao.cfrlBalance);
  }, [dao.account, dao.isConnected, dao.contracts, dao.cfrlBalance]);

  const [governorOwner, setGovernorOwner] = useState(null);
  useEffect(() => {
    const loadGovernorOwner = async () => {
      if (dao.contracts?.governor) {
        try {
          const owner = await dao.contracts.governor.owner();
          setGovernorOwner(owner);
        } catch (e) {
          console.error('Error loading governor owner:', e);
        }
      }
    };
    loadGovernorOwner();
  }, [dao.contracts?.governor]);

  const { buyTokens } = useTokenPurchase(dao.contracts, dao.account, setStatus, setIsLoading, async (addr) => {
    await dao.refreshCflrBalance(addr);
    if (dao.contracts.token && dao.contracts.treasury) {
      await loadBalances(dao.contracts.token, dao.contracts.treasury, addr);
      await loadTokenHolders(dao.contracts.token, activeTab);
    }
  });
  // Refund hook cho phép user đổi VCDAO lấy lại 90% CFLR
  const { refund } = useTokenRefund(dao.contracts, dao.account, setStatus, setIsLoading, proposals, async () => {
    // Callback sau khi refund thành công
    if (dao.contracts.token && dao.contracts.treasury && dao.account) {
      await loadBalances(dao.contracts.token, dao.contracts.treasury, dao.account);
      await dao.refreshCflrBalance(dao.account);
      await loadTokenHolders(dao.contracts.token, activeTab);
    }
  });
  const [testWithdrawAmt, setTestWithdrawAmt] = useState('');
  const [showStatus, setShowStatus] = useState(true);
  const statusTimeoutRef = useRef(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const hasInitializedRef = useRef(false);
  const { checkProposalPermission } = useProposalPermission(tokenBalance, circulatingSupply, () => setShowPermissionModal(true), tokenHolders, account);

  // Auto-hide status after 3 seconds
  useEffect(() => {
    if (status) {
      setShowStatus(true);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = setTimeout(() => setShowStatus(false), 3000);
    }
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, [status]);

  // Kết nối ví thông qua hook
  const connectWallet = async () => {
    const result = await dao.connectWallet();
    if (result) {
      const { contracts: c, account: acc } = result;
      await loadBalances(c.token, c.treasury, acc);
      await loadProposals(c.governor);
    }
  };

  // Auto-load balances, proposals and circulating supply after auto-connect from hook
  useEffect(() => {
    const run = async () => {
      if (
        !hasInitializedRef.current &&
        dao.account &&
        dao.contracts?.token &&
        dao.contracts?.treasury &&
        dao.contracts?.governor
      ) {
        hasInitializedRef.current = true;
        await loadBalances(dao.contracts.token, dao.contracts.treasury, dao.account);
        await loadProposals(dao.contracts.governor);
        // Load holders once on dashboard to compute circulating supply (no status spam)
        if (!Array.isArray(tokenHolders) || tokenHolders.length === 0) {
          await loadTokenHolders(dao.contracts.token, 'dashboard');
        }
      }
    };
    run();
  }, [dao.account, dao.contracts]);

  // Balances logic moved to useDaoBalances

  // CFLR balance được cập nhật qua dao.refreshCflrBalance

  // Danh sách người sở hữu được quản lý tại hook useTokenHolders

  // Hàm kiểm tra địa chỉ thủ công
  // Bỏ kiểm tra địa chỉ thủ công (đã không dùng)

  // Mua token sử dụng hook useTokenPurchase

  // Lắng nghe tài khoản/mạng đã được hook useDaoNetwork xử lý

  // Load token holders khi chuyển sang tab holders
  useEffect(() => {
    if (activeTab === 'holders' && contracts.token && !hasLoadedHolders.current && (!Array.isArray(tokenHolders) || tokenHolders.length === 0)) {
      console.log('Auto-loading token holders for first time...');
      hasLoadedHolders.current = true;
      loadTokenHolders(contracts.token, 'holders');
    }
  }, [activeTab]);

  // Permission logic now handled by useProposalPermission

  // Proposal logic now handled by useProposals hook

  // format helpers moved to utils/format

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white">
      {/* Animated background patterns */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-4 -right-4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-4 -left-4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Header */}
      <HeaderBar isConnected={isConnected} account={account} cfrlBalance={cfrlBalance} onConnect={connectWallet} />

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-6">
        {!isConnected ? (
          <WelcomeSection onConnect={connectWallet} />
        ) : (
          <>
            {/* Stats Overview */}
            <DashboardStats
              cfrlBalance={cfrlBalance}
              tokenBalance={tokenBalance}
              circulatingSupply={circulatingSupply}
              totalSupply={totalSupply}
              proposals={proposals}
              getProposalStatus={getProposalStatus}
              shouldHideProposal={shouldHideProposal}
              tokenHolders={tokenHolders}
            />

            {/* Navigation Tabs */}
            <NavigationTabs
              activeTab={activeTab}
              onSelect={(tabId) => {
                // Nếu rời khỏi holders và đang hiện thông báo refresh -> ẩn đi
                if (
                  activeTab === 'holders' &&
                  tabId !== 'holders' &&
                  status.startsWith('🔄 Đang làm mới danh sách người sở hữu')
                ) {
                  setStatus('');
                }
                if (tabId === 'create') {
                  if (checkProposalPermission()) setActiveTab(tabId);
                } else {
                  setActiveTab(tabId);
                }
              }}
            />

            {/* Tab Content */}
            <div className="glass rounded-2xl p-6 border border-white/10 backdrop-blur-xl relative overflow-hidden">
              {/* Content background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 rounded-2xl"></div>
              
              <div className="relative z-10">
              {/* Dashboard (Trang Chủ) */}
              {activeTab === 'dashboard' && isConnected && (
                <>
                  <DashboardStats
                    tokenBalance={tokenBalance}
                    treasuryBalance={treasuryBalance}
                    circulatingSupply={circulatingSupply}
                    totalSupply={totalSupply}
                    formatNumber={formatNumber}
                    proposals={proposals}
                    getProposalStatus={getProposalStatus}
                    shouldHideProposal={shouldHideProposal}
                    tokenHolders={tokenHolders}
                  />
                  
                  {/* Clear Cache Button */}
                  <div className="mt-4 flex justify-center space-x-3">
                    <button
                      onClick={() => {
                        if (window.forceClearCache) {
                          window.forceClearCache();
                          setTimeout(() => window.location.reload(), 500);
                        }
                      }}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm transition-all duration-200"
                    >
                      🧹 Clear Cache & Refresh
                    </button>
                    
                    <button
                      onClick={() => {
                        // Force clear ALL DAO cache
                        console.log('🧹 Force clearing ALL DAO cache...');
                        
                        const allKeys = Object.keys(localStorage);
                        const daoKeys = allKeys.filter(key => 
                          key.includes('proposal') || 
                          key.includes('vote') || 
                          key.includes('round') || 
                          key.includes('early') || 
                          key.includes('governor') ||
                          key.includes('dao') ||
                          key.includes('VCDAO')
                        );
                        
                        daoKeys.forEach(key => localStorage.removeItem(key));
                        
                        // Clear session storage too
                        const sessionKeys = Object.keys(sessionStorage);
                        sessionKeys.filter(key => 
                          key.includes('proposal') || key.includes('vote') || key.includes('dao')
                        ).forEach(key => sessionStorage.removeItem(key));
                        
                        console.log('✅ ALL DAO cache cleared! Reloading...');
                        setTimeout(() => window.location.reload(true), 1000);
                      }}
                      className="px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 text-sm transition-all duration-200"
                    >
                      🗑️ Nuclear Clear & Reload
                    </button>
                  </div>
                  
                  {/* Debug Info */}
                  <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-400">
                    <div>🔍 Debug Info:</div>
                    <div>Governor: {contracts?.governor?.address || 'Not connected'}</div>
                    <div>Proposals loaded: {proposals.length}</div>
                    <div>Contract addresses in config: {JSON.stringify(require('../src/config/contract-addresses.json').coston)}</div>
                    {/* Investment rounds debug panel (client-only) */}
                    {typeof window !== 'undefined' && (
                      <div className="mt-2 text-xs text-gray-300">
                        <div className="font-medium text-sm">🧭 Investment Rounds (debug)</div>
                        <div className="mt-1">
                          <pre className="whitespace-pre-wrap text-xxs max-h-48 overflow-auto p-2 bg-black/20 rounded">{investmentRounds && investmentRounds.length > 0 ? JSON.stringify(investmentRounds.map(r => ({ id: r.id, startTime: new Date(r.startTime).toLocaleString(), isFinished: r.isFinished, actualEndTime: r.actualEndTime ? new Date(r.actualEndTime).toLocaleString() : null, proposalIds: r.proposals ? r.proposals.map(p => p.id) : (r.proposalIds || []) })), null, 2) : 'No rounds computed yet'}</pre>
                        </div>
                        <div className="mt-2">
                          <div className="font-medium">Proposals (created times)</div>
                          <div className="mt-1 text-xs text-gray-300">
                            {proposals.map(p => (
                              <div key={p.id}>#{p.id} — created: {(() => { const t = getProposalCreatedTime(p); return t ? t.toLocaleString() : 'unknown'; })()} — executed: {p.executed ? 'yes' : 'no'}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Buy Tokens Tab - ĐÃ ĐỔI SANG CFLR */}
              {activeTab === 'invest' && (() => {
                // Use centralized round check instead of manual proposal iteration
                const canTrade = canTradeTokens();
                const currentRound = getCurrentRound();
                
                return (
                  <InvestSection
                    buyTokens={buyTokens}
                    isLoading={isLoading}
                    cfrlBalance={cfrlBalance}
                    account={account}
                    tokenBalance={tokenBalance}
                    hasActiveInvestmentRound={!canTrade}
                    currentRound={currentRound}
                  />
                );
              })()}

              {/* Refund Tab */}
              {activeTab === 'refund' && (() => {
                // Use centralized round check
                const canTrade = canTradeTokens();
                const currentRound = getCurrentRound();

                return (
                  <RefundSection
                    refund={refund}
                    isLoading={isLoading}
                    tokenBalance={tokenBalance}
                    hasActiveProposals={!canTrade}
                    currentRound={currentRound}
                  />
                );
              })()}


              {/* Các tabs khác giữ nguyên */}
              {/* Proposals Tab */}
              {activeTab === 'proposals' && (() => {
                const now = new Date();
                
                if (proposals.length === 0 && contracts.governor) {
                  loadProposals(contracts.governor);
                }
                
                // Nhóm proposals theo thời gian tạo (cùng batch trong 1 giờ)
                const proposalGroups = {};
                proposals.forEach(p => {
                  const groupKey = Math.floor(p.voteStart.getTime() / (3600 * 1000)); // Group by hour
                  if (!proposalGroups[groupKey]) proposalGroups[groupKey] = [];
                  proposalGroups[groupKey].push(p);
                });
                
                // LOGIC MỚI: Chỉ hiển thị proposals trong đợt chưa kết thúc (không có early-win)
                
                // 1. Tìm tất cả proposals với status khác nhau
                const allProposalStatuses = proposals.map(p => ({
                  id: p.id,
                  title: p.title,
                  status: getProposalStatus(p, (Array.isArray(tokenHolders) ? tokenHolders.filter(h => parseFloat(h.percentage || '0') >= 1).length : 0)),
                  voteStart: p.voteStart
                }));

                // 3. Tìm latest winning proposal để xác định điểm bắt đầu đợt mới
                const winningProposals = proposals.filter(p => {
                  const status = getProposalStatus(p, (Array.isArray(tokenHolders) ? tokenHolders.filter(h => parseFloat(h.percentage || '0') >= 1).length : 0));
                  return status === 'succeeded' || status === 'executed' || status === 'early-win';
                }).sort((a, b) => b.voteStart - a.voteStart);

                const latestWin = winningProposals[0];
                // Use millisecond precision for new round start time
                const newRoundStartTime = latestWin ? new Date(latestWin.voteStart.getTime() + 1000) : new Date(0); // +1 second

                // 3. Chỉ hiển thị proposals được tạo SAU lần thắng cuối (đợt mới)
                const newRoundProposals = proposals.filter(p => {
                  const status = getProposalStatus(p, (Array.isArray(tokenHolders) ? tokenHolders.filter(h => parseFloat(h.percentage || '0') >= 1).length : 0));
                  const isActive = status === 'active' || status === 'pending';
                  const isInNewRound = p.voteStart >= newRoundStartTime;
                  
                  return isActive && isInNewRound;
                });

                // 4. Kiểm tra đợt mới có early-win không
                const newRoundHasEarlyWin = newRoundProposals.some(p => {
                  const status = getProposalStatus(p, (Array.isArray(tokenHolders) ? tokenHolders.filter(h => parseFloat(h.percentage || '0') >= 1).length : 0));
                  return status === 'early-win';
                });

                let displayProposals = [];
                
                if (newRoundHasEarlyWin) {
                  // 5. Nếu đợt mới có early-win, ẩn tất cả proposals trong tab này
                  displayProposals = [];
                } else {
                  // 6. Hiển thị proposals của đợt mới
                  displayProposals = newRoundProposals;
                }
                
                return (
                  <ProposalList
                    proposals={displayProposals}
                    getProposalStatus={(p) => getProposalStatus(p, (Array.isArray(tokenHolders) ? tokenHolders.filter(h => parseFloat(h.percentage || '0') >= 1).length : 0))}
                    voteOnProposal={voteOnProposal}
                    isLoading={isLoading}
                    onCreateClick={() => {
                      if (checkProposalPermission()) setActiveTab('create');
                    }}
                    circulatingSupply={(Array.isArray(tokenHolders) ? tokenHolders.filter(h => parseFloat(h.percentage || '0') >= 1).length : 0)}
                    hasUserVoted={(proposalId) => {
                      return votedProposals.has(proposalId);
                    }}
                    canUserVote={canUserVote}
                    getUserOwnership={getUserOwnership}
                    getVotingEligibility={getVotingEligibility}
                    getCurrentRound={getCurrentRound}
                    shouldHideProposal={shouldHideProposal}
                    refreshTrigger={refreshTrigger}
                    getVoterCount={getVoterCount}
                    onEndRound={endCurrentRound}
                    governorOwner={governorOwner}
                    connectedAccount={account}
                  />
                );
              })()}

              {/* Winners Tab */}
              {activeTab === 'winners' && (
                <WinningProposals
                  proposals={proposals}
                  getProposalStatus={(p) => getProposalStatus(p, (Array.isArray(tokenHolders) ? tokenHolders.filter(h => parseFloat(h.percentage || '0') >= 1).length : 0))}
                  isLoading={isLoading}
                  circulatingSupply={(Array.isArray(tokenHolders) ? tokenHolders.filter(h => parseFloat(h.percentage || '0') >= 1).length : 0)}
                  getVoterCount={getVoterCount}
                />
              )}

              {/* Create Proposal Tab */}
              {activeTab === 'create' && (() => {
                // Tính limit riêng cho từng user với logic mới (đồng bộ với logic hiển thị)
                const getUserProposalLimit = () => {
                  if (!account) return { count: 0, oldestProposal: null, canCreate: true };
                  
                  // KIỂM TRA ĐỢT HIỆN TẠI TRƯỚC
                  const currentRound = getCurrentRound();
                  
                  // Nếu đợt hiện tại đã kết thúc (có early-win hoặc hết 7 ngày), KHÔNG CHO TẠO
                  if (currentRound && currentRound.isFinished) {
                    return { 
                      count: 3, // Show as maxed out
                      oldestProposal: null, 
                      canCreate: false,
                      resetReason: 'round_finished',
                      lastWinningProposal: currentRound.earlyWinner,
                      currentRoundFinished: true
                    };
                  }
                  
                  const userProposals = proposals.filter(p => 
                    p.proposer.toLowerCase() === account.toLowerCase()
                  ).sort((a, b) => b.voteStart - a.voteStart); // Sort by newest first
                  
                  if (userProposals.length === 0) {
                    return { count: 0, oldestProposal: null, canCreate: true };
                  }
                  
                  // ĐỒNG BỘ với logic hiển thị - dùng cùng cách tính đợt mới
                  const allWinningProposals = proposals.filter(p => {
                    const status = getProposalStatus(p, (Array.isArray(tokenHolders) ? tokenHolders.filter(h => parseFloat(h.percentage || '0') >= 1).length : 0));
                    return status === 'succeeded' || status === 'executed' || status === 'early-win';
                  }).sort((a, b) => b.voteStart - a.voteStart);

                  const latestWinAny = allWinningProposals[0];
                  const newRoundStartTime = latestWinAny ? new Date(latestWinAny.voteStart.getTime() + 1000) : new Date(0);
                  
                  // Đếm user proposals trong đợt mới
                  const newRoundUserProposals = userProposals.filter(p => p.voteStart >= newRoundStartTime);
                  
                  // Tìm user winning proposal để xác định reset reason
                  const userWinningProposal = userProposals.find(p => {
                    const status = getProposalStatus(p, circulatingSupply);
                    return status === 'succeeded' || status === 'executed' || status === 'early-win';
                  });
                  
                  const resetReason = userWinningProposal ? 'winning' : 'time';
                  const oldestInNewRound = newRoundUserProposals.sort((a, b) => a.voteStart - b.voteStart)[0];
                  
                  return {
                    count: newRoundUserProposals.length,
                    oldestProposal: oldestInNewRound,
                    canCreate: newRoundUserProposals.length < 3,
                    resetReason,
                    lastWinningProposal: userWinningProposal
                  };
                };
                
                const limitInfo = getUserProposalLimit();
                
                return (
                  <CreateProposalForm
                    newProposal={newProposal}
                    setNewProposal={setNewProposal}
                    isLoading={isLoading}
                    userProposalCount={limitInfo.count}
                    maxProposals={3}
                    treasuryBalance={treasuryBalance}
                    oldestProposalDate={limitInfo.oldestProposal?.voteStart || null}
                    canCreate={limitInfo.canCreate}
                    resetReason={limitInfo.resetReason}
                    lastWinningProposal={limitInfo.lastWinningProposal}
                    onSubmit={async (proposalData) => {
                      if (checkProposalPermission()) {
                        const success = await createProposal(proposalData, () => {
                          // Reset form sau khi tạo proposal thành công
                          setNewProposal({
                            title: '',
                            description: '',
                            recipient: '',
                            amount: ''
                          });
                        }, proposalData.skipReload);
                        return success;
                      }
                      return false;
                    }}
                    onBatchComplete={async () => {
                      // Reload proposals sau khi tạo xong batch
                      await reloadProposals();
                    }}
                  />
                );
              })()}

              {/* Token Holders Tab */}
              {activeTab === 'holders' && (
                <HoldersSection
                  tokenHolders={tokenHolders}
                  totalSupply={totalSupply}
                  circulatingSupply={circulatingSupply}
                  isLoading={isLoadingHolders}
                  onRefresh={() => {
                    hasLoadedHolders.current = false;
                    if (contracts.token) loadTokenHolders(contracts.token, 'holders');
                  }}
                />
              )}
              </div>
            </div>
          </>
        )}

        {/* Status Toast */}
        <StatusToast status={status} show={showStatus} onClose={() => setShowStatus(false)} />
      </main>

      {/* Permission Modal */}
      <PermissionModal
        isOpen={showPermissionModal}
        onClose={() => setShowPermissionModal(false)}
        tokenBalance={tokenBalance}
        circulatingSupply={circulatingSupply}
        formatNumber={formatNumber}
        tokenHolders={tokenHolders}
        account={account}
      />

      {/* Footer */}
      <FooterBar />
    </div>
  );
}
