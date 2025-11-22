// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./GovernanceToken.sol";
import "./Treasury.sol";

contract VCGovernor {
    enum Vote { None, Yes, No }
    enum ProposalState { Pending, Active, Defeated, Succeeded, Executed }
    
    struct Proposal {
        uint256 id;
        address proposer;
        string title;
        string description;
        address recipient;
        uint256 amount;
        uint256 voteStart;
        uint256 voteEnd;
        uint256 yesVotes;
        uint256 noVotes;
        uint256 yesVoterCount;
        uint256 noVoterCount;
        bool executed;
        uint256 roundId;
        mapping(address => bool) voters;
    }

    // Struct để trả về dữ liệu proposal
    struct ProposalView {
        uint256 id;
        address proposer;
        string title;
        string description;
        address recipient;
        uint256 amount;
        uint256 voteStart;
        uint256 voteEnd;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
        ProposalState state;
    }

    GovernanceToken public governanceToken;
    Treasury public treasury;
    address public owner;
    
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    uint256 public votingDelay = 0; // Không có delay, bắt đầu vote ngay
    uint256 public votingPeriod = 7 days; // Voting trong 7 ngày
    uint256 public quorumPercentage = 10;
    uint256 public eligibleHoldersCount = 0;
    uint256 public currentRoundStart = 0;
    uint256 public currentRoundEnd = 0;
    bool public roundActive = false;
    uint256 public currentRoundId = 0;
    uint256 public nextRoundId = 1;
    mapping(uint256 => Round) public rounds;

    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        uint256 amount,
        address recipient
    );
    event VoteCast(
        address indexed voter, 
        uint256 indexed proposalId, 
        uint8 support,
        uint256 weight
    );
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalReadyForExecution(uint256 indexed proposalId, address indexed recipient, uint256 amount);
    event VotingEndedNow(uint256 indexed proposalId);
    event VotingSettingsUpdated(uint256 delay, uint256 period, uint256 quorum);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _token, address _treasury) {
        governanceToken = GovernanceToken(_token);
        treasury = Treasury(payable(_treasury));
        owner = msg.sender;
    }

    function _startNewRound(uint256 startTs) internal {
        currentRoundStart = startTs + votingDelay;
        currentRoundEnd = currentRoundStart + votingPeriod;
        roundActive = true;
        currentRoundId = nextRoundId;
        Round storage r = rounds[currentRoundId];
        r.id = currentRoundId;
        r.start = currentRoundStart;
        r.end = currentRoundEnd;
        r.finished = false;
        r.earlyWinnerId = 0;
        r.proposalCount = 0;
        nextRoundId += 1;
    }

    function createProposal(
        string memory _title,
        string memory _description,
        address _recipient, 
        uint256 _amount
    ) external returns (uint256) {
        require(governanceToken.balanceOf(msg.sender) > 0, "Must hold tokens to propose");
        require(_amount > 0, "Amount must be greater than 0");
        require(_recipient != address(0), "Invalid recipient address");
        if (!roundActive || block.timestamp > currentRoundEnd) {
            _startNewRound(block.timestamp);
        }

        proposalCount++;
        Proposal storage newProposal = proposals[proposalCount];
        newProposal.id = proposalCount;
        newProposal.proposer = msg.sender;
        newProposal.title = _title;
        newProposal.description = _description;
        newProposal.recipient = _recipient;
        newProposal.amount = _amount;
        newProposal.voteStart = currentRoundStart;
        newProposal.voteEnd = currentRoundEnd;
        newProposal.executed = false;
        newProposal.roundId = currentRoundId;

        // Update round meta
        Round storage r = rounds[currentRoundId];
        r.proposalCount += 1;
        
        emit ProposalCreated(
            proposalCount, 
            msg.sender, 
            _title, 
            _amount, 
            _recipient
        );
        
        return proposalCount;
    }

    function castVote(uint256 _proposalId, bool _support) external {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.id == _proposalId, "Proposal does not exist");
        require(block.timestamp >= proposal.voteStart, "Voting not started");
        // Enforce voting only for proposals in the current active round
        require(roundActive && block.timestamp <= currentRoundEnd, "Voting ended");
        require(proposal.roundId == currentRoundId, "Wrong round for voting");
        require(!rounds[proposal.roundId].finished, "Round finished");
        require(!proposal.voters[msg.sender], "Already voted");
        uint256 bal = governanceToken.balanceOf(msg.sender);
        uint256 ts = governanceToken.totalSupply();
        require(bal > 0, "No tokens to vote");
        require(bal * 100 >= ts, "Not eligible");

        uint256 voterWeight = governanceToken.balanceOf(msg.sender);
        
        if (_support) {
            proposal.yesVotes += voterWeight;
            proposal.yesVoterCount += 1;
        } else {
            proposal.noVotes += voterWeight;
            proposal.noVoterCount += 1;
        }
        
        proposal.voters[msg.sender] = true;
        emit VoteCast(msg.sender, _proposalId, _support ? 1 : 0, voterWeight);
        
        // AUTO-EXECUTE: Tự động execute nếu đạt early-win
        _checkAndAutoExecute(_proposalId);
    }

    function executeProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.id == _proposalId, "Proposal does not exist");
        require(!proposal.executed, "Already executed");
        require(proposal.yesVotes > proposal.noVotes, "Proposal failed");
        
        uint256 threshold = (eligibleHoldersCount + 1) / 2;
        if (eligibleHoldersCount == 0) {
            threshold = 2; // Fallback: cần tối thiểu 2 người đồng ý khi chưa đồng bộ eligible holders
        }
        bool canExecuteEarly = proposal.yesVoterCount >= threshold;
        if (!canExecuteEarly) {
            uint256 totalSupply2 = governanceToken.totalSupply();
            uint256 quorumRequired2 = (totalSupply2 * quorumPercentage) / 100;
            require(block.timestamp > currentRoundEnd, "Voting not ended");
            require(proposal.yesVotes > proposal.noVotes, "Proposal failed");
            require(proposal.yesVotes >= quorumRequired2, "Quorum not reached");
        }

        // Sử dụng internal function để execute
        _executeProposalInternal(_proposalId);
    }

    function getProposalState(uint256 _proposalId) public view returns (ProposalState) {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.id == _proposalId, "Proposal does not exist");
        
        if (proposal.executed) return ProposalState.Executed;
        if (block.timestamp < proposal.voteStart) return ProposalState.Pending;
        if (roundActive && block.timestamp <= currentRoundEnd && !rounds[proposal.roundId].finished && proposal.roundId == currentRoundId) return ProposalState.Active;
        if (proposal.yesVotes <= proposal.noVotes) return ProposalState.Defeated;
        return ProposalState.Succeeded;
    }

    // Sửa hàm getProposal để tránh stack too deep
    function getProposal(uint256 _proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory title,
        string memory description,
        address recipient,
        uint256 amount,
        uint256 voteStart,
        uint256 voteEnd,
        uint256 yesVotes,
        uint256 noVotes,
        bool executed
    ) {
        Proposal storage p = proposals[_proposalId];
        return (
            p.id,
            p.proposer,
            p.title,
            p.description,
            p.recipient,
            p.amount,
            p.voteStart,
            p.voteEnd,
            p.yesVotes,
            p.noVotes,
            p.executed
        );
    }

    function getVoterCounts(uint256 _proposalId) external view returns (uint256 yesCount, uint256 noCount) {
        Proposal storage p = proposals[_proposalId];
        return (p.yesVoterCount, p.noVoterCount);
    }

    // Thêm hàm riêng để lấy state
    function getProposalWithState(uint256 _proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory title,
        string memory description,
        address recipient,
        uint256 amount,
        uint256 voteStart,
        uint256 voteEnd,
        uint256 yesVotes,
        uint256 noVotes,
        bool executed,
        ProposalState state
    ) {
        Proposal storage p = proposals[_proposalId];
        return (
            p.id,
            p.proposer,
            p.title,
            p.description,
            p.recipient,
            p.amount,
            p.voteStart,
            p.voteEnd,
            p.yesVotes,
            p.noVotes,
            p.executed,
            getProposalState(_proposalId)
        );
    }

    function hasVoted(uint256 _proposalId, address _voter) external view returns (bool) {
        return proposals[_proposalId].voters[_voter];
    }

    function updateVotingSettings(
        uint256 _delay,
        uint256 _period, 
        uint256 _quorum
    ) external onlyOwner {
        votingDelay = _delay;
        votingPeriod = _period;
        quorumPercentage = _quorum;
        emit VotingSettingsUpdated(_delay, _period, _quorum);
    }

    function updateEligibleHoldersCount(uint256 _count) external onlyOwner {
        eligibleHoldersCount = _count;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    // Cho phép owner kết thúc vòng bỏ phiếu cho một proposal ngay lập tức (dùng cho testing)
    function endVotingNow(uint256 _proposalId) external onlyOwner {
        Proposal storage proposal = proposals[_proposalId];
        require(proposal.id == _proposalId, "Proposal does not exist");
        // Đặt thời gian kết thúc bằng thời điểm hiện tại
        proposal.voteEnd = block.timestamp;
        currentRoundEnd = block.timestamp;
        roundActive = false;
        // Mark round finished
        Round storage r = rounds[proposal.roundId];
        r.end = currentRoundEnd;
        r.finished = true;
        emit VotingEndedNow(_proposalId);

        // Kiểm tra và auto-execute nếu thỏa điều kiện sau khi kết thúc
        _checkAndAutoExecute(_proposalId);
    }

    // AUTO-EXECUTE: Kiểm tra và tự động execute proposal nếu đạt điều kiện
    function _checkAndAutoExecute(uint256 _proposalId) internal {
        Proposal storage proposal = proposals[_proposalId];
        
        // Chỉ auto-execute nếu chưa executed
        if (proposal.executed) return;
        
        // Kiểm tra điều kiện early-win theo số người vote YES
        uint256 thresholdAuto = (eligibleHoldersCount + 1) / 2;
        if (eligibleHoldersCount == 0) {
            thresholdAuto = 2;
        }
        bool hasEarlyWin = proposal.yesVoterCount >= thresholdAuto;
        
        // Kiểm tra đã kết thúc voting và thắng cuộc
        bool votingEnded = block.timestamp > currentRoundEnd;
        bool proposalWon = proposal.yesVotes > proposal.noVotes;
        
        // Kiểm tra quorum
        uint256 totalSupply3 = governanceToken.totalSupply();
        uint256 quorumRequired3 = (totalSupply3 * quorumPercentage) / 100;
        bool quorumMet3 = proposal.yesVotes >= quorumRequired3;
        if (hasEarlyWin || (votingEnded && proposalWon && quorumMet3)) {
            // Mark round finished and set early winner when applicable
            Round storage r = rounds[proposal.roundId];
            r.finished = true;
            r.end = block.timestamp;
            if (hasEarlyWin) {
                r.earlyWinnerId = proposal.id;
            }
            emit ProposalReadyForExecution(_proposalId, proposal.recipient, proposal.amount);
            _executeProposalInternal(_proposalId);
        }
    }
    
    // Internal function để execute proposal (không cần external checks)
    function _executeProposalInternal(uint256 _proposalId) internal {
        Proposal storage proposal = proposals[_proposalId];
        
        // Mark as executed trước để tránh reentrancy
        proposal.executed = true;
        roundActive = false;
        currentRoundEnd = block.timestamp;
        Round storage r = rounds[proposal.roundId];
        r.finished = true;
        r.end = currentRoundEnd;
        r.earlyWinnerId = r.earlyWinnerId == 0 ? proposal.id : r.earlyWinnerId;
        
        // Chuyển tiền từ treasury
        string memory description = string(abi.encodePacked(
            "DAO Proposal #",
            uint2str(_proposalId),
            ": ",
            proposal.title
        ));
        
        treasury.withdrawFunds(
            payable(proposal.recipient), 
            proposal.amount, 
            description
        );
        
        // Emit event
        emit ProposalExecuted(_proposalId);
    }

    // Views for rounds
    function getRound(uint256 roundId) external view returns (uint256 id, uint256 start, uint256 end, bool finished, uint256 earlyWinnerId, uint256 proposalCount) {
        Round storage r = rounds[roundId];
        return (r.id, r.start, r.end, r.finished, r.earlyWinnerId, r.proposalCount);
    }

    // Helper function to convert uint to string
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
    struct Round {
        uint256 id;
        uint256 start;
        uint256 end;
        bool finished;
        uint256 earlyWinnerId; // 0 if none
        uint256 proposalCount;
    }
