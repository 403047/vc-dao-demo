import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';

// Utility function to check if address exists on blockchain
const checkAddressExists = async (address) => {
  try {
    if (!ethers.utils.isAddress(address)) {
      return { exists: false, error: 'Địa chỉ không hợp lệ' };
    }
    
    // Get current provider from window.ethereum
    if (!window.ethereum) {
      return { exists: false, error: 'Không tìm thấy MetaMask' };
    }
    
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    
    // Check if address has any transaction history or balance
    const [balance, transactionCount] = await Promise.all([
      provider.getBalance(address),
      provider.getTransactionCount(address)
    ]);
    
    // Address exists if it has balance > 0 or has made transactions
    const exists = balance.gt(0) || transactionCount > 0;
    
    return { 
      exists, 
      balance: ethers.utils.formatEther(balance),
      transactionCount,
      error: null 
    };
  } catch (error) {
    console.error('Error checking address:', error);
    return { exists: false, error: 'Lỗi kiểm tra địa chỉ: ' + error.message };
  }
};

export default function CreateProposalForm({
  newProposal,
  setNewProposal,
  onSubmit,
  onBatchComplete,
  isLoading = false,
  userProposalCount = 0,
  maxProposals = 3,
  treasuryBalance = '0',
  oldestProposalDate = null,
  canCreate = true,
  resetReason = 'time',
  lastWinningProposal = null,
}) {
  const remainingProposals = maxProposals - userProposalCount;
  const [proposals, setProposals] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [addressValidation, setAddressValidation] = useState({}); // Track validation status for each proposal
  const [validatingAddresses, setValidatingAddresses] = useState(new Set());
  const validationTimeouts = useRef({}); // Track debounce timeouts
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(validationTimeouts.current).forEach(clearTimeout);
    };
  }, []);
  
  // Tính ngày có thể tạo đề xuất mới nếu đã đạt giới hạn
  const resetDate = oldestProposalDate ? new Date(oldestProposalDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null;
  
  const addNewProposal = () => {
    if (proposals.length >= remainingProposals) return;
    const newId = Date.now();
    setProposals([...proposals, { 
      id: newId, 
      title: '', 
      description: '', 
      recipient: '', 
      amount: '' 
    }]);
    setExpandedId(newId);
  };
  
  const removeProposal = (id) => {
    setProposals(proposals.filter(p => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  };
  
  const updateProposal = (id, field, value) => {
    setProposals(proposals.map(p => p.id === id ? { ...p, [field]: value } : p));
    
    // Auto validate address when user types
    if (field === 'recipient') {
      setAddressValidation(prev => ({ ...prev, [id]: null }));
      
      // Clear previous timeout
      if (validationTimeouts.current[id]) {
        clearTimeout(validationTimeouts.current[id]);
      }
      
      // Debounce validation - wait 1.5 seconds after user stops typing
      if (value && ethers.utils.isAddress(value)) {
        validationTimeouts.current[id] = setTimeout(() => {
          validateAddress(id, value);
        }, 1500);
      }
    }
  };
  
  const validateAddress = async (id, address) => {
    if (!address || !ethers.utils.isAddress(address)) {
      setAddressValidation(prev => ({ ...prev, [id]: null }));
      return;
    }
    
    setValidatingAddresses(prev => new Set(prev).add(id));
    
    try {
      const result = await checkAddressExists(address);
      setAddressValidation(prev => ({ ...prev, [id]: result }));
    } catch (error) {
      setAddressValidation(prev => ({ 
        ...prev, 
        [id]: { exists: false, error: 'Lỗi kiểm tra địa chỉ' } 
      }));
    } finally {
      setValidatingAddresses(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };
  
  const submitAllProposals = async () => {
    // Kiểm tra tất cả proposals có hợp lệ không
    const validProposals = proposals.filter(p => {
      if (!p.title || !p.description || !p.recipient || !p.amount) return false;
      if (parseFloat(p.amount) <= 0 || parseFloat(p.amount) > maxTreasuryAmount) return false;
      
      // Kiểm tra địa chỉ hợp lệ và tồn tại
      try {
        ethers.utils.getAddress(p.recipient);
        const validation = addressValidation[p.id];
        return validation && validation.exists; // Chỉ cho phép nếu địa chỉ tồn tại
      } catch {
        return false;
      }
    });
    
    if (validProposals.length === 0) {
      return; // Không có proposal hợp lệ
    }
    
    let successCount = 0;
    
    // Tạo tuần tự từng proposal với delay nhỏ để tránh xung đột
    for (let i = 0; i < validProposals.length; i++) {
      const proposal = validProposals[i];
      try {
        // Convert amount từ CFLR sang Wei
        const amountInWei = ethers.utils.parseEther(proposal.amount.toString());
        
        const proposalData = {
          title: proposal.title,
          description: proposal.description,
          recipient: proposal.recipient,
          amount: amountInWei.toString(), // Gửi amount dạng Wei string
          skipReload: i < validProposals.length - 1, // Skip reload cho tất cả trừ cái cuối
        };
        
        // Pass proposal data directly instead of relying on state
        const success = await onSubmit(proposalData);
        if (success) successCount++;
        
        // Delay nhỏ giữa các proposal để tránh xung đột blockchain
        if (i < validProposals.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error('Error submitting proposal:', error);
        // Tiếp tục với proposal tiếp theo ngay cả khi có lỗi
      }
    }
    
    // Xóa tất cả proposals sau khi tạo xong
    setProposals([]);
    
    // Gọi callback để reload proposals
    if (onBatchComplete) {
      await onBatchComplete();
    }
    
    // Thông báo kết quả
    if (successCount === validProposals.length) {
      console.log(`✅ Đã tạo thành công ${successCount} đề xuất!`);
    } else {
      console.log(`⚠️ Tạo thành công ${successCount}/${validProposals.length} đề xuất`);
    }
  };
  
  const maxTreasuryAmount = parseFloat(treasuryBalance || '0');
  
  return (
    <div className="max-w-2xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Tạo Đề Xuất Đầu Tư</h2>
        <div className="text-sm">
          <span className={`font-semibold ${remainingProposals > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {userProposalCount}/{maxProposals}
          </span>
          <span className="text-gray-400 ml-1">
            đề xuất ({resetReason === 'winning' ? 'từ lần thắng cuối' : '7 ngày'})
          </span>
        </div>
      </div>
      
      {!canCreate && resetReason === 'round_finished' && (
        <div className="mb-4 bg-purple-900 bg-opacity-30 border border-purple-500 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">🏁</span>
            <div>
              <p className="text-purple-400 font-semibold mb-1">Đợt đề xuất đã kết thúc</p>
              <p className="text-purple-300 text-sm">
                Đợt đề xuất hiện tại đã kết thúc {lastWinningProposal ? 
                  `do proposal "${lastWinningProposal.title}" thắng sớm` : 
                  'sau 7 ngày'}.
                Vui lòng chờ đợt mới bắt đầu.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {!canCreate && resetReason === 'winning' && (
        <div className="mb-4 bg-orange-900 bg-opacity-30 border border-orange-500 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">🏆</span>
            <div>
              <p className="text-orange-400 font-semibold mb-1">Đã đạt giới hạn sau lần thắng cuối</p>
              <p className="text-orange-300 text-sm">
                Bạn đã tạo {maxProposals} đề xuất kể từ proposal "{lastWinningProposal?.title}" thắng cuộc. 
                Cần có proposal thắng mới để reset limit.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {!canCreate && resetReason === 'time' && resetDate && (
        <div className="mb-4 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">⏰</span>
            <div>
              <p className="text-red-400 font-semibold mb-1">Đã đạt giới hạn 7 ngày</p>
              <p className="text-red-300 text-sm">
                Bạn đã tạo {maxProposals} đề xuất trong 7 ngày. Có thể tạo lại sau <span className="font-semibold">{resetDate.toLocaleDateString('vi-VN')}</span>
              </p>
            </div>
          </div>
        </div>
      )}
      
      {!canCreate && resetReason === 'time' && !resetDate && (
        <div className="mb-4 bg-red-900 bg-opacity-30 border border-red-500 rounded-lg p-4">
          <p className="text-red-400 text-sm">
            ⚠️ Bạn đã tạo tối đa {maxProposals} đề xuất trong 7 ngày!
          </p>
        </div>
      )}
      
      {canCreate && remainingProposals === 1 && (
        <div className="mb-4 bg-yellow-900 bg-opacity-30 border border-yellow-500 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="text-yellow-400 font-semibold mb-1">Đề xuất cuối cùng!</p>
              <p className="text-yellow-300 text-sm">
                Bạn chỉ còn {remainingProposals} đề xuất cuối cùng {resetReason === 'winning' ? 'kể từ lần thắng cuối' : 'trong 7 ngày'}. 
                Hãy suy nghĩ kỹ!
              </p>
            </div>
          </div>
        </div>
      )}
      
      {canCreate && lastWinningProposal && resetReason === 'winning' && remainingProposals > 1 && (
        <div className="mb-4 bg-green-900 bg-opacity-30 border border-green-500 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="text-green-400 font-semibold mb-1">Limit đã được reset!</p>
              <p className="text-green-300 text-sm">
                Proposal "{lastWinningProposal.title}" của bạn đã thắng cuộc! Bạn có thể tạo thêm {remainingProposals} đề xuất.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="space-y-4 mb-4">
        {proposals.map((proposal, index) => (
          <div key={proposal.id} className="border border-gray-600 rounded-lg overflow-hidden">
            {/* Header - Clickable */}
            <button
              onClick={() => setExpandedId(expandedId === proposal.id ? null : proposal.id)}
              className="w-full flex items-center justify-between p-4 bg-gray-700 hover:bg-gray-650 transition-colors"
            >
              <span className="font-medium">
                {proposal.title || `Lựa chọn ${index + 1}`}
              </span>
              <svg 
                className={`w-5 h-5 transition-transform ${expandedId === proposal.id ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Expandable Content */}
            {expandedId === proposal.id && (
              <div className="p-4 bg-gray-800 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tiêu Đề Đề Xuất</label>
                  <input
                    type="text"
                    value={proposal.title}
                    onChange={(e) => updateProposal(proposal.id, 'title', e.target.value)}
                    placeholder="vd: Đầu tư vào Startup Web3 Gaming"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Mô Tả</label>
                  <textarea
                    value={proposal.description}
                    onChange={(e) => updateProposal(proposal.id, 'description', e.target.value)}
                    placeholder="Mô tả cơ hội đầu tư, đội ngũ và lợi nhuận tiềm năng..."
                    rows="3"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Địa Chỉ Người Nhận</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={proposal.recipient}
                      onChange={(e) => updateProposal(proposal.id, 'recipient', e.target.value)}
                      placeholder="0x..."
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 pr-10 focus:outline-none focus:border-blue-500 transition-colors font-mono text-sm"
                    />
                    {/* Auto validation indicator */}
                    {validatingAddresses.has(proposal.id) && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-blue-400">⏳</span>
                      </div>
                    )}
                    {addressValidation[proposal.id] && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className={addressValidation[proposal.id].exists ? 'text-green-400' : 'text-red-400'}>
                          {addressValidation[proposal.id].exists ? '✅' : '❌'}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Address validation status */}
                  {addressValidation[proposal.id] && (
                    <div className={`mt-2 p-2 rounded text-sm ${
                      addressValidation[proposal.id].exists 
                        ? 'bg-green-900 bg-opacity-30 border border-green-500 text-green-400'
                        : 'bg-red-900 bg-opacity-30 border border-red-500 text-red-400'
                    }`}>
                      {addressValidation[proposal.id].exists ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <span>✅ Địa chỉ tồn tại</span>
                          </div>
                          <div className="text-xs mt-1 text-gray-300">
                            Số dư: {parseFloat(addressValidation[proposal.id].balance).toFixed(4)} CFLR
                            {addressValidation[proposal.id].transactionCount > 0 && 
                              ` • ${addressValidation[proposal.id].transactionCount} giao dịch`
                            }
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span>❌ {addressValidation[proposal.id].error || 'Địa chỉ không tồn tại hoặc chưa có hoạt động'}</span>
                          <div className="text-xs mt-1 text-gray-300">
                            Địa chỉ cần có số dư &gt; 0 hoặc đã thực hiện giao dịch
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {proposal.recipient && ethers.utils.isAddress(proposal.recipient) && !addressValidation[proposal.id] && !validatingAddresses.has(proposal.id) && (
                    <div className="mt-2 p-2 rounded text-sm bg-blue-900 bg-opacity-30 border border-blue-500 text-blue-400">
                      🔍 Đang tự động kiểm tra địa chỉ...
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Số Tiền Đầu Tư (CFLR)
                    <span className="text-xs text-gray-400 ml-2">
                      Tối đa: {treasuryBalance} CFLR
                    </span>
                  </label>
                  <input
                    type="number"
                    value={proposal.amount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (val <= maxTreasuryAmount || e.target.value === '') {
                        updateProposal(proposal.id, 'amount', e.target.value);
                      }
                    }}
                    placeholder="0.1"
                    step="0.01"
                    min="0"
                    max={maxTreasuryAmount}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  {parseFloat(proposal.amount) > maxTreasuryAmount && (
                    <p className="text-xs text-red-400 mt-1">⚠️ Vượt quá số dư Treasury!</p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => removeProposal(proposal.id)}
                    className="w-full px-4 bg-red-600 hover:bg-red-700 rounded-lg py-2.5 transition-colors"
                    title="Xóa"
                  >
                    🗑️ Xóa
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Add New Proposal Button */}
      <button
        onClick={addNewProposal}
        disabled={proposals.length >= remainingProposals || !canCreate}
        className="w-full border-2 border-dashed border-blue-500 rounded-lg py-3 text-blue-400 hover:bg-blue-500 hover:bg-opacity-10 transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        <span className="text-lg mr-2">+</span> Thêm lựa chọn ({proposals.length}/{canCreate ? remainingProposals : 0})
      </button>
      
      {/* Submit All Button - Outside cards */}
      {proposals.length > 0 && (() => {
        const completeProposals = proposals.filter(p => {
          if (!p.title || !p.description || !p.recipient || !p.amount) return false;
          const validation = addressValidation[p.id];
          return validation && validation.exists;
        });
        
        const incompleteCount = proposals.length - completeProposals.length;
        
        return (
          <div className="mt-4">
            {incompleteCount > 0 && (
              <div className="mb-2 p-3 rounded bg-yellow-900 bg-opacity-30 border border-yellow-500 text-yellow-400 text-sm">
                ⚠️ {incompleteCount} đề xuất chưa hoàn tất: Cần điền đầy đủ thông tin và địa chỉ người nhận phải hợp lệ
              </div>
            )}
            <button
              onClick={submitAllProposals}
              disabled={isLoading || completeProposals.length === 0}
              className="w-full bg-gradient-to-r from-green-500 to-blue-500 rounded-lg py-4 font-semibold text-lg hover:from-green-600 hover:to-blue-600 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Đang tạo đề xuất...' : `Tạo ${completeProposals.length} Đề Xuất`}
            </button>
          </div>
        );
      })()}
    </div>
  );
}
