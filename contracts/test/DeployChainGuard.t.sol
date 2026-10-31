// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";
import {DeployPhreaking} from "../script/Deploy.s.sol";

/// @notice OBS-320: the deploy script must hard-fail on any non-Sepolia chain (e.g. mainnet, chainId 1)
///         when any of VAR_CAP_USD / TX_CAP_USD / WALLET_CAP_USD is unset, because a cap of 0 means
///         UNLIMITED on-chain (MysteryBoxBase._checkDepositCaps skips zero caps) and an unset cap would
///         deploy an unbounded fleet. Sepolia (11155111) keeps warn-but-proceed for test deployments.
contract DeployChainGuardTest is Test {
    uint256 constant SEPOLIA_CHAIN_ID = 11155111;
    uint256 constant MAINNET_CHAIN_ID = 1;
    string constant GUARD_REVERT =
        "DEPLOY ABORT: non-Sepolia deploy with cap(s) unset - cap 0 = UNLIMITED on-chain; set VAR_CAP_USD / TX_CAP_USD / WALLET_CAP_USD";

    address executor = makeAddr("executor");

    function _setEnv(string memory k, address v) internal {
        vm.setEnv(k, vm.toString(v));
    }

    function _commonEnv() internal {
        _setEnv("ADMIN", DEFAULT_SENDER);
        _setEnv("MULTISIG", makeAddr("multisig"));
        _setEnv("GUARDIAN", makeAddr("guardian"));
        _setEnv("EXECUTOR", executor);
        _setEnv("KEEPER_A", makeAddr("keeperA"));
        _setEnv("KEEPER_B", makeAddr("keeperB"));
    }

    function _countExecutorWired(Vm.Log[] memory logs) internal view returns (uint256 wired) {
        bytes32 executorChanged = keccak256("ExecutorChanged(address)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics[0] == executorChanged) {
                wired++;
                assertEq(address(uint160(uint256(logs[i].topics[1]))), executor, "wrong executor wired");
            }
        }
    }

    function test_RevertWhen_MainnetChainIdAndAllCapsUnset() public {
        _commonEnv();
        vm.setEnv("VAR_CAP_USD", "0");
        vm.setEnv("TX_CAP_USD", "0");
        vm.setEnv("WALLET_CAP_USD", "0");
        vm.chainId(MAINNET_CHAIN_ID);
        DeployPhreaking dp = new DeployPhreaking();
        vm.expectRevert(bytes(GUARD_REVERT));
        dp.run();
    }

    function test_RevertWhen_MainnetChainIdAndOneCapUnset() public {
        _commonEnv();
        vm.setEnv("VAR_CAP_USD", "100000000000"); // 1000 USD at 1e8
        vm.setEnv("TX_CAP_USD", "100000000"); // 1 USD at 1e8
        vm.setEnv("WALLET_CAP_USD", "0"); // unset -> unlimited -> abort
        vm.chainId(MAINNET_CHAIN_ID);
        DeployPhreaking dp = new DeployPhreaking();
        vm.expectRevert(bytes(GUARD_REVERT));
        dp.run();
    }

    function test_SucceedsOnMainnet_WhenAllCapsSet() public {
        _commonEnv();
        vm.setEnv("VAR_CAP_USD", "100000000000");
        vm.setEnv("TX_CAP_USD", "100000000");
        vm.setEnv("WALLET_CAP_USD", "10000000000");
        vm.chainId(MAINNET_CHAIN_ID);
        vm.recordLogs();
        new DeployPhreaking().run();
        assertEq(_countExecutorWired(vm.getRecordedLogs()), 17, "executor must be set on all 17 boxes");
    }

    function test_SucceedsOnSepolia_WithCapsUnset_WarnButProceed() public {
        _commonEnv();
        vm.setEnv("VAR_CAP_USD", "0");
        vm.setEnv("TX_CAP_USD", "0");
        vm.setEnv("WALLET_CAP_USD", "0");
        vm.chainId(SEPOLIA_CHAIN_ID);
        vm.recordLogs();
        new DeployPhreaking().run();
        assertEq(_countExecutorWired(vm.getRecordedLogs()), 17, "executor must be set on all 17 boxes");
    }
}