export const formatAddress = (address) => {
  if (!address) return '';
  return address.slice(0, 6) + '...' + address.slice(-4);
};

export const formatNumber = (num, decimals = 4) => {
  const n = parseFloat(num);
  if (isNaN(n)) return '0';
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals });
};

export const formatTokenBalance = (balance) => {
  const n = parseFloat(balance);
  if (isNaN(n)) return '0';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

// Helper: tính số CFLR hoàn trả từ VCDAO theo tỉ lệ cố định 1 VCDAO = 0.001 CFLR, refund 90%
export const computeRefundCflr = (vcdaoAmount) => {
  const n = parseFloat(vcdaoAmount || '0');
  if (isNaN(n) || n <= 0) return 0;
  return n * 0.001 * 0.9;
};
