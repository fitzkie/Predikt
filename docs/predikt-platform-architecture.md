# Predikt Platform Architecture

## Objective

Predikt runs as one brand with two execution products:

- `www.prediktmarkets.com` - marketing and brand site
- `bet.prediktmarkets.com` - Azuro-powered sportsbook
- `app.prediktmarkets.com` - Polymarket-powered predictions app

The platform should share design, analytics, authentication shell, and admin tooling, while keeping sportsbook and prediction-market execution stacks separate.

## Product Split

### Marketing

- Purpose: acquisition, education, trust, routing
- Domain: `www.prediktmarkets.com`
- Data requirements: static content, CMS blocks, FAQ, analytics only

### Bet

- Purpose: sportsbook betting
- Domain: `bet.prediktmarkets.com`
- Provider: Azuro only
- Launch chain: `PolygonUSDT`
- Launch features:
  - prematch
  - live
  - full cashout
  - freebets later

### Predikts

- Purpose: event trading / prediction markets
- Domain: `app.prediktmarkets.com`
- Provider: Polymarket only
- Launch mode: direct API integration

## Architecture Principles

1. Keep one brand and two frontends.
2. Keep two market engines and two execution services.
3. Share UI, analytics, auth shell, and admin data where possible.
4. Do not force Azuro and Polymarket into one execution abstraction too early.
5. Normalize display models at the view layer, not at the transport layer.

## Recommended Repo Shape

This repo currently behaves like a single Next.js app. The target state should move toward a small monorepo while preserving the current Railway deployment flow.

```text
apps/
  marketing/
  bet/
  predikts/

packages/
  ui/
  branding/
  auth/
  analytics/
  config/
  market-types/
  admin-sdk/
  azuro-client/
  polymarket-client/
  shared-utils/

docs/
  predikt-platform-architecture.md
```

## Suggested Migration From Current Repo

### Short-Term

Keep one repo and one Next.js codebase, but separate by module boundaries:

```text
src/
  app/
    (marketing routes)
    bet/
    predikts/
  modules/
    marketing/
    bet/
    predikts/
  providers/
    azuro/
    polymarket/
    analytics/
    auth/
  shared/
    ui/
    branding/
    config/
    types/
    lib/
```

### Long-Term

Break into separate deployable apps under `apps/` once each surface needs its own deployment cadence or scaling behavior.

## App Boundaries

### `apps/marketing`

Responsibilities:

- homepage
- about / FAQ / education
- launch routing
- SEO
- app switcher links

Does not own:

- wallet execution
- portfolio
- market data logic

### `apps/bet`

Responsibilities:

- sportsbook market browsing
- live and prematch event pages
- betslip
- bet submission
- cashout
- bet history
- wallet and token UX for `PolygonUSDT`

External systems:

- Azuro Backend API
- Azuro WebSocket API
- Azuro Graph API
- Privy
- WalletConnect

### `apps/predikts`

Responsibilities:

- market taxonomy
- market discovery
- market detail pages
- order placement
- open positions
- trade history
- watchlists and alerts

External systems:

- Polymarket market APIs
- Polymarket CLOB APIs
- Polymarket data APIs
- Privy
- WalletConnect

## Shared Packages

### `packages/ui`

Shared React components:

- buttons
- cards
- headers
- footers
- tabs
- drawers
- forms
- market list primitives
- status badges

### `packages/branding`

Shared brand assets and tokens:

- colors
- typography
- logos
- favicons
- spacing tokens
- button themes

### `packages/auth`

Shared auth shell:

- Privy provider
- WalletConnect provider
- wallet connection UI
- user session helpers
- address formatting

### `packages/analytics`

Shared event layer:

- page viewed
- market opened
- odds clicked
- wallet connected
- bet submitted
- bet success
- bet failed
- cashout opened
- cashout success
- order submitted
- order filled

### `packages/config`

Shared config parsing:

- environment variables
- domain detection
- feature flags
- app routing defaults

### `packages/market-types`

Shared display types only:

- market card view model
- position summary view model
- category metadata
- chart points
- badge/status enums

