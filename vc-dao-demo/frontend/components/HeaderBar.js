import { formatAddress, formatNumber } from '../utils/format';
import CONTRACT_ADDRESSES from '../src/config/contract-addresses.json';

export default function HeaderBar({ isConnected, account, cfrlBalance, onConnect }) {
  return (
    <header className="glass border-b border-white/10 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-lg flex items-center justify-center animate-pulse-glow shadow-lg">
              <span className="text-lg font-bold animate-float">🚀</span>
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">
                VC-DAO Fund
              </h1>
              <p className="text-xs text-gray-300 font-medium">Quỹ Đầu Tư Phi Tập Trung • Coston Testnet</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isConnected ? (
              <>
                <div className="text-right bg-white/5 backdrop-blur-sm rounded-lg p-2 border border-white/10">
                  <p className="text-xs text-emerald-400 font-semibold flex items-center">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1.5 animate-pulse"></span>
                    Đã kết nối
                  </p>
                  <p className="font-mono text-xs text-white">{formatAddress(account)}</p>
                  <p className="text-xs text-blue-300 font-medium">{formatNumber(cfrlBalance, 4)} CFLR</p>
                </div>
                <button
                  onClick={onConnect}
                  className="px-3 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-xs font-medium hover:bg-white/20 transition-all duration-300 border border-white/20 hover:border-white/40"
                >
                  🔄 Kết Nối Lại
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (!window.ethereum) return alert('Không tìm thấy MetaMask');
                      const tokenAddress = CONTRACT_ADDRESSES.coston?.token;
                      if (!tokenAddress) return alert('Token address chưa cấu hình');
                      const added = await window.ethereum.request({
                        method: 'wallet_watchAsset',
                        params: {
                          type: 'ERC20',
                          options: {
                            address: tokenAddress,
                            symbol: 'VCDAO',
                            decimals: 18,
                            image: ''
                          }
                        }
                      });
                      if (added) {
                        alert('Token đã được thêm vào ví (hoặc đang chờ xác nhận).');
                      } else {
                        alert('Người dùng đã từ chối thêm token.');
                      }
                    } catch (err) {
                      console.error('Add token error', err);
                      alert('Lỗi khi thêm token: ' + (err.message || err));
                    }
                  }}
                  className="px-3 py-2 bg-blue-500/10 backdrop-blur-sm rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-all duration-300 border border-blue-500/20 hover:border-blue-500/40"
                >
                  ➕ Thêm Token
                </button>
              </>
            ) : (
              <button
                onClick={onConnect}
                className="btn-primary px-6 py-2 rounded-lg font-semibold text-sm flex items-center space-x-2"
              >
                <span>🔐</span>
                <span>Kết Nối Ví</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
