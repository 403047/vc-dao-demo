import React from 'react';

export default function HoldersSection({
  tokenHolders = [],
  totalSupply = '0',
  circulatingSupply = '0',
  isLoading = false,
  onRefresh,
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Người Sở Hữu Token VCDAO</h2>
          <div className="flex items-center space-x-4 mt-2 text-sm">
            <p className="text-gray-400">
              <span className="font-semibold text-white">Tổng cung:</span>{' '}
              {parseFloat(totalSupply || '0').toLocaleString()} VCDAO
            </p>
            <span className="text-gray-600">•</span>
            <p className="text-gray-400">
              <span className="font-semibold text-green-400">Đang lưu hành:</span>{' '}
              {parseFloat(circulatingSupply || '0').toLocaleString()} VCDAO
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            * Tỷ lệ % được tính dựa trên số token đang lưu hành (không bao gồm token dự trữ của quỹ)
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg font-semibold transition-colors duration-200 disabled:opacity-50"
        >
          🔄 Làm Mới
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold mb-2">Đang Tải Danh Sách...</h3>
          <p className="text-gray-400">Vui lòng đợi trong giây lát</p>
        </div>
      ) : tokenHolders.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-700 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl">👥</span>
          </div>
          <h3 className="text-xl font-semibold mb-2">Chưa Tìm Thấy Người Sở Hữu</h3>
          <p className="text-gray-400 mb-4">Click "Làm Mới" để tải danh sách người sở hữu token</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-3 gap-4 text-sm font-semibold text-gray-400">
              <div>Địa Chỉ</div>
              <div className="text-right">Số Dư</div>
              <div className="text-right">Tỷ Lệ</div>
            </div>
          </div>

          {tokenHolders.map((holder, index) => (
            <div key={holder.address} className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500 transition-colors duration-200">
              <div className="grid grid-cols-3 gap-4 items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center font-bold">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-mono text-sm">{holder.address.slice(0, 6)}...{holder.address.slice(-4)}</p>
                    <a
                      href={`https://coston-explorer.flare.network/address/${holder.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      Xem trên Explorer ↗
                    </a>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-lg">{parseFloat(holder.balance).toFixed(2)}</p>
                  <p className="text-xs text-gray-400">VCDAO</p>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-lg text-green-400">{holder.percentage}%</p>
                  <div className="mt-1 w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                      style={{ width: `${Math.min(holder.percentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className="mt-6 p-4 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <p className="text-blue-400 text-sm text-center">
              📊 Tổng số người sở hữu: <strong>{tokenHolders.length}</strong> địa chỉ
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
