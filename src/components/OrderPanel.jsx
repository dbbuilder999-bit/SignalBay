import React, { useState, useEffect } from 'react'
import { Edit, Loader2 } from 'lucide-react'
import { tradingService } from '../services/TradingService'
import { OrderType } from '@polymarket/clob-client'

export default function OrderPanel({ market }) {
  const [side, setSide] = useState('Buy')
  const [outcome, setOutcome] = useState('Yes')
  const [orderType, setOrderType] = useState('Limit')
  const [price, setPrice] = useState(market?.yesPrice ? market.yesPrice.toFixed(1) : '50.0')
  const [amount, setAmount] = useState('0')
  const [cash, setCash] = useState(0.00)
  const [isConnected, setIsConnected] = useState(false)
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderStatus, setOrderStatus] = useState(null)

  if (!market) {
    return (
      <div className="p-6 text-center text-gray-400">
        Select a market to start trading
      </div>
    )
  }

  // Check if market is closed
  const isMarketClosed = market.closed === true || market.closed === 'true' || 
                         (market.polymarketData && market.polymarketData.closed === true)

  const bestAsk = market.yesPrice || 50
  const bestBid = market.noPrice || 50
  const selectedOutcomePrice = outcome === 'Yes' ? (market.yesPrice || 50) : (market.noPrice || 50)

  const shares = amount && parseFloat(amount) > 0 ? (parseFloat(amount) / (selectedOutcomePrice / 100)).toFixed(2) : '0.00'
  const avgPrice = selectedOutcomePrice.toFixed(1)
  const totalCost = amount && parseFloat(amount) > 0 ? parseFloat(amount).toFixed(2) : '0.00'
  const maxPayout = amount && parseFloat(amount) > 0 ? (parseFloat(amount) * (100 / selectedOutcomePrice)).toFixed(2) : '0.00'

  const quickFillAmounts = [1, 2, 5]

  // Check if trading service is initialized
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Try to initialize if credentials are available
        // Note: In Vite, use import.meta.env instead of process.env
        const privateKey = import.meta.env.VITE_POLYMARKET_PRIVATE_KEY
        const funderAddress = import.meta.env.VITE_POLYMARKET_FUNDER_ADDRESS
        
        if (privateKey && funderAddress) {
          await tradingService.initialize()
          setIsConnected(true)
        }
      } catch (error) {
        console.log('Trading service not initialized:', error.message)
        setIsConnected(false)
      }
    }
    
    checkConnection()
  }, [])

  const handleQuickFill = (value) => {
    if (value === 'Max') {
      setAmount(cash.toFixed(2))
    } else {
      const currentAmount = parseFloat(amount) || 0
      setAmount((currentAmount + value).toFixed(2))
    }
  }

  const handlePlaceOrder = async () => {
    if (!market || !market.polymarketData) {
      alert('Market data not available')
      return
    }

    // Check if market is closed
    if (isMarketClosed) {
      alert('This market is closed. Trading is no longer available.')
      return
    }

    if (!isConnected) {
      alert('Wallet not connected. Please set VITE_POLYMARKET_PRIVATE_KEY and VITE_POLYMARKET_FUNDER_ADDRESS in your .env file.')
      return
    }

    const amountNum = parseFloat(amount)
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const priceNum = parseFloat(price)
    if (!priceNum || priceNum < 0 || priceNum > 100) {
      alert('Please enter a valid price (0-100¢)')
      return
    }

    try {
      setIsPlacingOrder(true)
      setOrderStatus(null)

      // Get token ID based on outcome
      const tokenID = outcome === 'Yes' 
        ? market.polymarketData.yesTokenId 
        : market.polymarketData.noTokenId

      if (!tokenID) {
        throw new Error('Token ID not available for this market')
      }

      // Convert price from cents (0-100) to decimal (0-1)
      const priceDecimal = tradingService.convertPriceToDecimal(priceNum)

      // Calculate size (amount in USDC / price)
      // For prediction markets, size is typically the number of shares
      const size = amountNum / priceDecimal

      // Get market parameters
      const tickSize = market.polymarketData.tickSize || "0.001"
      const negRisk = market.polymarketData.negRisk || false

      // Place order
      const order = await tradingService.placeOrder(
        {
          tokenID: tokenID,
          price: priceDecimal,
          side: side,
          size: size,
          feeRateBps: 0,
        },
        {
          tickSize: tickSize,
          negRisk: negRisk,
        },
        orderType === 'Market' ? OrderType.IOC : OrderType.GTC
      )

      setOrderStatus({ success: true, order })
      setAmount('0')
      alert(`Order placed successfully! Order ID: ${order.id || 'N/A'}`)
    } catch (error) {
      console.error('Error placing order:', error)
      setOrderStatus({ success: false, error: error.message })
      alert(`Failed to place order: ${error.message}`)
    } finally {
      setIsPlacingOrder(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Closed Market Message */}
      {isMarketClosed && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">🔒</div>
          <p className="text-red-400 font-semibold mb-1">Market Closed</p>
          <p className="text-xs text-red-300/80">
            This market has been closed. Trading is no longer available.
          </p>
        </div>
      )}

      {/* Buy/Sell Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setSide('Buy')}
          disabled={isMarketClosed}
          className={`flex-1 py-3 rounded-lg font-semibold transition ${
            side === 'Buy'
              ? 'bg-yellow-500 text-black'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          } ${isMarketClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Buy
        </button>
        <button
          onClick={() => setSide('Sell')}
          disabled={isMarketClosed}
          className={`flex-1 py-3 rounded-lg font-semibold transition ${
            side === 'Sell'
              ? 'bg-red-500 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          } ${isMarketClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Sell
        </button>
      </div>

      {/* Outcome Selection */}
      <div className="space-y-2">
        <label className="text-xs text-gray-400">Outcome</label>
        <div className="flex gap-2">
          <button
            onClick={() => setOutcome('Yes')}
            disabled={isMarketClosed}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              outcome === 'Yes'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            } ${isMarketClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Yes {(market.yesPrice || 50).toFixed(1)}¢
          </button>
          <button
            onClick={() => setOutcome('No')}
            disabled={isMarketClosed}
            className={`flex-1 py-3 rounded-lg font-semibold transition ${
              outcome === 'No'
                ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            } ${isMarketClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            No {(market.noPrice || 50).toFixed(1)}¢
          </button>
        </div>
      </div>

      {/* Order Type */}
      <div className="flex gap-2">
        <button
          onClick={() => setOrderType('Limit')}
          disabled={isMarketClosed}
          className={`flex-1 py-2 text-sm rounded transition ${
            orderType === 'Limit'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          } ${isMarketClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Limit
        </button>
        <button
          onClick={() => setOrderType('Market')}
          disabled={isMarketClosed}
          className={`flex-1 py-2 text-sm rounded transition ${
            orderType === 'Market'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          } ${isMarketClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Market
        </button>
      </div>

      {/* Price Input */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">
          Price (¢) {orderType === 'Limit' ? `Best ${side === 'Buy' ? 'Ask' : 'Bid'}: ${(side === 'Buy' ? bestAsk : bestBid).toFixed(1)}¢` : 'Market Price'}
        </label>
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          step="0.1"
          min="0"
          max="100"
          disabled={orderType === 'Market' || isMarketClosed}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {orderType === 'Market' && (
          <p className="text-xs text-gray-500 mt-1">Market orders execute at best available price</p>
        )}
      </div>

      {/* Amount Input */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">Amount</label>
        <div className="relative">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
            min="0"
            placeholder="0"
            disabled={isMarketClosed}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 pr-16 text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-sm text-gray-400">USDC</span>
        </div>
        <div className="flex gap-2 mt-2">
          {quickFillAmounts.map((val) => (
            <button
              key={val}
              onClick={() => handleQuickFill(val)}
              disabled={isMarketClosed}
              className="px-3 py-1 text-xs bg-white/5 border border-white/10 rounded hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              +${val}
            </button>
          ))}
          <button
            onClick={() => handleQuickFill('Max')}
            disabled={isMarketClosed}
            className="px-3 py-1 text-xs bg-white/5 border border-white/10 rounded hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Max
          </button>
          <button 
            disabled={isMarketClosed}
            className="px-3 py-1 text-xs bg-white/5 border border-white/10 rounded hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Financial Details */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Cash</span>
          <span className="text-white font-semibold">${cash.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Minimum</span>
          <span className="text-white">$1.00</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Shares</span>
          <span className="text-white">{shares}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Avg Price</span>
          <span className="text-white">{avgPrice}¢</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total Cost</span>
          <span className="text-white">${totalCost}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Max Payout</span>
          <span className="text-white">${maxPayout}</span>
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-3 text-xs text-yellow-400">
          <p className="font-semibold mb-1">Wallet Not Connected</p>
          <p className="text-yellow-300/80">
            Set VITE_POLYMARKET_PRIVATE_KEY and VITE_POLYMARKET_FUNDER_ADDRESS in your .env file to enable trading.
          </p>
        </div>
      )}

      {/* Order Status */}
      {orderStatus && (
        <div className={`rounded-lg p-3 text-xs ${
          orderStatus.success
            ? 'bg-yellow-500/10 border border-yellow-500/50 text-yellow-400'
            : 'bg-red-500/10 border border-red-500/50 text-red-400'
        }`}>
          {orderStatus.success ? (
            <p>✅ Order placed successfully!</p>
          ) : (
            <p>❌ {orderStatus.error}</p>
          )}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handlePlaceOrder}
        disabled={isMarketClosed || !isConnected || isPlacingOrder || !amount || parseFloat(amount) <= 0}
        className={`w-full py-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
          side === 'Buy'
            ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
            : 'bg-red-500 hover:bg-red-600 text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isPlacingOrder ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Placing Order...
          </>
        ) : isMarketClosed ? (
          'Market Closed'
        ) : isConnected ? (
          `${side} ${outcome}`
        ) : (
          'Connect wallet to trade'
        )}
      </button>
    </div>
  )
}

