import React, { useEffect, useRef, useState } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import { polymarketService } from '../services/PolymarketService'
import { marketDataService } from '../services/MarketDataService'
import { DATA_SOURCE } from '../config/dataConfig'

// Select data service based on configuration
const dataService = 
  DATA_SOURCE === 'polymarket' ? polymarketService : marketDataService

export default function PredictionChart({ market }) {
  const chartContainerRef = useRef()
  const chartRef = useRef()
  const seriesRef = useRef()
  const [timeframe, setTimeframe] = useState('1D')
  const [priceData, setPriceData] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch price history when market or timeframe changes
  useEffect(() => {
    if (!market) return

    const fetchPriceHistory = async () => {
      try {
        setLoading(true)
        const history = await dataService.getPriceHistory(market.id, timeframe)
        setPriceData(history)
        
        if (seriesRef.current && history.length > 0) {
          seriesRef.current.setData(history)
        }
      } catch (error) {
        console.error('Error fetching price history:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPriceHistory()
  }, [market?.id, timeframe])

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current || !market) return

    const container = chartContainerRef.current

    // Create chart
    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0d14' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: container.clientWidth,
      height: container.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        min: 0,
        max: 100,
      },
    })

    chartRef.current = chart

    // Add line series for prediction market (0-100¢ range)
    const lineSeries = chart.addLineSeries({
      color: '#eab308',
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 1,
        minMove: 0.1,
      },
    })

    seriesRef.current = lineSeries

    // Load initial data if available
    if (priceData.length > 0) {
      lineSeries.setData(priceData)
    }

    // Subscribe to real-time price updates
    const handlePriceUpdate = (update) => {
      if (update.marketId === market.id && seriesRef.current) {
        const newPricePoint = {
          time: Math.floor(update.timestamp / 1000),
          value: update.yesPrice,
        }
        
        seriesRef.current.update(newPricePoint)
      }
    }

    dataService.subscribeToPriceUpdates(market.id, handlePriceUpdate)

    // Handle resize
    const handleResize = () => {
      if (container && chart) {
        chart.applyOptions({
          width: container.clientWidth,
          height: container.clientHeight,
        })
      }
    }

    let resizeObserver
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleResize)
      resizeObserver.observe(container)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      dataService.unsubscribeFromPriceUpdates(market.id)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      window.removeEventListener('resize', handleResize)
      if (chart) {
        chart.remove()
      }
    }
  }, [market?.id])

  // Update chart when price data changes
  useEffect(() => {
    if (seriesRef.current && priceData.length > 0) {
      seriesRef.current.setData(priceData)
    }
  }, [priceData])

  const timeframes = ['1H', '4H', '1D', '1W', '1M', 'All']

  return (
    <div className="flex flex-col h-full">
      {/* Timeframe Selector */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-white/10">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`px-3 py-1 text-xs rounded transition ${
              timeframe === tf
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="flex-1 w-full" style={{ minHeight: '400px' }} />
    </div>
  )
}

