/**
 * Wallet Service
 * Handles wallet connections (Phantom, MetaMask, etc.)
 * For Polymarket trading on Polygon network
 */

class WalletService {
  constructor() {
    this.wallet = null
    this.provider = null
    this.signer = null
    this.address = null
    this.chainId = 137 // Polygon mainnet
  }

  /**
   * Check if Phantom wallet is installed
   * Phantom supports both Solana and Ethereum
   */
  isPhantomInstalled() {
    return typeof window !== 'undefined' && (
      (window.ethereum && window.ethereum.isPhantom) ||
      (window.phantom && window.phantom.ethereum)
    )
  }

  /**
   * Check if MetaMask is installed
   */
  isMetaMaskInstalled() {
    return typeof window !== 'undefined' && window.ethereum && window.ethereum.isMetaMask
  }

  /**
   * Connect to Phantom wallet (Ethereum mode)
   * Note: Phantom supports both Solana and Ethereum
   */
  async connectPhantom() {
    try {
      if (!this.isPhantomInstalled()) {
        throw new Error('Phantom wallet is not installed. Please install it from https://phantom.app')
      }

      // Get Phantom's Ethereum provider
      let ethereumProvider = null
      if (window.ethereum && window.ethereum.isPhantom) {
        ethereumProvider = window.ethereum
      } else if (window.phantom && window.phantom.ethereum) {
        ethereumProvider = window.phantom.ethereum
      }

      if (ethereumProvider) {
        // Request account access
        const accounts = await ethereumProvider.request({
          method: 'eth_requestAccounts',
        })

        if (accounts.length === 0) {
          throw new Error('No accounts found')
        }

        this.address = accounts[0]
        this.provider = ethereumProvider

        // Check if we're on the correct network (Polygon)
        const chainId = await ethereumProvider.request({ method: 'eth_chainId' })
        const polygonChainId = '0x89' // 137 in hex

        if (chainId !== polygonChainId) {
          // Request to switch to Polygon
          try {
            await ethereumProvider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: polygonChainId }],
            })
          } catch (switchError) {
            // If chain doesn't exist, add it
            if (switchError.code === 4902) {
              await ethereumProvider.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: polygonChainId,
                    chainName: 'Polygon Mainnet',
                    nativeCurrency: {
                      name: 'MATIC',
                      symbol: 'MATIC',
                      decimals: 18,
                    },
                    rpcUrls: ['https://polygon-rpc.com'],
                    blockExplorerUrls: ['https://polygonscan.com'],
                  },
                ],
              })
            } else {
              throw switchError
            }
          }
        }

        // Import ethers to create signer
        const { ethers } = await import('ethers')
        this.provider = new ethers.BrowserProvider(ethereumProvider)
        this.signer = await this.provider.getSigner()
        this.address = await this.signer.getAddress()

        return {
          address: this.address,
          provider: this.provider,
          signer: this.signer,
        }
      } else {
        throw new Error('Phantom Ethereum provider not found')
      }
    } catch (error) {
      console.error('Error connecting Phantom wallet:', error)
      throw error
    }
  }

  /**
   * Connect to MetaMask wallet
   */
  async connectMetaMask() {
    try {
      if (!this.isMetaMaskInstalled()) {
        throw new Error('MetaMask is not installed. Please install it from https://metamask.io')
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      })

      if (accounts.length === 0) {
        throw new Error('No accounts found')
      }

      this.address = accounts[0]
      this.provider = window.ethereum

      // Check if we're on the correct network (Polygon)
      const chainId = await window.ethereum.request({ method: 'eth_chainId' })
      const polygonChainId = '0x89' // 137 in hex

      if (chainId !== polygonChainId) {
        // Request to switch to Polygon
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: polygonChainId }],
          })
        } catch (switchError) {
          // If chain doesn't exist, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: polygonChainId,
                  chainName: 'Polygon Mainnet',
                  nativeCurrency: {
                    name: 'MATIC',
                    symbol: 'MATIC',
                    decimals: 18,
                  },
                  rpcUrls: ['https://polygon-rpc.com'],
                  blockExplorerUrls: ['https://polygonscan.com'],
                },
              ],
            })
          } else {
            throw switchError
          }
        }
      }

      // Import ethers to create signer
      const { ethers } = await import('ethers')
      this.provider = new ethers.BrowserProvider(window.ethereum)
      this.signer = await this.provider.getSigner()
      this.address = await this.signer.getAddress()

      return {
        address: this.address,
        provider: this.provider,
        signer: this.signer,
      }
    } catch (error) {
      console.error('Error connecting MetaMask:', error)
      throw error
    }
  }

  /**
   * Disconnect wallet
   */
  disconnect() {
    this.wallet = null
    this.provider = null
    this.signer = null
    this.address = null
  }

  /**
   * Get current wallet address
   */
  getAddress() {
    return this.address
  }

  /**
   * Check if wallet is connected
   */
  isConnected() {
    return this.address !== null && this.signer !== null
  }

  /**
   * Get signer for transactions
   */
  getSigner() {
    return this.signer
  }

  /**
   * Get provider
   */
  getProvider() {
    return this.provider
  }
}

// Export singleton instance
export const walletService = new WalletService()

