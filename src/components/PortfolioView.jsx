import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Target, Award, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { polymarketService } from '../services/PolymarketService'

const dataService = polymarketService

export default function PortfolioView({ onSelectMarket }) {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [portfolioStats, setPortfolioStats] = useState(null)
  const [portfolioHistory, setPortfolioHistory] = useState([])

  // Load portfolio from localStorage
  useEffect(() => {
    loadPortfolio()
  }, [])

  // Update portfolio stats when positions change
  useEffect(() => {
    if (positions.length > 0) {
      updatePortfolioStats()
      updatePortfolioHistory()
    }
  }, [positions])

  // Poll for price updates to recalculate P&L
  useEffect(() => {
    if (positions.length === 0) return

    const updatePrices = async () => {
      const updatedPositions = await Promise.all(
        positions.map(async (position) => {
          try {
            const market = await dataService.getMarket(position.marketId)
            if (market) {
              return {
                ...position,
                currentYesPrice: market.yesPrice || 50,
                currentNoPrice: market.noPrice || 50,
                currentPrice: (position.side === 'Buy' && position.outcome === 'Yes')
                  ? (market.yesPrice || 50)
                  : (position.side === 'Buy' && position.outcome === 'No')
                  ? (market.noPrice || 50)
                  : position.entryPrice,
                market: market
              }
            }
          } catch (error) {
            return position
          }
        })
      )
      setPositions(updatedPositions.filter(p => p))
    }

    updatePrices()
    const interval = setInterval(updatePrices, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [positions.length])

  // Listen for new positions from localStorage (when orders are placed)
  useEffect(() => {
    const handleStorageChange = () => {
      loadPortfolio()
    }

    window.addEventListener('storage', handleStorageChange)
    // Also check periodically for changes
    const interval = setInterval(loadPortfolio, 2000)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const loadPortfolio = () => {
    try {
      const saved = localStorage.getItem('signalbay-portfolio')
      if (saved) {
        const portfolio = JSON.parse(saved)
        setPositions(portfolio.positions || [])
        setPortfolioHistory(portfolio.history || [])
      }
    } catch (error) {
      console.error('Error loading portfolio:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePortfolio = (positions, history) => {
    try {
      localStorage.setItem('signalbay-portfolio', JSON.stringify({
        positions,
        history,
        lastUpdated: Date.now()
      }))
    } catch (error) {
      console.error('Error saving portfolio:', error)
    }
  }

  const calculatePnL = (position) => {
    const { entryPrice, quantity, side, outcome } = position
    
    if (!entryPrice || !quantity) return 0

    // Get current price based on outcome
    const currentPrice = (side === 'Buy' && outcome === 'Yes') 
      ? (position.currentYesPrice || position.entryPrice)
      : (side === 'Buy' && outcome === 'No')
      ? (position.currentNoPrice || position.entryPrice)
      : position.entryPrice

    // For Yes positions: profit if current price > entry price
    // For No positions: profit if current price < entry price
    if (side === 'Buy' && outcome === 'Yes') {
      const priceChange = currentPrice - entryPrice
      return (priceChange / 100) * quantity // Convert cents to dollars
    } else if (side === 'Buy' && outcome === 'No') {
      const priceChange = entryPrice - currentPrice
      return (priceChange / 100) * quantity
    }
    
    return 0
  }

  const calculateROI = (position) => {
    const cost = (position.entryPrice / 100) * position.quantity
    const pnl = calculatePnL(position)
    return cost > 0 ? (pnl / cost) * 100 : 0
  }

  const updatePortfolioStats = () => {
    const totalCost = positions.reduce((sum, p) => {
      return sum + ((p.entryPrice || 0) / 100) * (p.quantity || 0)
    }, 0)

    const totalPnL = positions.reduce((sum, p) => sum + calculatePnL(p), 0)
    const totalValue = totalCost + totalPnL
    const totalROI = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0

    const winningPositions = positions.filter(p => calculatePnL(p) > 0)
    const losingPositions = positions.filter(p => calculatePnL(p) < 0)
    const winRate = positions.length > 0 ? (winningPositions.length / positions.length) * 100 : 0

    const bestPosition = positions.reduce((best, current) => {
      return calculatePnL(current) > calculatePnL(best) ? current : best
    }, positions[0] || null)

    const worstPosition = positions.reduce((worst, current) => {
      return calculatePnL(current) < calculatePnL(worst) ? current : worst
    }, positions[0] || null)

    setPortfolioStats({
      totalCost,
      totalPnL,
      totalValue,
      totalROI,
      winRate,
      winningPositions: winningPositions.length,
      losingPositions: losingPositions.length,
      totalPositions: positions.length,
      bestPosition,
      worstPosition
    })
  }

  const updatePortfolioHistory = () => {
    const totalValue = positions.reduce((sum, p) => {
      const cost = ((p.entryPrice || 0) / 100) * (p.quantity || 0)
      const pnl = calculatePnL(p)
      return sum + cost + pnl
    }, 0)

    const newHistoryPoint = {
      timestamp: Date.now(),
      value: totalValue,
      positions: positions.length
    }

    setPortfolioHistory(prev => {
      const updated = [...prev, newHistoryPoint]
      // Keep last 100 data points
      return updated.slice(-100)
    })

    savePortfolio(positions, portfolioHistory)
  }

  // Add a position (for demo/testing - in real app this would come from trading)
  const addDemoPosition = async () => {
    // This is a demo function - in production, positions would be added via trading
    const markets = await dataService.getMarkets({ limit: 5, active: true })
    if (markets.length > 0) {
      const market = markets[0]
      const newPosition = {
        id: `pos-${Date.now()}`,
        marketId: market.id,
        marketTitle: market.title || market.question,
        side: 'Buy',
        outcome: 'Yes',
        entryPrice: market.yesPrice || 50,
        currentYesPrice: market.yesPrice || 50,
        currentNoPrice: market.noPrice || 50,
        quantity: 100, // $1.00 worth
        timestamp: Date.now(),
        market: market
      }
      const updated = [...positions, newPosition]
      setPositions(updated)
      savePortfolio(updated, portfolioHistory)
    }
  }

  const removePosition = (positionId) => {
    const updated = positions.filter(p => p.id !== positionId)
    setPositions(updated)
    savePortfolio(updated, portfolioHistory)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading portfolio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#0a0d14] border-b border-white/10 px-6 py-6">
        <div className="max-w-[1920px] mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Portfolio</h1>
                <p className="text-gray-400 text-sm mt-1">
                  Track your positions and performance
                </p>
              </div>
            </div>
            {positions.length === 0 && (
              <button
                onClick={addDemoPosition}
                className="px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 transition text-sm"
              >
                Add Demo Position
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1920px] mx-auto px-6 py-8">
        {positions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Positions Yet</h2>
            <p className="text-gray-400 mb-6">
              Start trading to see your portfolio here
            </p>
            <button
              onClick={addDemoPosition}
              className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition font-semibold"
            >
              Add Demo Position
            </button>
          </div>
        ) : (
          <>
            {/* Portfolio Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {/* Total Value */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Total Value</span>
                  <DollarSign className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-white">
                  ${portfolioStats?.totalValue.toFixed(2) || '0.00'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Cost: ${portfolioStats?.totalCost.toFixed(2) || '0.00'}
                </p>
              </div>

              {/* Total P&L */}
              <div className={`bg-gray-900/50 border rounded-xl p-6 ${
                (portfolioStats?.totalPnL || 0) >= 0 
                  ? 'border-green-500/50' 
                  : 'border-red-500/50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Total P&L</span>
                  {(portfolioStats?.totalPnL || 0) >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <p className={`text-2xl font-bold ${
                  (portfolioStats?.totalPnL || 0) >= 0 
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  ${(portfolioStats?.totalPnL || 0).toFixed(2)}
                </p>
                <p className={`text-xs mt-1 ${
                  (portfolioStats?.totalROI || 0) >= 0 
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  {portfolioStats?.totalROI.toFixed(2) || '0.00'}% ROI
                </p>
              </div>

              {/* Win Rate */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Win Rate</span>
                  <Award className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {portfolioStats?.winRate.toFixed(1) || '0.0'}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {portfolioStats?.winningPositions || 0}W / {portfolioStats?.losingPositions || 0}L
                </p>
              </div>

              {/* Total Positions */}
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Positions</span>
                  <Target className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-white">
                  {portfolioStats?.totalPositions || 0}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Active positions
                </p>
              </div>
            </div>

            {/* Best/Worst Positions */}
            {(portfolioStats?.bestPosition || portfolioStats?.worstPosition) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {portfolioStats.bestPosition && (
                  <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowUpRight className="h-5 w-5 text-green-400" />
                      <h3 className="text-lg font-semibold text-green-400">Best Position</h3>
                    </div>
                    <p className="text-white font-medium mb-1 line-clamp-1">
                      {portfolioStats.bestPosition.marketTitle || 'Market'}
                    </p>
                    <p className="text-2xl font-bold text-green-400">
                      +${calculatePnL(portfolioStats.bestPosition).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {calculateROI(portfolioStats.bestPosition).toFixed(2)}% ROI
                    </p>
                  </div>
                )}

                {portfolioStats.worstPosition && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-3">
                      <ArrowDownRight className="h-5 w-5 text-red-400" />
                      <h3 className="text-lg font-semibold text-red-400">Worst Position</h3>
                    </div>
                    <p className="text-white font-medium mb-1 line-clamp-1">
                      {portfolioStats.worstPosition.marketTitle || 'Market'}
                    </p>
                    <p className="text-2xl font-bold text-red-400">
                      ${calculatePnL(portfolioStats.worstPosition).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {calculateROI(portfolioStats.worstPosition).toFixed(2)}% ROI
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Positions List */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800">
                <h2 className="text-xl font-bold text-white">Open Positions</h2>
              </div>
              <div className="divide-y divide-gray-800">
                {positions.map((position) => {
                  const pnl = calculatePnL(position)
                  const roi = calculateROI(position)
                  const currentPrice = position.currentPrice || 
                    (position.side === 'Buy' && position.outcome === 'Yes'
                      ? position.currentYesPrice
                      : position.currentNoPrice)

                  return (
                    <div
                      key={position.id}
                      className="p-6 hover:bg-gray-800/50 transition cursor-pointer"
                      onClick={() => position.market && onSelectMarket && onSelectMarket(position.market)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-white line-clamp-1">
                              {position.marketTitle || 'Market'}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-semibold rounded ${
                              position.side === 'Buy' && position.outcome === 'Yes'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}>
                              {position.side} {position.outcome}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Entry Price</p>
                              <p className="text-sm font-medium text-white">
                                {position.entryPrice.toFixed(1)}¢
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Current Price</p>
                              <p className="text-sm font-medium text-white">
                                {currentPrice.toFixed(1)}¢
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Quantity</p>
                              <p className="text-sm font-medium text-white">
                                {position.quantity} shares
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-1">Cost</p>
                              <p className="text-sm font-medium text-white">
                                ${((position.entryPrice / 100) * position.quantity).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="ml-6 text-right">
                          <div className={`text-2xl font-bold mb-1 ${
                            pnl >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                          </div>
                          <div className={`text-sm ${
                            roi >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removePosition(position.id)
                            }}
                            className="mt-2 text-xs text-gray-400 hover:text-red-400 transition"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

