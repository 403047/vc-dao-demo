# Kiến trúc Investment Rounds - VC DAO

## Tổng quan

Hệ thống được thiết kế với **Investment Round** (Đợt đề xuất) là thực thể trung tâm, quản lý vòng đời của các proposals và các hoạt động liên quan.

## Cấu trúc dữ liệu

### 1. Investment Round (Đợt đề xuất)
```javascript
{
  id: number,              // ID duy nhất của đợt
  startTime: timestamp,    // Thời gian bắt đầu (chính xác đến giây)
  endTime: timestamp,      // Thời gian kết thúc dự kiến (7 ngày)
  actualEndTime: timestamp, // Thời gian kết thúc thực tế (nếu có early-win)
  proposals: [],           // Danh sách proposals trong đợt
  isFinished: boolean,     // Đợt đã kết thúc?
  earlyWinner: Proposal    // Proposal thắng sớm (nếu có)
}
```

### 2. Proposal (Đề xuất)
```javascript
{
  id: number,
  createdTime: timestamp,  // Thời điểm tạo proposal (voteStart)
  roundId: number,         // ID của round chứa proposal này
  voteEnd: Date,          // Kế thừa từ round (actualEndTime hoặc endTime)
  // ... các fields khác
}
```

## Luồng hoạt động

### Kịch bản 1: Tạo đợt đề xuất mới
```
1. User tạo proposal đầu tiên
   ↓
2. Hệ thống kiểm tra: Có round đang active?
   - Không → Tạo round mới
     * startTime = now
     * endTime = now + 7 days
     * isFinished = false
   ↓
3. Thêm proposal vào round
   ↓
4. KHÓA chức năng mua/rút token
   (hasActiveRound = true)
```

### Kịch bản 2: Proposal thắng sớm (Early-win)
```
1. User vote → Đạt >50% holders
   ↓
2. Đánh dấu proposal là early-win
   ↓
3. Cập nhật round:
   * isFinished = true
   * actualEndTime = now
   * earlyWinner = proposal
   ↓
4. Tự động execute proposal
   ↓
5. MỞ KHÓA chức năng mua/rút token
   (hasActiveRound = false)
```

### Kịch bản 3: Round kết thúc tự nhiên (7 ngày)
```
1. Time reaches round.endTime
   ↓
2. Hệ thống tự động:
   * isFinished = true
   * actualEndTime = endTime
   ↓
3. MỞ KHÓA chức năng mua/rút token
   (hasActiveRound = false)
```

### Kịch bản 4: Giai đoạn giữa các đợt
```
Round kết thúc → Round mới chưa được tạo
   ↓
User CÓ THỂ:
   ✅ Mua token
   ✅ Rút tiền (refund)
   ✅ Xem proposals cũ
   ✅ Tạo proposal mới (→ Tạo round mới)
   
User KHÔNG THỂ:
   ❌ Vote proposals cũ (đã hết hạn)
```

## Các hàm quan trọng

### 1. `getInvestmentRounds()`
- **Mục đích**: Tính toán và trả về tất cả rounds
- **Logic**:
  - Sắp xếp proposals theo thời gian tạo
  - Nhóm proposals vào rounds
  - Xác định round nào đã kết thúc
  - Cập nhật `voteEnd` cho tất cả proposals

### 2. `getCurrentRound()`
- **Mục đích**: Lấy round đang active
- **Return**: Round chưa finished hoặc `null`

### 3. `canTradeTokens()`
- **Mục đích**: Kiểm tra có thể mua/rút token không
- **Logic**: `return !getCurrentRound() || getCurrentRound().isFinished`

### 4. `createProposal()`
- **Kiểm tra trước khi tạo**:
  1. Round hiện tại đã kết thúc? → Reject
  2. User đã tạo đủ 3 proposals? → Reject
  3. Passed → Tạo proposal + Tạo round mới nếu cần

## Quy tắc nghiệp vụ

### Về Proposals
1. ✅ Mỗi proposal chỉ có `createdTime` (không có endTime riêng)
2. ✅ Proposal kế thừa thời gian vote từ round
3. ✅ Proposal thuộc về 1 round cụ thể (via `roundId`)

### Về Rounds
1. ✅ Round được tạo KHI proposal đầu tiên được tạo
2. ✅ Round kéo dài 7 ngày HOẶC cho đến khi có early-win
3. ✅ Chỉ có 1 round active tại một thời điểm
4. ✅ Round kết thúc → Tự động mở khóa mua/rút token

### Về Trading (Mua/Rút token)
1. ✅ Chỉ được phép KHI KHÔNG có round đang active
2. ✅ Bị khóa ngay khi round mới bắt đầu
3. ✅ Được mở khóa ngay khi round kết thúc

### Về User limits
1. ✅ Mỗi user tối đa 3 proposals/round
2. ✅ Limit được reset khi round mới bắt đầu
3. ✅ Mỗi user chỉ vote 1 lần/round

## Lưu trữ (localStorage)

```javascript
// Persistent data
{
  "investmentRounds": [...],      // Toàn bộ rounds
  "earlyWinProposals": [...],     // IDs của proposals thắng sớm
  "earlyWinTimestamps": {...},    // Timestamp khi thắng sớm
  "proposalVoters": {...},        // Danh sách voters cho mỗi proposal
  "userRoundVotes": {...}         // User đã vote proposal nào
}
```

## UI/UX

### Tab "Đề Xuất"
- Hiển thị round hiện tại (nếu có)
- Hiển thị proposals trong round đó
- Ẩn proposals từ rounds đã kết thúc

### Tab "Mua Token" & "Rút Tiền"
- Hiển thị warning nếu round đang active
- Disable actions khi round đang active
- Hiển thị thông tin round hiện tại

### Tab "Tạo Đề Xuất"
- Kiểm tra round hiện tại
- Hiển thị số proposals còn lại có thể tạo
- Disable nếu round đã kết thúc

## Ví dụ Timeline

```
Day 0, 00:00:00  → User A tạo Proposal 1
                    → Round 1 bắt đầu (endTime: Day 7, 00:00:00)
                    → 🔒 Khóa mua/rút token

Day 1, 10:30:45  → User B tạo Proposal 2 (vào Round 1)

Day 2, 15:20:10  → User C vote Proposal 1
                    → Early-win! (>50% holders)
                    → Round 1 kết thúc ngay
                    → 🔓 Mở khóa mua/rút token

Day 3-6          → User có thể mua/rút token tự do

Day 7, 08:00:00  → User D tạo Proposal 3
                    → Round 2 bắt đầu
                    → 🔒 Khóa lại mua/rút token
```

## Migration Notes

### Từ hệ thống cũ sang mới:
1. ✅ Proposals giữ nguyên structure
2. ✅ Rounds được tính toán từ proposals hiện có
3. ✅ Cache cũ được giữ lại (earlyWinProposals, timestamps)
4. ✅ Không cần migrate smart contract

## Testing Checklist

- [ ] Tạo proposal đầu tiên → Round được tạo
- [ ] Tạo nhiều proposals → Cùng round
- [ ] Early-win → Round kết thúc ngay
- [ ] Round kết thúc → Mở khóa trading
- [ ] Tạo proposal mới → Round mới được tạo
- [ ] User limit reset khi round mới
- [ ] Vote limit 1 lần/round
- [ ] Không thể mua/rút khi round active
- [ ] Có thể mua/rút giữa các rounds
