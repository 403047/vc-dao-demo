export default function FooterBar() {
  return (
    <footer className="glass border-t border-white/10 mt-16 backdrop-blur-xl relative">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>
      
      <div className="relative z-10 container mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0">
          <div className="flex items-center space-x-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 rounded-xl flex items-center justify-center animate-pulse-glow shadow-lg">
              <span className="text-xl animate-float">🚀</span>
            </div>
            <div>
              <p className="text-xl font-bold gradient-text">VC-DAO Fund</p>
              <p className="text-sm text-gray-300 font-medium">Xây dựng trên Songbird Coston Testnet</p>
              <div className="flex items-center space-x-4 mt-2">
                <span className="flex items-center space-x-1 text-xs text-emerald-400">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span>Testnet</span>
                </span>
                <span className="text-xs text-blue-400">• Phi Tập Trung</span>
                <span className="text-xs text-purple-400">• Miễn Phí</span>
              </div>
            </div>
          </div>
          
          <div className="text-center md:text-right">
            <div className="text-gray-300 text-sm font-medium">© 2024 VC-DAO Fund</div>
            <div className="text-xs text-gray-400 mt-1">Mọi quyền được bảo lưu. Phi tập trung và mở.</div>
            <div className="flex justify-center md:justify-end space-x-4 mt-3">
              <a href="#" className="text-blue-400 hover:text-blue-300 text-xs hover:underline transition-colors">
                📄 Docs
              </a>
              <a href="#" className="text-purple-400 hover:text-purple-300 text-xs hover:underline transition-colors">
                🐛 GitHub
              </a>
              <a href="#" className="text-pink-400 hover:text-pink-300 text-xs hover:underline transition-colors">
                💬 Discord
              </a>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-400 space-y-2 md:space-y-0">
            <div>🌐 Phân cấp quỹ đầu tư mạo hiểm trên blockchain</div>
            <div className="flex items-center space-x-1">
              <span>⚡</span>
              <span>Powered by Flare Network</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