Do not use this package to hide provider-specific trading mechanics.

### `packages/azuro-client`

Owns:

- Backend API client
- WebSocket subscriptions
- Graph queries for history
- odds/feed adapters
- cashout adapters
- bet placement helpers

### `packages/polymarket-client`

Owns:

- market discovery client
- CLOB order book client
- trade placement helpers
- positions and activity client
- market taxonomy enrichment

### `packages/admin-sdk`

Shared internal admin logic:

- featured markets
- market curation
- homepage sections
- FAQ blocks
- alerts
- content toggles

## Core Interfaces

These interfaces should be implemented separately for Azuro and Polymarket.

### Display Models

```ts
export type MarketListItem = {
  id: string
  title: string
  subtitle?: string
  category: string
  status: 'prematch' | 'live' | 'closed' | 'resolved'
  outcomes: MarketOutcome[]
  source: 'azuro' | 'polymarket'
  startsAt?: string
  resolvesAt?: string
}

export type MarketOutcome = {
  id: string
  label: string
  price: number
  probability?: number
  change24h?: number
}

export type PositionSummary = {
  marketId: string
  source: 'azuro' | 'polymarket'
  side: string
  averagePrice: number
  sizeUsd: number
  currentValueUsd?: number
  pnlUsd?: number
  status: 'open' | 'closed' | 'resolved'
}
```

### Azuro Adapters

```ts
export interface AzuroMarketProvider {
  listPrematchMarkets(): Promise<MarketListItem[]>
  listLiveMarkets(): Promise<MarketListItem[]>
  getMarketDetails(marketId: string): Promise<MarketListItem>
  subscribeToMarket(marketId: string, onUpdate: (market: MarketListItem) => void): () => void
}

export interface AzuroExecutionService {
  quoteBet(input: AzuroBetQuoteInput): Promise<AzuroBetQuote>
  placeBet(input: AzuroPlaceBetInput): Promise<AzuroPlaceBetResult>
  getCashoutQuote(betId: string): Promise<AzuroCashoutQuote | null>
  executeCashout(betId: string): Promise<AzuroCashoutResult>
}

export interface AzuroHistoryService {
  listUserBets(wallet: string): Promise<PositionSummary[]>
  getBetHistory(wallet: string): Promise<PositionSummary[]>
}
```

### Polymarket Adapters

```ts
export interface PolymarketMarketProvider {
  listMarkets(category?: string): Promise<MarketListItem[]>
  getMarketDetails(marketId: string): Promise<MarketListItem>
  getOrderBook(marketId: string): Promise<PolymarketOrderBook>
}

export interface PolymarketExecutionService {
  placeOrder(input: PolymarketPlaceOrderInput): Promise<PolymarketOrderResult>
  cancelOrder(orderId: string): Promise<void>
  listOpenOrders(wallet: string): Promise<PolymarketOpenOrder[]>
}

export interface PolymarketPortfolioService {
  listPositions(wallet: string): Promise<PositionSummary[]>
  listActivity(wallet: string): Promise<PolymarketActivityItem[]>
}
```

## Data Sources

### Bet App

Use Azuro according to current V3 guidance:

- Backend API:
  - feed data
  - bet calculation
  - order management
  - cashout processing
- Graph API:
  - historical data
  - bet information
  - transaction-related data
- WebSocket API:
  - realtime game and condition updates

### Predikts App

Use Polymarket directly:

- market listing and metadata
- order book and pricing
- order placement and management
- positions and activity

## Environment Variables

### Shared

