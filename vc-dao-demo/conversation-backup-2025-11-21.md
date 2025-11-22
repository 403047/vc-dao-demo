==== BACKUP HỘI THOẠI ====
Date: 2025-11-21
Repository: vc-dao-demo

## 1. Mục tiêu chính
- Làm frontend đẹp hơn
- Tự động execute đề xuất thắng và chuyển tiền Treasury không cần xác nhận MetaMask
- Mỗi proposal chỉ hiển thị thời gian tạo; thời gian kết thúc lấy từ "investment round"
- Sửa lỗi vòng đầu tư cũ không tự kết thúc (countdown cứ kéo dài)

## 2. Stack & Thành phần
- **Frontend**: Next.js 13.5.6, Tailwind CSS, Ethers.js v5
- **Smart Contracts**: Solidity ^0.8.19 (VCGovernor, Treasury, GovernanceToken)
- **Network**: Songbird Coston Testnet
- **Off-chain script**: auto-executor.js (lắng nghe event, execute proposal thắng)
- **LocalStorage cache**: earlyWinProposals, proposalVoters, userRoundVotes

## 3. Trạng thái code hiện tại
- **useProposals.js**: Load proposals, dựng rounds; chưa đánh dấu đúng isFinished / actualEndTime khi hết hạn hoặc early-win
- **ProposalList.js**: Hiển thị thời gian tạo + thời gian kết thúc round; lọc executed & early-win
- **WinningProposals.js**: Danh sách đề xuất thắng (hiển thị thời gian tạo & trạng thái)
- **VCGovernor.sol**: Mỗi proposal vẫn có voteEnd = voteStart + 7 days; ý định dài hạn là đồng bộ với round end; đã thêm auto-execute logic
- **Scripts**: 
  - check-all-proposals.js, check-proposal.js (kiểm tra)
  - vote-old-proposal.js (vote cho proposals cũ)
  - auto-executor.js (tự động execute)
- **Contract cũ**: proposal "4123" đã executed
- **Contract mới**: 0 proposals

## 4. Đã cải thiện
- ✅ UI nâng cấp hiển thị thời gian tạo và lọc trạng thái
- ✅ Auto-execute & tự động chuyển tiền không cần popup người dùng
- ✅ Nút Clear Cache & Nuclear Clear
- ✅ Debug panel (địa chỉ governor + số proposals)
- ✅ Lọc proposals executed hoặc early-win khỏi danh sách đang hoạt động

## 5. Vấn đề tồn đọng
- ❌ Vòng đầu tư không "chốt" sau 7 ngày hay early-win
- ❌ Không lưu actualEndTime khi early-win → UI vẫn đếm ngược
- ❌ Phụ thuộc proposal.voteEnd gây sai vòng khi không có proposal mới
- ❌ File backup trước bị rỗng

## 6. Hướng sửa logic round (đề xuất)
Trong getInvestmentRounds():
1. Nếu `now >= round.endTime` ⇒ `isFinished = true`, `actualEndTime = round.endTime`
2. Nếu có early-win ⇒ `isFinished = true`, `actualEndTime = earlyWinTimestamp`
3. Countdown: dùng `actualEndTime` nếu finished, else `endTime`
4. Không dựa vào `proposal.voteEnd` để xác định kết thúc vòng
5. Persist thêm `roundsState` vào localStorage để tránh tái tính sai sau Clear Cache

## 7. Trạng thái xác thực
- ✅ Proposal cũ executed thành công (trên contract cũ)
- ⚠️ Contract mới chưa có proposals → vòng đầu tư đầu tiên bị coi như "dang dở" vô hạn

## 8. Next Steps (dự kiến)
1. Refactor useProposals.js (hàm dựng rounds)
2. Ghi nhận finished rounds vào localStorage
3. Cập nhật UI: nếu round finished → đổi label / chặn tạo proposal mới cho đến round kế tiếp
4. Giảm nhầm lẫn với voteEnd bằng cách ẩn nó khỏi hiển thị chính

## 9. Cấu trúc dự án
```
vc-dao-demo/
├── contracts/              # Smart contracts (Solidity)
│   ├── GovernanceToken.sol
│   ├── Treasury.sol
│   ├── VCGovernor.sol
│   └── interfaces/
├── frontend/              # Next.js frontend
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Next.js pages
│   ├── styles/           # CSS styles
│   └── utils/            # Utility functions
├── scripts/              # Deployment & utility scripts
│   ├── deploy-coston-fixed.js
│   ├── auto-executor.js
│   ├── check-all-proposals.js
│   └── ...
├── test/                 # Contract tests
└── abis/                 # Contract ABIs & deployed addresses
```

## 10. Ghi chú kỹ thuật
- Sử dụng localStorage để cache: earlyWinProposals, proposalVoters, userRoundVotes
- Investment rounds: 7 ngày mỗi round
- Early win: khi proposal đạt > 50% tổng supply
- Auto-executor chạy background để execute proposals thắng
- Contract addresses lưu trong `deployed-addresses-coston.json`

## 11. Lịch sử phát triển
- Ban đầu: Setup cơ bản DAO với governance token, treasury, governor
- Cải tiến: Thêm auto-execute, UI/UX improvements
- Hiện tại: Debug round logic và cache management

---
**Last Updated**: 2025-11-21
**Status**: Active Development
