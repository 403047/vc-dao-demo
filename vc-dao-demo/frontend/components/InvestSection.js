import React from 'react';

export default function InvestSection({ buyTokens, isLoading, cfrlBalance, account, tokenBalance, hasActiveInvestmentRound }) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3">🚀 Tham Gia Quỹ Đầu Tư VC-DAO</h2>
        <p className="text-gray-400 text-lg">
          Mua token VCDAO để trở thành thành viên quỹ đầu tư và có quyền quyết định các dự án đầu tư
        </p>
      </div>

      <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl p-6 mb-6 border-2 border-blue-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="text-blue-400 text-sm font-semibold mb-1">💎 GIÁ TOKEN CỐ ĐỊNH</p>
            <p className="text-3xl font-bold mb-2">0.001 CFLR = 1 VCDAO</p>
            <p className="text-lg text-green-400 font-semibold">⚡ 1 CFLR = 1,000 VCDAO Token</p>
          </div>
          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
            <span className="text-3xl">💰</span>
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4 mt-4">
          <p className="text-gray-300 mb-2">
            <span className="text-yellow-400 font-semibold">📊 Quyền Lợi Thành Viên:</span>
          </p>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Biểu quyết cho các dự án đầu tư của quỹ</li>
            <li>• Đề xuất dự án mới để quỹ đầu tư</li>
            <li>• Quyền lực tương ứng với số token sở hữu</li>
            <li>• Tham gia quản trị quỹ đầu tư phi tập trung</li>
          </ul>
        </div>
      </div>

      {/* Investment Round Warning */}
      {hasActiveInvestmentRound && (
        <div className="mb-6 p-5 bg-red-900/30 border-2 border-red-500 rounded-xl">
          <div className="flex items-start space-x-3">
            <span className="text-3xl">🚫</span>
            <div className="flex-1">
              <p className="text-red-400 font-bold text-lg mb-2">Không Thể Mua Token</p>
              <p className="text-red-300 mb-3">
                Hiện có đợt đầu tư đang diễn ra. Việc mua token trong lúc voting sẽ ảnh hưởng đến tỷ lệ phiếu bầu và tính công bằng của hệ thống.
              </p>
              <div className="bg-red-500/10 rounded-lg p-3">
                <p className="text-red-200 text-sm">
                  <span className="font-semibold">📋 Quy tắc:</span> Chỉ có thể mua token khi không có đề xuất nào đang trong thời gian voting.
                  Bạn có thể mua token sau khi tất cả đề xuất trong đợt hiện tại kết thúc.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Buy Buttons */}
      <div className="mb-6">
        <p className="text-gray-300 font-semibold mb-3 text-center">🎯 Chọn Gói Mua Nhanh</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { cflr: 0.01, token: 10, popular: false },
            { cflr: 0.05, token: 50, popular: true },
            { cflr: 0.1, token: 100, popular: false },
          ].map((pkg) => (
            <button
              key={pkg.cflr}
              onClick={() => buyTokens(pkg.cflr)}
              disabled={isLoading || parseFloat(cfrlBalance || '0') < pkg.cflr + 0.001 || hasActiveInvestmentRound}
              className={`relative bg-gray-700 rounded-xl p-5 text-center hover:bg-gray-600 transition-all duration-200 border-2 ${
                pkg.popular ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' : 'border-gray-600 hover:border-blue-500'
              } disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-gray-900 text-xs font-bold px-3 py-1 rounded-full">
                  ⭐ PHỔ BIẾN
                </div>
              )}
              <div className="mb-2">
                <p className="text-2xl font-bold text-blue-400">{pkg.cflr} CFLR</p>
              </div>
              <div className="flex items-center justify-center space-x-2 mb-2">
                <span className="text-gray-400">→</span>
                <p className="text-xl font-semibold text-green-400">{pkg.token} VCDAO</p>
              </div>
              <p className="text-xs text-gray-500">{((pkg.token / (pkg.token + 100)) * 100).toFixed(3)}% quyền biểu quyết*</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">* Giả định tổng supply hiện tại</p>
      </div>

      {/* Main Buy Button */}
      <button
        onClick={() => buyTokens(0.01)}
        disabled={isLoading || parseFloat(cfrlBalance || '0') < 0.011 || hasActiveInvestmentRound}
        className="w-full bg-gradient-to-r from-green-500 to-blue-600 rounded-xl py-5 font-bold text-lg hover:from-green-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mb-4 shadow-lg"
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
            Đang xử lý giao dịch...
          </div>
        ) : hasActiveInvestmentRound ? (
          <div className="flex items-center justify-center space-x-2">
            <span>🚫</span>
            <span>KHÔNG THỂ MUA - CÓ ĐỢT ĐẦU TƯ ĐANG DIỄN RA</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-2">
            <span>🎯</span>
            <span>MUA NGAY 10 VCDAO VỚI 0.01 CFLR</span>
          </div>
        )}
      </button>

      {/* Important Notes */}
      <div className="space-y-3">
        {/* Gas Fee Notice */}
        <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
          <div className="flex items-start space-x-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-yellow-400 font-semibold mb-1">Lưu Ý Phí Gas</p>
              <p className="text-yellow-400/80 text-sm">Đảm bảo bạn có thêm 0.001-0.003 CFLR cho phí giao dịch</p>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <div className="flex items-start space-x-3">
            <span className="text-xl">ℹ️</span>
            <div className="flex-1">
              <p className="text-blue-400 font-semibold mb-1">Cách Thức Hoạt Động</p>
              <p className="text-blue-400/80 text-sm">Bạn gửi CFLR → Nhận token VCDAO ngay lập tức → Bắt đầu tham gia quản trị quỹ</p>
            </div>
          </div>
        </div>

        {/* Network Info */}
        <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
          <div className="flex items-start space-x-3">
            <span className="text-xl">🌐</span>
            <div className="flex-1">
              <p className="text-green-400 font-semibold mb-1">Mạng Testnet</p>
              <p className="text-green-400/80 text-sm">Đang kết nối với Songbird Coston Testnet - Token chỉ dùng để test</p>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="mt-6 p-4 bg-gray-700 rounded-lg">
        <p className="text-sm text-gray-400 mb-2">Thông Tin Debug:</p>
        <p className="text-xs font-mono">Số Dư CFLR: {cfrlBalance}</p>
        <p className="text-xs font-mono">Số Dư Token: {tokenBalance}</p>
        <p className="text-xs font-mono">Tài khoản: {account}</p>
        <p className="text-xs font-mono">Mạng: Songbird Coston Testnet</p>
      </div>
    </div>
  );
}
