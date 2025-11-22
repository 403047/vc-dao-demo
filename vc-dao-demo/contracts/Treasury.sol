// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Interface thay vì import full contract để tránh circular dependency
interface IGovernanceToken {
    function burnFrom(address from, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract Treasury {
    uint256 public totalFunds;
    string public name;
    address public owner;
    
    event FundsDeposited(address indexed from, uint256 amount, string description);
    event FundsWithdrawn(address indexed to, uint256 amount, string description);
    event TreasuryCreated(string name, address creator);
    event Refunded(address indexed user, uint256 tokenAmount, uint256 cflrReturned);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier nonReentrant() {
        require(!_reentrantLock, "Reentrant call");
        _reentrantLock = true;
        _;
        _reentrantLock = false;
    }
    
    bool private _reentrantLock;

    IGovernanceToken public token;
    uint256 public constant TOKEN_PRICE = 0.001 ether; // phải đồng bộ với GovernanceToken
    uint256 public constant REFUND_RATE_NUM = 90; // 90%
    uint256 public constant REFUND_RATE_DEN = 100;

    constructor(string memory _name, address _token) {
        name = _name;
        owner = msg.sender;
        // Token có thể là address(0) khi deploy (set sau)
        if (_token != address(0)) {
            token = IGovernanceToken(_token);
        }
        emit TreasuryCreated(_name, msg.sender);
    }
    
    // Cho phép owner set token address sau khi deploy
    function setToken(address _token) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        token = IGovernanceToken(_token);
    }

    receive() external payable {
        totalFunds += msg.value;
        emit FundsDeposited(msg.sender, msg.value, "Direct deposit");
    }

    function deposit(string memory description) external payable {
        totalFunds += msg.value;
        emit FundsDeposited(msg.sender, msg.value, description);
    }

    function withdrawFunds(
        address payable _to, 
        uint256 _amount, 
        string memory _description
    ) external onlyOwner nonReentrant {
        require(_amount <= address(this).balance, "Insufficient balance");
        require(_amount > 0, "Amount must be greater than 0");
        
        totalFunds -= _amount;
        _to.transfer(_amount);
        
        emit FundsWithdrawn(_to, _amount, _description);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // Cho phép bất kỳ holder refund token của họ để lấy lại 90% giá trị CFLR
    function refund(uint256 tokenAmount) external nonReentrant {
        require(tokenAmount > 0, "Amount must be > 0");
        // Kiểm tra người gọi có đủ token
        require(token.balanceOf(msg.sender) >= tokenAmount, "Insufficient token balance");
        // Người gọi cần approve trước cho Treasury
        require(token.allowance(msg.sender, address(this)) >= tokenAmount, "Allowance insufficient");

        // Burn token thông qua burnFrom
        bool burned = token.burnFrom(msg.sender, tokenAmount);
        require(burned, "Burn failed");

        // Tính số CFLR trả lại: tokenAmount / 1e18 * TOKEN_PRICE * 90%
        uint256 base = (tokenAmount * TOKEN_PRICE) / 1e18; // Giá trị CFLR đầy đủ
        uint256 refundValue = (base * REFUND_RATE_NUM) / REFUND_RATE_DEN;
        require(refundValue > 0, "Refund value = 0");
        require(refundValue <= address(this).balance, "Treasury insufficient CFLR");

        totalFunds -= refundValue; // giảm tracking quỹ do chi trả
        payable(msg.sender).transfer(refundValue);
        emit Refunded(msg.sender, tokenAmount, refundValue);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getTreasuryInfo() external view returns (
        string memory _name,
        uint256 _balance,
        uint256 _totalFunds,
        address _owner
    ) {
        return (
            name,
            address(this).balance,
            totalFunds,
            owner
        );
    }
}