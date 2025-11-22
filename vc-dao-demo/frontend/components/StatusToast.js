import React from 'react';

export default function StatusToast({ status, show, onClose }) {
  if (!status || !show) return null;
  
  // Determine toast type and styling
  const isError = status.includes('❌') || /error|lỗi/i.test(status);
  const isWarning = status.includes('⚠️');
  const isSuccess = status.includes('✅') || /thành công|hoàn thành/i.test(status);
  
  let toastStyle = '';
  let iconColor = '';
  let borderColor = '';
  
  if (isError) {
    toastStyle = 'from-red-500/20 to-rose-500/20';
    iconColor = 'bg-red-500';
    borderColor = 'border-red-500/50';
  } else if (isWarning) {
    toastStyle = 'from-yellow-500/20 to-orange-500/20';
    iconColor = 'bg-yellow-500';
    borderColor = 'border-yellow-500/50';
  } else if (isSuccess) {
    toastStyle = 'from-green-500/20 to-emerald-500/20';
    iconColor = 'bg-green-500';
    borderColor = 'border-green-500/50';
  } else {
    toastStyle = 'from-blue-500/20 to-cyan-500/20';
    iconColor = 'bg-blue-500';
    borderColor = 'border-blue-500/50';
  }
  
  return (
    <div className={`fixed bottom-6 right-6 glass backdrop-blur-xl rounded-2xl p-5 max-w-sm shadow-2xl animate-slide-up border ${borderColor} z-50`}>
      {/* Background glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${toastStyle} rounded-2xl`}></div>
      
      <div className="relative z-10 flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-4 flex-1">
          <div className={`w-4 h-4 rounded-full animate-pulse ${iconColor} shadow-lg`}></div>
          <p className="text-sm font-medium text-white flex-1 leading-relaxed">{status}</p>
        </div>
        <button 
          onClick={onClose} 
          className="text-gray-300 hover:text-white transition-all duration-300 hover:bg-white/10 rounded-lg p-1 ml-2 group hover:scale-110"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
