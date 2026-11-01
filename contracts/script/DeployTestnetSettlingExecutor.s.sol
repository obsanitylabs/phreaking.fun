// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {console} from "forge-std/console.sol";
import {Script} from "forge-std/Script.sol";
import {Vm} from "forge-std/Vm.sol";

import {TestnetSettlingExecutor} from "../testnet-settling-executor/src/TestnetSettlingExecutor.sol";
import {DeployPhreaking} from "./Deploy.s.sol";

/// @title DeployTestnetSettlingExecutor.s.sol — OBS-557 Sepolia-only executor deploy + fleet wiring
/// @notice Deploys the OBS-522 `TestnetSettlingExecutor`, then runs the real `Deploy.s.sol` in the same
///         forge-script broadcast run with `EXECUTOR` set to that fresh executor. The executor's owner is
///         the broadcast sender (ADMIN); the fleet's admin handoff to MULTISIG is unchanged.
/// @dev    TESTNET/LOCAL ONLY. The executor custodies every pulled / native deposit until its owner sweeps
///         it, which violates the production no-custody trust model. This script refuses to run on mainnet
///         (chainId 1) and on any chain other than Sepolia (11155111) or a local dev chain (31337/1337).
///         It does not modify `Deploy.s.sol`: it only supplies the required `EXECUTOR` env value.
///
///         The script instantiates the real `DeployPhreaking` locally to run its unchanged `run()`. That
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

    /// @notice The executor deployed by the most recent `run()` (also the value forced into `EXECUTOR`).
    TestnetSettlingExecutor public executor;

    function run() external returns (TestnetSettlingExecutor deployedExecutor) {
        Vm vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

        // Accidental-mainnet guard. The executor custodies funds and must never reach mainnet.
        uint256 chainId = block.chainid;
        require(
            chainId == SEPOLIA_CHAIN_ID || chainId == ANVIL_CHAIN_ID || chainId == LOCAL_CHAIN_ID,
            "DeployTestnetSettlingExecutor: testnet/local chains only"
        );

        address admin = vm.envAddress("ADMIN");
        address multisig = vm.envAddress("MULTISIG");
        address guardian = vm.envAddress("GUARDIAN");
        address keeperA = vm.envAddress("KEEPER_A");
        address keeperB = vm.envAddress("KEEPER_B");

        require(admin != address(0), "DeployTestnetSettlingExecutor: ADMIN unset");
        require(multisig != address(0), "DeployTestnetSettlingExecutor: MULTISIG unset");
        require(guardian != address(0), "DeployTestnetSettlingExecutor: GUARDIAN unset");
        require(keeperA != address(0), "DeployTestnetSettlingExecutor: KEEPER_A unset");
        require(keeperB != address(0), "DeployTestnetSettlingExecutor: KEEPER_B unset");
        require(admin != multisig, "DeployTestnetSettlingExecutor: ADMIN and MULTISIG must differ");
        require(keeperA != keeperB, "DeployTestnetSettlingExecutor: keepers must differ");

        console.log("=== OBS-557 testnet executor deployment ===");
        console.log("chainId:  ", chainId);
        console.log("admin:    ", admin);
        console.log("multisig: ", multisig);
        console.log("guardian: ", guardian);

        vm.startBroadcast();
        executor = new TestnetSettlingExecutor();
        vm.stopBroadcast();

        require(address(executor) != address(0), "DeployTestnetSettlingExecutor: executor not deployed");
        require(executor.owner() == admin, "DeployTestnetSettlingExecutor: executor owner is not ADMIN");

        console.log("TestnetSettlingExecutor: ", address(executor));
        console.log("executor owner (ADMIN):  ", executor.owner());
        console.log("custody note: deposits accumulate here until the owner sweeps them; TESTNET ONLY.");

        // Supply the required EXECUTOR env value and run the real deployment. The executor's owner stays
        // ADMIN; the fleet's final DEFAULT_ADMIN_ROLE handoff stays MULTISIG.
        vm.setEnv("EXECUTOR", vm.toString(address(executor)));
        new DeployPhreaking().run();

        deployedExecutor = executor;
    }
}
