export interface Currency {
  name: string;
  code: string;
  address: string;
  decimals: number;
  isNative?: boolean;
}

export const currencies: Currency[] = [
  {
    name: "None",
    code: "None",
    address: "",
    decimals: 18,
  },
  {
    name: "Sepolia ETH",
    code: "ETH",
    address: "",
    decimals: 18,
    isNative: true,
  },
  {
    name: "USD Coin",
    code: "USDC",
    address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    decimals: 6,
  },
  {
    name: "Chainlink Token",
    code: "LINK",
    address: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
    decimals: 18,
  },
  {
    name: "Wrapped Ether",
    code: "WETH",
    address: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
    decimals: 18,
  },
];

export const getBoxId = (boxType: string): number => {
  const type = boxType.replace(/\s+box$/i, "").toLowerCase();
  switch (type) {
    case "blue":
      return 0;
    case "white":
      return 2;
    case "silver":
      return 1;
    default:
      return 0;
  }
};

export const addresses = {
  mysteryBoxAddress: "0x30bbe3c4942a74B3EFFdFe1b6157A46a7C0EAdf5",
  silverBoxAddress: "0x5C973451Bf8De44c84171DAc3447e4b1e16144Fc",
  blueBoxAddress: "0x5555A156c36DE4734175C5613304B04eD3ffe6Cb",
  usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  linkAddress: "0x779877A7B0D9E8603169DdbD7836e478b4624789",
  wethAddress: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
};
