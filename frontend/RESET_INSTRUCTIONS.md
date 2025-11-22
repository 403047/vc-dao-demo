# Kiểm tra / Reset trạng thái Voting & Token

1. Xác nhận frontend đang dùng đúng file addresses
   - Kiểm tra frontend/src/config/contract-addresses.json đã đúng network và addresses.

2. Kiểm tra state on-chain (quick test)
   - Chạy script:
     node frontend/scripts/query-state.js RPC_URL YOUR_ADDRESS
   - Kiểm tra totalSupply và getVotes của governor cho address mong muốn.

3. Nếu state trên chain chưa reset:
   - Cập nhật file không đủ — phải thay đổi on-chain:
     a) Nếu hợp đồng có hàm admin để reset/revoke/burn => gọi hàm đó từ tài khoản owner.
     b) Nếu không có hàm admin phù hợp => redeploy hợp đồng (mới) và cập nhật addresses ở frontend.
   - Dùng Hardhat/ethers để gọi hàm admin hoặc redeploy.

4. Sau khi thay on-chain:
   - Xóa cache frontend & localStorage (mở devtools -> Application -> Clear Storage).
   - Ngắt kết nối/wallet và reconnect.
   - Nếu dùng subgraph/indexer -> re-index hoặc update mapping để fetch lại events.

5. Gợi ý debug:
   - Kiểm tra chủ sở hữu (owner) của contract để xác định ai có quyền gọi hàm admin.
   - Dùng block explorer của mạng (Coston) để xem giao dịch deploy/calls.
   - Nếu cần, chạy scripts tương tự `query-state.js` trên nhiều địa chỉ để kiểm tra voting distribution.

