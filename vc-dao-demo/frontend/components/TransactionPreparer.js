export default function TransactionPreparer({ onReady }) {
  return (
    <div className="glass rounded-xl p-6 border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
          <span className="text-2xl">💰</span>
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-2">
            🎉 Chúc mừng! Đề xuất thắng cuộc
          </h3>
          <p className="text-gray-300 mb-4">
            Hệ thống sẽ tự động gửi yêu cầu chuyển tiền. Bạn chỉ cần xác nhận <strong>một lần</strong> trong MetaMask.
          </p>
          <div className="flex items-center space-x-2 text-sm text-blue-300">
            <span>⚡</span>
            <span>Giao dịch sẽ được gửi trong 3 giây...</span>
          </div>
        </div>
      </div>
    </div>
  );
}