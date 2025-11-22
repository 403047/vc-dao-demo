// Clear localStorage script - run in browser console
console.log('🧹 Clearing DAO localStorage cache...');

// Keys to clear
const keysToRemove = [
  'earlyWinProposals',
  'userRoundVotes', 
  'proposalVoters'
];

// Clear specific keys
keysToRemove.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    console.log(`✅ Removed ${key}`);
  }
});

// Also clear any keys that start with 'user_voted_'
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('user_voted_')) {
    localStorage.removeItem(key);
    console.log(`✅ Removed ${key}`);
  }
});

console.log('🎉 Cache cleared! Please refresh the page.');

// Auto refresh
window.location.reload();