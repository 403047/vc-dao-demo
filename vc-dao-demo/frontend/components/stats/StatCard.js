export default function StatCard({ label, value, subLabel, icon, color='blue' }) {
  const colorMap = {
    blue: {
      bg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20',
      border: 'border-blue-500/30',
      icon: 'from-blue-400 to-cyan-400',
      glow: 'hover:shadow-blue-500/20'
    },
    green: {
      bg: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20',
      border: 'border-green-500/30',
      icon: 'from-green-400 to-emerald-400',
      glow: 'hover:shadow-green-500/20'
    },
    yellow: {
      bg: 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20',
      border: 'border-yellow-500/30',
      icon: 'from-yellow-400 to-orange-400',
      glow: 'hover:shadow-yellow-500/20'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
      border: 'border-purple-500/30',
      icon: 'from-purple-400 to-pink-400',
      glow: 'hover:shadow-purple-500/20'
    },
    red: {
      bg: 'bg-gradient-to-br from-red-500/20 to-rose-500/20',
      border: 'border-red-500/30',
      icon: 'from-red-400 to-rose-400',
      glow: 'hover:shadow-red-500/20'
    }
  };

  const colors = colorMap[color];

  return (
    <div className={`glass rounded-2xl p-6 border ${colors.border} card-hover ${colors.glow} group relative overflow-hidden`}>
      {/* Background gradient overlay on hover */}
      <div className={`absolute inset-0 ${colors.bg} opacity-0 group-hover:opacity-50 transition-opacity duration-300 rounded-2xl`}></div>
      
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-300 text-sm font-medium mb-2 group-hover:text-white transition-colors duration-300">{label}</p>
          <p className="text-2xl md:text-3xl font-bold text-white mb-1 group-hover:scale-105 transition-transform duration-300">{value}</p>
          {subLabel && (
            <p className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors duration-300">{subLabel}</p>
          )}
        </div>
        
        <div className={`w-14 h-14 bg-gradient-to-br ${colors.icon} rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg`}>
          <span className="text-xl font-bold text-white drop-shadow-lg">{icon}</span>
        </div>
      </div>
      
      {/* Animated border */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${colors.icon} opacity-20 blur-sm`}></div>
      </div>
    </div>
  );
}
