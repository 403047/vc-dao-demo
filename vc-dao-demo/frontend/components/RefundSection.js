import React, { useState } from 'react';

export default function RefundSection({ 
  refund, 
  isLoading, 
  tokenBalance, 
  hasActiveProposals 
}) {
  const [refundAmount, setRefundAmount] = useState('');

  const handleRefund = () => {
    if (refundAmount && parseFloat(refundAmount) > 0) {
      refund({ tokenAmount: refundAmount });
      setRefundAmount('');
    }
  };

  const maxRefundable = parseFloat(tokenBalance || '0');
  const estimatedCFLR = parseFloat(refundAmount || 0) * 0.001 * 0.9;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-3">💸 Rút Tiền (Refund)</h2>
        <p className="text-gray-400 text-lg">
          Đổi token VCDAO lấy lại 90% số CFLR đã đầu tư
        </p>
      </div>

      {/* Voting Warning */}
      {hasActiveProposals && (
        <div className="mb-6 p-5 bg-red-900/30 border-2 border-red-500 rounded-xl">
          <div className="flex items-start space-x-3">
            <span className="text-3xl">🚫</span>
            <div className="flex-1">
              <p className="text-red-400 font-bold text-lg mb-2">Không Thể Rút Tiền</p>
              <p className="text-red-300">
                Hiện có đề xuất đang trong thời gian vote. Bạn cần đợi đến khi tất cả các đề xuất kết thúc mới có thể rút tiền.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Refund Info Card */}
      <div className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl p-6 mb-6 border-2 border-purple-500/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <p className="text-purple-400 text-sm font-semibold mb-1">💰 CHÍNH SÁCH HOÀN TIỀN</p>
            <p className="text-2xl font-bold mb-2">Hoàn 90% CFLR</p>
            <p className="text-lg text-green-400 font-semibold">⚡ 1 VCDAO = 0.0009 CFLR</p>
          </div>
          <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
            <span className="text-3xl">💸</span>
          </div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-4 mt-4">
          <p className="text-gray-300 mb-2">
            <span className="text-yellow-400 font-semibold">📊 Lưu Ý:</span>
          </p>
          <ul className="text-gray-400 text-sm space-y-1">
            <li>• Token VCDAO của bạn sẽ bị burn (xóa vĩnh viễn)</li>
            <li>• Bạn nhận lại 90% số CFLR (10% phí giao dịch)</li>
            <li>• Không thể rút khi có đề xuất đang vote</li>
            <li>• Giao dịch không thể hoàn tác</li>
          </ul>
        </div>
      </div>

      {/* Refund Form */}
      <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
        <label className="block text-sm font-medium mb-3 text-gray-300">
          Số Token VCDAO Muốn Rút
        </label>
        
        <div className="flex items-center space-x-3 mb-4">
          <input
            type="number"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder="0.0"
            step="0.01"
            min="0"
            max={maxRefundable}
            disabled={isLoading || hasActiveProposals}
            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => setRefundAmount(maxRefundable.toString())}
            disabled={isLoading || hasActiveProposals || maxRefundable <= 0}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            MAX
          </button>
        </div>

        <div className="flex justify-between text-sm text-gray-400 mb-4">
          <span>Số dư khả dụng:</span>
          <span className="font-mono font-semibold text-white">{maxRefundable.toFixed(2)} VCDAO</span>
        </div>

        {/* Estimation */}
        {parseFloat(refundAmount || 0) > 0 && (
          <div className="bg-gray-900 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Bạn trả:</span>
              <span className="font-mono font-semibold text-red-400">{parseFloat(refundAmount).toFixed(2)} VCDAO</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-400">Bạn nhận (90%):</span>
              <span className="font-mono font-semibold text-green-400">{estimatedCFLR.toFixed(6)} CFLR</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-700">
              <span className="text-gray-400 text-xs">Phí dịch vụ (10%):</span>
              <span className="font-mono text-xs text-gray-500">{(parseFloat(refundAmount) * 0.001 * 0.1).toFixed(6)} CFLR</span>
            </div>
          </div>
        )}

        <button
          onClick={handleRefund}
          disabled={
            isLoading || 
            hasActiveProposals || 
            !refundAmount || 
            parseFloat(refundAmount) <= 0 || 
            parseFloat(refundAmount) > maxRefundable
          }
          className="w-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl py-4 font-bold text-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
              Đang xử lý...
            </div>
          ) : hasActiveProposals ? (
            '🚫 Không thể rút khi có đề xuất đang vote'
          ) : (
            <div className="flex items-center justify-center space-x-2">
              <span>💸</span>
              <span>RÚT {estimatedCFLR > 0 ? `${estimatedCFLR.toFixed(6)} CFLR` : 'TIỀN'}</span>
            </div>
          )}
        </button>
      </div>

      {/* Important Warnings */}
      <div className="space-y-3">
        <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
          <div className="flex items-start space-x-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-red-400 font-semibold mb-1">Không Thể Hoàn Tác</p>
              <p className="text-red-400/80 text-sm">Token sẽ bị burn vĩnh viễn. Hãy chắc chắn trước khi thực hiện!</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
          <div className="flex items-start space-x-3">
            <span className="text-xl">📊</span>
            <div className="flex-1">
              <p className="text-yellow-400 font-semibold mb-1">Mất Quyền Biểu Quyết</p>
              <p className="text-yellow-400/80 text-sm">Sau khi rút, bạn sẽ mất quyền vote và tạo đề xuất tương ứng với số token đã rút</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
          <div className="flex items-start space-x-3">
            <span className="text-xl">⛽</span>
            <div className="flex-1">
              <p className="text-blue-400 font-semibold mb-1">Phí Gas</p>
              <p className="text-blue-400/80 text-sm">Cần ~0.001-0.003 CFLR để trả phí giao dịch blockchain</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
