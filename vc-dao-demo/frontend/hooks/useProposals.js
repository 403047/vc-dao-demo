import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { GOVERNOR_ABI, CONTRACT_ADDRESSES, NETWORK_CONFIG, READONLY_PROVIDER_URL } from '../src/config/daoContracts';

export function useProposals(contracts, account, setStatus, setIsLoading, onVoteSuccess = null, onCreateSuccess = null, onExecuteSuccess = null, tokenHoldersCount = 0, prefUserTokenBalance = null, prefTotalSupply = null) {
  const [proposals, setProposals] = useState([]);
  
  // Helper function for safe localStorage access
  const safeLocalStorage = {
    getItem: (key) => {
      if (typeof window === 'undefined') return null;
      return localStorage.getItem(key);
    },
    setItem: (key, value) => {
      if (typeof window === 'undefined') return;
      localStorage.setItem(key, value);
    },
    removeItem: (key) => {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(key);
    }
  };
  
  // Track UI refresh trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // Track last scanned block for VoteCast events to avoid full rescans
  const [lastVoteScanBlock, setLastVoteScanBlock] = useState(0);

  // Auto-clear cache if contract address changed
  useEffect(() => {
    if (typeof window === 'undefined' || !contracts?.governor) return;
    
    const currentGovernorAddress = contracts.governor.address;
    const savedGovernorAddress = localStorage.getItem('governor_address');
    
    if (savedGovernorAddress && savedGovernorAddress !== currentGovernorAddress) {
      
      // Clear all DAO-related localStorage including executed proposals
      ['earlyWinProposals', 'earlyWinTimestamps', 'userRoundVotes', 'proposalVoters', 'executedProposals', 'investmentRounds'].forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Also clear any proposal-specific cache
      Object.keys(localStorage).forEach(key => {
        if (key.includes('proposal_') || key.includes('round_')) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear user vote keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('user_voted_')) {
          localStorage.removeItem(key);
        }
      });
      
      // FORCE RESET STATE VARIABLES
      setEarlyWinProposals(new Set());
      setEarlyWinTimestamps({});
      setProposals([]);
      setInvestmentRounds([]);
      
    }
    
    // Save current contract address
    localStorage.setItem('governor_address', currentGovernorAddress);
    
    // Force reload proposals when contract changes
    if (savedGovernorAddress && savedGovernorAddress !== currentGovernorAddress) {
      setTimeout(() => {
        if (contracts?.governor) {
          loadProposals(contracts.governor);
        }
      }, 1000);
    }
  }, [contracts?.governor]);

  // Track proposals that achieved early-win (in-memory only)
  const [earlyWinProposals, setEarlyWinProposals] = useState(() => new Set());

  // Track timestamps when proposals achieved early-win (in-memory only)
  const [earlyWinTimestamps, setEarlyWinTimestamps] = useState(() => ({}));

  // Track user votes per investment round (in-memory only)
  const [userRoundVotes, setUserRoundVotes] = useState(() => ({}));

  // Track voters for each proposal (in-memory only)
  const [proposalVoters, setProposalVoters] = useState(() => ({}));

  // Track investment rounds (in-memory only)
  const [investmentRounds, setInvestmentRounds] = useState(() => ([]));

  // No-op: rounds are not persisted cross-client to avoid divergence
  const persistInvestmentRounds = useCallback(() => {}, []);



  const loadVoteEvents = useCallback(async (governorContract, proposalList = null) => {
    try {
      const contract = (() => {
        try {
          if (governorContract) return governorContract;
        } catch {}
        try {
          const ro = new ethers.providers.JsonRpcProvider(READONLY_PROVIDER_URL);
          return new ethers.Contract(CONTRACT_ADDRESSES.governor, GOVERNOR_ABI, ro);
        } catch {}
        return governorContract;
      })();
      if (!contract) return;

      const targets = Array.isArray(proposalList) && proposalList.length > 0 ? proposalList : proposals;
      if (!targets || targets.length === 0) return;

      const countsMap = {};
      for (const p of targets) {
        try {
          const res = await contract.getVoterCounts(p.id);
          const yesCount = parseInt(res[0].toString(), 10);
          countsMap[p.id] = Array.from({ length: yesCount }, (_, i) => `v${i}`);
        } catch {}
      }
      setProposalVoters(countsMap);
    } catch (error) {
      console.error('Load vote counts error:', error);
    }
  }, [proposals]);

  const loadProposals = useCallback(async (governorContract) => {
    try {
      const reader = (() => {
        try {
          if (governorContract) return governorContract;
        } catch {}
        try {
          const ro = new ethers.providers.JsonRpcProvider(READONLY_PROVIDER_URL);
          return new ethers.Contract(CONTRACT_ADDRESSES.governor, GOVERNOR_ABI, ro);
        } catch {}
        return governorContract;
      })();
      if (!reader) return;
      const count = await reader.proposalCount();
      const total = parseInt(count.toString(), 10);
      const loaded = [];


      // Proposals in contract start from index 1, not 0
      for (let i = 1; i <= total; i++) {
        try {
          const proposalData = await reader.getProposal(i);
          const [id, proposer, title, description, recipient, amount, voteStart, voteEnd, yesVotes, noVotes, executed] = proposalData;
          
          // Skip empty proposals (index 0 or invalid data)
          if (!proposer || proposer === '0x0000000000000000000000000000000000000000') {
            continue;
          }
          
          // Force refresh executed status from blockchain
          
          // If proposal is executed, mark it as such and potentially hide
          if (executed) {
          }
          
          loaded.push({
            id: parseInt(id.toString(), 10),
            proposer,
            title,
            description,
            recipient,
            amount: amount.toString(),
            voteStart: new Date(parseInt(voteStart.toString(), 10) * 1000),
            voteEnd: new Date(parseInt(voteEnd.toString(), 10) * 1000),
            yesVotes: yesVotes.toString(),
            noVotes: noVotes.toString(),
            executed,
          });
        } catch (e) {
          console.error('Load proposal error', i, e);
        }
      }
      
      // IMPORTANT: Detect if we loaded fewer proposals than expected
      // This indicates contract was redeployed or cache is stale
      
      // Check if any cached early-win proposals don't exist in loaded proposals
      const loadedIds = new Set(loaded.map(p => p.id));
      const cachedEarlyWinIds = Array.from(earlyWinProposals);
      const staleWinners = cachedEarlyWinIds.filter(id => !loadedIds.has(id));
      
      if (staleWinners.length > 0) {
        
        // Remove stale early-win proposals
            const cleanedWinners = new Set(cachedEarlyWinIds.filter(id => loadedIds.has(id)));
            setEarlyWinProposals(cleanedWinners);
        
        // Remove stale timestamps
        const cleanedTimestamps = {};
        Object.keys(earlyWinTimestamps).forEach(id => {
          if (loadedIds.has(parseInt(id))) {
            cleanedTimestamps[id] = earlyWinTimestamps[id];
          }
        });
              setEarlyWinTimestamps(cleanedTimestamps);
        
        // Also clean proposalVoters
        const cleanedVoters = {};
        Object.keys(proposalVoters).forEach(id => {
          if (loadedIds.has(parseInt(id))) {
            cleanedVoters[id] = proposalVoters[id];
          }
        });
              setProposalVoters(cleanedVoters);
        
      }
      
      if (loaded.length === 0 && governorContract) {
        try {
          const rc = await reader.proposalCount();
          const rtotal = parseInt(rc.toString(), 10);
          for (let i = 1; i <= rtotal; i++) {
            try {
              const data = await reader.getProposal(i);
              const [id, proposer, title, description, recipient, amount, voteStart, voteEnd, yesVotes, noVotes, executed] = data;
              if (!proposer || proposer === '0x0000000000000000000000000000000000000000') continue;
              loaded.push({
                id: parseInt(id.toString(), 10),
                proposer,
                title,
                description,
                recipient,
                amount: amount.toString(),
                voteStart: new Date(parseInt(voteStart.toString(), 10) * 1000),
                voteEnd: new Date(parseInt(voteEnd.toString(), 10) * 1000),
                yesVotes: yesVotes.toString(),
                noVotes: noVotes.toString(),
                executed,
              });
            } catch {}
          }
        } catch {}
      }
      setProposals(loaded);
      
      // Query on-chain voter counts per proposal and update map using connected provider
      try {
        if (!reader) throw new Error('Governor contract unavailable');
        const countsMap = {};
        for (const p of loaded) {
          try {
            const res = await reader.getVoterCounts(p.id);
            const yesCount = parseInt(res[0].toString(), 10);
            countsMap[p.id] = Array.from({ length: yesCount }, (_, i) => `v${i}`);
          } catch {}
        }
        setProposalVoters(countsMap);
      } catch (e) {
        console.error('Failed to load voter counts:', e);
      }
    } catch (error) {
      console.error('Load proposals error', error);
    }
  }, [loadVoteEvents, earlyWinProposals, earlyWinTimestamps, proposalVoters]);

  // ...existing code...



  

  // Auto-refresh proposals when early win status changes to update UI
  useEffect(() => {
    if (contracts?.governor && earlyWinProposals.size > 0) {
      // Trigger UI refresh and reload proposals
      setRefreshTrigger(prev => prev + 1);
      setTimeout(() => {
        loadProposals(contracts.governor);
      }, 1000);
    }
  }, [earlyWinProposals.size, contracts?.governor, loadProposals]);

  // Lightweight periodic polling to catch cross-client votes
  useEffect(() => {
    const contract = contracts?.governor || null;
    if (!contract) return;
    const interval = setInterval(() => loadVoteEvents(contract), 20000);
    return () => clearInterval(interval);
  }, [contracts?.governor, loadVoteEvents]);

  // Get voter count for a proposal - MUST be before early-win useEffect
  const getVoterCount = useCallback((proposalId) => {
    const voters = proposalVoters[proposalId] || [];
    const count = new Set(voters).size;
    return count;
  }, [proposalVoters]);

  // Separate useEffect to detect early-win WITHOUT side effects in render
  useEffect(() => {
    if (!proposals.length || !contracts?.governor) return;
    
    // Use setTimeout to ensure this runs AFTER render completes
    const timeoutId = setTimeout(() => {
      const checkEarlyWin = async () => {
        const rounds = getInvestmentRounds();
        
        for (const p of proposals) {
          // Skip if already marked as early-win or executed
          if (earlyWinProposals.has(p.id) || p.executed) continue;
          
          // Find which round this proposal belongs to
          const proposalRound = rounds.find(round => 
            round.proposals.some(rp => rp.id === p.id)
          );
          
          // Skip if round is already finished
          if (!proposalRound || proposalRound.isFinished) continue;
          
          // Check early-win condition
          const yesVotes = parseFloat(p.yesVotes);
          const actualVoterCount = getVoterCount(p.id);
          
          if (actualVoterCount > 0 && yesVotes > 0) {
            // Early-win: ≥50% số người đủ điều kiện (không ép tối thiểu 2)
            const totalHolders = tokenHoldersCount;
            const threshold = totalHolders > 0 ? Math.ceil(totalHolders / 2) : 0;
            const hasEarlyWin = totalHolders > 0 && actualVoterCount >= threshold;
            
            if (hasEarlyWin) {
              // Mark as early-win
              setEarlyWinProposals(prev => new Set([...prev, p.id]));

              const earlyWinTimestamp = Date.now();
              setEarlyWinTimestamps(prev => ({ ...prev, [p.id]: earlyWinTimestamp }));

              // Kiểm tra eligibleHoldersCount trước khi thực thi
              // Không gọi executeProposal từ frontend để tránh cần xác nhận MetaMask
              // Việc thực thi sẽ do hợp đồng xử lý nội bộ khi đạt early-win

              // Finalize round locally so trading stops and UI updates
              finalizeRoundForEarlyWinner(p.id, Date.now());

              // Refresh proposals from chain shortly after
              setTimeout(() => {
                loadProposals(contracts.governor);
              }, 500);
            }
          }
        }
      };
      
      checkEarlyWin();
    }, 0); // Run after current render completes
    
    return () => clearTimeout(timeoutId);
  }, [proposals, earlyWinProposals, contracts, getVoterCount, loadProposals, onExecuteSuccess, tokenHoldersCount]);

  // Get investment rounds - each round starts with first proposal and lasts 7 days or until early-win
  const getInvestmentRounds = useCallback(() => {
    if (!proposals.length) return [];
    
    // Sort proposals by creation time (voteStart)
    const sortedProposals = [...proposals].sort((a, b) => {
      const getTimeStamp = (proposal) => {
        if (proposal.voteStart instanceof Date) {
          return proposal.voteStart.getTime();
        } else if (typeof proposal.voteStart === 'number') {
          return proposal.voteStart;
        } else if (typeof proposal.voteStart === 'string') {
          const parsed = new Date(proposal.voteStart);
          return isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
        }
        return Date.now();
      };
      
      return getTimeStamp(a) - getTimeStamp(b);
    });
    
    // Do not load persisted rounds from localStorage to avoid cross-client divergence

    // Do NOT attach proposals based on persisted proposalIds to avoid misassignment across clients

    const rounds = [];
    const createdRoundIds = new Set();
    let currentRound = null;

    for (const proposal of sortedProposals) {
      // Get proposal creation time
      let proposalCreatedTime;
      try {
        if (proposal.voteStart instanceof Date) {
          proposalCreatedTime = proposal.voteStart.getTime();
        } else if (typeof proposal.voteStart === 'number') {
          proposalCreatedTime = proposal.voteStart;
        } else if (typeof proposal.voteStart === 'string') {
          proposalCreatedTime = new Date(proposal.voteStart).getTime();
        } else {
          console.warn(`Invalid voteStart for proposal ${proposal.id}:`, proposal.voteStart);
          proposalCreatedTime = Date.now();
        }
        
        if (isNaN(proposalCreatedTime)) {
          console.warn(`Invalid timestamp for proposal ${proposal.id}, using current time`);
          proposalCreatedTime = Date.now();
        }
      } catch (error) {
        console.error(`Error parsing date for proposal ${proposal.id}:`, error);
        proposalCreatedTime = Date.now();
      }
      
      // Consider a proposal a winner if it's marked early-win OR already executed on-chain
      const isWinner = earlyWinProposals.has(proposal.id) || Boolean(proposal.executed);

      // If this proposal belongs to a persisted finalized round, attach it there and
      // respect the persisted actualEndTime (do not extend it).
      // Ignore persisted proposalIds. Rounds are computed deterministically by time and early-win.

      // Start a new round if none exists
      if (!currentRound) {
        const roundStartTime = proposalCreatedTime;
        const roundEndTime = roundStartTime + (7 * 24 * 60 * 60 * 1000);
        currentRound = {
          id: rounds.length + 1,
          startTime: roundStartTime,
          endTime: roundEndTime,
          proposals: [],
          isFinished: false,
          earlyWinner: null,
          actualEndTime: null
        };
        rounds.push(currentRound);
      }

      // Start a new round immediately after a finished round before processing subsequent proposals
      if (currentRound && currentRound.isFinished) {
        const roundStartTime = proposalCreatedTime;
        const roundEndTime = roundStartTime + (7 * 24 * 60 * 60 * 1000);
        currentRound = {
          id: rounds.length + 1,
          startTime: roundStartTime,
          endTime: roundEndTime,
          proposals: [],
          isFinished: false,
          earlyWinner: null,
          actualEndTime: null
        };
        rounds.push(currentRound);
      }

      // If currentRound already has an earlyWinner, ensure endTime reflects its timestamp
      if (currentRound.earlyWinner && earlyWinTimestamps[currentRound.earlyWinner.id]) {
        const winTs = earlyWinTimestamps[currentRound.earlyWinner.id];
        currentRound.endTime = winTs;
        currentRound.actualEndTime = winTs;
      }

      // If this proposal was created AFTER the current round's endTime, close current round and start a new one
      if (proposalCreatedTime > currentRound.endTime) {
        if (!currentRound.isFinished) {
          currentRound.isFinished = true;
          currentRound.actualEndTime = currentRound.actualEndTime || currentRound.endTime;
        }

        // Start a new round for this proposal
        const roundStartTime = proposalCreatedTime;
        const roundEndTime = roundStartTime + (7 * 24 * 60 * 60 * 1000);
        currentRound = {
          id: rounds.length + 1,
          startTime: roundStartTime,
          endTime: roundEndTime,
          proposals: [],
          isFinished: false,
          earlyWinner: null,
          actualEndTime: null
        };
        rounds.push(currentRound);
      }

      // Now determine if this proposal belongs to the current round (created <= endTime)
      const createdInRound = proposalCreatedTime >= currentRound.startTime && proposalCreatedTime <= currentRound.endTime;

      if (createdInRound) {
        const proposalInRound = {
          ...proposal,
          createdTime: currentRound.startTime,
          roundId: currentRound.id,
          roundStartTime: currentRound.startTime,
          roundEndTime: currentRound.endTime
        };
        currentRound.proposals.push(proposalInRound);

        // If this proposal is a winner and the round doesn't yet have an earlyWinner, mark the earlyWinner
        if (isWinner && !currentRound.earlyWinner) {
          // Prefer explicit early-win timestamp for people-based early wins (immediate closure).
          // If this proposal was marked as an early-win (people-based), use the saved timestamp
          // or fallback to now so the round closes immediately. For executed proposals that
          // finished after vote period, prefer the on-chain voteEnd time.
          let earlyWinTime = null;
          if (earlyWinProposals.has(proposal.id)) {
            earlyWinTime = earlyWinTimestamps[proposal.id] || Date.now();
          } else if (proposal.executed) {
            // If the proposal was executed on-chain, consider the execution time as the round
            // closing moment (use now). Using voteEnd (which is typically voteStart + 7 days)
            // would incorrectly keep the round open until that future time.
            earlyWinTime = Date.now();
          } else {
            earlyWinTime = Date.now();
          }

          // Set early winner and shorten the round endTime to the win time.
          currentRound.earlyWinner = proposal;
          currentRound.actualEndTime = earlyWinTime;
          currentRound.endTime = earlyWinTime;
          // Mark the round as finished immediately so UI and trading reflect closure
          currentRound.isFinished = true;

          
        }
      } else {
        // This branch shouldn't be hit because we start a new round above when needed,
        // but keep a safe fallback log.
        console.warn(`⚠️ Proposal ${proposal.id} created outside expected round window for round ${currentRound.id}`);
      }
    }
    
    // Check if any round naturally ended (7 days passed) without early-win
    rounds.forEach(round => {
      if (!round.isFinished && Date.now() > round.endTime) {
        round.isFinished = true;
        round.actualEndTime = round.endTime;
      }
    });
    
    // KHÔNG cần update voteEnd cho proposals - proposals không có thời gian kết thúc riêng
    // Chỉ dựa vào thời gian tạo có nằm trong đợt hay không
    
    
    // If recomputed set has no active round but we previously synthesized an active placeholder,
    // keep that placeholder so UI shows the new round before any proposals exist
    try {
      const hasActive = rounds.some(r => !r.isFinished);
      if (!hasActive && Array.isArray(investmentRounds)) {
        const prevActive = investmentRounds.find(r => !r.isFinished);
        if (prevActive) {
          const existsSame = rounds.some(r => r.startTime === prevActive.startTime);
          if (!existsSame) {
            rounds.push(prevActive);
          }
        }
      }
    } catch {}

    // Persist sanitized rounds (do not store tentative 7-day endTime)
    persistInvestmentRounds(rounds);
    
    return rounds;
  }, [proposals, earlyWinProposals, earlyWinTimestamps, investmentRounds]);

  // Separate useEffect to sync investmentRounds state (avoid setState during render)
  useEffect(() => {
    if (!proposals.length) return;
    
    // Use setTimeout to ensure this runs AFTER render
    const timeoutId = setTimeout(() => {
      const rounds = getInvestmentRounds();
      setInvestmentRounds(rounds);
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [proposals, getInvestmentRounds]);

  const getProposalStatus = useCallback((p, circulatingSupply = 0) => {
    if (!p) return 'unknown';
    if (p.executed) return 'executed';
    const rounds = getInvestmentRounds();
    const proposalRound = rounds.find(round => round.proposals.some(rp => rp.id === p.id));
    const yesCount = (proposalVoters[p.id] || []).length;
    const threshold = circulatingSupply > 0 ? Math.ceil(parseFloat(circulatingSupply) / 2) : 0;

    // Early-win strictly by headcount while round is active
    if (proposalRound && !proposalRound.isFinished) {
      if (threshold > 0 && yesCount >= threshold) return 'early-win';
      return 'active';
    }

    // Round finished: decide by headcount winner
    if (proposalRound && proposalRound.isFinished) {
      const counts = (proposalRound.proposals || []).map(rp => ({ id: rp.id, c: (proposalVoters[rp.id] || []).length }));
      const max = counts.reduce((m, x) => x.c > m ? x.c : m, 0);
      const myCount = yesCount;
      if (max === 0) return 'defeated';
      return myCount === max ? 'succeeded' : 'defeated';
    }

    return 'active';
  }, [getInvestmentRounds, proposalVoters]);

  const getProposalCreatedTime = useCallback((p) => {
    const rounds = getInvestmentRounds();
    const proposalRound = rounds.find(r => r.proposals.some(rp => rp.id === p.id));
    if (proposalRound) {
      return new Date(proposalRound.startTime);
    }
    // Fallback: nếu chưa gán vòng, dùng startTime của vòng đầu tiên nếu có
    if (rounds && rounds.length > 0) {
      return new Date(rounds[0].startTime);
    }
    // Cuối cùng: tránh dùng ngày tạo riêng của đề xuất
    return new Date();
  }, [getInvestmentRounds]);

  // Check if user can vote with detailed reason (only 1 vote per investment round)
  const canUserVote = useCallback((proposalId) => {
    if (!account) return false;
    
    // Tìm proposal user muốn vote
    const targetProposal = proposals.find(p => p.id === proposalId);
    if (!targetProposal) return false;
    
    // Use shared getInvestmentRounds logic instead of duplicating
    const rounds = getInvestmentRounds();
    
    if (!rounds || rounds.length === 0) {
      return false;
    }
    
    // Find the active round (not finished)
    const activeRound = rounds.find(round => !round.isFinished);
    
    if (!activeRound) {
      return false;
    }
    
    // Kiểm tra proposal có trong đợt hiện tại không
    const isInCurrentRound = activeRound.proposals.some(p => p.id === proposalId);
    if (!isInCurrentRound) {
      return false;
    }

    // Kiểm tra user đã vote trong đợt hiện tại chưa
    const userVotesInCurrentRound = Object.keys(userRoundVotes).filter(pid => {
      const proposal = proposals.find(p => p.id.toString() === pid);
      if (!proposal) return false;
      
      const isInCurrentRound = activeRound.proposals.some(p => p.id === proposal.id);
      const isUserVote = userRoundVotes[pid] === account;
      
      return isInCurrentRound && isUserVote;
    });
    
    if (userVotesInCurrentRound.length > 0) {
      return false;
    }
    
    return true;
  }, [account, proposals, userRoundVotes, getInvestmentRounds]);

  // Reset user votes for new investment round when there's a winner
  const resetRoundVotes = useCallback(() => {
    const emptyVotes = {};
    setUserRoundVotes(emptyVotes);
    // Note: Don't reset proposalVoters as we want to keep historical vote counts
  }, []);

  // Finalize current round locally when an early-win is detected:
  // - reset per-round user votes
  // - recompute investment rounds and persist
  // - trigger UI refresh
  const finalizeRoundForEarlyWinner = useCallback((proposalId, timestamp) => {
    try {
      // reset per-round voting records so trading is disabled immediately
      resetRoundVotes();

      // Recompute rounds and then mark the round containing proposalId as finished
      const rounds = getInvestmentRounds();

      // Find the round that contains this proposal
      let targetRound = rounds.find(r => (r.proposals || []).some(p => p.id === proposalId));

      const nowTs = timestamp || Date.now();
      if (targetRound) {
        // Ensure we set finished and actual end time (do not extend if already set)
        if (!targetRound.isFinished) {
          targetRound.isFinished = true;
          targetRound.actualEndTime = targetRound.actualEndTime || nowTs;
          targetRound.endTime = targetRound.actualEndTime;
        }

        // Try to set earlyWinner if possible
        if (!targetRound.earlyWinner) {
          const winner = (targetRound.proposals || []).find(p => p.id === proposalId) || proposals.find(p => p.id === proposalId) || { id: proposalId };
          targetRound.earlyWinner = winner;
        }
      } else {
        console.warn(`Could not find round for proposal ${proposalId} when finalizing; creating a finished stub round.`);
        const stub = {
          id: rounds.length + 1,
          startTime: Date.now(),
          endTime: nowTs,
          proposals: [{ id: proposalId }],
          isFinished: true,
          earlyWinner: { id: proposalId },
          actualEndTime: nowTs
        };
        rounds.push(stub);
      }

      // Update state and persist sanitized rounds
      setInvestmentRounds(rounds);
      persistInvestmentRounds(rounds);

      // trigger UI refresh
      setRefreshTrigger(prev => prev + 1);

    } catch (e) {
      console.error('Error finalizing round for early winner:', e);
    }
  }, [getInvestmentRounds, resetRoundVotes]);

  // Get current active investment round
  const getCurrentRound = useCallback(() => {
    const rounds = getInvestmentRounds();
    return rounds.find(round => !round.isFinished) || null;
  }, [getInvestmentRounds]);

  // Ensure there is an active investment round. If none exists, create one starting now.
  const ensureActiveRound = useCallback(() => {
    try {
      // Recompute rounds to get freshest state
      const rounds = getInvestmentRounds();
      const active = rounds.find(r => !r.isFinished);

      if (active) {
        // Active round already exists
        return active;
      }

      // No active round -> create one starting now
      const startTime = Date.now();
      const expectedEnd = startTime + (7 * 24 * 60 * 60 * 1000);
      const newRound = {
        id: rounds.length + 1,
        startTime,
        endTime: expectedEnd,
        proposals: [],
        isFinished: false,
        earlyWinner: null,
        actualEndTime: null
      };

      const updatedRounds = [...rounds, newRound];
      setInvestmentRounds(updatedRounds);
      persistInvestmentRounds(updatedRounds);

      return newRound;
    } catch (e) {
      console.error('Error ensuring active round:', e);
      return null;
    }
  }, [getInvestmentRounds]);

  // Check if user can buy/refund tokens (only when NO active round)
  const canTradeTokens = useCallback(() => {
    const currentRound = getCurrentRound();
    const canTrade = !currentRound || currentRound.isFinished;
    
    return canTrade;
  }, [getCurrentRound]);

  const createProposal = useCallback(async (newProposal, onSuccess, skipReload = false) => {
    if (!contracts?.governor || !account) return;
    if (!skipReload) setIsLoading(true);
    try {
      // Ensure there is an active investment round before creating a proposal
      let currentRound = getCurrentRound();
      if (!currentRound) {
        // Create a new active round starting now
        currentRound = ensureActiveRound();
      }

      // Re-check if the current round is finished
      if (currentRound && currentRound.isFinished) {
        const reason = currentRound.earlyWinner 
          ? `đề xuất "${currentRound.earlyWinner.title}" đã thắng sớm`
          : 'đã hết 7 ngày';
        setStatus(`❌ Không thể tạo đề xuất: Đợt hiện tại đã kết thúc do ${reason}. Vui lòng chờ đợt mới.`);
        if (!skipReload) setIsLoading(false);
        return false;
      }
      
      // Kiểm tra limit tạo đề xuất: reset khi có proposal thắng hoặc sau 7 ngày
      const userProposals = proposals.filter(p => 
        p.proposer.toLowerCase() === account.toLowerCase()
      ).sort((a, b) => b.voteStart - a.voteStart); // Sort by newest first
      
      if (userProposals.length > 0) {
        // Tìm proposal thắng gần nhất
        const lastWinningProposal = userProposals.find(p => {
          const status = getProposalStatus(p);
          return status === 'succeeded' || status === 'executed' || status === 'early-win';
        });
        
        let countFrom = new Date(0); // Default: đếm từ đầu
        
        if (lastWinningProposal) {
          // Có proposal thắng -> đếm từ sau thời điểm thắng
          countFrom = lastWinningProposal.voteEnd;
        } else {
          // Không có proposal thắng -> đếm từ 7 ngày trước
          countFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        }
        
        // Nếu có một investment round đã kết thúc sau thời điểm countFrom, reset lại từ actualEndTime của đợt đó
        try {
          const rounds = getInvestmentRounds();
          const finishedRounds = (rounds || []).filter(r => r.isFinished && r.actualEndTime);
          if (finishedRounds.length > 0) {
            const latestEnd = Math.max(...finishedRounds.map(r => r.actualEndTime || 0));
            if (latestEnd && latestEnd > countFrom.getTime()) {
              countFrom = new Date(latestEnd);
            }
          }
        } catch (e) {
          console.error('Error computing reset time from finished rounds:', e);
        }
        
        // Đếm số proposal được tạo sau thời điểm reset
        const recentProposals = userProposals.filter(p => p.voteStart >= countFrom);
        
        if (recentProposals.length >= 3) {
          if (lastWinningProposal) {
            setStatus(`❌ Bạn đã tạo 3 đề xuất kể từ proposal thắng cuộc gần nhất. Cần có proposal thắng mới để reset limit.`);
          } else {
            const oldestProposal = recentProposals.sort((a, b) => a.voteStart - b.voteStart)[0];
            const resetDate = new Date(oldestProposal.voteStart.getTime() + 7 * 24 * 60 * 60 * 1000);
            setStatus(`❌ Bạn đã tạo 3 đề xuất trong 7 ngày. Có thể tạo lại sau ${resetDate.toLocaleDateString('vi-VN')}`);
          }
          if (!skipReload) setIsLoading(false);
          return false; // Return false để báo hiệu thất bại
        }
      }
      
      const tx = await contracts.governor.createProposal(
        newProposal.title,
        newProposal.description,
        newProposal.recipient,
        ethers.BigNumber.from(newProposal.amount) // Convert string to BigNumber
      );
      setStatus('Đang gửi giao dịch tạo đề xuất...');
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        setStatus('✅ Đã tạo đề xuất!');
        // Chỉ reload nếu không skip
        if (!skipReload) {
            try {
            await loadProposals(contracts.governor);
            // After reload, ensure the newly created proposal is present. If chain/indexer hasn't
            // indexed it yet, fetch the latest proposal by id and append if missing.
            try {
              const countBn = await contracts.governor.proposalCount();
              const latestId = parseInt(countBn.toString(), 10);
              if (latestId > 0) {
                const existsAfterReload = (proposals || []).some(p => p.id === latestId);
                if (!existsAfterReload) {
                  try {
                    const proposalData = await contracts.governor.getProposal(latestId);
                    const [id, proposer, title, description, recipient, amount, voteStart, voteEnd, yesVotes, noVotes, executed] = proposalData;
                    const newP = {
                      id: parseInt(id.toString(), 10),
                      proposer,
                      title,
                      description,
                      recipient,
                      amount: amount.toString(),
                      voteStart: new Date(parseInt(voteStart.toString(), 10) * 1000),
                      voteEnd: new Date(parseInt(voteEnd.toString(), 10) * 1000),
                      yesVotes: yesVotes.toString(),
                      noVotes: noVotes.toString(),
                      executed,
                    };
                    setProposals(prev => {
                      const exists = (prev || []).some(p => p.id === newP.id);
                      if (exists) return prev;
                      const updated = [...(prev || []), newP];
                      return updated;
                    });
                  } catch (fetchErr) {
                    console.error('Fallback fetch latest proposal error:', fetchErr);
                  }
                }
              }
            } catch (countErr) {
              console.error('Error checking proposalCount after create:', countErr);
            }
          } catch (reloadErr) {
            console.error('Reload proposals after create failed:', reloadErr);
          }
        }
        if (onSuccess) {
          await onSuccess();
        }
        return true; // Return true để báo hiệu thành công
      } else {
        setStatus('❌ Giao dịch thất bại');
        return false;
      }
    } catch (error) {
      console.error('Create proposal error:', error);
      setStatus('Lỗi tạo đề xuất: ' + error.message);
      return false;
    } finally {
      if (!skipReload) setIsLoading(false);
    }
  }, [contracts, account, proposals, loadProposals, setStatus, setIsLoading, getCurrentRound]);

  const voteOnProposal = useCallback(async (proposalId, support, totalHolders = 3) => {
    if (!contracts?.governor || !account) return;
    
    // Check detailed voting eligibility including ownership
    const eligibility = await getVotingEligibility(proposalId);
    if (!eligibility.canVote) {
      let message = '❌ Không thể vote: ';
      switch (eligibility.reason) {
        case 'insufficient_ownership':
          message += `Cần sở hữu ít nhất 1% VCDAO (hiện tại: ${eligibility.ownershipInfo?.formattedPercentage || '0%'})`;
          break;
        case 'already_voted':
          message += 'Bạn đã vote cho đề xuất này!';
          break;
        case 'already_voted_in_round':
          message += 'Bạn đã vote đề xuất khác trong đợt này!';
          break;
        case 'proposal_won':
          message += 'Đề xuất đã thắng!';
          break;
        default:
          message += 'Vui lòng thử lại sau';
      }
      setStatus(message);
      return;
    }
    
    setIsLoading(true);
    try {
      // Pre-checks to avoid on-chain reverts
      try {
        const already = await contracts.governor.hasVoted(proposalId, account);
        if (already) {
          setIsLoading(false);
          setStatus('❌ Bạn đã vote đề xuất này rồi');
          return;
        }
      } catch {}

      try {
        const pData = await contracts.governor.getProposal(proposalId);
        const voteStart = parseInt(pData[6].toString(), 10);
        const voteEnd = parseInt(pData[7].toString(), 10);
        const nowSec = Math.floor(Date.now() / 1000);
        if (nowSec < voteStart) {
          setIsLoading(false);
          setStatus('⏳ Voting chưa bắt đầu cho đề xuất này');
          return;
        }
        if (nowSec > voteEnd) {
          setIsLoading(false);
          setStatus('⏰ Voting đã kết thúc cho đề xuất này');
          return;
        }
      } catch {}

      try {
        // Ensure user has tokens
        if (contracts?.token && account) {
          const bal = await contracts.token.balanceOf(account);
          if (bal.eq(0)) {
            setIsLoading(false);
            setStatus('⚠️ Bạn chưa sở hữu VCDAO nên không thể vote');
            return;
          }
        }
      } catch {}

      // Simulate the vote to capture revert reason early
      try {
        await contracts.governor.callStatic.castVote(proposalId, support);
      } catch (simErr) {
        const msg = (simErr?.error?.message || simErr?.reason || simErr?.message || '').toLowerCase();
        if (msg.includes('already voted')) {
          setStatus('❌ Bạn đã vote đề xuất này rồi');
        } else if (msg.includes('voting not started')) {
          setStatus('⏳ Voting chưa bắt đầu cho đề xuất này');
        } else if (msg.includes('voting ended')) {
          setStatus('⏰ Voting đã kết thúc cho đề xuất này');
        } else if (msg.includes('no tokens')) {
          setStatus('⚠️ Bạn chưa sở hữu VCDAO nên không thể vote');
        } else {
          setStatus('❌ Không thể gửi phiếu: giao dịch sẽ bị revert');
        }
        setIsLoading(false);
        return;
      }

      const tx = await contracts.governor.castVote(proposalId, support);
      setStatus('Đang gửi phiếu...');
      await tx.wait();
      setStatus('Đã ghi nhận phiếu!');
      
      // Record user vote for this round
      const newUserRoundVotes = { ...userRoundVotes, [proposalId]: account };
      setUserRoundVotes(newUserRoundVotes);
      
      // Track voter for this proposal (for accurate people count) - only if YES vote
      if (support) {
        const existingVoters = proposalVoters[proposalId] || [];
        if (!existingVoters.includes(account)) {
          const newProposalVoters = { 
            ...proposalVoters, 
            [proposalId]: [...existingVoters, account]
          };
          setProposalVoters(newProposalVoters);
        }
      }
      
      const voteTimestamp = Date.now(); // Lưu thời gian vote
      
      // Reload proposals first to get updated vote counts
      await loadProposals(contracts.governor);
      
      // Check early-win using PEOPLE-BASED logic (consistent with getProposalStatus)
      try {
        // Get actual voter count and total holders
        const actualVoterCount = getVoterCount(proposalId);
        // Use eligible holder count from hook if available
        const eligibleHolders = tokenHoldersCount || totalHolders;
        const threshold = eligibleHolders > 0 ? Math.ceil(eligibleHolders / 2) : 0;
        const hasEarlyWin = eligibleHolders > 0 && actualVoterCount >= threshold;
        
          if (hasEarlyWin) {
          // Lưu vào earlyWinProposals Set
          const newEarlyWinProposals = new Set(earlyWinProposals);
          newEarlyWinProposals.add(proposalId);
          setEarlyWinProposals(newEarlyWinProposals);
          
          // Lưu timestamp early-win
          const newTimestamps = { ...earlyWinTimestamps, [proposalId]: voteTimestamp };
          setEarlyWinTimestamps(newTimestamps);
          
          // Kiểm tra eligibleHoldersCount trước khi thực thi
          // Không gọi executeProposal từ frontend để tránh cần xác nhận MetaMask
          // Việc thực thi sẽ do hợp đồng xử lý nội bộ khi đạt early-win
          
          // Finalize round locally to end investment round immediately
          finalizeRoundForEarlyWinner(proposalId, voteTimestamp);

          if (onVoteSuccess) {
            onVoteSuccess(proposalId, 'early-win');
          }
        } else if (onVoteSuccess) {
          onVoteSuccess(proposalId);
        }
      } catch (error) {
        console.error('Error checking early-win:', error);
        if (onVoteSuccess) {
          onVoteSuccess(proposalId);
        }
      }
    } catch (error) {
      console.error('Vote error:', error);
      setStatus('Lỗi vote: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [contracts, account, loadProposals, setStatus, setIsLoading, onVoteSuccess]);

  const executeProposal = useCallback(async (proposalId) => {
    if (!contracts?.governor) return;
    setIsLoading(true);
    try {
      const tx = await contracts.governor.executeProposal(proposalId);
      setStatus('Đang thực thi đề xuất...');
      const receipt = await tx.wait();
      setStatus('Đã thực thi đề xuất!');
      await loadProposals(contracts.governor);
      
      // Reload balances sau khi execute để cập nhật treasury balance
      if (receipt.status === 1 && onExecuteSuccess) {
        await onExecuteSuccess();
      }
    } catch (error) {
      console.error('Execute error:', error);
      setStatus('Lỗi thực thi: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [contracts, loadProposals, setStatus, setIsLoading, onExecuteSuccess]);

  // Owner-only: end the current investment round immediately by calling endVotingNow on each active proposal
  const endCurrentRound = useCallback(async () => {
    if (!contracts?.governor) return;
    try {
      setIsLoading(true);
      const currentRound = getCurrentRound();
      if (!currentRound) {
        setStatus('Không có đợt đầu tư đang hoạt động');
        return;
      }

      // Ensure caller is contract owner — endVotingNow is owner-only on-chain
      try {
        const contractOwner = await contracts.governor.owner();
        if (!account || contractOwner.toLowerCase() !== account.toLowerCase()) {
          setStatus('⚠️ Chỉ owner mới có thể kết thúc đợt. Vui lòng kết nối ví owner hoặc để owner thực hiện.');
          setIsLoading(false);
          return;
        }
      } catch (ownerErr) {
        console.error('Error fetching contract owner:', ownerErr);
        setStatus('Lỗi kiểm tra quyền owner: ' + (ownerErr.message || ownerErr));
        setIsLoading(false);
        return;
      }

      setStatus('Đang kết thúc đợt đầu tư...');
      for (const p of currentRound.proposals) {
        try {
          const tx = await contracts.governor.endVotingNow(p.id);
          await tx.wait();
        } catch (e) {
          // Better error messaging for common Ethers errors
          if (e && e.code === 'UNPREDICTABLE_GAS_LIMIT') {
            console.error(`Failed to end voting for proposal ${p.id}:`, e);
            setStatus(`❌ Không thể ước lượng gas cho proposal ${p.id}. Có thể giao dịch sẽ revert.`);
          } else {
            console.error(`Failed to end voting for proposal ${p.id}:`, e);
          }
        }
      }

      // Reload proposals after batch
      await loadProposals(contracts.governor);
      setStatus('✅ Đã kết thúc đợt đầu tư');
    } catch (error) {
      console.error('endCurrentRound error:', error);
      setStatus('Lỗi khi kết thúc đợt: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [contracts, getCurrentRound, loadProposals, setIsLoading, setStatus]);
  
  // Tìm proposal có nhiều vote nhất trong một batch (cùng thời gian tạo)
  const findWinningProposal = useCallback((proposalBatch) => {
    if (!proposalBatch || proposalBatch.length === 0) return null;
    
    // Sort theo yesVotes giảm dần
    const sorted = [...proposalBatch].sort((a, b) => 
      parseFloat(b.yesVotes) - parseFloat(a.yesVotes)
    );
    
    return sorted[0];
  }, []);

  // Get user ownership percentage for display
  const getUserOwnership = useCallback(async () => {
    if (!account || !contracts?.token) return { percentage: 0, meetsMinimum: false };
    
    try {
      // Fast path: dùng số liệu đã tải sẵn từ UI nếu có
      if (prefUserTokenBalance !== null && prefTotalSupply !== null) {
        const userBalNum = parseFloat(prefUserTokenBalance);
        const totalSupNum = parseFloat(prefTotalSupply);
        if (!isNaN(userBalNum) && !isNaN(totalSupNum) && totalSupNum > 0) {
          const ownershipPercentage = (userBalNum / totalSupNum) * 100;
          return {
            percentage: ownershipPercentage,
            meetsMinimum: ownershipPercentage >= 1,
            formattedPercentage: ownershipPercentage.toFixed(4) + '%'
          };
        }
      }

      let userTokenBalance, totalSupply;
      try {
        userTokenBalance = await contracts.token.balanceOf(account);
        totalSupply = await contracts.token.totalSupply();
      } catch (primaryErr) {
        try {
          const ro = new ethers.providers.JsonRpcProvider(READONLY_PROVIDER_URL);
          const roToken = new ethers.Contract(contracts.token.address, ['function balanceOf(address) view returns (uint256)', 'function totalSupply() view returns (uint256)'], ro);
          const pBal = roToken.balanceOf(account);
          const pTs = roToken.totalSupply();
          userTokenBalance = await Promise.race([pBal, new Promise(resolve => setTimeout(() => resolve(ethers.BigNumber.from(0)), 1500))]);
          totalSupply = await Promise.race([pTs, new Promise(resolve => setTimeout(() => resolve(ethers.BigNumber.from(0)), 1500))]);
        } catch (fallbackErr) {
          throw fallbackErr;
        }
      }
      
      const userBalanceInTokens = parseFloat(ethers.utils.formatEther(userTokenBalance));
      const totalSupplyInTokens = parseFloat(ethers.utils.formatEther(totalSupply));
      
      const ownershipPercentage = (userBalanceInTokens / totalSupplyInTokens) * 100;
      
      return {
        percentage: ownershipPercentage,
        meetsMinimum: ownershipPercentage >= 1,
        formattedPercentage: ownershipPercentage.toFixed(4) + '%'
      };
    } catch (error) {
      console.error('Error getting user ownership:', error);
      return { percentage: 0, meetsMinimum: false };
    }
  }, [account, contracts?.token, prefUserTokenBalance, prefTotalSupply]);

  // Get detailed voting eligibility info for a proposal
  const getVotingEligibility = useCallback(async (proposalId) => {
    if (!account) return { canVote: false, reason: 'no_wallet', ownershipInfo: null };
    
    const targetProposal = proposals.find(p => p.id === proposalId);
    if (!targetProposal) return { canVote: false, reason: 'proposal_not_found', ownershipInfo: null };
    
    // Get ownership info
    const timeoutMs = 1200;
    const guard = (p, fallback) => Promise.race([p, new Promise(resolve => setTimeout(() => resolve(fallback), timeoutMs))]);
    const ownershipInfo = await guard(getUserOwnership(), { percentage: 0, meetsMinimum: true, formattedPercentage: '0%' });
    
    // Check ownership requirement first
    if (!ownershipInfo.meetsMinimum) {
      return { 
        canVote: false, 
        reason: 'insufficient_ownership', 
        ownershipInfo 
      };
    }
    
    // Stronger cross-client check: read on-chain hasVoted (with read-only fallback & timeout)
    let governorReader = null;
    try {
      if (contracts?.governor) {
        governorReader = contracts.governor;
      }
    } catch {}
    if (!governorReader) {
      try {
        const ro = new ethers.providers.JsonRpcProvider(READONLY_PROVIDER_URL);
        governorReader = new ethers.Contract(CONTRACT_ADDRESSES.governor, GOVERNOR_ABI, ro);
      } catch {}
    }

    const safeHasVoted = async (pid, addr) => {
      try {
        const p = new Promise(async (resolve) => {
          try {
            const v = await governorReader.hasVoted(pid, addr);
            resolve(Boolean(v));
          } catch (e) {
            resolve(false);
          }
        });
        const t = new Promise(resolve => setTimeout(() => resolve(false), 2500));
        const r = await Promise.race([p, t]);
        return Boolean(r);
      } catch {
        return false;
      }
    };

    try {
      if (governorReader && typeof governorReader.hasVoted === 'function') {
        const voted = await safeHasVoted(proposalId, account);
        if (voted) {
          return { 
            canVote: false, 
            reason: 'already_voted', 
            ownershipInfo 
          };
        }
      }
    } catch {}
    
    // Check if proposal is won
    if (earlyWinProposals.has(proposalId)) {
      return { 
        canVote: false, 
        reason: 'proposal_won', 
        ownershipInfo 
      };
    }
    
    // Enforce one vote per round across clients using on-chain hasVoted
    try {
      const rounds = getInvestmentRounds();
      const activeRound = rounds.find(r => !r.isFinished);
      if (activeRound && activeRound.proposals && activeRound.proposals.length > 0) {
        for (const rp of activeRound.proposals) {
          if (rp.id === proposalId) continue;
          if (governorReader && typeof governorReader.hasVoted === 'function') {
            const votedAny = await safeHasVoted(rp.id, account);
            if (votedAny) {
              return { 
                canVote: false, 
                reason: 'already_voted_in_round', 
                ownershipInfo 
              };
            }
          }
        }
      }
    } catch {}
    
    return { 
      canVote: true, 
      reason: 'eligible', 
      ownershipInfo 
    };
  }, [account, proposals, earlyWinProposals, getUserOwnership, canUserVote]);

  // Check if a proposal should be hidden because its investment round has finished
  const shouldHideProposal = useCallback((proposal) => {
    // Nếu chính đề xuất này là early winner, ẩn khỏi tab proposals
    if (earlyWinProposals.has(proposal.id)) {
      return true;
    }
    
    // If proposal is executed, hide it from proposals tab (show in winning tab)
    if (proposal.executed) {
      return true;
    }
    
    const rounds = getInvestmentRounds();
    
    // If no rounds exist yet, NEVER hide proposals
    if (!rounds || rounds.length === 0) {
      return false;
    }
    
    // Find which round this proposal belongs to
    const proposalRound = rounds.find(round => 
      round.proposals.some(p => p.id === proposal.id)
    );
    
    // If proposal not in any round, it's new - show it
    if (!proposalRound) {
      return false;
    }
    
    // CRITICAL: If the round has an early winner and this proposal is NOT the winner, HIDE IT
    if (proposalRound.earlyWinner && proposalRound.earlyWinner.id !== proposal.id) {
      return true;
    }
    
    // If the round is finished (either by early-win or 7 days), hide non-winner proposals
    if (proposalRound.isFinished) {
      return true;
    }
    
    return false;
  }, [proposals, earlyWinProposals, getInvestmentRounds]);

  // Auto-execute winning proposals - TẮT ĐI vì đã có auto-executor script chạy ở backend
  // useEffect này gây lag do lặp lại liên tục khi có lỗi
  // Backend auto-executor sẽ xử lý việc execute tự động
  /*
  useEffect(() => {
    if (!contracts?.governor || !proposals.length) return;

    const autoExecuteWinningProposals = async () => {
      for (const proposal of proposals) {
        // Skip if already executed
        if (proposal.executed) {
          continue;
        }
        
        const status = getProposalStatus(proposal, proposals.length);
        
        // Auto-execute if proposal succeeded (won after voting period ended) OR early-win
        if (status === 'succeeded' || status === 'early-win') {
          try {
            const statusMessage = status === 'early-win' 
              ? `🎉 Đề xuất ${proposal.id} thắng sớm! Vui lòng xác nhận MetaMask...`
              : `🏆 Đề xuất ${proposal.id} thắng cuộc! Vui lòng xác nhận MetaMask...`;
            setStatus(statusMessage);
            
            const tx = await contracts.governor.executeProposal(proposal.id);
            setStatus('⚙️ Đang xử lý giao dịch trên blockchain...');
            await tx.wait();
            
            const successMessage = status === 'early-win'
              ? '✅ Đã chuyển tiền thành công cho đề xuất thắng sớm!'
              : '✅ Đã chuyển tiền thành công cho đề xuất thắng cuộc!';
            setStatus(successMessage);
            
            // Reload proposals để cập nhật trạng thái
            await loadProposals(contracts.governor);
            
            if (onExecuteSuccess) {
              await onExecuteSuccess();
            }
            
            // Chỉ execute một proposal một lúc để tránh race condition
            break;
          } catch (error) {
            console.error(`Auto-execute error for proposal ${proposal.id}:`, error);
            if (error.code === 4001) {
              setStatus(`❌ Bạn đã từ chối giao dịch cho đề xuất ${proposal.id}. Có thể thực hiện thủ công sau.`);
            } else {
              setStatus(`⚠️ Lỗi chuyển tiền cho đề xuất ${proposal.id}: ` + error.message);
            }
          }
        }
      }
    };

    // Chạy auto-execute mỗi 10 giây (giảm từ 2 giây để tránh lag)
    const interval = setInterval(autoExecuteWinningProposals, 10000);
    
    // Chạy ngay lập tức một lần
    autoExecuteWinningProposals();

    return () => clearInterval(interval);
  }, [contracts?.governor, proposals, setStatus, onExecuteSuccess, loadProposals]);
  */

  return {
    proposals,
    loadProposals,
    createProposal,
    voteOnProposal,
    executeProposal,
    getProposalStatus,
    getProposalCreatedTime,
    findWinningProposal,
    canUserVote,
    getUserOwnership,
    getVotingEligibility,
    getInvestmentRounds,
    getCurrentRound,
    canTradeTokens, // NEW: Check if user can buy/refund tokens
    shouldHideProposal,
    resetRoundVotes,
    getVoterCount,
    refreshTrigger, // For triggering UI updates
    reloadProposals: () => loadProposals(contracts.governor), // Thêm hàm reload từ bên ngoài
    investmentRounds, // Export rounds state
    endCurrentRound,
  };
}

