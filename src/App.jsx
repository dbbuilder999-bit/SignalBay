import React, { useState, useEffect } from 'react'
import { Search, Star, Sun, Moon, MessageCircle } from 'lucide-react'
import MarketSidebar from './components/MarketSidebar'
import PredictionChart from './components/PredictionChart'
import TradingTabs from './components/TradingTabs'
import OrderPanel from './components/OrderPanel'
import MarketsList from './components/MarketsList'
import TruncatedText from './components/TruncatedText'
import LandingPage from './components/LandingPage'
// Polymarket is the source of truth for market data
import { polymarketService } from './services/PolymarketService'

// Always use Polymarket service for real data
const dataService = polymarketService

export default function SignalBay() {
  const [showLanding, setShowLanding] = useState(() => {
    // Check if user has visited before (stored in localStorage)
    try {
      return !localStorage.getItem('signalbay-has-visited')
    } catch {
      return true
    }
  })
  const [showEvents, setShowEvents] = useState(true) // Show events list by default
  const [selectedMarket, setSelectedMarket] = useState(null)
  const [markets, setMarkets] = useState([])
  const [activeTab, setActiveTab] = useState('Related')
  const [darkMode, setDarkMode] = useState(true)
  const [loading, setLoading] = useState(true)
  const [watchlist, setWatchlist] = useState(() => {
    // Load watchlist from localStorage on mount
    try {
      const saved = localStorage.getItem('signalbay-watchlist')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [showRulesModal, setShowRulesModal] = useState(false)

  // Fetch markets on mount (only when not showing events list, since MarketsList handles its own data)
  useEffect(() => {
    // Don't fetch if showing events list - MarketsList handles its own data fetching
    if (showEvents) {
      setLoading(false)
      return
    }

    const fetchMarkets = async () => {
      try {
        setLoading(true)
        // Use same limit as MarketsList to leverage cache
        const marketData = await dataService.getMarkets({ limit: 1000, active: true, closed: false })
        setMarkets(marketData)
        if (marketData.length > 0 && !selectedMarket) {
          setSelectedMarket(marketData[0])
        }
      } catch (error) {
        console.error('Error loading markets:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMarkets()
  }, [showEvents])

  // Save watchlist to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('signalbay-watchlist', JSON.stringify(watchlist))
    } catch (error) {
      console.error('Error saving watchlist to localStorage:', error)
    }
  }, [watchlist])

  // Toggle market in watchlist
  const toggleWatchlist = (marketId) => {
    setWatchlist(prev => {
      if (prev.includes(marketId)) {
        console.log(`[Watchlist] Removing market ${marketId} from watchlist`)
        return prev.filter(id => id !== marketId)
      } else {
        console.log(`[Watchlist] Adding market ${marketId} to watchlist`)
        return [...prev, marketId]
      }
    })
  }

  // Check if market is in watchlist
  const isInWatchlist = (marketId) => {
    return watchlist.includes(marketId)
  }

  // Subscribe to price updates for selected market
  useEffect(() => {
    if (!selectedMarket) return

    const handlePriceUpdate = (update) => {
      setSelectedMarket(prev => {
        if (!prev || prev.id !== update.marketId) return prev
        return {
          ...prev,
          yesPrice: update.yesPrice,
          noPrice: update.noPrice,
        }
      })
      
      // Also update in markets list
      setMarkets(prev => prev.map(m => 
        m.id === update.marketId
          ? { ...m, yesPrice: update.yesPrice, noPrice: update.noPrice }
          : m
      ))
    }

    dataService.subscribeToPriceUpdates(selectedMarket.id, handlePriceUpdate)

    return () => {
      dataService.unsubscribeFromPriceUpdates(selectedMarket.id)
    }
  }, [selectedMarket?.id])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading markets...</p>
        </div>
      </div>
    )
  }

  // Handle start trading from landing page
  const handleStartTrading = () => {
    try {
      localStorage.setItem('signalbay-has-visited', 'true')
    } catch (error) {
      console.error('Error saving visit status:', error)
    }
    setShowLanding(false)
    setShowEvents(true)
  }

  // Show landing page if not visited before
  if (showLanding) {
    return <LandingPage onStartTrading={handleStartTrading} />
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-[#0a0d14]' : 'bg-gray-50'} text-gray-100`}>
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-[#0a0d14] border-b border-white/10 px-6 py-4">
        <div className="flex justify-between items-center max-w-[1920px] mx-auto">
          <div className="flex items-center gap-8">
            <img 
              src="/assets/signalbay-logo.png" 
              alt="SignalBay" 
              className="h-16 w-auto"
            />
            <div className="flex items-center gap-6">
              <button
                onClick={() => setShowEvents(true)}
                className={`transition text-sm ${
                  showEvents
                    ? 'text-white font-semibold'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Events
              </button>
              <button
                onClick={() => setShowEvents(false)}
                className={`transition text-sm ${
                  !showEvents
                    ? 'text-white font-semibold'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Trade
              </button>
            </div>
          </div>
          <button className="px-6 py-2 bg-yellow-500 text-black rounded-lg font-semibold hover:bg-yellow-600 transition">
            Sign In
          </button>
        </div>
      </nav>

      {showEvents ? (
        <MarketsList 
          onSelectMarket={(market) => {
            // Add market to markets list if not already present
            setMarkets(prev => {
              const exists = prev.find(m => m.id === market.id)
              if (exists) return prev
              return [market, ...prev]
            })
            setSelectedMarket(market)
            setShowEvents(false) // Switch to trade view
          }}
        />
      ) : (
        <div className="flex max-w-[1920px] mx-auto" style={{ height: 'calc(100vh - 73px)' }}>
        {/* Left Sidebar */}
        <MarketSidebar
          markets={markets}
          selectedMarket={selectedMarket}
          onSelectMarket={setSelectedMarket}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
          watchlist={watchlist}
          isInWatchlist={isInWatchlist}
        />

        {/* Central Trading Area */}
        <main className="flex-1 flex flex-col border-r border-white/10 overflow-hidden">
          {selectedMarket && (
            <>
              {/* Market Header */}
              <div className="bg-[#0a0d14] border-b border-white/10 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{selectedMarket.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-2xl font-bold text-white">{selectedMarket.title}</h2>
                        {(selectedMarket.closed === true || selectedMarket.closed === 'true' || 
                          (selectedMarket.polymarketData && selectedMarket.polymarketData.closed === true)) && (
                          <span className="px-3 py-1 text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/50 rounded-full">
                            🔒 Closed
                          </span>
                        )}
                      </div>
                      <TruncatedText 
                        text={selectedMarket.description} 
                        maxLength={200}
                        className="max-w-3xl"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setShowRulesModal(true)}
                      className="px-4 py-2 text-sm border border-white/20 rounded-lg hover:bg-white/5 transition"
                    >
                      Rules
                    </button>
                    <button 
                      onClick={() => {
                        if (selectedMarket) {
                          console.log(`[Watchlist] Toggling market: ${selectedMarket.id}, currently in watchlist: ${isInWatchlist(selectedMarket.id)}`)
                          toggleWatchlist(selectedMarket.id)
                        }
                      }}
                      className={`p-2 rounded-lg transition ${
                        selectedMarket && isInWatchlist(selectedMarket.id)
                          ? 'bg-yellow-500/20 hover:bg-yellow-500/30'
                          : 'hover:bg-white/5'
                      }`}
                      title={selectedMarket && isInWatchlist(selectedMarket.id) ? 'Remove from watchlist' : 'Add to watchlist'}
                    >
                      <Star 
                        className={`h-5 w-5 transition ${
                          selectedMarket && isInWatchlist(selectedMarket.id)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-400'
                        }`} 
                      />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-6 mt-4">
                  <div>
                    <span className="text-xs text-gray-400">24h Volume</span>
                    <p className="text-lg font-semibold text-white">
                      {selectedMarket.volume >= 1000000 
                        ? `$${(selectedMarket.volume / 1000000).toFixed(2)}M`
                        : `$${(selectedMarket.volume / 1000).toFixed(2)}K`}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400">End Date</span>
                    <p className="text-lg font-semibold text-white">
                      {selectedMarket.endDate 
                        ? new Date(selectedMarket.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Price Chart */}
              <div className="flex-1 bg-[#0a0d14] border-b border-white/10">
                <PredictionChart market={selectedMarket} />
              </div>

              {/* Trading Tabs */}
              <div className="bg-[#0a0d14] border-b border-white/10">
                <TradingTabs />
              </div>
            </>
          )}
        </main>

        {/* Right Trading Panel */}
        <aside className="w-96 bg-[#0a0d14] border-l border-white/10 overflow-y-auto">
          {selectedMarket ? (
            <OrderPanel market={selectedMarket} />
          ) : (
            <div className="p-6 text-center text-gray-400">
              Select a market to start trading
            </div>
          )}
        </aside>
      </div>
      )}

      {/* Chat Icon */}
      <button className="fixed bottom-6 right-6 w-14 h-14 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg hover:bg-yellow-600 transition z-50">
        <MessageCircle className="h-6 w-6 text-black" />
      </button>

      {/* Rules Modal */}
      {showRulesModal && selectedMarket && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowRulesModal(false)}
        >
          <div 
            className="bg-[#0a0d14] border border-white/20 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">Market Rules</h2>
                <button
                  onClick={() => setShowRulesModal(false)}
                  className="text-gray-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{selectedMarket.title}</h3>
                  {selectedMarket.description && (
                    <p className="text-gray-300 mb-4">{selectedMarket.description}</p>
                  )}
                </div>

                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Resolution Criteria</h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    {selectedMarket.polymarketData?.resolutionSource ? (
                      <p>
                        <span className="font-medium">Resolution Source:</span>{' '}
                        {selectedMarket.polymarketData.resolutionSource}
                      </p>
                    ) : (
                      <p className="text-gray-500 italic">
                        Resolution criteria will be determined based on the market outcome.
                      </p>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <h4 className="text-sm font-semibold text-gray-400 mb-2">Market Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">End Date:</span>
                      <p className="text-white">
                        {selectedMarket.endDate 
                          ? new Date(selectedMarket.endDate).toLocaleString('en-US', { 
                              month: 'long', 
                              day: 'numeric', 
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit'
                            })
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Category:</span>
                      <p className="text-white capitalize">{selectedMarket.category || 'General'}</p>
                    </div>
                    {selectedMarket.polymarketData?.slug && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Market ID:</span>
                        <p className="text-white font-mono text-xs break-all">
                          {selectedMarket.polymarketData.slug}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-gray-500">
                    For detailed rules and resolution criteria, visit the market on Polymarket.com
                    {selectedMarket.polymarketData?.slug && (
                      <a 
                        href={`https://polymarket.com/event/${selectedMarket.polymarketData.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-yellow-400 hover:text-yellow-300 ml-1 underline"
                      >
                        View on Polymarket →
                      </a>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
