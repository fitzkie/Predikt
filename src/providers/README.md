# Provider Boundaries

This directory is the integration seam for platform-level providers.

- `azuro/` owns sportsbook protocol providers and adapters
- `polymarket/` owns prediction-market protocol providers and adapters
- `auth/` owns wallet and session boundaries
- `analytics/` owns tracking boundaries

These providers are intentionally thin scaffolds for the initial refactor. The goal is
to move product logic behind stable boundaries before splitting into separate apps.
