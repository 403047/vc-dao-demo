import { useState, useRef, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { NETWORK_CONFIG, READONLY_PROVIDER_URL } from '../src/config/daoContracts';

export function useTokenHolders(setStatus) {
  const [tokenHolders, setTokenHolders] = useState([]);
  const [totalSupply, setTotalSupply] = useState('0');
  const [ownerAddress, setOwnerAddress] = useState('');
  const [ownerBalance, setOwnerBalance] = useState('0');
  const [circulatingSupply, setCirculatingSupply] = useState('0');
  const [isLoadingHolders, setIsLoadingHolders] = useState(false);
  const hasLoadedHolders = useRef(false);

  const loadTokenHolders = useCallback(async (tokenContract, activeTab) => {
    try {
      if (!tokenContract) return;
      setIsLoadingHolders(true);

      let owner = '';
      let supply = ethers.BigNumber.from(0);
      let ownerBal = ethers.BigNumber.from(0);
      try {
        owner = await tokenContract.owner();
        supply = await tokenContract.totalSupply();
        ownerBal = await tokenContract.balanceOf(owner);
      } catch (ePrimary) {
        try {
          const ro = new ethers.providers.JsonRpcProvider(READONLY_PROVIDER_URL);
          const roToken = new ethers.Contract(tokenContract.address, [
            'function owner() view returns (address)',
            'function totalSupply() view returns (uint256)',
            'function balanceOf(address) view returns (uint256)'
          ], ro);
          owner = await roToken.owner();
          supply = await roToken.totalSupply();
          ownerBal = await roToken.balanceOf(owner);
        } catch (eFallback) {
          throw eFallback;
        }
      }
      setOwnerAddress(owner.toLowerCase());
      const formattedSupply = ethers.utils.formatUnits(supply, 18);
      setTotalSupply(formattedSupply);
      const formattedOwnerBalance = ethers.utils.formatUnits(ownerBal, 18);
      setOwnerBalance(formattedOwnerBalance);

      // Token Đang Lưu Hành = Total Supply (bao gồm cả token của owner)
      const circulating = parseFloat(formattedSupply);
      setCirculatingSupply(circulating.toString());

      const tokenAddress = tokenContract.address;
      const apiUrl = `https://coston-explorer.flare.network/api/v2/tokens/${tokenAddress}/holders`;
      
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
          // Token mới, explorer chưa index → dùng fallback im lặng
          throw new Error('API not available');
        }
        const data = await response.json();

        const holdersData = [];
        if (data.items && Array.isArray(data.items)) {
          for (const holder of data.items) {
            try {
              const holderAddress = holder.address.hash.toLowerCase();
              const balance = ethers.utils.formatUnits(holder.value || '0', 18);
              const percentage = circulating > 0 ? ((parseFloat(balance) / circulating) * 100).toFixed(2) : '0.00';
              holdersData.push({ address: holderAddress, balance, percentage });
            } catch (e) {
              console.error('Parse holder error', e);
            }
          }
        }
        holdersData.sort((a,b) => parseFloat(b.balance) - parseFloat(a.balance));
        setTokenHolders(holdersData);

        if (activeTab === 'holders') {
          if (holdersData.length > 0) setStatus(`✅ Đã tải ${holdersData.length} người sở hữu`);
          else setStatus('⚠️ Chưa có người dùng mua token');
        }
      } catch (apiError) {
        // Fallback: token mới, thử build holders từ on-chain Transfer logs
        try {
          const rpcProvider = tokenContract.provider || new ethers.providers.JsonRpcProvider(READONLY_PROVIDER_URL);
          if (!rpcProvider) throw new Error('No provider available for on-chain fallback');

          const transferTopic = ethers.utils.id('Transfer(address,address,uint256)');
          // The RPC may limit the maximum blocks per getLogs call. Scan in chunks.
          const latestBlock = await rpcProvider.getBlockNumber();
          // Prefer scanning recent history instead of genesis; limit to last N blocks to avoid massive scans
          const MAX_SCAN_BLOCKS = parseInt(process.env.NEXT_PUBLIC_FALLBACK_MAX_BLOCKS || '200000', 10);
          // Try small chunks first to satisfy strict RPC limits (some RPCs limit to 30 blocks)
          const chunkSizeCandidates = [30, 10, 5, 1];
          let startBlock = Math.max(0, latestBlock - MAX_SCAN_BLOCKS);

          let logs = [];
          let usedChunk = null;
          for (const candidate of chunkSizeCandidates) {
            try {
              const tmpLogs = [];
              const estimatedRequests = Math.ceil((latestBlock - startBlock + 1) / candidate);
              // Avoid sending an extremely large number of requests
              const MAX_REQUESTS = 800; // safety cap
              if (estimatedRequests > MAX_REQUESTS) {
                // shrink the scan window so we don't send too many requests
                startBlock = Math.max(latestBlock - candidate * MAX_REQUESTS, 0);
              }

              for (let from = startBlock; from <= latestBlock; from += candidate) {
                const to = Math.min(from + candidate - 1, latestBlock);
                try {
                  const windowLogs = await rpcProvider.getLogs({
                    address: tokenAddress,
                    fromBlock: from,
                    toBlock: to,
                    topics: [transferTopic]
                  });
                  if (windowLogs && windowLogs.length) tmpLogs.push(...windowLogs);
                } catch (innerErr) {
                  // If RPC reports a specific max block window, try to adapt to it
                  const msg = innerErr && innerErr.message ? innerErr.message : '';
                  const m = msg.match(/maximum is set to (\d+)/);
                  if (m && m[1]) {
                    const rpcMax = parseInt(m[1], 10);
                    if (!isNaN(rpcMax) && rpcMax > 0 && rpcMax < candidate) {
                      // restart attempt with rpcMax as candidate by breaking to outer loop
                      console.warn(`RPC enforces max window ${rpcMax}, will retry with that chunk size`);
                      throw new Error(`RPC_MAX_${rpcMax}`);
                    }
                  }
                  // otherwise log and continue (try next smaller global candidate)
                  console.warn(`getLogs window ${from}-${to} failed`, innerErr.message || innerErr);
                  throw innerErr;
                }
              }
              logs = tmpLogs;
              usedChunk = candidate;
              break; // success
            } catch (e) {
              // If we signaled a specific RPC_MAX via thrown Error string, insert that into candidates list
              const code = e && e.message ? e.message : '';
              const rpcMaxMatch = code.match(/RPC_MAX_(\d+)/);
              if (rpcMaxMatch) {
                const rpcMax = parseInt(rpcMaxMatch[1], 10);
                // try rpcMax directly
                try {
                  const tmpLogs = [];
                  const rpcCandidate = rpcMax;
                  const estimatedRequests = Math.ceil((latestBlock - startBlock + 1) / rpcCandidate);
                  const MAX_REQUESTS = 1200;
                  if (estimatedRequests > MAX_REQUESTS) {
                    startBlock = Math.max(latestBlock - rpcCandidate * MAX_REQUESTS, 0);
                  }
                  for (let from = startBlock; from <= latestBlock; from += rpcCandidate) {
                    const to = Math.min(from + rpcCandidate - 1, latestBlock);
                    const windowLogs = await rpcProvider.getLogs({
                      address: tokenAddress,
                      fromBlock: from,
                      toBlock: to,
                      topics: [transferTopic]
                    });
                    if (windowLogs && windowLogs.length) tmpLogs.push(...windowLogs);
                  }
                  logs = tmpLogs;
                  usedChunk = rpcCandidate;
                  break;
                } catch (e2) {
                  console.warn('Retry with RPC max failed, continuing to next candidate', e2.message || e2);
                }
              }
              // try next smaller candidate
              console.warn(`getLogs with chunk failed, trying smaller chunk`, e.message || e);
              continue;
            }
          }
          if (usedChunk === null) throw new Error('Failed to fetch logs with available chunk sizes');

          const balances = new Map();
          const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

          for (const log of logs) {
            // topics[1] = from, topics[2] = to
            const fromTopic = log.topics[1] || null;
            const toTopic = log.topics[2] || null;

            const from = fromTopic ? ethers.utils.getAddress('0x' + fromTopic.slice(-40)) : ZERO_ADDR;
            const to = toTopic ? ethers.utils.getAddress('0x' + toTopic.slice(-40)) : ZERO_ADDR;
            const value = ethers.BigNumber.from(log.data || '0');

            if (from !== ZERO_ADDR) {
              const prev = balances.get(from) || ethers.BigNumber.from(0);
              balances.set(from, prev.sub(value));
            }
            if (to !== ZERO_ADDR) {
              const prev = balances.get(to) || ethers.BigNumber.from(0);
              balances.set(to, prev.add(value));
            }
          }

          const holdersData = [];
          const circulating = parseFloat(ethers.utils.formatUnits(supply, 18));

          for (const [addr, bn] of balances.entries()) {
            // skip zero or negative balances
            if (!bn || bn.lte(0)) continue;
            const balance = ethers.utils.formatUnits(bn, 18);
            const percentage = circulating > 0 ? ((parseFloat(balance) / circulating) * 100).toFixed(2) : '0.00';
            holdersData.push({ address: addr.toLowerCase(), balance, percentage });
          }

          holdersData.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
          setTokenHolders(holdersData);

          if (activeTab === 'holders') {
            if (holdersData.length > 0) setStatus(`✅ Đã tải ${holdersData.length} người sở hữu (on-chain)`);
            else setStatus('ℹ️ Chưa có holder; token có thể vừa được deploy');
          }
        } catch (fallbackError) {
          // If on-chain fallback fails, keep silent and show friendly message
          console.error('Token holders on-chain fallback failed', fallbackError);
          const holdersData = [];
          setTokenHolders(holdersData);
          if (activeTab === 'holders') {
            setStatus('ℹ️ Token mới deploy, chưa có dữ liệu holder từ explorer. Mua token để trở thành holder đầu tiên!');
          }
        }
      }
    } catch (error) {
      console.error('Load holders error', error);
      if (activeTab === 'holders') {
        setStatus('ℹ️ Token mới, explorer đang index. Quay lại sau hoặc mua token để thấy balance của bạn!');
      }
    } finally {
      setIsLoadingHolders(false);
    }
  }, [setStatus]);

  return {
    tokenHolders,
    totalSupply,
    ownerAddress,
    ownerBalance,
    circulatingSupply,
    isLoadingHolders,
    hasLoadedHolders,
    loadTokenHolders
  };
}

// Auto-reload helper: call `loadTokenHolders` when token contract address, account or activeTab changes
export function useAutoReloadTokenHolders(tokenContract, account, activeTab, loadTokenHolders) {
  const tokenAddr = tokenContract && tokenContract.address ? tokenContract.address : null;

  useEffect(() => {
    if (!loadTokenHolders) return;
    // Only reload if we have a token contract; if account is present try to load holders for user's perspective
    if (tokenContract) {
      loadTokenHolders(tokenContract, activeTab || 'dashboard');
    }
  }, [tokenAddr, account, activeTab]);

  return null;
}
