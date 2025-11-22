export default function WelcomeSection({ onConnect }) {
  return (
    <div className="text-center py-24 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Hero Icon */}
        <div className="relative mb-12">
          <div className="w-32 h-32 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-3xl mx-auto mb-8 flex items-center justify-center animate-pulse-glow shadow-2xl">
            <span className="text-5xl animate-float">🚀</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-600/20 to-pink-500/20 rounded-3xl blur-2xl -z-10"></div>
        </div>

        {/* Hero Text */}
        <h2 className="text-5xl md:text-6xl font-bold mb-6 gradient-text">
          Chào mừng đến Quỹ VC-DAO
        </h2>
        <p className="text-2xl md:text-3xl text-transparent bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text font-semibold mb-6">
          Quỹ Đầu Tư Mạo Hiểm Phi Tập Trung
        </p>
        <p className="text-lg text-gray-300 mb-12 max-w-2xl mx-auto leading-relaxed">
          Mua token VCDAO để trở thành thành viên quỹ. Tham gia quyết định đầu tư vào các dự án blockchain tiềm năng cùng cộng đồng.
        </p>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="glass card-hover rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4 animate-float">💰</div>
            <h3 className="text-xl font-bold mb-3 text-white">Mua Token Quỹ</h3>
            <p className="text-gray-300 mb-2">Giá cố định</p>
            <p className="text-blue-400 font-bold text-lg">0.001 CFLR/token</p>
          </div>

          <div className="glass card-hover rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4 animate-float" style={{animationDelay: '2s'}}>🗳️</div>
            <h3 className="text-xl font-bold mb-3 text-white">Biểu Quyết Đầu Tư</h3>
            <p className="text-gray-300 mb-2">Quyết định dự án</p>
            <p className="text-purple-400 font-bold text-lg">1 người = 1 phiếu</p>
          </div>

          <div className="glass card-hover rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4 animate-float" style={{animationDelay: '4s'}}>📊</div>
            <h3 className="text-xl font-bold mb-3 text-white">Quản Trị Minh Bạch</h3>
            <p className="text-gray-300 mb-2">Mọi quyết định</p>
            <p className="text-green-400 font-bold text-lg">đều on-chain</p>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={onConnect}
          className="btn-primary px-12 py-4 rounded-2xl font-bold text-xl mb-8 flex items-center justify-center mx-auto space-x-3 group"
        >
          <span className="text-2xl group-hover:scale-110 transition-transform duration-300">🔐</span>
          <span>Kết Nối Ví Để Bắt Đầu</span>
        </button>

        {/* Instructions */}
        <div className="glass rounded-2xl p-6 max-w-lg mx-auto">
          <h4 className="text-lg font-semibold mb-4 text-yellow-400">📝 Hướng dẫn cài đặt:</h4>
          <div className="space-y-3 text-sm">
            <div className="flex items-center space-x-3">
              <span className="text-green-400 text-lg">✅</span>
              <span className="text-gray-300">Đảm bảo bạn đã cài đặt <strong className="text-orange-400">MetaMask</strong></span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-green-400 text-lg">✅</span>
              <span className="text-gray-300">Chuyển sang mạng <strong className="text-blue-400">Songbird Coston Testnet</strong></span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-green-400 text-lg">✅</span>
              <span className="text-gray-300">
                Nhận CFLR test miễn phí từ{' '}
                <a 
                  href="https://faucet.flare.network/" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-cyan-400 hover:text-cyan-300 underline font-semibold hover-glow"
                >
                  Coston Faucet
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
