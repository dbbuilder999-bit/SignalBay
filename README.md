# SignalBay

**SignalBay** is a professional prediction markets trading platform built with **React + Tailwind + Framer Motion**.

Trade prediction markets with a professional trading interface featuring live orderbooks, TradingView charts, and real-time execution.

## Features

- 📊 **Orderbooks** - Order book visualization with bid/ask spreads
- 📈 **Trading Charts** - Professional line charts with timeframe selection
- 🎨 **Professional UI** - Modern, dark-mode trading interface
- 💹 **Market Data** - Price feeds and market statistics
- 🔄 **Order Management** - Order placement interface (UI only)
- 🔌 **API Ready** - Service layer ready for real API integration

## Current Status

**✅ Real Prediction Markets Available!** SignalBay now supports **live data** from multiple sources:

### Data Source

**Polymarket** - Real prediction markets from Polymarket (Source of Truth)
   - Real markets with Yes/No outcomes
   - Live prices, volume, and market data
   - No authentication required for reading markets
   - See [POLYMARKET_SETUP.md](./POLYMARKET_SETUP.md) for setup

### Quick Start

Polymarket is configured as the default data source in `src/config/dataConfig.js`:

```javascript
export const DATA_SOURCE = 'polymarket' // Uses Polymarket as source of truth
```

**Note**: The app uses Polymarket by default. Mock data is available as a fallback option.

## Technology Stack

- **React 18** - Modern React with hooks
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **Lightweight Charts** - High-performance trading charts
- **Vite** - Fast build tool and dev server

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Deploy

```bash
npm run deploy
```

## Project Structure

```
src/
  ├── App.jsx                  # Main trading interface component
  ├── components/              # Trading UI components
  │   ├── MarketSidebar.jsx   # Market list sidebar
  │   ├── PredictionChart.jsx # Price chart component
  │   ├── TradingTabs.jsx     # Trading tabs (Orders/Positions/OrderBook)
  │   └── OrderPanel.jsx      # Buy/sell order panel
  ├── services/                # Data services
  │   └── MarketDataService.js # Market data API service (ready for real APIs)
  └── utils/                   # Utility functions
```

## Features Overview

### Trading Interface
- Professional trading layout with customizable panels
- Real-time market data updates
- Order placement with market and limit orders
- Position tracking and P&L calculation

### Charts
- Multiple chart types (candlestick, line, area)
- Technical indicators
- Zoom and pan functionality
- Timeframe selection

### Order Book
- Live bid/ask order book
- Depth visualization
- Trade history
- Price ladder

## Data Integration

### Polymarket Integration

**✅ Already configured!** SignalBay uses Polymarket as the source of truth. See [POLYMARKET_SETUP.md](./POLYMARKET_SETUP.md) for:
- API setup and configuration
- Trading setup (when ready)
- Troubleshooting

### Custom APIs

To connect your own data sources, see [DATA_INTEGRATION.md](./DATA_INTEGRATION.md) for:
- Setting up API endpoints
- Replacing mock data with API calls
- Implementing WebSocket connections
- Handling authentication
- Error handling and fallbacks

## License

MIT
