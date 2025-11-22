// 🧹 NUCLEAR CLEAR - Xóa toàn bộ cache DAO
// Copy và paste script này vào Browser Console (F12)
// Sau đó reload trang (F5)

console.log('💣 NUCLEAR CLEAR - Clearing ALL DAO cache...');

// Xóa tất cả localStorage keys liên quan DAO
const keysToRemove = [];
Object.keys(localStorage).forEach(key => {
  if (
    key.includes('proposal') ||
    key.includes('vote') ||
    key.includes('round') ||
    key.includes('early') ||
    key.includes('governor') ||
    key.includes('voter') ||
    key.includes('executed') ||
    key.toLowerCase().includes('dao')
  ) {
    localStorage.removeItem(key);
    keysToRemove.push(key);
  }
});

console.log(`✅ Removed ${keysToRemove.length} cache entries:`);
keysToRemove.forEach(key => console.log(`   - ${key}`));

console.log('\n🔄 Reloading page...');
setTimeout(() => {
  location.reload();
}, 1000);
