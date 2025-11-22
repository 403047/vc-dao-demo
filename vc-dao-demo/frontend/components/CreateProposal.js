import { useState } from 'react';
import { ethers } from 'ethers';
import { contractAddresses, abi } from '../utils/contracts';

export default function CreateProposal({ signer, tokenBalance }) {
  const [description, setDescription] = useState('');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const createProposal = async (e) => {
    e.preventDefault();
    if (!signer) return;

    setLoading(true);
    try {
      const governorContract = new ethers.Contract(contractAddresses.governor, abi.governor, signer);
      const tx = await governorContract.createProposal(
        description,
        recipient,
        ethers.utils.parseEther(amount)
      );
      
      await tx.wait();
      alert('Tạo proposal thành công!');
      setDescription('');
      setRecipient('');
      setAmount('');
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi tạo proposal');
    } finally {
      setLoading(false);
    }
  };

  if (parseFloat(tokenBalance) === 0) {
    return (
      <div>
        <h2>Tạo Proposal Đầu Tư</h2>
        <p>Bạn cần mua token để tạo proposal</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Tạo Proposal Đầu Tư</h2>
      <form onSubmit={createProposal}>
        <div>
          <label>Mô tả:</label>
          <input 
            type="text" 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label>Địa chỉ nhận:</label>
          <input 
            type="text" 
            value={recipient} 
            onChange={(e) => setRecipient(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label>Số ETH:</label>
          <input 
            type="number" 
            step="0.001"
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            required 
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Đang xử lý...' : 'Tạo Proposal'}
        </button>
      </form>
    </div>
  );
}