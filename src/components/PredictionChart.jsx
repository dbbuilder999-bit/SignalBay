import React, { useEffect, useRef, useState } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import { polymarketService } from '../services/PolymarketService'

// Always use Polymarket service for real data
const dataService = polymarketService

export default function PredictionChart({ market }) {
  const chartContainerRef = useRef()
  const chartRef = useRef()
  const yesSeriesRef = useRef()
  const noSeriesRef = useRef()
  const [timeframe, setTimeframe] = useState('1d')
  const [priceData, setPriceData] = useState({ yes: [], no: [] })
  const [loading, setLoading] = useState(true)

  // Fetch price history when market or timeframe changes
  useEffect(() => {
    if (!market) return

    const fetchPriceHistory = async () => {
      try {
        setLoading(true)
        const history = await dataService.getPriceHistory(market.id, timeframe)
        setPriceData(history)
        
        if (yesSeriesRef.current && history.yes.length > 0) {
          yesSeriesRef.current.setData(history.yes)
        }
        if (noSeriesRef.current && history.no.length > 0) {
          noSeriesRef.current.setData(history.no)
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

    // Add line series for Yes outcome (green/yellow)
    const yesSeries = chart.addLineSeries({
      color: '#22c55e', // Green for Yes
      lineWidth: 2,
      title: 'Yes',
      priceFormat: {
        type: 'price',
        precision: 1,
        minMove: 0.1,
      },
    })

    // Add line series for No outcome (red)
    const noSeries = chart.addLineSeries({
      color: '#ef4444', // Red for No
      lineWidth: 2,
      title: 'No',
      priceFormat: {
        type: 'price',
        precision: 1,
        minMove: 0.1,
      },
    })

    yesSeriesRef.current = yesSeries
    noSeriesRef.current = noSeries

    // Load initial data if available
    if (priceData.yes.length > 0) {
      yesSeries.setData(priceData.yes)
    }
    if (priceData.no.length > 0) {
      noSeries.setData(priceData.no)
    }

    // Subscribe to real-time price updates
    const handlePriceUpdate = (update) => {
      if (update.marketId === market.id) {
        if (yesSeriesRef.current && update.yesPrice !== undefined) {
          const newYesPoint = {
            time: Math.floor(update.timestamp / 1000),
            value: update.yesPrice,
          }
          yesSeriesRef.current.update(newYesPoint)
        }
        if (noSeriesRef.current && update.noPrice !== undefined) {
          const newNoPoint = {
            time: Math.floor(update.timestamp / 1000),
            value: update.noPrice,
          }
          noSeriesRef.current.update(newNoPoint)
        }
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
    if (yesSeriesRef.current && priceData.yes.length > 0) {
      yesSeriesRef.current.setData(priceData.yes)
    }
    if (noSeriesRef.current && priceData.no.length > 0) {
      noSeriesRef.current.setData(priceData.no)
    }
  }, [priceData])

  const timeframes = ['1m', '1h', '6h', '1d', '1w', 'max']

  return (
    <div className="flex flex-col h-full">
      {/* Timeframe Selector and Legend */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
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
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-green-500"></div>
            <span className="text-gray-400">Yes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-red-500"></div>
            <span className="text-gray-400">No</span>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div ref={chartContainerRef} className="flex-1 w-full relative" style={{ minHeight: '400px' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0a0d14]/80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto mb-2"></div>
              <p className="text-gray-400 text-sm">Loading chart data...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

