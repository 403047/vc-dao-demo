# 🔄 Hướng Dẫn Khởi Động Lại Đợt Đề Xuất

## ⚠️ Vấn Đề
Danh sách đề xuất đang hiển thị proposals từ contract cũ (như proposal #4123) do cache localStorage.

## ✅ Giải Pháp

### Cách 1: Dùng Nút "Nuclear Clear" (KHUYẾN NGHỊ)

1. **Mở trang Proposals** (localhost:3000)
2. **Nhìn góc trên bên phải**, thấy nút **"💣 Nuclear Clear"**
3. **Click vào nút** → Xác nhận
4. **Trang tự động reload** → Proposals cũ đã biến mất!

### Cách 2: Clear Cache Thủ Công

**Trong Browser Console (F12):**
```javascript
// Xóa tất cả cache DAO
Object.keys(localStorage).forEach(key => {
  if (key.includes('proposal') || 
      key.includes('vote') || 
      key.includes('round') || 
      key.includes('early') || 
      key.includes('governor')) {
    localStorage.removeItem(key);
  }
});

// Reload trang
location.reload();
```

### Cách 3: Clear Cache Browser

1. Mở **DevTools** (F12)
2. Tab **Application** → **Storage** → **Local Storage**
3. Click **Clear All**
4. **Reload** trang (F5)

---

## 🎯 Những Gì Sẽ Bị Xóa

Khi nhấn Nuclear Clear:
- ✅ `earlyWinProposals` - Danh sách proposals thắng sớm
- ✅ `earlyWinTimestamps` - Timestamp early-win
- ✅ `userRoundVotes` - Lịch sử vote của user
- ✅ `proposalVoters` - Danh sách voters
- ✅ `executedProposals` - Proposals đã execute
- ✅ `governor_address` - Địa chỉ contract cũ

---

## 🔍 Debug Info

Nếu không thấy proposals sau khi clear:

### 1. Kiểm tra Contract Address
```javascript
console.log('Governor:', localStorage.getItem('governor_address'));
```

### 2. Kiểm tra Proposals Count
Xem trong component Debug Info (hiển thị khi proposals.length === 0)

### 3. Check Console Logs
```javascript
// Trong useProposals.js
console.log('📊 Proposals loaded:', proposals.length);
```

---

## 🚀 Tạo Đợt Đề Xuất Mới

Sau khi clear cache:

1. **Click "Đề Xuất Mới"**
2. Nhập thông tin:
   - Tiêu đề
   - Mô tả  
   - Người nhận
   - Số tiền (CFLR)
3. **Submit** → Đợt đề xuất mới bắt đầu!

**Lưu ý:**
- Đợt đề xuất **bắt đầu** khi proposal đầu tiên được tạo
- Đợt đề xuất **kết thúc** sau 7 ngày HOẶC khi có early-win

---

## 📊 Thông Tin Đợt Đề Xuất

Sau khi tạo proposal đầu tiên:

```
🏦 Đợt Đầu Tư Hiện Tại
• 1 đề xuất
• Bắt đầu: 21/11, 15:47
• Kết thúc: 28/11, 15:47
• 🟢 Đang diễn ra
• Còn: 6d 23h 59m 45s
```

---

## ⚡ Auto-Clear Khi Deploy Contract Mới

Code đã có logic tự động clear cache khi phát hiện contract address thay đổi:

```javascript
// Trong useProposals.js
useEffect(() => {
  const currentGovernorAddress = contracts.governor.address;
  const savedGovernorAddress = localStorage.getItem('governor_address');
  
  if (savedGovernorAddress && savedGovernorAddress !== currentGovernorAddress) {
    console.log('🔄 Contract address changed, clearing cache...');
    // Auto clear all cache
  }
}, [contracts?.governor]);
```

---

## 🎨 UI Updates

### Đã Thêm:
1. **Nút "💣 Nuclear Clear"** - Góc trên phải ProposalList
2. **Debug Info Panel** - Hiển thị khi proposals.length === 0
3. **Confirmation Dialog** - Xác nhận trước khi xóa cache

### Hiển Thị:
```
⚠️ XÓA TOÀN BỘ CACHE?

Điều này sẽ:
- Xóa tất cả proposals cũ
- Reset voting history
- Xóa early-win records  
- Khởi động lại đợt đề xuất mới

Bạn có chắc chắn?
```

---

## 📝 Checklist Khắc Phục

- [x] Thêm nút Nuclear Clear vào UI
- [x] Thêm confirmation dialog
- [x] Thêm debug info panel
- [x] Auto-reload sau khi clear
- [x] Log chi tiết những gì bị xóa
- [x] Hướng dẫn sử dụng

---

**TL;DR:** Click nút **"💣 Nuclear Clear"** → Xác nhận → Done! 🎉
