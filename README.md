# x402 Forge

A futuristic dark-mode landing page built with **React + Tailwind + Framer Motion**, inspired by the x402 protocol.

x402 Forge powers programmable payments, AI coordination, and the next evolution of digital transactions.

<img src="x402_forge.png" alt="x402 Forge" style="max-height: 300px; width: auto; max-width: 80%;">

### 🌌 Features
- Animated neon background
- Typing code examples
- Reactive sections with motion
- Modular dark design

## Vision: The Invisible Payment Layer

Every web request can carry value. With x402, payments become a native, programmable primitive of the internet.

Forge turns API calls into on-chain events, enabling agents to coordinate, meter usage, and share revenue in real time. No middlemen, no custom billing — just verifiable, automated economics at machine speed.

### Why x402
A trustless payment protocol embedded into every API layer, making data and compute monetizable.

### Use Cases
Autonomous services that pay each other for inference, storage, or access across global networks.

### For Teams
Integrate x402 into your stack to create usage-based billing and microservices that earn in real time.

## Technology Modules

### Bridge Layer
Verifies paid HTTP requests and automates on-chain settlement with sub-3s latency.
- Secure multi-sig verification
- Adaptive transaction gas optimization
- AI-driven audit trail summaries

### Agent Mesh
Enables P2P task routing, payment splitting, and autonomous coordination.
- Secure multi-sig verification
- Adaptive transaction gas optimization
- AI-driven audit trail summaries

### Proof Engine
Emits verifiable receipts and cryptographic proofs for every transaction.
- Secure multi-sig verification
- Adaptive transaction gas optimization
- AI-driven audit trail summaries

### 💻 Code Examples

#### Send a payment-enabled API request
```javascript
// Request premium data feed with automatic payment
import { x402 } from '@x402/sdk'

async function fetchDataFeed() {
  try {
    const response = await x402.fetch('https://api.datafeed.ai/v1/streams', {
      method: 'POST',
      headers: {
        'X-402-Payment': '0.5 USDC',
        'X-402-Deadline': Date.now() + 30000, // 30s expiry
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_KEY}`
      },
      body: JSON.stringify({
        query: 'SELECT * FROM streams WHERE usage > 100',
        filters: { region: 'us-east-1', type: 'real-time' }
      })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Payment or request failed: ${error.message}`)
    }

    const data = await response.json()
    console.log('Stream data received:', data.streams.length, 'records')
    return data
  } catch (error) {
    console.error('Failed to fetch data feed:', error.message)
    throw error
  }
}

// Usage
fetchDataFeed()
  .then(data => processStreams(data))
  .catch(error => handleError(error))
```

#### Agent-to-Agent micropayment and service call
```javascript
// Autonomous agent pays another agent for rendering service
import { AgentWallet } from '@x402/sdk'
import { ethers } from 'ethers'

class TaskOrchestrator {
  constructor(privateKey) {
    this.wallet = new AgentWallet({ 
      privateKey,
      network: process.env.X402_NETWORK || 'mainnet',
      provider: new ethers.providers.JsonRpcProvider(process.env.RPC_URL)
    })
  }

  async requestRenderService(config) {
    const { chartType, data, format } = config
    
    try {
      // Create payment transaction
      const paymentTx = await this.wallet.pay({
        to: 'forge.network/render',
        amount: '3.5', // USDC
        asset: 'USDC',
        memo: `Render ${chartType} chart for analytics v3`,
        metadata: {
          jobId: crypto.randomUUID(),
          service: 'render',
          params: { format, quality: 'high' }
        }
      })

      console.log('Payment transaction:', paymentTx.hash)
      
      // Wait for confirmation
      const receipt = await paymentTx.wait({ confirmations: 2 })
      
      if (receipt.status === 'confirmed') {
        console.log('Payment confirmed:', receipt.blockNumber)
        
        // Notify render service agent
        await this.notifyRenderAgent({
          txHash: paymentTx.hash,
          jobId: paymentTx.metadata.jobId,
          data,
          config: { chartType, format }
        })
        
        return { success: true, txHash: paymentTx.hash, jobId: paymentTx.metadata.jobId }
      } else {
        throw new Error('Payment confirmation failed')
      }
    } catch (error) {
      console.error('Render service payment failed:', error)
      throw error
    }
  }

  async notifyRenderAgent(payload) {
    const response = await fetch('https://forge.network/render/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return response.json()
  }
}

// Usage
const orchestrator = new TaskOrchestrator(process.env.AGENT_PRIVATE_KEY)

orchestrator.requestRenderService({
  chartType: 'line',
  data: analyticsData,
  format: 'png'
}).then(result => {
  console.log('Render job queued:', result.jobId)
}).catch(console.error)
```

#### Verify payment and auto-execute smart workflow
```javascript
// Service endpoint that verifies payment and executes job
import { verifyPayment, PaymentVerifier } from '@x402/utils'
import { x402 } from '@x402/sdk'

class PaymentProcessor {
  constructor() {
    this.verifier = new PaymentVerifier({
      network: process.env.X402_NETWORK,
      rpcUrl: process.env.RPC_URL
    })
  }

  async processPaymentRequest(txHash, jobConfig) {
    try {
      // Verify payment on-chain
      const receipt = await this.verifier.verify({
        txHash,
        expectedAmount: jobConfig.amount,
        expectedAsset: jobConfig.asset || 'USDC',
        timeout: 60000 // 60s timeout
      })

      if (!receipt.valid) {
        console.error('❌ Payment invalid or expired:', receipt.reason)
        return { success: false, error: receipt.reason }
      }

      console.log('✅ Verified payment for', receipt.service)
      console.log('Amount:', receipt.amount, receipt.asset)
      console.log('From:', receipt.from)
      console.log('Block:', receipt.blockNumber)

      // Extract job metadata from payment memo
      const jobId = receipt.metadata?.jobId || receipt.jobId
      
      if (!jobId) {
        throw new Error('No job ID found in payment metadata')
      }

      // Execute the job
      const result = await this.executeJob(jobId, jobConfig)
      
      // Log audit trail
      await this.logAudit({
        jobId,
        txHash,
        status: 'completed',
        timestamp: Date.now(),
        result
      })

      return { success: true, jobId, result }
    } catch (error) {
      console.error('Payment processing failed:', error)
      await this.logAudit({
        txHash,
        status: 'failed',
        error: error.message
      })
      throw error
    }
  }

  async executeJob(jobId, config) {
    const job = await x402.getJob(jobId)
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    // Set job context
    job.setContext({
      config,
      startTime: Date.now()
    })

    // Execute with timeout
    const result = await Promise.race([
      job.run(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Job timeout')), 300000)
      )
    ])

    console.log('Job completed successfully:', jobId)
    return result
  }

  async logAudit(entry) {
    await x402.logAudit({
      ...entry,
      service: 'payment-processor',
      version: '1.0.0'
    })
  }
}

// Express.js endpoint example
import express from 'express'
const app = express()
const processor = new PaymentProcessor()

app.post('/api/process-payment', async (req, res) => {
  const { txHash, jobConfig } = req.body
  
  try {
    const result = await processor.processPaymentRequest(txHash, jobConfig)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

## Documentation

Explore SDKs, architecture, and guides for building intelligent autonomous agents with x402.

- [View on GitHub](https://github.com/coinbase/x402) - Official x402 protocol repository
- [Visit x402.org](https://www.x402.org/) - Complete documentation and guides

### 🛠 Deployment
To deploy via GitHub Pages:
```bash
npm run deploy
```
