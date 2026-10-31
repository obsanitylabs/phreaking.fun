// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {console} from "forge-std/console.sol";
import {Script} from "forge-std/Script.sol";
import {Vm} from "forge-std/Vm.sol";

import {BoxTokenRegistry} from "../src/BoxTokenRegistry.sol";
import {TokenPricer} from "../src/TokenPricer.sol";
import {RolePriceSource} from "../src/RolePriceSource.sol";
import {MysteryBox} from "../src/MysteryBox.sol";
import {RedBox} from "../src/RedBox.sol";
import {BlueBox} from "../src/BlueBox.sol";
import {GreenBox} from "../src/GreenBox.sol";
import {WhiteBox} from "../src/WhiteBox.sol";
import {OrangeBox} from "../src/OrangeBox.sol";
import {YellowBox} from "../src/YellowBox.sol";
import {PinkBox} from "../src/PinkBox.sol";
import {PurpleBox} from "../src/PurpleBox.sol";
import {RainbowBox} from "../src/RainbowBox.sol";
import {BlackBox} from "../src/BlackBox.sol";
import {CheckeredBox} from "../src/CheckeredBox.sol";
import {SilverBox} from "../src/SilverBox.sol";
import {GoldBox} from "../src/GoldBox.sol";
import {DiamondBox} from "../src/DiamondBox.sol";
import {RussianFlagBox} from "../src/RussianFlagBox.sol";
import {CoinGatchaBox} from "../src/CoinGatchaBox.sol";
import {ReferralToken} from "../src/ReferralToken.sol";
import {ReferralRegistry} from "../src/ReferralRegistry.sol";

