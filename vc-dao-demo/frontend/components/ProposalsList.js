import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { contractAddresses, abi } from '../utils/contracts';

export default function ProposalsList({ provider, account, signer }) {
  const [proposals, setProposals] = useState([]);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadProposals = async () => {
    if (!provider) return;

    setLoading(true);
    try {
      const governorContract = new ethers.Contract(contractAddresses.governor, abi.governor, provider);
      try {
        const o = await governorContract.owner();
        setOwner(o);
      } catch (e) {
        // ignore if owner() not available
      }
      const proposalCount = await governorContract.proposalCount();
      
      const proposalsData = [];
      for (let i = 1; i <= proposalCount; i++) {
        const proposal = await governorContract.getProposal(i);
        proposalsData.push(proposal);
      }
      
      setProposals(proposalsData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const castVote = async (proposalId, support) => {
    if (!signer) return;

    try {
      const governorContract = new ethers.Contract(contractAddresses.governor, abi.governor, signer);
      const tx = await governorContract.castVote(proposalId, support);
      await tx.wait();
      alert('Bỏ phiếu thành công!');
      loadProposals();
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi bỏ phiếu');
    }
  };

  const executeProposal = async (proposalId) => {
    if (!signer) return;

    try {
      const governorContract = new ethers.Contract(contractAddresses.governor, abi.governor, signer);
      const tx = await governorContract.executeProposal(proposalId);
      await tx.wait();
      alert('Thực thi proposal thành công!');
      loadProposals();
    } catch (error) {
      console.error(error);
      alert('Có lỗi xảy ra khi thực thi proposal');
    }
  };

  const endVotingNow = async (proposalId) => {
    if (!signer) return;

    try {
      const governorContract = new ethers.Contract(contractAddresses.governor, abi.governor, signer);
      const tx = await governorContract.endVotingNow(proposalId);
      await tx.wait();
      alert('Đã kết thúc vòng bỏ phiếu cho proposal ' + proposalId);
      loadProposals();
    } catch (error) {
      console.error(error);
      alert('Không thể kết thúc vòng bỏ phiếu: ' + (error && error.message ? error.message : 'Lỗi'));
    }
  };

  useEffect(() => {
    loadProposals();
  }, [provider]);

  if (loading) {
    return <div>Đang tải proposals...</div>;
  }

  return (
    <div>
      <h2>Danh sách Proposals</h2>
      <button onClick={loadProposals}>Tải Lại</button>
      
      {proposals.length === 0 ? (
        <p>Chưa có proposal nào</p>
      ) : (
        proposals.map((proposal) => (
          <div key={proposal.id.toString()} style={{ border: '1px solid #ccc', margin: '10px', padding: '10px' }}>
            <h3>Proposal #{proposal.id.toString()}</h3>
            <p><strong>Mô tả:</strong> {proposal.description}</p>
            <p><strong>Người đề xuất:</strong> {proposal.proposer}</p>
            <p><strong>Địa chỉ nhận:</strong> {proposal.recipient}</p>
            <p><strong>Số ETH:</strong> {ethers.utils.formatEther(proposal.amount)}</p>
            <p><strong>Bắt đầu bỏ phiếu:</strong> {new Date(proposal.voteStart * 1000).toLocaleString()}</p>
            <p><strong>Kết thúc bỏ phiếu:</strong> {new Date(proposal.voteEnd * 1000).toLocaleString()}</p>
            <p><strong>Phiếu đồng ý:</strong> {ethers.utils.formatEther(proposal.yesVotes)}</p>
            <p><strong>Phiếu từ chối:</strong> {ethers.utils.formatEther(proposal.noVotes)}</p>
            <p><strong>Trạng thái:</strong> {proposal.executed ? 'Đã thực thi' : 'Chưa thực thi'}</p>
            
            {!proposal.executed && (
              <div>
                <button 
                  onClick={() => castVote(proposal.id, true)}
                  disabled={proposal.voters && proposal.voters[account]}
                >
                  Đồng ý
                </button>
                <button 
                  onClick={() => castVote(proposal.id, false)}
                  disabled={proposal.voters && proposal.voters[account]}
                >
                  Từ chối
                </button>
                
                {proposal.voteEnd * 1000 < Date.now() && proposal.yesVotes.gt(proposal.noVotes) && (
                  <button onClick={() => executeProposal(proposal.id)}>
                    Thực thi
                  </button>
                )}
                {/* Nút admin để kết thúc vòng bỏ phiếu ngay lập tức - chỉ hiển thị cho owner */}
                {owner && account && owner.toLowerCase() === account.toLowerCase() && (
                  <div style={{ marginTop: '8px' }}>
                    <button onClick={() => endVotingNow(proposal.id)}>
                      Kết thúc bỏ phiếu ngay
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}