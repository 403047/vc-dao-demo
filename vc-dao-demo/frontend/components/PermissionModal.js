import React from 'react';

export default function PermissionModal({
  isOpen,
  onClose,
  tokenBalance,
  circulatingSupply,
  formatNumber,
  tokenHolders,
  account
}) {
  if (!isOpen) return null;
  const circulating = parseFloat(circulatingSupply);
  const balance = parseFloat(tokenBalance);
  const percentage = circulating > 0 ? (balance / circulating) * 100 : 0;
  
  // Kiểm tra điều kiện: < 1000 thì không cho phép, >= 1000 thì check top 2
  const isBelowThreshold = circulating < 1000;
  let userRank = null;
  let isInTop2 = false;
  
  if (!isBelowThreshold && tokenHolders && account) {
    const sortedHolders = [...tokenHolders].sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance));
    const userIndex = sortedHolders.findIndex(h => h.address.toLowerCase() === account.toLowerCase());
    userRank = userIndex >= 0 ? userIndex + 1 : null;
    isInTop2 = userRank && userRank <= 2;
  }
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-70 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-gray-800 border-2 border-blue-500 rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all">
        <div className="p-6">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-blue-500 bg-opacity-20 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <h3 className="text-xl font-bold text-center mb-3 text-blue-400">Không Đủ Quyền Tạo Đề Xuất</h3>
          
          {isBelowThreshold ? (
            <p className="text-gray-300 text-center mb-6">
              Token đang lưu hành phải <span className="text-yellow-400 font-bold">≥ 1000 VCDAO</span> thì mới có thể tạo đề xuất. Hiện tại: <span className="text-red-400 font-bold">{formatNumber(circulatingSupply, 2)} VCDAO</span>
            </p>
          ) : (
            <p className="text-gray-300 text-center mb-6">
              Token đang lưu hành ≥ 1000 VCDAO. Chỉ <span className="text-yellow-400 font-bold">2 người có nhiều token nhất</span> được tạo đề xuất.
            </p>
          )}
          
          <div className="bg-gray-900 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">Số dư của bạn:</span>
              <span className="font-mono font-semibold">{formatNumber(tokenBalance, 2)} VCDAO</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400 text-sm">Token đang lưu hành:</span>
              <span className="font-mono font-semibold">{formatNumber(circulatingSupply, 2)} VCDAO</span>
            </div>
            
            {isBelowThreshold ? (
              <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                <span className="text-gray-400 text-sm">Cần thêm:</span>
                <span className="font-mono font-bold text-yellow-400">
                  {formatNumber((1000 - circulating).toFixed(2), 2)} VCDAO
                </span>
              </div>
            ) : (
              <div className="flex justify-between items-center pt-2 border-t border-gray-700">
                <span className="text-gray-400 text-sm">Xếp hạng của bạn:</span>
                <span className={`font-mono font-bold ${isInTop2 ? 'text-green-400' : 'text-red-400'}`}>
                  {userRank ? `#${userRank}` : 'N/A'}
                </span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105">Đã Hiểu</button>
        </div>
      </div>
    </div>
  );
}
