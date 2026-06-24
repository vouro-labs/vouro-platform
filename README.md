<p align="center">
  <img src="apps/web/public/logo.png" width="120" alt="VOURO Logo" />
</p>

<h1 align="center">VOURO — Proof-to-Earn Voxel World</h1>

VOURO is a Solana-based Proof-to-Earn platform with an interactive 3D voxel city visual. It represents a decentralized network where developers and contributors (Builders) complete real missions, submit proof keys, and permanently build out the VOURO visual landscape on-chain.

> **MAIN TAGLINE:** Build What Can Be Proven.  
> **SUPPORTING TAGLINE:** Proof First. Reward After.

---

## Architecture Layout

VOURO uses a workspace-linked monorepo layout powered by `pnpm`:

```
vouro/
├── apps/
│   ├── web/               # React + Vite + Three.js / React Three Fiber Frontend
│   └── api/               # Fastify + WebSockets + data providers API Server
├── packages/
│   ├── shared/            # Common typescript interfaces & constants (colors, rules)
│   ├── validation/        # Zod schemas for payload validation
│   ├── blockchain/        # Anchor Solana program code and PDA helpers
│   ├── data-providers/    # Solana RPC, Helius, Jupiter, DexScreener integrations
│   ├── config/            # Common configuration settings
│   └── ui/                # Shared UI layouts
└── package.json           # Monorepo workspaces management scripts
```

---

## Quickstart

### Prerequisites
- Node.js version `>=20.0.0`
- Package manager `pnpm` (`npm install -g pnpm`)

### 1. Installation
Run the following in the monorepo root to automatically bootstrap all packages and link workspaces:
```bash
pnpm install
```

### 2. Configuration
Copy the env template and fill out Helius, Jupiter, and GitHub API credentials:
```bash
cp .env.example .env
```

### 3. Running Development Servers
To run both the Vite frontend (`localhost:3000`) and Fastify backend (`localhost:5000`) concurrently:
```bash
pnpm dev
```

---

## Campaign Rules (Smart Contract Guidelines)

The VOURO program implements strict validators preventing fraudulent claims:
* **RULE 01 — REWARD FIRST:** Campaign creator must transfer all slots rewards to the Campaign Vault PDA before activation.
* **RULE 03 — NO SILENT REJECTION:** Rejections require explicit code flags (`PR_INCOMPLETE`, `WRONG_SIGNER`, `DUPLICATE_PROOF`) and reasons.
* **RULE 04 — LIMITED REVISION:** Max revision bounds are set during campaign initialization (0, 1, or 2) and cannot be changed.
* **RULE 06 — IMMUTABLE SUBMISSION:** Submission hashes and files are read-only; updates require a revision index increment.
* **RULE 09 — DOUBLE CLAIM PROTECTION:** Vault state locks transaction claims to prevent double-spending.
* **RULE 12 — SAFE CAMPAIGNS:** Auto-mod blocks titles and instructions containing violence, illegal hacks, doxxing, or fake reviews.

---

## OpenAPI / API Endpoint Index

The Fastify server exposes the following endpoints:

| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Network health checking (Solana, Helius, Jupiter Price API) |
| `GET` | `/api/world` | Totals and configurations of the voxel world dioramas |
| `GET` | `/api/world/events` | Scrollable ledger log of platform submissions |
| `GET` | `/api/districts` | List all project district environments |
| `POST` | `/api/missions` | Launch a campaign (Rule 12 content checks applied) |
| `POST` | `/api/missions/:id/fund` | Verify on-chain SOL/USDC deposit transaction |
| `POST` | `/api/missions/:id/accept` | Join campaign slots (Vouch Score requirements validation) |
| `POST` | `/api/missions/:id/submit` | Upload proof payload & generate SHA-256 cube |
| `POST` | `/api/submissions/:id/review` | Creator review (Approve / Reject with code) |
| `POST` | `/api/submissions/:id/dispute` | Initiate dispute review within 48h SLA window |
| `POST` | `/api/rewards/:id/claim` | Unlock and trigger SPL transfer from Vault to Builder |
| `GET` | `/api/prices` | Query Spot exchange prices from Jupiter Price API v3 |
| `POST` | `/api/webhooks/helius` | Receive enhanced transaction logs (idempotent, async) |

---

## Deployment Guidelines

### Frontend (apps/web)
Deploy static outputs to **Vercel**, **Netlify**, or **Cloudflare Pages**:
```bash
pnpm --filter web build
```
Set environmental variables:
* `VITE_API_BASE_URL` to backend server host URL
* `VITE_USE_MOCK_DATA=false` for production database connection.

### Backend (apps/api)
Deploy to **Render**, **Fly.io**, or **Heroku**:
1. Build TypeScript:
   ```bash
   pnpm --filter api build
   ```
2. Start server daemon:
   ```bash
   pnpm --filter api start
   ```
3. Set up Redis server instance (`REDIS_URL`) and PostgreSQL database cluster (`DATABASE_URL`).

---

## 🗺️ Roadmap & Future Strategy

VOURO is structured to evolve from a local monorepo prototype into an autonomous on-chain developer coordination layer. Below is the multi-phase deployment roadmap and strategic directions:

### 📍 Phase 1: Core Protocol & Interactive Web (Q3 2026) — *Current Status*
* **Monorepo Layout**: Complete client dashboard and Fastify endpoints using SQLite seed.
* **Interactive 3D Voxel Engine**: Real-time rendering of districts and voxel cubes inside Three.js viewports.
* **Helius & Solana Webhook Integration**: Idempotent event processor listening for SOL/USDC funding and claim transactions.
* **Developer Docs & Dashboard Console**: Native system specs explorer embedded directly inside the builder application.

### 📍 Phase 2: Decentralized Verification & Arbitration (Q4 2026)
* **Programmatic Verification Engines**: Introduce automated Docker-based build verification containers. Creators upload verification scripts that compile builder repositories to check tests and static analysis.
* **Arbitration Guilds**: Establish an on-chain dispute resolution framework where high-reputation validators (Stakers) verify rejected proofs in exchange for a fraction of the bounty.
* **Dynamic Voxel Mutation Pipelines**: Enable builders' submissions to generate customized voxel assets (different colors, structures, or heights) reflecting the type of contribution (e.g. documentation, frontend, core smart contracts).

### 📍 Phase 3: Tokenomics & On-chain District Vaults (Q1 2027)
* **VOURO Governance Token ($VRO)**: Launch the protocol utility token to reward system validators and incentivize long-term builders.
* **District Staking Pools**: Allow projects (Districts) to lock pools of SOL/USDC/VRO to yield continuous rewards for builders actively working on their missions.
* **Reputation-based Borrowing & Grants**: Enable highly reputed Builders (based on proof history) to borrow development tools or claim priority grants without pre-allocation.

### 📍 Phase 4: Cross-chain Expansion & Enterprise Adaptations (Q2 2027)
* **EVM Proof Bridging**: Integrate Wormhole or Chainlink CCIP to accept proof keys from Ethereum/L2 networks while maintaining the state ledger on Solana.
* **Enterprise Vault Solutions**: Launch self-hosted VOURO instances for private codebases, ensuring confidential proof validation with zero-knowledge (ZK) proofs.

