export const CONTRACT_ADDRESSES = {
  token: "0x3ad34899951B491132302f22849C174a18E9668D",
  treasury: "0xad5Fe02d8a3cbd740589888f6EB22f84E614A38D", 
  governor: "0x26D3E316E5BbEfb0Bd6fC1ECE311307F00da5973"
  };

export const NETWORK_CONFIG = {
  coston: {
    chainId: "0x10",
    chainName: "Songbird Coston",
    rpcUrls: ["https://coston-api.flare.network/ext/bc/C/rpc"],
    blockExplorerUrls: ["https://coston-explorer.flare.network"],
    nativeCurrency: {
      name: "Coston FLR",
      symbol: "CFLR",
      decimals: 18
    }
  }
};

export const PROPOSAL_STATES = {
  0: "Chờ xử lý",
  1: "Đang hoạt động", 
  2: "Bị từ chối",
  3: "Thành công",
  4: "Đã thực thi"
};

export const NAV_TABS = [
  { id: 'dashboard', label: 'Trang Chủ', icon: '📊' },
  { id: 'invest', label: 'Mua Token', icon: '💰' },
  { id: 'refund', label: 'Rút Tiền', icon: '💸' },
  { id: 'proposals', label: 'Đề Xuất', icon: '📝' },
  { id: 'winners', label: 'Đã Thắng', icon: '🏆' },
  { id: 'create', label: 'Tạo Đề Xuất', icon: '✨' },
  { id: 'holders', label: 'Người Sở Hữu', icon: '👥' }
];