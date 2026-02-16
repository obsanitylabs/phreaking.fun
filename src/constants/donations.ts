export const DONATION_CONTRACT_ADDRESS = "0x0d25a6C86EAbbcd2FC6F766aeFE79929903095D2";

import { whiteBoxABI } from '@/abi/whiteBoxABI';

export const DONATION_WALLETS = {
  1: "0x92018A43e97F1dCFc6f19bd9934C4Eb84c2C3cAD",
  2: "0x5ecbfB90F229cB0883d66c35A48105cb7b589fA6",
  3: "0xf25AFE0a2d21b09c3a10DBF541E9c00D21694eDF",
  4: "0xF23DA05c6AC119e631afa4f5b9B30065cca2EA7d",
  5: "0x860d6a2Bc81E6AecaC91689606A219e78F6aDF28",
  6: "0x9b932Bb9FaEB6d7Ba957F70e0882C008224C7Faf"
} as const;

export const DONATION_ORGANIZATIONS: Record<DonationId, {
  name: string;
  description: string;
  category: string;
  location: string;
  icon: string;
}> = {
  1: {
    name: "ZachXBT",
    description: "Blockchain investigation and security research",
    category: "Security Research",
    location: "Global",
    icon: "/institutions/Zach-logo.svg"
  },
  2: {
    name: "Electronic Frontier Foundation",
    description: "Digital rights and privacy advocacy",
    category: "Digital Rights",
    location: "San Francisco, US",
    icon: "/institutions/Eef-logo.svg"
  },
  3: {
    name: "Internet Archive",
    description: "Digital preservation and access",
    category: "Digital Preservation",
    location: "San Francisco, US",
    icon: "/institutions/Internet-logo.svg"
  },
  4: {
    name: "Tor Project",
    description: "Privacy and anonymity tools",
    category: "Privacy Technology",
    location: "Global",
    icon: "/institutions/Tor-logo.svg"
  },
  5: {
    name: "Unbound Science Foundation",
    description: "Advancing scientific research",
    category: "Scientific Research",
    location: "Global",
    icon: "/institutions/Unbound-logo.svg"
  },
  6: {
    name: "Desci Foundation",
    description: "Decentralized science initiatives",
    category: "Decentralized Science",
    location: "Global",
    icon: "/institutions/Desc-logo.svg"
  }
} as const;

export const DONATION_CONTRACT_ABI = whiteBoxABI;

export type DonationId = keyof typeof DONATION_WALLETS;
