// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract GovernanceToken {
    string public constant name = "VC DAO Governance Token";
    string public constant symbol = "VCDAO";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    
    address public owner;
    address public treasury; // Treasury nhận CFLR từ việc bán token
    uint256 public constant TOKEN_PRICE = 0.001 ether; // 0.001 CFLR = 1 token

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TokensPurchased(address indexed buyer, uint256 ethAmount, uint256 tokenAmount);
    event TokensBurned(address indexed from, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _treasury) {
        owner = msg.sender;
        treasury = _treasury;
        totalSupply = 0; // Không mint trước, token sẽ mint khi mua
    }

    // Mua token: CFLR vào Treasury, token mint cho người mua
    function buyTokens() external payable {
        require(msg.value > 0, "Must send CFLR to buy tokens");
        require(treasury != address(0), "Treasury not set");
        
        // Tính số token nhận được: msg.value / TOKEN_PRICE
        uint256 tokenAmount = (msg.value * 10**18) / TOKEN_PRICE;
        require(tokenAmount > 0, "Token amount must be greater than 0");
        
        // Mint token mới cho người mua
        totalSupply += tokenAmount;
        balanceOf[msg.sender] += tokenAmount;
        
        emit Transfer(address(0), msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, msg.value, tokenAmount);
        
        // Chuyển toàn bộ CFLR vào Treasury (dùng call thay vì transfer)
        (bool success, ) = payable(treasury).call{value: msg.value}("");
        require(success, "Transfer to treasury failed");
    }

    // Hàm tính token có thể mua - CŨNG SỬA LẠI
    function calculateTokenAmount(uint256 cflrAmount) external pure returns (uint256) {
        return (cflrAmount * 10**18) / TOKEN_PRICE;
    }

    // Các hàm khác giữ nguyên...
    function transfer(address to, uint256 value) external returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Allowance exceeded");
        
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }

    // Cho phép holder tự burn token của họ
    function burn(uint256 value) external returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        totalSupply -= value;
        emit Transfer(msg.sender, address(0), value);
        emit TokensBurned(msg.sender, value);
        return true;
    }

    // Burn token từ tài khoản khác với allowance (dùng cho Treasury refund)
    function burnFrom(address from, uint256 value) external returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Allowance exceeded");
        balanceOf[from] -= value;
        allowance[from][msg.sender] -= value;
        totalSupply -= value;
        emit Transfer(from, address(0), value);
        emit TokensBurned(from, value);
        return true;
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        payable(owner).transfer(balance);
    }
    
    // Cho phép owner thay đổi Treasury address nếu cần
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury address");
        treasury = _treasury;
    }

    function getTokenPrice() external pure returns (uint256) {
        return TOKEN_PRICE;
    }

    function getOwnerBalance() external view returns (uint256) {
        return balanceOf[owner];
    }
}