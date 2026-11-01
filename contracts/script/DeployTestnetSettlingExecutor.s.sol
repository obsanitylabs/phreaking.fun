// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {console} from "forge-std/console.sol";
import {Script} from "forge-std/Script.sol";
import {Vm} from "forge-std/Vm.sol";

import {TestnetSettlingExecutor} from "../testnet-settling-executor/src/TestnetSettlingExecutor.sol";
import {DeployPhreaking, DeployConfig} from "./Deploy.s.sol";

/// @title DeployTestnetSettlingExecutor.s.sol — OBS-557 Sepolia-only executor deploy + fleet wiring
/// @notice Deploys the OBS-522 `TestnetSettlingExecutor`, then runs the real `Deploy.s.sol` in the same
///         forge-script broadcast run with the fleet's executor forced to that fresh executor. The
///         executor's owner is the broadcast sender (ADMIN); the fleet's admin handoff to MULTISIG is
///         unchanged.
/// @dev    TESTNET/LOCAL ONLY. The executor custodies every pulled / native deposit until its owner sweeps
///         it, which violates the production no-custody trust model. This script refuses to run on mainnet
///         (chainId 1) and on any chain other than Sepolia (11155111) or a local dev chain (31337/1337).
///         It does not modify `Deploy.s.sol`: it calls its explicit-config entrypoint with the executor it
///         just deployed.
///
///         OBS-595: this script never calls `vm.setEnv`. `vm.setEnv` mutates a process-global map shared by
///         parallel forge-test threads, so a writer here would race the production-entrypoint test in
///         `AttackSim.t.sol`. The wrapper instead builds a `DeployConfig` in memory and forces
///         `config.executor` to the address it just deployed, so the operator still cannot mis-wire
///         EXECUTOR. That keeps exactly one env writer in the test fleet (the AttackSim production test).
///
///         The script instantiates the real `DeployPhreaking` locally to run its explicit-config deploy. That
///         script contract's creation code is large, so the script-executor limits must be relaxed:
///         `--disable-block-gas-limit --disable-code-size-limit`. These flags affect only the local script
///         execution; the broadcast transactions are unchanged.
///
///         ADMIN must be the address of the deploy key. The real script requires ADMIN != MULTISIG and
///         KEEPER_A != KEEPER_B, so a single deployer address cannot fill all four custody placeholders.
///
///         Run (local dry run):
///           ADMIN=... MULTISIG=... GUARDIAN=... KEEPER_A=... KEEPER_B=... \
///           VAR_CAP_USD=... TX_CAP_USD=... WALLET_CAP_USD=... \
///           forge script script/DeployTestnetSettlingExecutor.s.sol \
///             --rpc-url http://127.0.0.1:8545 --broadcast \
///             --disable-block-gas-limit --disable-code-size-limit --private-key $DEPLOY_KEY
///
///         Run (Sepolia):
///           ADMIN=... MULTISIG=... GUARDIAN=... KEEPER_A=... KEEPER_B=... \
///           VAR_CAP_USD=... TX_CAP_USD=... WALLET_CAP_USD=... \
///           forge script script/DeployTestnetSettlingExecutor.s.sol \
///             --rpc-url $SEPOLIA_RPC_URL --broadcast \
///             --disable-block-gas-limit --disable-code-size-limit --private-key $DEPLOY_KEY
contract DeployTestnetSettlingExecutor is Script {
    uint256 internal constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 internal constant ANVIL_CHAIN_ID = 31337;
    uint256 internal constant LOCAL_CHAIN_ID = 1337;

    /// @notice The executor deployed by the most recent deploy (also the value forced into the fleet config).
    TestnetSettlingExecutor public executor;

    /// @notice Production entrypoint. Reads every parameter from the process environment but NEVER writes
    ///         it: `vm.setEnv` is a process-global mutation that races parallel forge-test suites. Reads are
    ///         safe because the production entrypoint is the only consumer of these values.
    function run() external returns (TestnetSettlingExecutor deployedExecutor) {
        Vm vm = _vm();
        _guardChain();

        DeployConfig memory config = DeployConfig({
            admin: vm.envAddress("ADMIN"),
            multisig: vm.envAddress("MULTISIG"),
            guardian: vm.envAddress("GUARDIAN"),
            executor: address(0), // overridden below with the freshly deployed executor
            keeperA: vm.envAddress("KEEPER_A"),
            keeperB: vm.envAddress("KEEPER_B"),
            varCapUsd: _optionalEnvUint(vm, "VAR_CAP_USD"),
            txCapUsd: _optionalEnvUint(vm, "TX_CAP_USD"),
            walletCapUsd: _optionalEnvUint(vm, "WALLET_CAP_USD"),
            referralMaxSupply: _optionalEnvUint(vm, "REFERRAL_MAX_SUPPLY"),
            ethPriceUsd: _optionalEnvUint(vm, "ETH_PRICE_USD")
        });

        deployedExecutor = _deployWithConfig(config);
    }

    /// @notice Explicit-parameter entrypoint for the deploy-script tests (OBS-595). Touches no process
    ///         environment, so parallel suites cannot race on a shared `vm.setEnv` map. The wrapper still
    ///         forces the executor it just deployed into the fleet config, so the safety property survives.
    function runWithConfig(DeployConfig calldata configIn)
        external
        returns (TestnetSettlingExecutor deployedExecutor)
    {
        DeployConfig memory config = configIn;
        deployedExecutor = _deployWithConfig(config);
    }

    /// @dev Deploys the executor, then runs the real deployment with the executor forced to the fresh one.
    function _deployWithConfig(DeployConfig memory config)
        internal
        returns (TestnetSettlingExecutor deployedExecutor)
    {
        _guardChain();

        address admin = config.admin;
        require(admin != address(0), "DeployTestnetSettlingExecutor: ADMIN unset");
        require(config.multisig != address(0), "DeployTestnetSettlingExecutor: MULTISIG unset");
        require(config.guardian != address(0), "DeployTestnetSettlingExecutor: GUARDIAN unset");
        require(config.keeperA != address(0), "DeployTestnetSettlingExecutor: KEEPER_A unset");
        require(config.keeperB != address(0), "DeployTestnetSettlingExecutor: KEEPER_B unset");
        require(admin != config.multisig, "DeployTestnetSettlingExecutor: ADMIN and MULTISIG must differ");
        require(config.keeperA != config.keeperB, "DeployTestnetSettlingExecutor: keepers must differ");

        console.log("=== OBS-557 testnet executor deployment ===");
        console.log("chainId:  ", block.chainid);
        console.log("admin:    ", admin);
        console.log("multisig: ", config.multisig);
        console.log("guardian: ", config.guardian);

        Vm vm = _vm();
        vm.startBroadcast();
        deployedExecutor = new TestnetSettlingExecutor();
        vm.stopBroadcast();

        require(address(deployedExecutor) != address(0), "DeployTestnetSettlingExecutor: executor not deployed");
        require(deployedExecutor.owner() == admin, "DeployTestnetSettlingExecutor: executor owner is not ADMIN");

        console.log("TestnetSettlingExecutor: ", address(deployedExecutor));
        console.log("executor owner (ADMIN):  ", deployedExecutor.owner());
        console.log("custody note: deposits accumulate here until the owner sweeps them; TESTNET ONLY.");

        // Force the fleet to use the executor this script just deployed. The operator cannot override it, and
        // the fleet's final DEFAULT_ADMIN_ROLE handoff stays MULTISIG.
        executor = deployedExecutor;
        config.executor = address(deployedExecutor);
        new DeployPhreaking().runWithConfig(config);
    }

    /// @dev Accidental-mainnet guard. The executor custodies funds and must never reach mainnet.
    function _guardChain() internal view {
        uint256 chainId = block.chainid;
        require(
            chainId == SEPOLIA_CHAIN_ID || chainId == ANVIL_CHAIN_ID || chainId == LOCAL_CHAIN_ID,
            "DeployTestnetSettlingExecutor: testnet/local chains only"
        );
    }

    function _vm() internal pure returns (Vm) {
        return Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    }

    /// @dev Reads an optional uint env var; defaults to 0 when unset. Mirrors `DeployPhreaking`'s helper.
    function _optionalEnvUint(Vm vm, string memory name) internal view returns (uint256 value) {
        value = vm.envOr(name, uint256(0));
    }
}
