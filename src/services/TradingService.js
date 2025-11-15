/**
 * Trading Service
 * Handles order placement on Polymarket using CLOB client
 * 
 * Setup required:
 * 1. Private key from wallet or Magic Link (https://reveal.magic.link/polymarket)
 * 2. Funder address (shown below profile picture on Polymarket site)
 * 3. Set VITE_POLYMARKET_PRIVATE_KEY and VITE_POLYMARKET_FUNDER_ADDRESS in .env
 */

import { ApiKeyCreds, ClobClient, OrderType, Side } from "@polymarket/clob-client"
import { Wallet } from "@ethersproject/wallet"
import { POLYMARKET_CONFIG } from '../config/dataConfig'

class TradingService {
  constructor() {
    this.host = POLYMARKET_CONFIG.clobApiUrl || 'https://clob.polymarket.com'
    this.chainId = 137 // Polygon mainnet
    this.clobClient = null
    this.isInitialized = false
    this.signatureType = 1 // 1: Magic/Email, 2: Browser Wallet, 0: EOA
  }

  /**
   * Initialize the CLOB client with wallet credentials
   * @param {Object} options - Wallet configuration
   * @param {string} options.privateKey - Private key (or from env)
   * @param {string} options.funderAddress - Funder address (or from env)
   * @param {number} options.signatureType - Signature type (1: Magic/Email, 2: Browser Wallet, 0: EOA)
   * @returns {Promise<ClobClient>} Initialized CLOB client
   */
  async initialize(options = {}) {
    try {
      // Get credentials from options, config, or environment
      const privateKey = options.privateKey || POLYMARKET_CONFIG.privateKey
      const funderAddress = options.funderAddress || POLYMARKET_CONFIG.funderAddress

      if (!privateKey) {
        throw new Error('Private key is required. Set VITE_POLYMARKET_PRIVATE_KEY in .env or pass as option.')
      }

      if (!funderAddress) {
        throw new Error('Funder address is required. Set VITE_POLYMARKET_FUNDER_ADDRESS in .env or pass as option.')
      }

      const signer = new Wallet(privateKey)
      this.signatureType = options.signatureType || this.signatureType

      // Create or derive API key (don't create new one, always derive)
      const creds = new ClobClient(this.host, this.chainId, signer).createOrDeriveApiKey()
      
      // Initialize CLOB client
      this.clobClient = new ClobClient(
        this.host,
        this.chainId,
        signer,
        await creds,
        this.signatureType,
        funderAddress
      )

      this.isInitialized = true
      
      return this.clobClient
    } catch (error) {
      console.error('❌ Failed to initialize trading service:', error)
      throw error
    }
  }

  /**
   * Place an order on Polymarket
   * @param {Object} orderParams - Order parameters
   * @param {string} orderParams.tokenID - Token ID from market data
   * @param {number} orderParams.price - Price (0-1 decimal format)
   * @param {string} orderParams.side - 'BUY' or 'SELL'
   * @param {number} orderParams.size - Order size
   * @param {number} orderParams.feeRateBps - Fee rate in basis points (default: 0)
   * @param {Object} marketParams - Market parameters
   * @param {string} marketParams.tickSize - Tick size (e.g., "0.001")
   * @param {boolean} marketParams.negRisk - Negative risk flag
   * @param {string} orderType - Order type (OrderType.GTC, OrderType.IOC, etc.)
   * @returns {Promise<Object>} Order response
   */
  async placeOrder(orderParams, marketParams, orderType = OrderType.GTC) {
    if (!this.isInitialized || !this.clobClient) {
      throw new Error('Trading service not initialized. Call initialize() first.')
    }

    try {
      const side = orderParams.side.toUpperCase() === 'BUY' ? Side.BUY : Side.SELL

      const order = await this.clobClient.createAndPostOrder(
        {
          tokenID: orderParams.tokenID,
          price: orderParams.price,
          side: side,
          size: orderParams.size,
          feeRateBps: orderParams.feeRateBps || 0,
        },
        {
          tickSize: marketParams.tickSize || "0.001",
          negRisk: marketParams.negRisk || false,
        },
        orderType
      )

      return order
    } catch (error) {
      console.error('❌ Failed to place order:', error)
      throw error
    }
  }

  /**
   * Convert price from cents (0-100) to decimal (0-1) format
   * @param {number} priceCents - Price in cents (0-100)
   * @returns {number} Price in decimal format (0-1)
   */
  convertPriceToDecimal(priceCents) {
    return priceCents / 100
  }

  /**
   * Convert price from decimal (0-1) to cents (0-100) format
   * @param {number} priceDecimal - Price in decimal format (0-1)
   * @returns {number} Price in cents (0-100)
   */
  convertPriceToCents(priceDecimal) {
    return priceDecimal * 100
  }

  /**
   * Get order status
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Order status
   */
  async getOrderStatus(orderId) {
    if (!this.isInitialized || !this.clobClient) {
      throw new Error('Trading service not initialized. Call initialize() first.')
    }

    try {
      return await this.clobClient.getOrder(orderId)
    } catch (error) {
      console.error('❌ Failed to get order status:', error)
      throw error
    }
  }

  /**
   * Cancel an order
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Cancellation response
   */
  async cancelOrder(orderId) {
    if (!this.isInitialized || !this.clobClient) {
      throw new Error('Trading service not initialized. Call initialize() first.')
    }

    try {
      return await this.clobClient.cancelOrder(orderId)
    } catch (error) {
      console.error('❌ Failed to cancel order:', error)
      throw error
    }
  }

  /**
   * Get user's open orders
   * @returns {Promise<Array>} Array of open orders
   */
  async getOpenOrders() {
    if (!this.isInitialized || !this.clobClient) {
      throw new Error('Trading service not initialized. Call initialize() first.')
    }

    try {
      return await this.clobClient.getOpenOrders()
    } catch (error) {
      console.error('❌ Failed to get open orders:', error)
      throw error
    }
  }
}

// Export singleton instance
export const tradingService = new TradingService()

export default TradingService

