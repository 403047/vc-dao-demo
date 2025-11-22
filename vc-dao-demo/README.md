# VC DAO Demo

Một DAO quỹ đầu tư mạo hiểm phi tập trung được xây dựng với Hardhat và Next.js.

## Tính năng

- Mua Governance Token bằng ETH
- Tạo proposal đầu tư
- Bỏ phiếu cho proposal
- Tự động thực thi proposal khi đạt đủ phiếu

## Cài đặt

1. Cài đặt dependencies:
```bash
npm install
```

2. Cấu hình biến môi trường frontend:

Tạo file `frontend/.env.local` bằng cách copy từ mẫu:

```bash
cp frontend/.env.example frontend/.env.local
```

Sau đó cập nhật các địa chỉ contract đã deploy:

```env
NEXT_PUBLIC_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_TREASURY_ADDRESS=0x...
NEXT_PUBLIC_GOVERNOR_ADDRESS=0x...
```

Nếu bạn chưa có địa chỉ (ví dụ mới clone repo để xem thử) ứng dụng sẽ dùng địa chỉ mặc định và hiện cảnh báo trong console trình duyệt.

3. Chạy frontend:

```bash
cd frontend
npm run dev
```

4. Deploy contracts (Hardhat):

```bash
npx hardhat run scripts/deploy.js --network coston
```

Sau deploy, ghi lại địa chỉ vào `.env.local`. Nên dùng địa chỉ checksum.

## Biến môi trường

| Variable | Mô tả |
|----------|-------|
| NEXT_PUBLIC_TOKEN_ADDRESS | Địa chỉ Governance Token |
| NEXT_PUBLIC_TREASURY_ADDRESS | Địa chỉ Treasury contract |
| NEXT_PUBLIC_GOVERNOR_ADDRESS | Địa chỉ Governor contract |

Tất cả phải có prefix `NEXT_PUBLIC_` để được render ở phía client trong Next.js.

## Ghi chú kiến trúc

Các ABI và địa chỉ được quản lý tập trung tại `frontend/src/config/daoContracts.js`. File cũ `frontend/utils/contracts.js` và `frontend/src/config/contracts.js` chỉ còn đóng vai trò chuyển tiếp để tránh lỗi với mã legacy.

## License

Demo code phục vụ mục đích học tập. Vui lòng kiểm tra lại và bổ sung giấy phép phù hợp nếu dùng trong sản phẩm.