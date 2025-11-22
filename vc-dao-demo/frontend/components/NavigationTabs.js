import { NAV_TABS } from '../utils/constants';

export default function NavigationTabs({ activeTab, onSelect }) {
  const tabs = NAV_TABS;

  return (
    <div className="glass rounded-xl p-2 mb-6 border border-white/10 backdrop-blur-xl overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`group flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 transform relative overflow-hidden whitespace-nowrap ${
              activeTab === tab.id
                ? 'btn-primary text-white shadow-lg'
                : 'text-gray-300 hover:text-white hover:bg-white/10 backdrop-blur-sm border border-white/10 hover:border-white/20'
            }`}
          >
            {/* Background glow effect for active tab */}
            {activeTab === tab.id && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur-xl -z-10 animate-pulse"></div>
            )}
            
            <span className={`text-sm transition-transform duration-300 ${
              activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'
            }`}>
              {tab.icon}
            </span>
            <span className="text-sm font-medium">{tab.label}</span>
            
            {/* Hover indicator */}
            <div className={`absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400 transition-all duration-300 ${
              activeTab === tab.id ? 'w-full' : 'w-0 group-hover:w-full'
            }`}></div>
          </button>
        ))}
      </div>
    </div>
  );
}
