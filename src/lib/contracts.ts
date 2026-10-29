export const MYSTERY_BOX_CONTRACT =
  "0x30bbe3c4942a74B3EFFdFe1b6157A46a7C0EAdf5";
export const BLUE_BOX_CONTRACT = "0x5555A156c36DE4734175C5613304B04eD3ffe6Cb";
export const TOKEN_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
export const TRANSACTION_FEE = "0.001";
export const TOKEN_AMOUNT = "1000000";

export const BOX_IDS = {
  BLUE: 0,
  SILVER: 1,
} as const;

export type BoxType = "blue" | "silver";

export const getBoxTypeFromTitle = (title: string): BoxType => {
  const normalized = title.toLowerCase().trim();
  if (normalized.includes("blue")) return "blue";
  if (normalized.includes("silver")) return "silver";
  return "blue";
};

// Sepolia testnet ONLY. All deployed contract addresses are Sepolia-only;
// mainnet is intentionally absent and any mainnet (chainId 1) access is rejected.
const CONTRACT_ADDRESSES = {
  11155111: {
    mysteryBox: "0x30bbe3c4942a74B3EFFdFe1b6157A46a7C0EAdf5",
    blueBox: "0x5555A156c36DE4734175C5613304B04eD3ffe6Cb",
    usdcToken: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  },
} as const;

export const SUPPORTED_CHAIN_IDS = [11155111];

export const getContractAddress = (
  chainId: number,
  contract: "mysteryBox" | "blueBox" | "usdcToken",
) => {
  const addresses =
    CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) {
    throw new Error(
      `Unsupported chain ID: ${chainId}. This app is Sepolia testnet only.`,
    );
  }
  return addresses[contract];
};

export const MYSTERY_BOX_ABI = [
  {
    inputs: [
      {
        internalType: "string",
        name: "boxType",
        type: "string",
      },
    ],
    name: "purchaseBox",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "getBoxTypes",
    outputs: [
      {
        internalType: "string[]",
        name: "",
        type: "string[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "getUserPurchases",
    outputs: [
      {
        internalType: "uint256[]",
        name: "",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "boxType",
        type: "string",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "BoxPurchased",
    type: "event",
  },
] as const;

export const VOC_TOKEN_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
