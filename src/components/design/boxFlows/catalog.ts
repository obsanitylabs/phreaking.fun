import { BoxDefinition, BoxId, ToolkitDefinition, ToolkitId } from "./types";

export const TOOLKITS: ToolkitDefinition[] = [
  {
    id: "core",
    label: "CORE",
    notice: "The original mystery. Output is random and unknown at signing.",
  },
  {
    id: "refresh",
    label: "REFRESH TOOLKIT",
    notice:
      "Swap, recycle, or clean up. Outputs are market-priced; nothing here is a guaranteed return.",
  },
  {
    id: "adrenaline",
    label: "ADRENALINE TOOLKIT",
    notice:
      "Higher variance. Some actions are irreversible or time-locked. Read the review screen.",
  },
  {
    id: "vibe",
    label: "VIBE TOOLKIT",
    notice:
      "Copy-trade mirrors. Requires 10,000 UNITE staked. Weights are configuration, not a promise of performance.",
  },
  {
    id: "arcade",
    label: "ARCADE",
    notice: "Fixed-price grabs. Prize inventory is pre-funded and visible.",
  },
];

export const BOXES: BoxDefinition[] = [
  {
    id: "mystery",
    name: "MYSTERY BOX",
    mechanicLabel: "Random swap",
    toolkit: "core",
    accent: "#22E584",
    icon: "gift",
    oneLine: "Deposit crypto. Receive one random token from the live pool.",
    detail:
      "The truest mystery. Deposit one to four tokens and receive a randomly selected token from the active pool. The output is not known when you sign.",
    assetMode: "multi",
    flowKind: "random-swap",
    resultKind: "random",
    status: "sepolia",
    chips: ["RANDOM"],
    warnings: [
      "The output token is chosen randomly. You cannot pick or influence it.",
      "Token values can move between quote and execution.",
    ],
    requiresAcknowledgement: true,
    acknowledgement:
      "I understand the output is random and cannot be chosen.",
    demo: {
      eyebrow: "RANDOM DRAW COMPLETE",
      headline: "You received BAX",
      assets: [{ symbol: "BAX", amount: "1.000", usd: "$0.42" }],
      note: "Selected from the active Mystery Box pool by the on-chain randomizer.",
      route: "Sepolia -> Mystery pool",
      coingecko: true,
      dexscreener: true,
    },
  },
  {
    id: "red",
    name: "RED BOX",
    mechanicLabel: "1:1 token swap",
    toolkit: "refresh",
    accent: "#FF3B30",
    icon: "swap",
    oneLine:
      "Deposit one whole token. Receive one whole token — same chain or cross-chain.",
    detail:
      "One whole token in, one whole token out. Choose Native to stay on your current chain, or Cross-chain to route through Axelar/Synapse to a wider pool. Example: 1 AVAX can return 1 BAX or 1 WBTC.",
    assetMode: "single",
    flowKind: "fixed-swap",
    resultKind: "swap",
    status: "sepolia",
    toggles: [
      {
        id: "route",
        label: "Routing",
        options: [
          {
            id: "native",
            label: "NATIVE",
            help: "Stay on this chain. Fastest and lowest fee.",
          },
          {
            id: "cross-chain",
            label: "CROSS-CHAIN",
            help: "Route to a wider pool through Axelar or Synapse. Adds bridge time and fee.",
          },
        ],
      },
    ],
    warnings: [
      "You receive one whole token, not a dollar-equivalent amount.",
      "Cross-chain routes take longer and charge a bridge fee.",
    ],
    demo: {
      eyebrow: "1:1 SWAP COMPLETE",
      headline: "You received WBTC",
      assets: [{ symbol: "WBTC", amount: "1.000", usd: "$63,120.00" }],
      note: "Exact 1:1 whole-token swap. Route chosen on the configure step.",
      route: "Sepolia -> Axelar -> Arbitrum Sepolia",
      coingecko: true,
      dexscreener: true,
    },
  },
  {
    id: "blue",
    name: "BLUE BOX",
    mechanicLabel: "Portfolio offer",
    toolkit: "refresh",
    accent: "#2F6BFF",
    icon: "layers",
    oneLine:
      "Deposit a lot of tokens. Accept a dollar-value offer for a different basket.",
    detail:
      "Deposit a multi-token lot and receive a dollar-value offer. Accept it to get a different basket worth the same USD, within +/-1% slippage. This is a portfolio swap, not a stablecoin trade.",
    assetMode: "multi",
    flowKind: "portfolio-offer",
    resultKind: "basket",
    status: "sepolia",
    eligibility: [
      { id: "band", label: "Offer must stay within +/-1% of deposit value" },
      { id: "timer", label: "Offer expires 60 seconds after it is issued" },
    ],
    warnings: [
      "The basket you receive is different from the basket you deposit.",
      "You must accept the offer before it expires.",
    ],
    demo: {
      eyebrow: "OFFER ACCEPTED",
      headline: "You received a 3-token basket",
      assets: [
        { symbol: "XCM", amount: "120.00", usd: "$420.00" },
        { symbol: "RIO", amount: "14.00", usd: "$380.00" },
        { symbol: "LINK", amount: "9.00", usd: "$200.00" },
      ],
      note: "Basket value $1,000.00 against a $1,000.00 deposit (0.00% slippage).",
      route: "Sepolia -> Blue offer pool",
      coingecko: true,
      dexscreener: true,
    },
  },
  {
    id: "green",
    name: "GREEN BOX",
    mechanicLabel: "Shitcoin recycler",
    toolkit: "refresh",
    accent: "#16A34A",
    icon: "recycle",
    oneLine:
      "Trade old shitcoins for newer ones that pass the age and volume screen.",
    detail:
      "The shitcoin recycler. Send old tokens and receive newer ones. Eligible receipts must be from a token contract younger than two years with at least $100k average daily volume over the past 90 days.",
    assetMode: "multi",
    flowKind: "recycle",
    resultKind: "basket",
    status: "sepolia",
    eligibility: [
      { id: "age", label: "Receipt token contract is younger than 2 years" },
      { id: "volume", label: "At least $100k average daily volume over 90 days" },
    ],
    warnings: [
      "Screening is not an endorsement. A token can pass the screen and still lose value.",
      "Ineligible assets must be removed before you can continue.",
    ],
    demo: {
      eyebrow: "RECYCLE COMPLETE",
      headline: "You received 2 newer tokens",
      assets: [
        { symbol: "GFI", amount: "310.00", usd: "$465.00" },
        { symbol: "PEAR", amount: "890.00", usd: "$535.00" },
      ],
      note: "Both receipts passed the contract-age and 90-day volume screen.",
      route: "Sepolia -> Recycler pool",
      coingecko: true,
      dexscreener: true,
    },
  },
  {
    id: "orange",
    name: "ORANGE BOX",
    mechanicLabel: "Shit-to-Bit",
    toolkit: "refresh",
    accent: "#FD9C26",
    icon: "bitcoin",
    oneLine: "Sweep dust and selected coins into WBTC.",
    detail:
      "Shit-to-Bit. Select dust positions or individual coins and convert the lot to WBTC. Useful for cleaning a wallet without bridging each asset by hand.",
    assetMode: "multi",
    flowKind: "dust-to-btc",
    resultKind: "swap",
    status: "sepolia",
    warnings: [
      "Dust positions may be worth less than the network fee to move them.",
      "Output is WBTC on the selected destination chain.",
    ],
    demo: {
      eyebrow: "DUST SWEPT",
      headline: "You received WBTC",
      assets: [{ symbol: "WBTC", amount: "0.00310", usd: "$195.67" }],
      note: "Six dust positions converted into one WBTC output.",
      route: "Sepolia -> Uniswap-style router -> WBTC",
      coingecko: true,
      dexscreener: true,
    },
  },
  {
    id: "purple",
    name: "PURPLE BOX",
    mechanicLabel: "NFT highway",
    toolkit: "refresh",
    accent: "#A855F7",
    icon: "image",
    oneLine: "Dump unwanted NFTs for altcoins — or flip altcoins into NFTs.",
    detail:
      "The NFT <-> altcoin highway. Dump unwanted NFTs for altcoins of similar dollar value, or spend altcoins to receive NFTs. When possible, altcoin dumps sweep the floor of the Black Box Harold collection.",
    assetMode: "nft",
    flowKind: "nft-swap",
    resultKind: "swap",
    status: "sepolia",
    toggles: [
      {
        id: "mode",
        label: "Direction",
        options: [
          {
            id: "nft-to-alt",
            label: "NFTs -> ALTCOINS",
            help: "Select NFTs to sell into an altcoin offer.",
          },
          {
            id: "alt-to-nft",
            label: "ALTCOINS -> NFTs",
            help: "Spend tokens to receive NFTs, with an optional floor sweep.",
          },
        ],
      },
    ],
    warnings: [
      "Similar value is estimated within +/-10% and is not guaranteed.",
      "NFT floor prices can move before execution.",
    ],
    demo: {
      eyebrow: "NFT HIGHWAY COMPLETE",
      headline: "You received altcoins for 2 NFTs",
      assets: [{ symbol: "RIO", amount: "212.00", usd: "$381.60" }],
      note: "Floor-based offer. Harold floor sweep was not required for this route.",
      route: "Sepolia -> NFT adapter -> altcoin pool",
      coingecko: true,
      dexscreener: true,
    },
  },
  {
    id: "white",
    name: "WHITE BOX",
    mechanicLabel: "Donate",
    toolkit: "adrenaline",
    accent: "#FFFFFF",
    icon: "heart",
    oneLine: "Donate crypto to a random charity through TheGivingBlock.",
    detail:
      "Donate crypto to a randomly selected charity through TheGivingBlock. Funds are swapped to USDC and donated anonymously. No tax receipt is issued. If you need a receipt, donate directly through TheGivingBlock instead.",
    assetMode: "single",
    flowKind: "donation",
    resultKind: "donation",
    status: "sepolia",
    chips: ["NO RECEIPT"],
    warnings: [
      "Donations are anonymous and do not generate a tax receipt.",
      "The charity is selected at random unless you choose one.",
    ],
    requiresAcknowledgement: true,
    acknowledgement:
      "I understand this donation is anonymous and I will not receive a tax receipt.",
    demo: {
      eyebrow: "DONATION COMPLETE",
      headline: "You donated to Rainforest Foundation US",
      assets: [{ symbol: "USDC", amount: "250.00", usd: "$250.00" }],
      note: "Anonymous donation. No tax receipt was issued.",
      route: "Sepolia -> USDC swap -> TheGivingBlock",
    },
  },
  {
    id: "black",
    name: "BLACK BOX",
    mechanicLabel: "Rage quit",
    toolkit: "adrenaline",
    accent: "#FFFFFF",
    icon: "skull",
    oneLine:
      "Throw your entire wallet into the black hole. Keep a Harold NFT as the receipt.",
    detail:
      "Rage quit. Every token in the connected wallet is swept into a one-time deposit address, valued in USD, and sent to the dev black hole. You receive a Hide The Pain Harold NFT with the USD value printed in the corner. This is irreversible and zeroes the wallet's balances.",
    assetMode: "wallet",
    flowKind: "wallet-sweep",
    resultKind: "harold-nft",
    status: "sepolia",
    chips: ["IRREVERSIBLE"],
    warnings: [
      "This sweeps the entire wallet on every supported EVM chain.",
      "Move anything you want to keep to another wallet first.",
      "The USD total shown on review is the value printed on the NFT.",
    ],
    requiresAcknowledgement: true,
    acknowledgement:
      "I understand this is irreversible and will zero my balances.",
    demo: {
      eyebrow: "RAGE QUIT COMPLETE",
      headline: "Hide The Pain Harold #4821",
      assets: [{ symbol: "USD SWEPT", amount: "$1,842.60", usd: "$1,842.60" }],
      note: "NFT minted on Polygon. USD value is pinned in the upper-right corner of the card.",
      route: "Ethereum -> Polygon -> Harold NFT mint",
    },
  },
  {
    id: "rainbow",
    name: "RAINBOW BOX",
    mechanicLabel: "Anything goes",
    toolkit: "adrenaline",
    accent: "#8B5CF6",
    gradient: true,
    icon: "shuffle",
    oneLine:
      "Approve once. A random box fires — you won't know which until it lands.",
    detail:
      "Approves a transaction that randomly triggers one of the other boxes. The deposit rules of the fired box apply. You will not know which box fired until the result screen.",
    assetMode: "multi",
    flowKind: "random-box",
    resultKind: "random",
    status: "sepolia",
    chips: ["RANDOM"],
    warnings: [
      "A random box fires. Its rules and risks apply to your deposit.",
      "If Black Box fires, the sweep covers your entire wallet — not just the assets you deposited.",
      "You cannot choose or cancel the fired box after signing.",
    ],
    requiresAcknowledgement: true,
    acknowledgement:
      "I understand a random box will fire and I cannot choose it.",
    demo: {
      eyebrow: "BOX TRIGGERED",
      headline: "You received a Blue Box basket",
      assets: [
        { symbol: "wTHT", amount: "410.00", usd: "$512.50" },
        { symbol: "MKR", amount: "0.42", usd: "$487.50" },
      ],
      note: "The Rainbow randomizer fired the Blue Box for this deposit.",
      route: "Sepolia -> Rainbow selector -> Blue Box",
      triggeredBox: "BLUE BOX",
      coingecko: true,
      dexscreener: true,
    },
  },
  {
    id: "checkered",
    name: "CHECKERED BOX",
    mechanicLabel: "Portfolio shuffle",
    toolkit: "adrenaline",
    accent: "#E5E7EB",
    icon: "grid",
    oneLine: "Trade your whole portfolio with another player. No takebacks.",
    detail:
      "Shuffle your hand with someone else's. Two players escrow their entire portfolios and swap them. Value may be higher or lower. Once matched, there are no takebacks.",
    assetMode: "wallet",
    flowKind: "portfolio-match",
    resultKind: "matched",
    status: "demo",
    chips: ["IRREVERSIBLE", "DEMO MATCH"],
    warnings: [
      "You may receive a portfolio worth less than the one you send.",
      "Once a match is accepted there are no takebacks.",
      "Matchmaking is a simulator on Sepolia; no real counterparty pool exists.",
    ],
    requiresAcknowledgement: true,
    acknowledgement:
      "I understand I may receive less value and there are no takebacks.",
    demo: {
      eyebrow: "PORTFOLIO SHUFFLED",
      headline: "You received a matched portfolio",
      assets: [
        { symbol: "wTHT", amount: "1,240.00", usd: "$1,550.00" },
        { symbol: "USDC", amount: "310.00", usd: "$310.00" },
        { symbol: "GFI", amount: "88.00", usd: "$132.00" },
      ],
      note: "Matched portfolio value $1,992.00 against your escrowed $1,978.40.",
      route: "Sepolia -> Checkered escrow -> matched wallet",
      coingecko: true,
      dexscreener: true,
    },
  },
  {
    id: "russian-flag",
    name: "RUSSIAN FLAG",
    mechanicLabel: "24h GMX trade",
    toolkit: "adrenaline",
    accent: "#D52B1E",
    icon: "flag",
    oneLine: "A random 24-hour GMX long or short on Russian-developed coins.",
    detail:
      "Funds are converted to USDC, then a random 2-10 leverage long is placed on GMX (Arbitrum) across Russian-developed coins: ETH, SOL, LINK, AAVE, TON, XMR. There is a 1 in 6 chance the position goes short. The trade closes after 24 hours. Positive PnL is taxed: 13% under 2.4%, 15% from 2.4% to 50%, 22% above 50%.",
    assetMode: "single",
    flowKind: "leveraged-trade",
    resultKind: "position",
    status: "demo",
    chips: ["24H LOCK"],
    warnings: [
      "Funds are locked for 24 hours.",
      "A random 2-10 leverage long or short is opened; you cannot change it.",
      "Profit is taxed at 13%, 15%, or 22% depending on PnL.",
    ],
    requiresAcknowledgement: true,
    acknowledgement:
      "I understand my funds are locked for 24 hours and profit is taxed.",
    demo: {
      eyebrow: "POSITION OPEN",
      headline: "Long 4x opened on the Russian-developed basket",
      assets: [{ symbol: "POSITION", amount: "$1,000.00", usd: "$1,000.00" }],
      note: "Closes automatically after 24 hours. Tax applies to positive PnL: 13% / 15% / 22%.",
      route: "Sepolia -> USDC -> GMX Arbitrum (mock)",
    },
  },
  {
    id: "silver",
    name: "SILVER BOX",
    mechanicLabel: "Majors mirror",
    toolkit: "vibe",
    accent: "#C0C0C0",
    icon: "crown",
    oneLine: "Swap into the top coins held by hedge funds and VCs.",
    detail:
      "Copy the majors. Swap into a top-50 whitelist drawn from hedge-fund and VC portfolios, rebalanced annually. Suggested weights: 50% wBTC, 20% ETH, 10% LINK, 5% ONDO, 5% MKR, 2% UNI, 2% AAVE, 2% AVAX, 2% ENA, 2% SEI.",
    assetMode: "multi",
    flowKind: "mirror",
    resultKind: "basket",
    status: "locked",
    chips: ["UNITE 10K"],
    warnings: [
      "Weights are configuration, not a promise of performance.",
      "You must exit positions yourself; the box does not rebalance your wallet.",
    ],
    demo: {
      eyebrow: "MIRROR COMPLETE",
      headline: "You received the majors basket",
      assets: [
        { symbol: "WBTC", amount: "0.0079", usd: "$500.00" },
        { symbol: "ETH", amount: "0.0625", usd: "$200.00" },
        { symbol: "LINK", amount: "7.14", usd: "$100.00" },
        { symbol: "MKR", amount: "0.01", usd: "$50.00" },
        { symbol: "UNI", amount: "3.33", usd: "$50.00" },
      ],
      note: "Weights follow the annual top-50 whitelist. Dust output below $1 is not returned.",
      route: "Sepolia -> mirror router -> top-50 basket",
      coingecko: true,
      dexscreener: true,
    },
  },
  {
    id: "gold",
    name: "GOLD BOX",
    mechanicLabel: "Microcap mirror",
    toolkit: "vibe",
    accent: "#D4AF37",
    icon: "sparkles",
    oneLine: "The same mirror, aimed at microcaps under $30M.",
    detail:
      "Copy the microcaps. Same mechanic as Silver, limited to coins under a $30M market cap and drawn from public portfolios including Pantera, a16z, Sequoia, Framework, Binance Labs, OKX Ventures, and others.",
    assetMode: "multi",
    flowKind: "mirror",
    resultKind: "basket",
    status: "locked",
    chips: ["UNITE 10K"],
    warnings: [
      "Microcaps are less liquid and can move sharply.",
      "Weights are configuration, not a promise of performance.",
    ],
    demo: {
      eyebrow: "MIRROR COMPLETE",
      headline: "You received the microcap basket",
      assets: [
        { symbol: "F", amount: "120.00", usd: "$300.00" },
        { symbol: "SYRUP", amount: "55.00", usd: "$300.00" },
        { symbol: "GFI", amount: "180.00", usd: "$270.00" },
        { symbol: "CPOOL", amount: "95.00", usd: "$130.00" },
      ],
      note: "All targets were under a $30M market cap at quote time.",
      route: "Sepolia -> mirror router -> microcap basket",
      coingecko: true,
      dexscreener: true,
    },
  },
  {
    id: "diamond",
    name: "DIAMOND BOX",
    mechanicLabel: "1000x or death",
    toolkit: "vibe",
    accent: "#7DD3FC",
    icon: "gem",
    oneLine: "Dollar-for-dollar into sub-$10M coins, filled over 24 hours.",
    detail:
      "The highest-risk mirror. Dollar-for-dollar into coins under a $10M market cap, at least $10k daily volume over 90 days, younger than three years. Fills are TWAP'd over 24 hours with slippage capped at 1%; you may receive several small bags.",
    assetMode: "multi",
    flowKind: "mirror",
    resultKind: "basket",
    status: "locked",
    chips: ["UNITE 10K", "24H TWAP"],
    warnings: [
      "Highest-risk mirror. Sub-$10M coins can lose most of their value.",
      "Fills over 24 hours; you may receive several small bags.",
      "Slippage is capped at 1% per coin.",
    ],
    demo: {
      eyebrow: "TWAP COMPLETE",
      headline: "You received 4 small bags",
      assets: [
        { symbol: "UNB", amount: "8,200.00", usd: "$328.00" },
        { symbol: "LITH", amount: "1,450.00", usd: "$261.00" },
        { symbol: "STURDY", amount: "610.00", usd: "$244.00" },
        { symbol: "RLY", amount: "900.00", usd: "$167.00" },
      ],
      note: "Filled over 24 hours at a maximum 1% slippage per coin.",
      route: "Sepolia -> Diamond TWAP -> sub-$10M basket",
      coingecko: true,
      dexscreener: true,
    },
  },
  {
    id: "coin-gatcha",
    name: "COIN GATCHA",
    mechanicLabel: "Claw machine",
    toolkit: "arcade",
    accent: "#F59E0B",
    icon: "gamepad",
    oneLine: "Grab a ball. Keep the coin inside.",
    detail:
      "A claw machine for coins. Deposit, grab a ball, and receive the coin inside. Three machines at $1, $10, and $100 per grab. Prize inventory is pre-funded and static; a ball can be worth more than the grab price. 3% swap markup and 10% gas premium apply.",
    assetMode: "none",
    flowKind: "gatcha",
    resultKind: "gatcha",
    status: "sepolia",
    chips: ["ARCADE"],
    warnings: [
      "Prize inventory is static and pre-funded; a grab can return less value than the grab price.",
      "3% swap markup and a 10% gas premium apply.",
    ],
    demo: {
      eyebrow: "PRIZE GRABBED",
      headline: "You won LINK",
      assets: [{ symbol: "LINK", amount: "1.45", usd: "$20.30" }],
      note: "Grabbed from the $10 machine. Ball inventory was purchased and held before the grab.",
      route: "Sepolia -> Gatcha vault -> wallet",
      coingecko: true,
      dexscreener: true,
    },
  },
];

export const BOX_BY_ID: Record<BoxId, BoxDefinition> = BOXES.reduce(
  (acc, box) => {
    acc[box.id] = box;
    return acc;
  },
  {} as Record<BoxId, BoxDefinition>,
);

export const BOXES_BY_TOOLKIT: Record<ToolkitId, BoxDefinition[]> = TOOLKITS.reduce(
  (acc, toolkit) => {
    acc[toolkit.id] = BOXES.filter((box) => box.toolkit === toolkit.id);
    return acc;
  },
  {} as Record<ToolkitId, BoxDefinition[]>,
);

export const WHITE_BOX_RECEIPT_LANGUAGE =
  "if you wish to generate a tax receipt or wish for further information, visit thegivingblock.com and donate directly through their platform. For anonymous fast donations without tax receipts, please proceed here";

export const DEMO_CHARITIES = [
  "Rainforest Foundation US",
  "Direct Relief",
  "GiveDirectly",
  "The Trevor Project",
  "Doctors Without Borders",
];
