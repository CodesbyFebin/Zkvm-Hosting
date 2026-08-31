// One EVM-compatible address, reused across every EVM chain configured below
// (Ethereum, Optimism, Arbitrum, Filecoin EVM). Verified as a checksummed
// address via ethers.getAddress() before being committed here.
const YOUR_WALLET_ADDRESS = '0x5A53E897C2A98432A87Ba3cc2266F481Cb9BAfED'

const donationConfigs = {
  ETH: {
    donationWallet: YOUR_WALLET_ADDRESS,
    tokenContract: null,
    decimals: null,
    isNative: true,
    explorer: 'https://etherscan.io/tx/',
    chainId: 1
  },
  USDT: {
    donationWallet: YOUR_WALLET_ADDRESS,
    tokenContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    isNative: false,
    explorer: 'https://etherscan.io/tx/',
    chainId: 1
  },
  USDT_OP: {
    donationWallet: YOUR_WALLET_ADDRESS,
    tokenContract: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    decimals: 6,
    isNative: false,
    explorer: 'https://optimistic.etherscan.io/tx/',
    chainId: 10
  },
  USDT_ARB: {
    donationWallet: YOUR_WALLET_ADDRESS,
    tokenContract: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    decimals: 6,
    isNative: false,
    explorer: 'https://arbiscan.io/tx/',
    chainId: 42161
  },
  OP: {
    donationWallet: YOUR_WALLET_ADDRESS,
    tokenContract: '0x4200000000000000000000000000000000000042',
    decimals: 18,
    isNative: false,
    explorer: 'https://optimistic.etherscan.io/tx/',
    chainId: 10
  },
  ARB: {
    donationWallet: YOUR_WALLET_ADDRESS,
    tokenContract: '0x912ce59144191c1204e64559fe8253a0e49e6548',
    decimals: 18,
    isNative: false,
    explorer: 'https://arbiscan.io/tx/',
    chainId: 42161
  },
  FIL: {
    donationWallet: YOUR_WALLET_ADDRESS,
    tokenContract: null,
    decimals: null,
    isNative: true,
    explorer: 'https://filfox.info/en/tx/',
    chainId: 314
  }
}

const networkConfigs = {
  1: {
    chainId: '0x1',
    chainName: 'Ethereum Mainnet',
    rpcUrls: ['https://mainnet.infura.io'],
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://etherscan.io']
  },
  10: {
    chainId: '0xa',
    chainName: 'Optimism',
    rpcUrls: ['https://mainnet.optimism.io'],
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://optimistic.etherscan.io']
  },
  42161: {
    chainId: '0xa4b1',
    chainName: 'Arbitrum One',
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://arbiscan.io']
  },
  314: {
    // Chain ID, native currency, and RPC verified live against chainlist.org
    // (Filecoin - Mainnet, height ~6327527 at verification time).
    chainId: '0x13a',
    chainName: 'Filecoin Mainnet',
    rpcUrls: ['https://api.node.glif.io/rpc/v1'],
    nativeCurrency: { name: 'Filecoin', symbol: 'FIL', decimals: 18 },
    blockExplorerUrls: ['https://filfox.info/en']
  }
}

// Bitcoin (native SegWit) and Solana addresses below are shown as static
// "send directly" targets on the page, not wired into the MetaMask flow
// above — neither chain speaks the Ethereum JSON-RPC that ethers.js and
// window.ethereum expect, so there is no "connect wallet" step for them here.
const directAddresses = {
  BTC: { network: 'Bitcoin Mainnet', address: 'bc1qt7tp4nly9xzjkj2ajah5qt0pgvqg8jplpxdeln' },
  SOL: { network: 'Solana Mainnet Beta', address: '73Cc84sjGtk3RNSVoEres4PLMcZZtg4n46kQUzJnR93n' }
}