```env
NEXT_PUBLIC_COMPANY_NAME=Predikt Markets
NEXT_PUBLIC_BASE_URL=https://prediktmarkets.com
NEXT_PUBLIC_SPORTS_APP_URL=https://bet.prediktmarkets.com
NEXT_PUBLIC_PREDIKTS_APP_URL=https://app.prediktmarkets.com
NEXT_PUBLIC_PRIVY_APP_ID=
NEXT_PUBLIC_WALLETCONNECT_ID=
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

### Bet App

```env
NEXT_PUBLIC_AFFILIATE_ADDRESS=
NEXT_PUBLIC_AZURO_ENV=PolygonUSDT
NEXT_PUBLIC_AZURO_BACKEND_API_URL=
NEXT_PUBLIC_AZURO_GRAPH_API_URL=
NEXT_PUBLIC_AZURO_WS_URL=
NEXT_PUBLIC_AZURO_FREEBETS_ENABLED=false
NEXT_PUBLIC_AZURO_CASHOUT_ENABLED=true
NEXT_PUBLIC_AZURO_LIVE_ENABLED=true
NEXT_PUBLIC_AZURO_PREMATCH_ENABLED=true
```

### Predikts App

```env
NEXT_PUBLIC_POLYMARKET_CLOB_URL=
NEXT_PUBLIC_POLYMARKET_DATA_API_URL=
NEXT_PUBLIC_POLYMARKET_GAMMA_API_URL=
NEXT_PUBLIC_POLYMARKET_CHAIN_ID=
NEXT_PUBLIC_POLYMARKET_ENABLED=true
```

### Admin / Internal

```env
ADMIN_DATABASE_URL=
ADMIN_REDIS_URL=
ADMIN_JWT_SECRET=
ADMIN_ALERTS_ENABLED=true
ADMIN_FEATURED_MARKETS_ENABLED=true
```

## Domain Routing

### Marketing

- `www.prediktmarkets.com` -> marketing app

### Bet

- `bet.prediktmarkets.com` -> Azuro sportsbook app

### Predikts

- `app.prediktmarkets.com` -> Polymarket predictions app

If a single Next.js deployment is kept temporarily, hostname-aware routing should continue to push:

- `bet.` -> sportsbook default route
- `app.` -> predictions default route

## Authentication Model

Use one shared wallet onboarding layer:

- Privy for simple onboarding and embedded flows
- WalletConnect for wallet-native users
- wallet address remains the canonical user identifier

Keep app-specific execution state separate:

- Azuro bets and history remain in Azuro data models
- Polymarket orders and positions remain in Polymarket data models

## Admin and Analytics

Use one shared internal layer for:

- featured markets
- homepage modules
- alerts
- watchlists
- notifications
- analytics dashboards

Recommended tables:

- `users`
- `wallet_links`
- `watchlists`
- `featured_markets`
- `content_blocks`
- `alert_rules`
- `event_logs`

## Launch Checklists

### Bet App

- confirm `PolygonUSDT` production endpoints
- verify affiliate address in production
- connect Backend API
- connect Graph API
- connect WebSocket API
- verify wallet and Privy flows
- verify USDT balance and allowance UX
- verify prematch market list
- verify live market list
- verify place-bet flow
- verify full cashout flow
- verify bet history
- verify realtime odds updates
- complete 10+ real-money bets before scaling traffic

### Predikts App

- connect Polymarket market APIs
- connect order book APIs
- build category browsing
- build market detail page
- verify buy/sell flows
- verify positions
- verify activity/history
- verify price refresh and stale-book handling

### Marketing

- keep product split clear
- route traffic cleanly to `bet.` and `app.`
- maintain wallet-native / non-custodial messaging

## Implementation Backlog

### Phase 1

- extract `shared/ui`, `shared/branding`, `shared/auth`, `shared/analytics`
- isolate `bet` and `predikts` route trees
- centralize env parsing

### Phase 2

- finish `bet` provider boundaries
- wire all Azuro APIs cleanly
- productionize betslip, history, and cashout

### Phase 3

- add `polymarket-client`
- build predictions discovery and market detail flows
- add positions and activity

### Phase 4

- add admin backend
- add featured markets
- add alerts/watchlists
- add content management

### Phase 5

- run live-money sportsbook validation
- verify analytics and incident logging
- enable freebets when Azuro admin access is ready

## Immediate Next Build Step

The highest-value next implementation step is:

1. carve current code into `marketing`, `bet`, and `predikts` modules inside `src/`
2. add `azuro-client` and `polymarket-client` packages or package-like folders
3. wire `bet` to hard `PolygonUSDT`
4. begin replacing the current `predikts` placeholder with direct Polymarket data
