import { useState } from 'react';
import { ethers } from 'ethers';
import { contractAddresses, abi } from '../utils/contracts';

export default function BuyTokens({ signer, onTokensBought }) {
  const [loading, setLoading] = useState(false);

  const buyTokens = async () => {
    if (!signer) {
      alert('Vui lòng kết nối ví trước');
      return;
    }
    
    setLoading(true);
    try {
      // Kiểm tra network
      const network = await signer.provider.getNetwork();
      console.log('Network:', network);
      
      // Tạo contract instance với các tùy chọn bổ sung
      const tokenContract = new ethers.Contract(
        contractAddresses.token, 
        abi.token, 
        signer
      );
      
      // Sử dụng số tiền phù hợp với giá hiển thị (0.001 CFLR per token)
      // Ví dụ: mua 1000 token với 1 CFLR
      const amountInCFLR = "1.0"; // 1 CFLR = 1000 VCDAO
      const value = ethers.utils.parseEther(amountInCFLR);
      
      console.log('Sending transaction with value:', value.toString());
      
      // Gọi hàm buyTokens
      const tx = await tokenContract.buyTokens({
        value: value
      });
      
      console.log('Transaction hash:', tx.hash);
      alert(`Giao dịch đã được gửi! Hash: ${tx.hash}`);
      
      // Chờ xác nhận
      await tx.wait();
      console.log('Transaction confirmed!');
      
      onTokensBought();
      alert('Mua token thành công!');
    } catch (error) {
      console.error('Chi tiết lỗi:', error);
      
      if (error.code === 'UNSUPPORTED_OPERATION') {
        alert('Lỗi kết nối mạng. Vui lòng:\n1. Đảm bảo đã kết nối đúng Songbird Coston Testnet\n2. Thử refresh trang và kết nối lại ví');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        alert('Không đủ CFLR để thực hiện giao dịch');
      } else if (error.message.includes('user rejected')) {
        alert('Bạn đã từ chối giao dịch');
      } else {
        alert('Lỗi: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Mua Governance Tokens</h2>
      <p>Giá hiện tại: 0.001 CFLR per token (1 CFLR = 1000 VCDAO)</p>
      <button onClick={buyTokens} disabled={loading}>
        {loading ? 'Đang xử lý...' : 'Mua Tokens (1 CFLR)'}
      </button>
    </div>
  );
}