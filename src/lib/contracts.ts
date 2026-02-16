export const MYSTERY_BOX_CONTRACT =
  "0x75e9dF3b53aAd26a4eb2fc6e19C43000d7B08DDd";
export const BLUE_BOX_CONTRACT = "0x05d7927E949D053CA56A9Ce0b8F5AC6154c9ED24";
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

const CONTRACT_ADDRESSES = {
  11155111: {
    mysteryBox: "0x30bbe3F5F8D4f0f5A8F0d8F0F5A8F0d8F0F5A8F0",
    blueBox: "0x30bbe3F5F8D4f0f5A8F0d8F0F5A8F0d8F0F5A8F0",
    usdcToken: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  },
  1: {
    mysteryBox: "0x0000000000000000000000000000000000000000",
    blueBox: "0x0000000000000000000000000000000000000000",
    usdcToken: "0xA0b86a33E6441E4d4fB0b5F5A8F0d8F0F5A8F0d8",
  },
} as const;

export const getContractAddress = (
  chainId: number,
  contract: "mysteryBox" | "blueBox" | "usdcToken",
) => {
  const addresses =
    CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
  if (!addresses) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
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
