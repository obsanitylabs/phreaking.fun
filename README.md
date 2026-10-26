# Phreaking Fun — Paused Prototype (Sepolia)

> **Status: Paused / archived prototype. Sepolia testnet only. Not production. Do not send mainnet funds.**
>
> This repository is kept for reference only. The project is not audited, not maintained, and not a live product. It was a 90s-themed experiment for interacting with test contracts on the Ethereum Sepolia testnet. There is no mainnet deployment, and no support or new feature work is planned. Do not connect a mainnet wallet or send real funds.

## Overview

**Phreaking Fun** is a 90s-themed prototype dapp built with Next.js for interacting with box-style test contracts on the Ethereum Sepolia testnet. The boxes explored portfolio swaps, curated swaps, and donations to charitable organizations. The project is paused and archived; no new features, support, or deployments are planned.

> **Naming note:** Earlier drafts used a different working title that could imply an association with a third party. That title is retired. The public name is "Phreaking Fun," matching the repo and domain `phreaking.fun`.

## 🚀 Technologies Used

### **Frontend**

- **Next.js 15.3.2** - React framework for web applications
- **React 19** - Library for user interfaces
- **TypeScript** - Static typing for JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- [ ]  **Blockchain & Web3**

- **Wagmi 2.15.6** - React hooks for Ethereum
- **Viem 2.x** - TypeScript library for Ethereum
- **RainbowKit 2.2.7** - Wallet connection library
- **TanStack Query 5.80.7** - Server state management

### **UI/UX**

- **Radix UI** - Accessible primitive components
- **Lucide React** - SVG icons
- **Class Variance Authority** - CSS variant management
- **React Scramble Text** - Animated text effect

### **Build & Deploy**

- **Netlify** - Deployment platform with Next.js plugin
- **ESLint & Prettier** - Code linting and formatting
- **Turbopack** - Fast bundler for development

## 🏗️ Application Architecture

### **Directory Structure**

```
src/
├── abi/                    # Smart contract ABIs
├── app/                    # Next.js App Router
├── components/             # Reusable React components
├── config/                 # Box flow configurations
├── constants/              # Constants and contract addresses
├── contexts/               # React Contexts for global state
├── hooks/                  # Custom hooks
├── lib/                    # Utilities and libraries
├── styles/                 # Style files
└── types/                  # TypeScript type definitions
```

### **Design Patterns**

- **Context API** - Global state management
- **Custom Hooks** - Reusable logic
- **Component Composition** - Modular components
- **Type Safety** - TypeScript throughout the application

## 📦 Box Types

### **White Box - Donation Box**

#### **Concept**

The White Box is a special box that facilitates donations to charitable organizations through an interactive roulette system.

#### **Features**

- **P2P Exchange**: Facilitates peer-to-peer exchanges
- **NGO Integration**: Connection with charitable organizations
- **Donation Roulette**: Random selection system for beneficiaries
- **Multi-token Support**: Accepts ETH and ERC20 tokens

#### **Operation Flow**

1. **Initial Step**: User selects token and amount
2. **Donation Spin**: Roulette draws between 6 organizations
3. **Processing**: Execution of donation contract
4. **Finished**: Display of donation receipt

#### **Accepted Tokens**

- **ETH** (Sepolia ETH) - Native token
- **USDC** - USD Coin (0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238)
- **LINK** - Chainlink Token (0x779877A7B0D9E8603169DdbD7836e478b4624789)
- **WETH** - Wrapped Ether (0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9)

#### **Beneficiary Organizations**

```typescript
const DONATION_WALLETS = {
  1: "0x92018A43e97F1dCFc6f19bd9934C4Eb84c2C3cAD", // Organization 1
  2: "0x5ecbfB90F229cB0883d66c35A48105cb7b589fA6", // Organization 2
  3: "0xf25AFE0a2d21b09c3a10DBF541E9c00D21694eDF", // Organization 3
  4: "0xF23DA05c6AC119e631afa4f5b9B30065cca2EA7d", // Organization 4
  5: "0x860d6a2Bc81E6AecaC91689606A219e78F6aDF28", // Organization 5
  6: "0x9b932Bb9FaEB6d7Ba957F70e0882C008224C7Faf"  // Organization 6
};
```

#### **Smart Contract**

- **Address**: `0x0d25a6C86EAbbcd2FC6F766aeFE79929903095D2`
- **Main Function**: `donate(uint256 donationId, address[] tokens, uint256[] amounts)`
- **Network**: Ethereum Sepolia Testnet

### **Blue Box - Portfolio Swap**

