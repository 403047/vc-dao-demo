import { useEffect, useState } from 'react';
import styles from '../styles/Components.module.css';

export default function ConnectWallet({ account, isConnected, connectWallet, disconnectWallet }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const formatAddress = (addr) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className={styles.walletContainer}>
      {!isConnected ? (
        <button className={styles.connectButton} onClick={connectWallet}>
          Kết Nối Ví
        </button>
      ) : (
        <div className={styles.connectedWallet}>
          <span className={styles.address}>{formatAddress(account)}</span>
          <button className={styles.disconnectButton} onClick={disconnectWallet}>
            Ngắt Kết Nối
          </button>
        </div>
      )}
    </div>
  );
}