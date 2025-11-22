# 🕐 Phân Tích Độ Chính Xác Thời Gian

**Ngày kiểm tra:** 2025-11-21

## ✅ Những Gì Đã Chính Xác

### 1. Thời gian tạo đề xuất (`voteStart`)
- ✅ **Nguồn:** Blockchain (contract)
- ✅ **Độ chính xác:** Đến giây (timestamp Unix)
- ✅ **Code:** `useProposals.js` dòng 218
```javascript
voteStart: new Date(parseInt(voteStart.toString(), 10) * 1000)
```

### 2. Real-time countdown
- ✅ **Cập nhật:** Mỗi 1 giây
- ✅ **Code:** `ProposalList.js` dòng 16-22
```javascript
useEffect(() => {
  const timer = setInterval(() => {
    setCurrentTime(new Date());
  }, 1000);
  return () => clearInterval(timer);
}, []);
```

### 3. Logic tính toán 7 ngày
- ✅ **Công thức:** `roundEndTime = roundStartTime + (7 * 24 * 60 * 60 * 1000)`
- ✅ **Độ chính xác:** Đến millisecond
- ✅ **Code:** `useProposals.js` dòng 680

## ❌ Vấn Đề Cần Sửa

### 1. **Hiển thị thời gian mất độ chính xác**

#### Vị trí: `ProposalList.js` dòng 229
```javascript
<p className="text-gray-400">Đợt Kết Thúc</p>
<p className="font-semibold">
  {currentRound?.endTime ? new Date(currentRound.endTime).toLocaleDateString('vi-VN') : 'Đang tính...'}
</p>
```

**Vấn đề:** 
- Chỉ hiển thị ngày (VD: 21/11/2025)
- Mất thông tin giờ:phút:giây

**Nên sửa thành:**
```javascript
{currentRound?.endTime ? new Date(currentRound.endTime).toLocaleString('vi-VN') : 'Đang tính...'}
```

#### Vị trí: `ProposalList.js` dòng 210 & 211
```javascript
<p className="text-gray-400">Thời Gian Tạo</p>
<p className="font-semibold">{proposal.voteStart.toLocaleDateString('vi-VN')}</p>
```

**Vấn đề:** Tương tự - chỉ hiển thị ngày

**Nên sửa thành:**
```javascript
<p className="font-semibold">{proposal.voteStart.toLocaleString('vi-VN')}</p>
```

### 2. **Early-win timestamp SAI LOGIC**

#### Vị trí: `useProposals.js` dòng 703
```javascript
if (isWinner) {
  const earlyWinTime = proposalTime; // ❌ SAI - đây là thời gian TẠO proposal
  currentRound.isFinished = true;
  currentRound.earlyWinner = proposal;
  currentRound.actualEndTime = earlyWinTime;
```

**Vấn đề:**
- `proposalTime` = thời gian TẠO đề xuất
- Early-win nên ghi nhận thời gian VOTE ĐẠT >50%
- Hiện tại: nếu proposal tạo lúc 10:00, thắng lúc 15:00 → ghi là 10:00 ❌

**Giải pháp:**
1. Lưu timestamp thực tế khi detect early-win
2. Persist vào localStorage với key: `earlyWin_${proposalId}_timestamp`

### 3. **Không persist actualEndTime**

#### Vị trí: `useProposals.js` dòng 29-38
```javascript
const [earlyWinProposals, setEarlyWinProposals] = useState(() => {
  const saved = localStorage.getItem('earlyWinProposals');
  return saved ? new Set(JSON.parse(saved)) : new Set();
});
```

**Vấn đề:**
- Chỉ lưu proposal IDs
- Không lưu timestamp của early-win
- Khi reload → tính lại rounds → có thể sai thời gian kết thúc

**Nên thêm:**
```javascript
const [earlyWinTimestamps, setEarlyWinTimestamps] = useState(() => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem('earlyWinTimestamps');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
});
```

### 4. **So sánh thời gian không đủ chính xác**

#### Vị trí: `useProposals.js` dòng 265
```javascript
const voteEnded = now.getTime() > effectiveEndTime.getTime();
```

**Hiện tại:** ✅ Đã dùng `.getTime()` → chính xác đến millisecond

**NHƯNG** vấn đề là `effectiveEndTime` có thể không chính xác do:
- `actualRoundEndTime` bị gán sai (= thời gian tạo thay vì thời gian thắng)

## 🔧 Đề Xuất Sửa Chữa

### Fix 1: Hiển thị thời gian đầy đủ
```javascript
// Trong ProposalList.js
// Thay tất cả .toLocaleDateString() → .toLocaleString()
<p className="font-semibold">
  {proposal.voteStart.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })}
</p>
```

### Fix 2: Lưu timestamp early-win chính xác
```javascript
// Khi detect early-win (trong voteOnProposal)
if (hasEarlyWin) {
  const earlyWinTimestamp = Date.now(); // Thời điểm HIỆN TẠI
  
  // Lưu vào localStorage
  const timestamps = JSON.parse(localStorage.getItem('earlyWinTimestamps') || '{}');
  timestamps[proposalId] = earlyWinTimestamp;
  localStorage.setItem('earlyWinTimestamps', JSON.stringify(timestamps));
  
  // Mark early-win
  setEarlyWinProposals(prev => {
    const newSet = new Set([...prev, proposalId]);
    localStorage.setItem('earlyWinProposals', JSON.stringify([...newSet]));
    return newSet;
  });
}
```

### Fix 3: Dùng timestamp đã lưu khi tính rounds
```javascript
// Trong getInvestmentRounds()
if (isWinner) {
  // Lấy timestamp thực tế từ localStorage
  const savedTimestamps = JSON.parse(
    localStorage.getItem('earlyWinTimestamps') || '{}'
  );
  const earlyWinTime = savedTimestamps[proposal.id] || proposalTime;
  
  currentRound.isFinished = true;
  currentRound.earlyWinner = proposal;
  currentRound.actualEndTime = earlyWinTime;
  
  // Cập nhật proposals với thời gian chính xác
  currentRound.proposals.forEach(p => {
    p.voteEnd = new Date(earlyWinTime);
    p.actualRoundEndTime = earlyWinTime;
  });
}
```

## 📋 Checklist Sửa Lỗi

- [ ] Fix 1: Thay `.toLocaleDateString()` → `.toLocaleString()` cho tất cả hiển thị thời gian
- [ ] Fix 2: Thêm state `earlyWinTimestamps` và persist vào localStorage
- [ ] Fix 3: Lưu timestamp khi detect early-win (thời điểm vote đạt >50%)
- [ ] Fix 4: Dùng saved timestamp khi tính `actualEndTime` trong rounds
- [ ] Fix 5: Clear `earlyWinTimestamps` khi contract address thay đổi
- [ ] Test: Tạo proposal, vote đến >50%, kiểm tra timestamp có chính xác không
- [ ] Test: Reload trang, kiểm tra thời gian kết thúc có giữ nguyên không

## 🎯 Kết Quả Mong Đợi

Sau khi sửa:
1. ✅ Thời gian tạo hiển thị: `21/11/2025, 14:30:45`
2. ✅ Thời gian đợt kết thúc: `28/11/2025, 14:30:45` (chính xác đến giây)
3. ✅ Early-win timestamp: Thời điểm VOTE đạt >50%, không phải thời gian tạo
4. ✅ Reload trang: Thời gian không thay đổi (đã persist)
5. ✅ Countdown: Chính xác đến giây, real-time update

---
**Ưu tiên:** 🔴 CAO - Ảnh hưởng đến tính chính xác của vòng đầu tư
