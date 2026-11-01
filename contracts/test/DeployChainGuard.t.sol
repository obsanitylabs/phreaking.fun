// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {DeployPhreaking} from "../script/Deploy.s.sol";

/// @notice OBS-320: the deploy script must hard-fail on any non-Sepolia chain (e.g. mainnet, chainId 1)
///         when any of VAR_CAP_USD / TX_CAP_USD / WALLET_CAP_USD is unset, because a cap of 0 means
///         UNLIMITED on-chain (MysteryBoxBase._checkDepositCaps skips zero caps) and an unset cap would
///         deploy an unbounded fleet. Sepolia (11155111) keeps warn-but-proceed for test deployments.
///
/// @dev    These tests drive `DeployPhreaking.runWithConfig` with an explicit config instead of writing
///         process environment variables via `vm.setEnv`. The environment is process-global and leaks /
///         races across concurrently executed test functions (OBS-621), which made this suite flaky.
contract DeployChainGuardTest is Test {
    uint256 constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 constant MAINNET_CHAIN_ID = 1;
    string constant GUARD_REVERT =
        "DEPLOY ABORT: non-Sepolia deploy with cap(s) unset - cap 0 = UNLIMITED on-chain; set VAR_CAP_USD / TX_CAP_USD / WALLET_CAP_USD";

    // The deployer must be the broadcast sender (see Vm.startBroadcast docs), i.e. DEFAULT_SENDER.
    address constant MULTISIG = address(0x11516);
    address constant GUARDIAN = address(0x6AA);
    address constant EXECUTOR = address(0xE0);
    address constant KEEPER_A = address(0x7EEDA1);
    address constant KEEPER_B = address(0x7EEDB2);

    function _cfg(uint256 varCap, uint256 txCap, uint256 walCap)
        internal
        pure
        returns (DeployPhreaking.DeployConfig memory)
    {
        return DeployPhreaking.DeployConfig({
            admin: DEFAULT_SENDER,
            multisig: MULTISIG,
            guardian: GUARDIAN,
            executor: EXECUTOR,
            keeperA: KEEPER_A,
            keeperB: KEEPER_B,
            varCap: varCap,
            txCap: txCap,
            walCap: walCap,
            ethPriceSeed: 0,
            referralMaxSupply: 0
        });
    }

    function _countExecutorWired(Vm.Log[] memory logs) internal pure returns (uint256 wired) {
        bytes32 executorChanged = keccak256("ExecutorChanged(address)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == executorChanged) {
                wired++;
                assertEq(address(uint160(uint256(logs[i].topics[1]))), EXECUTOR, "wrong executor wired");
            }
        }
    }

    function test_RevertWhen_MainnetChainIdAndAllCapsUnset() public {
        vm.chainId(MAINNET_CHAIN_ID);
        DeployPhreaking dp = new DeployPhreaking();
        vm.expectRevert(bytes(GUARD_REVERT));
        dp.runWithConfig(_cfg(0, 0, 0));
    }

    function test_RevertWhen_MainnetChainIdAndOneCapUnset() public {
        vm.chainId(MAINNET_CHAIN_ID);
        DeployPhreaking dp = new DeployPhreaking();
        // totalVaR and perTx set, perWallet left at 0 (unlimited) -> abort.
        vm.expectRevert(bytes(GUARD_REVERT));
        dp.runWithConfig(_cfg(100000000000, 100000000, 0));
    }

    function test_SucceedsOnMainnet_WhenAllCapsSet() public {
        vm.chainId(MAINNET_CHAIN_ID);
        vm.recordLogs();
        new DeployPhreaking().runWithConfig(_cfg(100000000000, 100000000, 10000000000));
        assertEq(_countExecutorWired(vm.getRecordedLogs()), 17, "executor must be set on all 17 boxes");
    }

    function test_SucceedsOnSepolia_WithCapsUnset_WarnButProceed() public {
        vm.chainId(SEPOLIA_CHAIN_ID);
        vm.recordLogs();
        new DeployPhreaking().runWithConfig(_cfg(0, 0, 0));
        assertEq(_countExecutorWired(vm.getRecordedLogs()), 17, "executor must be set on all 17 boxes");
    }
}