#### **Concept**

The Blue Box allows users to deposit a portfolio of tokens and receive a curated portfolio of equivalent value.

#### **Features**

- **Portfolio Swap**: Exchange of token portfolios
- **Minimal Slippage**: Designed to minimize slippage
- **Multi-token Support**: Support for multiple tokens simultaneously
- **Curated Selection**: Carefully selected portfolios

#### **Accepted Tokens**

- **ETH** - Ethereum native token
- **USDC** - USD Coin
- **LINK** - Chainlink Token
- **WETH** - Wrapped Ether

#### **Smart Contract**

- **Address**: `0x5555A156c36DE4734175C5613304B04eD3ffe6Cb`
- **Main Function**: `purchaseBox(address receiver, address[] tokens, uint256[] amounts)`
- **Box ID**: 0

### **Silver Box - Curated Swaps**

#### **Concept**

The Silver Box offers value-for-value swaps using specially curated token lists, with the possibility of specific discounts or fees.

#### **Features**

- **Value-for-Value Swaps**: Equivalent value exchanges
- **Curated Token Lists**: Selected token lists
- **Dynamic Pricing**: Discounts or fees based on chosen list
- **Uniswap Integration**: Uniswap integration for liquidity

#### **Accepted Tokens**

- **ETH** - Ethereum native token
- **USDC** - USD Coin
- **LINK** - Chainlink Token
- **WETH** - Wrapped Ether

#### **Smart Contract**

- **Address**: `0x5C973451Bf8De44c84171DAc3447e4b1e16144Fc`
- **Main Function**: `purchaseBox(address receiver, address[] tokens, uint256[] amounts)`
- **Box ID**: 1
- **Uniswap Router**: Integration for automatic swaps

## 🔗 Smart Contracts

### **Contract Addresses (Sepolia)**

```typescript
const addresses = {
  // Box Contracts
  mysteryBoxAddress: "0x30bbe3c4942a74B3EFFdFe1b6157A46a7C0EAdf5",
  whiteBoxAddress: "0x0d25a6C86EAbbcd2FC6F766aeFE79929903095D2",
  silverBoxAddress: "0x5C973451Bf8De44c84171DAc3447e4b1e16144Fc",
  blueBoxAddress: "0x5555A156c36DE4734175C5613304B04eD3ffe6Cb",
  
  // Tokens
  usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  linkAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
  wethAddress: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
};
```

### **Contract ABIs**

- `whiteBoxABI.ts` - ABI for donation contracts
- `blueBoxABI.ts` - ABI for portfolio swaps
- `silverBoxABI.ts` - ABI for curated swaps
- `mysteryBoxABI.ts` - Main contract ABI
- `erc20ABI.ts` - Standard ABI for ERC20 tokens

## 🎨 User Interface

### **Main Components**

- **EnhancedMysteryBoxModal** - Main modal for box interaction
- **InitialStep** - Token and amount selection
- **DonationSpinStep** - Selection roulette (White Box only)
- **ProcessingStep** - Transaction processing
- **FinishedStep** - Final result and receipts

### **Design System**

- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui Components** - Customizable base components
- **Framer Motion Animations** - Smooth transitions
- **Responsive Design** - Adaptable to different devices

### **Themes and Colors**

- **Dark Theme** - Default dark theme
- **Gradient Backgrounds** - Gradient backgrounds
- **Box-specific Colors** - Unique colors for each box type

## 🔧 Configuration and Development

### **Environment Variables**

```bash
# RainbowKit/Wagmi configurations
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_ENVIRONMENT=development
```

### **Available Scripts**

```bash
npm run dev          # Development with Turbopack
npm run build        # Production build
npm run start        # Production server
npm run lint         # Linting with ESLint
npm run lint:fix     # Automatic lint fix
npm run format       # Formatting with Prettier
npm run format:check # Format verification
```

### **Deploy**

- **Platform**: Netlify
- **Plugin**: @netlify/plugin-nextjs
- **Build Command**: `npm run build`
- **Publish Directory**: `.next`

**Deployment status: paused.** Do not redeploy this repository as a live product. If the Netlify site remains online, it must show a clear pause notice and must not accept mainnet funds. The intended disposition is a takedown or a static paused/prototype page.

## Security

This prototype is not audited. Do not use it with real funds. The Sepolia test contracts and this code are provided as-is, with no warranty. The app was built as an experiment; no production security review was completed.

## License

No license is granted for this repository. It is public for reference only. Do not copy, modify, deploy, or redistribute the code without written permission from Obsanity Labs.
