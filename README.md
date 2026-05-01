This repository is a production-oriented Azuro starter built with [Next.js](https://nextjs.org/). It is a cleaner baseline than the `polymarket-example` template when you want to build a branded prediction-market product and deploy it on Railway.

## License
[This license](/LICENSE.md) applies to all code contained in this repository.

## What This Baseline Is Good For

- Reusing Azuro wallet, market, and settlement integrations
- Rebranding the shell into your own market product
- Deploying a single `web` service on Railway first, then adding `api` and `worker` services later

This codebase is still sportsbook-oriented in several deeper components. The shell in this repo is the right place to start branding, IA changes, and product-specific route work.

## Customization

### Theme
This project utilizes a [Tailwind CSS](https://tailwindcss.com/docs/theme) theme configuration, allowing you to customize theme colors, element border-radius, and typography sizes to suit your needs. Check [tailwind.config.ts](/tailwind.config.ts) file.

### Environment
Copy `.env.example` to `.env` and set the values for your project.

- `NEXT_PUBLIC_COMPANY_NAME`: brand shown in the UI and metadata
- `NEXT_PUBLIC_BASE_URL`: public app URL, e.g. your Railway domain
- `NEXT_PUBLIC_AFFILIATE_ADDRESS`: your Azuro affiliate address
- `NEXT_PUBLIC_WALLETCONNECT_ID`: your WalletConnect project ID
- `NEXT_PUBLIC_PRIVY_APP_ID`: your Privy app ID
- `NEXT_PUBLIC_DOCS_URL`, `NEXT_PUBLIC_TERMS_URL`, `NEXT_PUBLIC_POLICY_URL`, `NEXT_PUBLIC_FAQ_URL`: optional footer links

### Social login
Register at https://dashboard.privy.io/account:
- Create a project, go to "Embedded wallets" page, "Smart Wallets" tab, enable it, choose "Safe" (we support only this), configure paymasters for your app chains (https://dashboard.pimlico.io/apikeys).
- Go to "Settings" and copy `App ID`.
- Put value to `NEXT_PUBLIC_PRIVY_APP_ID` variable in [.env](/.env)

### Logo
Update [Logo](/src/components/ui/Logo/Logo.tsx) and the theme in [tailwind.config.ts](/tailwind.config.ts) to match your brand.

## Railway Deployment

This app already uses Next.js standalone output in [next.config.mjs](/next.config.mjs), which is the right deploy target for Railway.

### Service setup

1. Create a Railway project and point it at this repository.
2. Set the start command to `npm run start`.
3. Set the build command to `npm run build`.
4. Add the environment variables from `.env.example`.
5. Set `NEXT_PUBLIC_BASE_URL` to your Railway public domain or custom domain.

### Recommended follow-up architecture

- `web`: this Next.js app
- `api`: a separate Node service for watchlists, curation, alerts, leaderboards, and admin tools
- `worker`: background jobs for market sync, notifications, and derived analytics
- `postgres`: Railway Postgres for app-owned data
- `redis`: optional for queues, rate limits, and cache fanout

## Run project

First, install dependencies:

```bash
npm install
```

And run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
