import React, { useState, useEffect } from 'react'
import { polymarketService } from '../services/PolymarketService'

export default function TradingTabs({ market }) {
  const [activeTab, setActiveTab] = useState('Order Book')
  const [orderBook, setOrderBook] = useState(null)
  const [loading, setLoading] = useState(false)

  const tabs = ['Open Orders', 'My Positions', 'Order Book']

  // Fetch order book when Order Book tab is active and market is available
  useEffect(() => {
    if (activeTab === 'Order Book' && market?.id) {
      const fetchOrderBook = async () => {
        try {
          setLoading(true)
          const book = await polymarketService.getOrderBook(market.id)
          setOrderBook(book)
        } catch (error) {
          console.error('Error fetching order book:', error)
        } finally {
          setLoading(false)
        }
      }

      fetchOrderBook()
      
      // Refresh order book every 5 seconds
      const interval = setInterval(fetchOrderBook, 5000)
      return () => clearInterval(interval)
    }
  }, [activeTab, market?.id])

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'N/A'
    return `${price.toFixed(1)}¢`
  }

  const formatAmount = (amount) => {
    if (!amount && amount !== 0) return '0.00'
    if (amount >= 1000) return `${(amount / 1000).toFixed(2)}K`
    return amount.toFixed(2)
  }

  return (
    <div className="px-6">
      <div className="flex border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium transition ${
              activeTab === tab
                ? 'text-white border-b-2 border-yellow-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      
      <div className="py-6">
        {activeTab === 'Order Book' ? (
          loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-2"></div>
              <p className="text-gray-400 text-sm">Loading order book...</p>
            </div>
          ) : orderBook ? (
            <div className="grid grid-cols-2 gap-6">
              {/* Asks (Sell Orders) */}
              <div className="flex flex-col h-[500px]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-red-400">Asks (Sell)</h3>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span className="w-20 text-right">Price</span>
                    <span className="w-16 text-right">Size</span>
                    <span className="w-16 text-right">Total</span>
                  </div>
                </div>
                <div className="space-y-0.5 overflow-y-auto flex-1 min-h-0">
                  {orderBook.asks && orderBook.asks.length > 0 ? (
                    orderBook.asks.map((ask, index) => {
                      const maxTotal = orderBook.asks[orderBook.asks.length - 1]?.total || 1
                      return (
                        <div
                          key={`ask-${index}`}
                          className="flex items-center justify-between py-1 px-2 hover:bg-red-500/5 transition relative"
                        >
                          <div 
                            className="absolute left-0 h-full bg-red-500/10 transition-all"
                            style={{ width: `${(ask.total / maxTotal) * 100}%` }}
                          />
                          <span className="text-sm text-red-400 font-medium w-20 text-right relative z-10">
                            {formatPrice(ask.price)}
                          </span>
                          <span className="text-xs text-gray-300 w-16 text-right relative z-10">
                            {formatAmount(ask.amount)}
                          </span>
                          <span className="text-xs text-gray-400 w-16 text-right relative z-10">
                            {formatAmount(ask.total)}
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-center text-gray-500 text-sm py-4">No asks available</p>
                  )}
                </div>
              </div>

              {/* Bids (Buy Orders) */}
              <div className="flex flex-col h-[500px]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10 flex-shrink-0">
                  <h3 className="text-sm font-semibold text-green-400">Bids (Buy)</h3>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span className="w-20 text-right">Price</span>
                    <span className="w-16 text-right">Size</span>
                    <span className="w-16 text-right">Total</span>
                  </div>
                </div>
                <div className="space-y-0.5 overflow-y-auto flex-1 min-h-0">
                  {orderBook.bids && orderBook.bids.length > 0 ? (
                    orderBook.bids.map((bid, index) => {
                      const maxTotal = orderBook.bids[orderBook.bids.length - 1]?.total || 1
                      return (
                        <div
                          key={`bid-${index}`}
                          className="flex items-center justify-between py-1 px-2 hover:bg-green-500/5 transition relative"
                        >
                          <div 
                            className="absolute left-0 h-full bg-green-500/10 transition-all"
                            style={{ width: `${(bid.total / maxTotal) * 100}%` }}
                          />
                          <span className="text-sm text-green-400 font-medium w-20 text-right relative z-10">
                            {formatPrice(bid.price)}
                          </span>
                          <span className="text-xs text-gray-300 w-16 text-right relative z-10">
                            {formatAmount(bid.amount)}
                          </span>
                          <span className="text-xs text-gray-400 w-16 text-right relative z-10">
                            {formatAmount(bid.total)}
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-center text-gray-500 text-sm py-4">No bids available</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400 text-sm">No market selected</p>
            </div>
          )
        ) : (
          <div className="py-8 text-center">
            <p className="text-gray-400 text-sm">Connect wallet to view {activeTab.toLowerCase()}</p>
          </div>
        )}
      </div>
    </div>
  )
}
