# 🔄 Hướng Dẫn Cập Nhật Contract Mới

## ⚠️ Vấn Đề Phát Hiện
Frontend đang load contract CŨ vì địa chỉ hardcoded trong `daoContracts.js` chưa được cập nhật.

## ✅ ĐÃ SỬA
File `frontend/src/config/daoContracts.js` đã được cập nhật với địa chỉ mới:

```javascript
const DEFAULT_ADDRESSES = {
  token: '0x471A3cf973EA9B5614ABA3e18FC7f39D124C9d88',      // ✅ MỚI
  treasury: '0xC7E0b71e3EB2fd3F2caa59A3c0A4C3026A3B45b9',   // ✅ MỚI
  governor: '0xcC3f61B01527fA5b5322b7070bC9Abb357b0bCc9'    // ✅ MỚI
};
```

## 🚀 Bước Restart Frontend

### Cách 1: Restart Terminal Dev Server (KHUYẾN NGHỊ)

1. **Tìm terminal đang chạy `npm run dev`**
2. **Nhấn `Ctrl+C`** để dừng server
3. **Chạy lại:**
   ```bash
   cd frontend
   npm run dev
   ```
4. **Reload browser** (F5)

### Cách 2: Kill Process và Restart

```bash
# Trong PowerShell
Stop-Process -Name "node" -Force
cd d:\BlockChain\VC-DAO-DEMO\vc-dao-demo\frontend
npm run dev
```

### Cách 3: Hard Reload Browser

Nếu không muốn restart server:
1. Mở **DevTools** (F12)
2. **Right-click** nút Reload
3. Chọn **"Empty Cache and Hard Reload"**
4. Hoặc nhấn **Ctrl+Shift+R**

## 🧹 Clear Cache Sau Khi Restart

Sau khi frontend load lại:

1. **Mở trang** → Thấy Debug Info với governor address MỚI
2. **Click "💣 Nuclear Clear"** 
3. **Xác nhận** → Trang reload
4. ✅ **Proposals cũ biến mất!**

## 🔍 Kiểm Tra Đã Đúng Chưa

### Trong Browser Console (F12):

```javascript
// Xem governor address hiện tại
localStorage.getItem('governor_address')
// Phải là: "0xcC3f61B01527fA5b5322b7070bC9Abb357b0bCc9"

// Xem proposals
localStorage.getItem('earlyWinProposals')
// Phải là: null hoặc []
```

### Trong Debug Info Panel:

Khi proposals.length === 0, sẽ thấy:

```
🔍 Debug Info:
• Governor Address: 0xcC3f61B01527fA5b5322b7070bC9Abb357b0bCc9...  ✅
• Total Proposals Loaded: 0  ✅
• Current Round: None  ✅
```

## 📋 Checklist

- [x] Cập nhật `daoContracts.js` với addresses mới
- [ ] Restart frontend dev server
- [ ] Reload browser
- [ ] Verify governor address trong Debug Info
- [ ] Click "Nuclear Clear" để xóa cache cũ
- [ ] Verify proposals.length = 0
- [ ] Tạo proposal đầu tiên

## 🎯 Kết Quả Mong Đợi

Sau khi hoàn thành:

```
Đề Xuất Đầu Tư
💣 Nuclear Clear    + Đề Xuất Mới

🔍 Debug Info:
• Governor Address: 0xcC3f61B01527fA5b5322b7070bC9Abb357b0bCc9...
• Total Proposals Loaded: 0
• Current Round: None
💡 Nếu thấy proposals cũ, hãy nhấn "💣 Nuclear Clear" để reset

📝 Chưa Có Đề Xuất Nào
Hãy là người đầu tiên tạo đề xuất đầu tư
[Tạo Đề Xuất Đầu Tiên]
```

## ⚡ Auto-Sync Script (Tùy Chọn)

Đã tạo script `sync-addresses.js` để tự động sync addresses từ hardhat deployment:

```bash
node sync-addresses.js
```

Script sẽ:
1. Đọc `abis/deployed-addresses-coston.json`
2. Cập nhật `frontend/src/config/daoContracts.js`
3. Log ra addresses mới

---

**TL;DR:** 
1. **Restart frontend** (`Ctrl+C` → `npm run dev`)
2. **Reload browser** (F5)
3. **Click "Nuclear Clear"**
4. ✅ Done!