/// @title Deploy.s.sol — phreaking.fun Sepolia deployment (OBS-129 Phase 2)
/// @notice Deploys the full box fleet + referral system with bounded-launch wiring:
///          - ADMIN must be the address that signs this script's broadcast transactions (the deployer EOA);
///            it receives constructor admin roles and performs all setup calls.
///          - MULTISIG is the final DEFAULT_ADMIN_ROLE holder (2-of-3 recommended per deployment package):
///            every contract's admin role is transferred to it at the end, then the EOA renounces.
///          - GUARDIAN (on-call guardian multisig) gets one-tx pause on every pausable contract immediately.
///          - Caps applied from CFO-signed env values (USD 1e8); if unset they are left at 0 (= unlimited) and
///            MUST be set before launch — logged loudly below.
/// @dev    Run: forge script script/Deploy.s.sol --rpc-url <sepolia-rpc> --broadcast --private-key $DEPLOY_KEY
///         Required env: ADMIN (signer address == deployer key's address), MULTISIG, GUARDIAN, KEEPER_A, KEEPER_B.
///         Optional env: VAR_CAP_USD / TX_CAP_USD / WALLET_CAP_USD (USD 1e8 integers), REFERRAL_MAX_SUPPLY.
contract DeployPhreaking is Script {
    /// @notice Known Polygon Sepolia tokens from src/constants/currencies.ts — registered on-chain here so the
    ///         registry has correct decimals before pool configuration. Pool membership itself is an admin
    ///         decision post-deploy (per-box spec); this script deliberately does not assume it.
    address constant SEPOLIA_USDC_E = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238; // 6 decimals (verified live)
    address constant SEPOLIA_WETH   = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9; // 18 decimals
    address constant SEPOLIA_LINK   = 0x779877A7B0D9E8603169DdbD7836e478b4624789; // 18 decimals

    bytes32 constant DEFAULT_ADMIN_ROLE = 0x0000000000000000000000000000000000000000000000000000000000000000;

    function run() external {
        Vm vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
        address admin    = vm.envAddress("ADMIN");   // signer of this broadcast == deployer EOA.
        address multisig = vm.envAddress("MULTISIG"); // final DEFAULT_ADMIN_ROLE holder (2-of-3).
        address guardian = vm.envAddress("GUARDIAN"); // on-call emergency pause role.
        require(admin != multisig, "DeployPhreaking: ADMIN and MULTISIG must differ");

        uint256 varCap = _optionalEnvUint(vm, "VAR_CAP_USD");
        uint256 txCap  = _optionalEnvUint(vm, "TX_CAP_USD");
        uint256 walCap = _optionalEnvUint(vm, "WALLET_CAP_USD");

        console.log("=== phreaking.fun deployment (OBS-129) ===");
        console.log("admin:    ", admin);
        console.log("multisig: ", multisig);
        console.log("guardian: ", guardian);
        if (varCap == 0 || txCap == 0 || walCap == 0) {
            console.log("WARNING: one or more caps unset - contracts deploy with cap = 0 (unlimited). Set them before launch.");
        } else {
            console.log("caps (USD 1e8) - totalVaR:", varCap);
            console.log("caps (USD 1e8) - perTx:", txCap);
            console.log("caps (USD 1e8) - perWallet:", walCap);
        }

        vm.startBroadcast(); // every call below is replayed as a signed transaction from `admin`.

        // ---- core infrastructure ----------------------------------------------------
        BoxTokenRegistry registry = new BoxTokenRegistry(admin);
        console.log("BoxTokenRegistry: ", address(registry));

        // Two sources, two keepers. A quote is accepted only when both agree within 1%.
        // KEEPER_A and KEEPER_B must be different operators (or one later swapped for a Chainlink adapter).
        address keeperA = vm.envAddress("KEEPER_A");
        address keeperB = vm.envAddress("KEEPER_B");
        require(keeperA != keeperB, "DeployPhreaking: keepers must differ");
        RolePriceSource primary = new RolePriceSource(admin);
        RolePriceSource secondary = new RolePriceSource(admin);
        TokenPricer pricer = new TokenPricer(admin, primary, secondary);
        primary.grantRole(primary.KEEPER_ROLE(), keeperA);
        secondary.grantRole(secondary.KEEPER_ROLE(), keeperB);
        // Temporary, so the deployer can seed the launch quote on both sources in this broadcast.
        // Revoked before admin handoff. Ongoing quotes require the two keepers independently.
        primary.grantRole(primary.KEEPER_ROLE(), admin);
        secondary.grantRole(secondary.KEEPER_ROLE(), admin);
        console.log("TokenPricer:      ", address(pricer));
        console.log("PriceSource A:    ", address(primary));
        console.log("PriceSource B:    ", address(secondary));

        // ---- 17 box variants ---------------------------------------------------------
        MysteryBox mystery   = new MysteryBox(registry, pricer, admin);
        RedBox red           = new RedBox(registry, pricer, admin);
        BlueBox blue         = new BlueBox(registry, pricer, admin);
        GreenBox green       = new GreenBox(registry, pricer, admin);
        WhiteBox white       = new WhiteBox(registry, pricer, admin);
        OrangeBox orange     = new OrangeBox(registry, pricer, admin);
        YellowBox yellow     = new YellowBox(registry, pricer, admin);
        PinkBox pink         = new PinkBox(registry, pricer, admin);
        PurpleBox purple     = new PurpleBox(registry, pricer, admin);
        RainbowBox rainbow   = new RainbowBox(registry, pricer, admin);
        BlackBox black       = new BlackBox(registry, pricer, admin);
        CheckeredBox check   = new CheckeredBox(registry, pricer, admin);
        SilverBox silver     = new SilverBox(registry, pricer, admin);
        GoldBox gold         = new GoldBox(registry, pricer, admin);
        DiamondBox diamond   = new DiamondBox(registry, pricer, admin);
        RussianFlagBox rf    = new RussianFlagBox(registry, pricer, admin);
        CoinGatchaBox cg     = new CoinGatchaBox(registry, pricer, admin);

        console.log("MysteryBox:       ", address(mystery));
        console.log("RedBox:           ", address(red));
        console.log("BlueBox:          ", address(blue));
        console.log("GreenBox:         ", address(green));
        console.log("WhiteBox:         ", address(white));
        console.log("OrangeBox:        ", address(orange));
        console.log("YellowBox:        ", address(yellow));
        console.log("PinkBox:          ", address(pink));
        console.log("PurpleBox:        ", address(purple));
        console.log("RainbowBox:       ", address(rainbow));
        console.log("BlackBox:         ", address(black));
        console.log("CheckeredBox:     ", address(check));
        console.log("SilverBox:        ", address(silver));
        console.log("GoldBox:          ", address(gold));
        console.log("DiamondBox:       ", address(diamond));
        console.log("RussianFlagBox:   ", address(rf));
        console.log("CoinGatchaBox:    ", address(cg));

        // ---- referral system ----------------------------------------------------------
        uint256 maxSupply = _optionalEnvUint(vm, "REFERRAL_MAX_SUPPLY");
        if (maxSupply == 0) maxSupply = 10_000 ether; // default program exposure cap; overridable.
        ReferralToken referralToken = new ReferralToken(admin, maxSupply);
        console.log("ReferralToken:    ", address(referralToken));
        console.log("ReferralToken maxSupply:", maxSupply);

        ReferralRegistry referralRegistry = new ReferralRegistry(referralToken, admin);
        console.log("ReferralRegistry: ", address(referralRegistry));

        // Minting is granted exactly once to the registry (no other privileged surface).
        bytes32 minterRole = keccak256("MINTER"); // ReferralToken.MINTER_ROLE (not externally visible).
        referralToken.grantRole(minterRole, address(referralRegistry));

        // ---- bounded-launch wiring -----------------------------------------------------
        // One-tx guardian pause on every pausable contract.
        mystery.grantRole(mystery.GUARDIAN_ROLE(), guardian);
        red.grantRole(red.GUARDIAN_ROLE(), guardian);
        blue.grantRole(blue.GUARDIAN_ROLE(), guardian);
        green.grantRole(green.GUARDIAN_ROLE(), guardian);
        white.grantRole(white.GUARDIAN_ROLE(), guardian);
        orange.grantRole(orange.GUARDIAN_ROLE(), guardian);
        yellow.grantRole(yellow.GUARDIAN_ROLE(), guardian);
        pink.grantRole(pink.GUARDIAN_ROLE(), guardian);
        purple.grantRole(purple.GUARDIAN_ROLE(), guardian);
        rainbow.grantRole(rainbow.GUARDIAN_ROLE(), guardian);
        black.grantRole(black.GUARDIAN_ROLE(), guardian);
        check.grantRole(check.GUARDIAN_ROLE(), guardian);
        silver.grantRole(silver.GUARDIAN_ROLE(), guardian);
        gold.grantRole(gold.GUARDIAN_ROLE(), guardian);
        diamond.grantRole(diamond.GUARDIAN_ROLE(), guardian);
        rf.grantRole(rf.GUARDIAN_ROLE(), guardian);
        cg.grantRole(cg.GUARDIAN_ROLE(), guardian);
        referralRegistry.grantRole(referralRegistry.GUARDIAN_ROLE(), guardian);

        // Caps at deploy time (CFO-signed values; 0 = skip, must be set before launch).
        if (varCap != 0 || txCap != 0 || walCap != 0) {
            mystery.setTotalValueAtRiskCap(varCap); mystery.setPerTransactionCap(txCap);   mystery.setPerWalletCap(walCap);
            red.setTotalValueAtRiskCap(varCap);     red.setPerTransactionCap(txCap);         red.setPerWalletCap(walCap);
            blue.setTotalValueAtRiskCap(varCap);    blue.setPerTransactionCap(txCap);        blue.setPerWalletCap(walCap);
            green.setTotalValueAtRiskCap(varCap);   green.setPerTransactionCap(txCap);       green.setPerWalletCap(walCap);
            white.setTotalValueAtRiskCap(varCap);   white.setPerTransactionCap(txCap);       white.setPerWalletCap(walCap);
            orange.setTotalValueAtRiskCap(varCap);  orange.setPerTransactionCap(txCap);      orange.setPerWalletCap(walCap);
            yellow.setTotalValueAtRiskCap(varCap);  yellow.setPerTransactionCap(txCap);      yellow.setPerWalletCap(walCap);
            pink.setTotalValueAtRiskCap(varCap);    pink.setPerTransactionCap(txCap);        pink.setPerWalletCap(walCap);
            purple.setTotalValueAtRiskCap(varCap);  purple.setPerTransactionCap(txCap);      purple.setPerWalletCap(walCap);
            rainbow.setTotalValueAtRiskCap(varCap); rainbow.setPerTransactionCap(txCap);     rainbow.setPerWalletCap(walCap);
            black.setTotalValueAtRiskCap(varCap);   black.setPerTransactionCap(txCap);       black.setPerWalletCap(walCap);
            check.setTotalValueAtRiskCap(varCap);   check.setPerTransactionCap(txCap);       check.setPerWalletCap(walCap);
            silver.setTotalValueAtRiskCap(varCap);  silver.setPerTransactionCap(txCap);      silver.setPerWalletCap(walCap);
            gold.setTotalValueAtRiskCap(varCap);    gold.setPerTransactionCap(txCap);        gold.setPerWalletCap(walCap);
            diamond.setTotalValueAtRiskCap(varCap); diamond.setPerTransactionCap(txCap);     diamond.setPerWalletCap(walCap);
            rf.setTotalValueAtRiskCap(varCap);      rf.setPerTransactionCap(txCap);          rf.setPerWalletCap(walCap);
            cg.setTotalValueAtRiskCap(varCap);      cg.setPerTransactionCap(txCap);          cg.setPerWalletCap(walCap);
        }
        // ---- token registry seed (known Sepolia tokens; decimals only, pools are admin config) ----
        registry.registerToken(SEPOLIA_USDC_E, 6);
        registry.registerToken(SEPOLIA_WETH,   18);
        registry.registerToken(SEPOLIA_LINK,   18);

        // Native Ether (zero-address convention; OBS-128 H-1 donation-path support). Optional USD seed at
        // deploy time — both keepers must refresh it within the 1h freshness heartbeat.
        registry.registerToken(address(0), 18);
        uint256 ethPriceSeed = _optionalEnvUint(vm, "ETH_PRICE_USD"); // whole-ETH USD at 1e8
        if (ethPriceSeed != 0) {
            primary.setQuote(address(0), ethPriceSeed, 18);
            secondary.setQuote(address(0), ethPriceSeed, 18);
            console.log("native Ether seeded at USD:", ethPriceSeed);
        } else {
            console.log("NOTE: native Ether price not seeded - both keepers must quote before launch.");
        }
        primary.revokeRole(primary.KEEPER_ROLE(), admin);
        secondary.revokeRole(secondary.KEEPER_ROLE(), admin);


        // ---- hand every DEFAULT_ADMIN_ROLE to the multisig; EOA renounces all ----------
        // Source admin transfers BEFORE the pricer handoff (granting needs admin rights).
        primary.grantRole(primary.DEFAULT_ADMIN_ROLE(), multisig);
        secondary.grantRole(secondary.DEFAULT_ADMIN_ROLE(), multisig);
        primary.renounceRole(primary.DEFAULT_ADMIN_ROLE(), admin);
        secondary.renounceRole(secondary.DEFAULT_ADMIN_ROLE(), admin);
        registry.grantRole(DEFAULT_ADMIN_ROLE, multisig);            registry.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        pricer.grantRole(DEFAULT_ADMIN_ROLE, multisig);              pricer.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        mystery.grantRole(DEFAULT_ADMIN_ROLE, multisig);             mystery.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        red.grantRole(DEFAULT_ADMIN_ROLE, multisig);                 red.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        blue.grantRole(DEFAULT_ADMIN_ROLE, multisig);                blue.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        green.grantRole(DEFAULT_ADMIN_ROLE, multisig);               green.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        white.grantRole(DEFAULT_ADMIN_ROLE, multisig);               white.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        orange.grantRole(DEFAULT_ADMIN_ROLE, multisig);              orange.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        yellow.grantRole(DEFAULT_ADMIN_ROLE, multisig);              yellow.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        pink.grantRole(DEFAULT_ADMIN_ROLE, multisig);                pink.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        purple.grantRole(DEFAULT_ADMIN_ROLE, multisig);              purple.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        rainbow.grantRole(DEFAULT_ADMIN_ROLE, multisig);             rainbow.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        black.grantRole(DEFAULT_ADMIN_ROLE, multisig);               black.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        check.grantRole(DEFAULT_ADMIN_ROLE, multisig);               check.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        silver.grantRole(DEFAULT_ADMIN_ROLE, multisig);              silver.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        gold.grantRole(DEFAULT_ADMIN_ROLE, multisig);                gold.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        diamond.grantRole(DEFAULT_ADMIN_ROLE, multisig);             diamond.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        rf.grantRole(DEFAULT_ADMIN_ROLE, multisig);                  rf.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        cg.grantRole(DEFAULT_ADMIN_ROLE, multisig);                  cg.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        referralToken.grantRole(DEFAULT_ADMIN_ROLE, multisig);       referralToken.renounceRole(DEFAULT_ADMIN_ROLE, admin);
        referralRegistry.grantRole(DEFAULT_ADMIN_ROLE, multisig);    referralRegistry.renounceRole(DEFAULT_ADMIN_ROLE, admin);

        vm.stopBroadcast();

        console.log("=== deployment complete: DEFAULT_ADMIN_ROLE held only by the multisig ===");
        console.log("Next steps (multisig): set per-box pool membership + executor address + price feeds.");
    }

    /// @dev Reads an optional uint env var; defaults to 0 when unset.
    function _optionalEnvUint(Vm vm, string memory name) internal view returns (uint256 value) {
        value = vm.envOr(name, uint256(0));
    }
}
