// Simple script to completely clear all DAO cache and force refresh
(function() {
    console.log('🧹 Force clearing ALL DAO cache...');
    
    // Get all localStorage keys
    const allKeys = Object.keys(localStorage);
    
    // Clear all DAO-related keys
    const daoKeys = allKeys.filter(key => 
        key.includes('proposal') || 
        key.includes('vote') || 
        key.includes('round') || 
        key.includes('early') || 
        key.includes('governor') ||
        key.includes('dao') ||
        key.includes('vc-dao') ||
        key.includes('VCDAO')
    );
    
    console.log('🗑️ Removing keys:', daoKeys);
    
    daoKeys.forEach(key => {
        localStorage.removeItem(key);
    });
    
    // Also clear session storage
    const sessionKeys = Object.keys(sessionStorage);
    const daoSessionKeys = sessionKeys.filter(key => 
        key.includes('proposal') || 
        key.includes('vote') || 
        key.includes('dao')
    );
    
    daoSessionKeys.forEach(key => {
        sessionStorage.removeItem(key);
    });
    
    console.log('✅ All DAO cache cleared!');
    console.log('🔄 Reloading page...');
    
    // Force hard reload
    setTimeout(() => {
        window.location.reload(true);
    }, 1000);
})();