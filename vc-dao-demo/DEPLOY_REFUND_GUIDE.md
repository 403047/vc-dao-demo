# VC DAO Demo - Hướng dẫn Deploy & Test Refund

## Vấn đề hiện tại
Console báo lỗi: `transaction failed` khi refund vì địa chỉ Treasury cũ (fallback) không có hàm `refund(uint256)`.

Frontend đang dùng địa chỉ fallback hardcoded:
- Token: `0x745c86156Ab86fEc74A28a3B461D28649E817301`
- Treasury: `0x03D1F88E919864c88156bc67B0E276091060d269`
- Governor: `0xb4AFF46373B68f8841e666A6bd162860d136730F`

**Các hợp đồng cũ này không có logic refund mới.**

---

## Giải pháp: Deploy hợp đồng mới

### Bước 1: Chuẩn bị PRIVATE_KEY

Tạo file `.env` ở thư mục gốc `d:\BlockChain\VC-DAO-DEMO\vc-dao-demo\`:

```bash
# .env
PRIVATE_KEY=0xYOUR_PRIVATE_KEY_WITH_COSTON_CFLR_TESTNET
```

**Lưu ý:**
- Private key cần có ít nhất 0.5 CFLR testnet để trả phí gas.
- Lấy CFLR testnet tại: https://faucet.flare.network/ (chọn Coston testnet)

---

### Bước 2: Deploy contracts mới

Mở PowerShell và chạy:

```powershell
cd 'd:\BlockChain\VC-DAO-DEMO\vc-dao-demo'
npx hardhat run scripts/deploy-coston-fixed.js --network coston
```

**Kết quả deploy sẽ in ra console:**

```
✅ GovernanceToken: 0xNEW_TOKEN_ADDRESS
✅ Treasury: 0xNEW_TREASURY_ADDRESS
✅ VCGovernor: 0xNEW_GOVERNOR_ADDRESS
```

Đồng thời, script sẽ lưu vào file: `abis/deployed-addresses-coston.json`

---

### Bước 3: Cập nhật frontend với địa chỉ mới

Tạo file `frontend/.env.local`:

```bash
# frontend/.env.local
NEXT_PUBLIC_TOKEN_ADDRESS=0xNEW_TOKEN_ADDRESS
NEXT_PUBLIC_TREASURY_ADDRESS=0xNEW_TREASURY_ADDRESS
NEXT_PUBLIC_GOVERNOR_ADDRESS=0xNEW_GOVERNOR_ADDRESS
```

**Thay `0xNEW_*_ADDRESS` bằng địa chỉ thật từ bước deploy.**

---

### Bước 4: Khởi động lại frontend

```powershell
cd 'd:\BlockChain\VC-DAO-DEMO\vc-dao-demo\frontend'
npm run dev
```

Frontend sẽ tự reload và dùng địa chỉ mới từ `.env.local`.

---

### Bước 5: Test chức năng refund

#### 5.1. Mua token VCDAO
1. Mở http://localhost:3000
2. Kết nối ví MetaMask (đảm bảo đã chọn Coston testnet).
3. Vào tab **Mua Token** → nhập số CFLR → mua token.

#### 5.2. Nạp quỹ vào Treasury (quan trọng!)
Treasury cần có CFLR để hoàn tiền. Có 2 cách:

**Cách 1: Gửi CFLR trực tiếp qua MetaMask**
- Send transaction đến địa chỉ Treasury (0xNEW_TREASURY_ADDRESS).
- Số lượng: ~0.1 CFLR (đủ để test refund).

**Cách 2: Gọi hàm deposit từ console**
```javascript
// Trong browser console:
const treasuryABI = ['function deposit(string) payable'];
const treasury = new ethers.Contract('0xNEW_TREASURY_ADDRESS', treasuryABI, provider.getSigner());
await treasury.deposit('Initial funding', { value: ethers.utils.parseEther('0.1') });
```

#### 5.3. Test refund
1. Vào tab **Trang Chủ (Dashboard)**.
2. Nhập số VCDAO muốn refund (ví dụ: 10).
3. Nhấn **Hoàn tiền 90%**.
4. MetaMask sẽ yêu cầu approve trước (cho phép Treasury burn token).
5. Sau approve, giao dịch refund sẽ chạy:
   - Token VCDAO bị burn.
   - CFLR (= VCDAO × 0.001 × 0.9) trả về ví của bạn.

---

## Kiểm tra kết quả

- **Token balance giảm** (token đã burn).
- **CFLR balance tăng** (~90% giá trị token).
- Console không còn lỗi `transaction failed`.

---

## Tóm tắt các thay đổi code

### Contracts
- `GovernanceToken.sol`: Thêm `burn()` và `burnFrom()` để hỗ trợ đốt token.
- `Treasury.sol`: 
  - Thêm `refund(uint256)` cho phép user đổi token lấy 90% CFLR.
  - Constructor nhận thêm địa chỉ token.

### Frontend
- `hooks/useTokenRefund.js`: Hook mới xử lý approve + refund.
- `pages/index.js`: UI refund đơn giản (chỉ nhập VCDAO, không cần địa chỉ nhận).
- `src/config/daoContracts.js`: Mở rộng ABI cho refund + allowance.

---

## Lưu ý quan trọng

1. **Không dùng lại token cũ**: Sau deploy, token/treasury cũ sẽ không hoạt động với logic mới. Mua token mới trên contract mới.
2. **Treasury phải có CFLR**: Nếu treasury trống, refund sẽ báo "Treasury insufficient CFLR".
3. **Testnet nên dễ dàng test**: Coston CFLR miễn phí, bạn có thể test nhiều lần không lo chi phí.

---

Bạn muốn mình làm gì thêm?
- Viết script tự động nạp quỹ Treasury sau deploy?
- Thêm UI "Deposit vào Treasury" trong frontend?
- Viết test Hardhat cho refund?
