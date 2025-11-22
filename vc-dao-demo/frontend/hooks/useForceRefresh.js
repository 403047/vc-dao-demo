// Force refresh all proposals and clear old cache
import { useEffect } from 'react';

export const useForceRefresh = (contracts) => {
  useEffect(() => {
    if (typeof window === 'undefined' || !contracts?.governor) return;
    
    // Function to force clear all DAO cache
    const forceClearCache = () => {
      console.log('🧹 Force clearing all DAO cache...');
      
      // Clear all DAO-related keys
      const keysToRemove = [
        'earlyWinProposals',
        'userRoundVotes', 
        'proposalVoters',
        'governor_address'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`✅ Removed ${key}`);
      });
      
      // Clear user vote keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('user_voted_')) {
          localStorage.removeItem(key);
          console.log(`✅ Removed ${key}`);
        }
      });
      
      console.log('🎉 All cache cleared!');
    };
    
    // Expose function globally for easy access
    window.forceClearCache = forceClearCache;
    
    // Auto-clear if URL contains ?clear=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('clear') === 'true') {
      forceClearCache();
      // Remove the parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      // Reload page to apply changes
      setTimeout(() => window.location.reload(), 500);
    }
    
  }, [contracts?.governor]);
};