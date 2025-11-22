// Script để clear toàn bộ cache localStorage
if (typeof window !== 'undefined') {
  console.log('🧹 Clearing all DAO cache...');
  
  // List all keys to remove
  const keysToRemove = [
    'earlyWinProposals',
    'earlyWinTimestamps', 
    'userRoundVotes',
    'proposalVoters',
    'executedProposals',
    'governor_address'
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log(`✅ Removed: ${key}`);
  });
  
  // Also remove any dynamic keys
  Object.keys(localStorage).forEach(key => {
    if (key.includes('proposal_') || 
        key.includes('round_') || 
        key.startsWith('user_voted_')) {
      localStorage.removeItem(key);
      console.log(`✅ Removed dynamic: ${key}`);
    }
  });
  
  console.log('✅ All cache cleared! Please reload the page.');
  alert('Cache đã được xóa! Vui lòng reload trang (F5)');
}
