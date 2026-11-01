// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Vm} from "forge-std/Vm.sol";

import {DeployTestnetSettlingExecutor} from "../script/DeployTestnetSettlingExecutor.s.sol";
import {TestnetSettlingExecutor} from "../testnet-settling-executor/src/TestnetSettlingExecutor.sol";
import {MysteryBox} from "../src/MysteryBox.sol";
import {MysteryBoxBase} from "../src/MysteryBoxBase.sol";
import {BoxTokenRegistry} from "../src/BoxTokenRegistry.sol";
import {TokenPricer} from "../src/TokenPricer.sol";
import {RolePriceSource} from "../src/RolePriceSource.sol";

/// @dev Minimal ERC20 for the dry-run deposit. The executor pulls through the box's one-shot allowance.
contract DryRunToken {
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _move(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        require(a >= amount, "DryRunToken: insufficient allowance");
        allowance[from][msg.sender] = a - amount;
        _move(from, to, amount);
        return true;
    }

    function _move(address from, address to, uint256 amount) internal {
        require(balanceOf[from] >= amount, "DryRunToken: insufficient balance");
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
    }
}

/// @notice OBS-557 dry-run proof: the real `Deploy.s.sol` runs behind the new executor-deploy script, wires
///         the executor on all 17 boxes, and one ERC20 deposit lands in the executor's custody.
contract TestnetExecutorDeployTest is Test {
    uint256 internal constant LOCAL_CHAIN_ID = 31337;
    uint256 internal constant MAINNET_CHAIN_ID = 1;

    address internal admin = DEFAULT_SENDER;
    address internal multisig = makeAddr("multisig");
    address internal guardian = makeAddr("guardian");
    address internal keeperA = makeAddr("keeperA");
    address internal keeperB = makeAddr("keeperB");
    address internal user = makeAddr("user");

    DeployTestnetSettlingExecutor internal deployer;
    TestnetSettlingExecutor internal exec;
    DryRunToken internal token;

    function setUp() external {
        vm.chainId(LOCAL_CHAIN_ID);
        _setEnv("ADMIN", admin);
        _setEnv("MULTISIG", multisig);
        _setEnv("GUARDIAN", guardian);
        _setEnv("KEEPER_A", keeperA);
        _setEnv("KEEPER_B", keeperB);
        vm.setEnv("VAR_CAP_USD", "1000000000000000"); // 10,000,000 USD at 1e8
        vm.setEnv("TX_CAP_USD", "1000000000000"); // 10,000 USD at 1e8
        vm.setEnv("WALLET_CAP_USD", "1000000000000"); // 10,000 USD at 1e8
        token = new DryRunToken();
    }

    function _setEnv(string memory key, address value) internal {
        vm.setEnv(key, vm.toString(value));
    }

    function _findMysteryBoxAndExecutorWiring(Vm.Log[] memory logs)
        internal
        view
        returns (address mystery, uint256 wired)
    {
        bytes32 executorChanged = keccak256("ExecutorChanged(address)");
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length != 2 || logs[i].topics[0] != executorChanged) continue;
            address box = logs[i].emitter;
            assertEq(address(uint160(uint256(logs[i].topics[1]))), address(exec), "wrong executor wired");
            assertEq(address(MysteryBoxBase(box).executor()), address(exec), "box executor mismatch");
            wired++;
            if (MysteryBoxBase(box).boxType() == BoxTokenRegistry.BoxType.MYSTERY) mystery = box;
        }
    }

    function test_DeployWiresExecutorOnAllBoxes_AndDepositLandsInExecutor() public {
        deployer = new DeployTestnetSettlingExecutor();
        vm.recordLogs();
        exec = deployer.run();
        Vm.Log[] memory logs = vm.getRecordedLogs();

        assertEq(exec.owner(), admin, "executor owner must remain ADMIN");
        assertEq(address(exec), address(deployer.executor()), "script did not expose the deployed executor");

        (address mystery, uint256 wired) = _findMysteryBoxAndExecutorWiring(logs);
        assertEq(wired, 17, "executor must be wired on all 17 boxes");
        assertTrue(mystery != address(0), "MysteryBox not found");

        MysteryBox box = MysteryBox(mystery);
        BoxTokenRegistry registry = box.registry();
        TokenPricer pricer = TokenPricer(address(box.pricer()));
        RolePriceSource primary = RolePriceSource(address(pricer.primary()));
        RolePriceSource secondary = RolePriceSource(address(pricer.secondary()));

        vm.startPrank(multisig);
        registry.registerToken(address(token), 18);
        registry.setPoolMembership(BoxTokenRegistry.BoxType.MYSTERY, address(token), true);
        vm.stopPrank();

        vm.prank(keeperA);
        primary.setQuote(address(token), 2000e8, 18);
        vm.prank(keeperB);
        secondary.setQuote(address(token), 2000e8, 18);

        token.mint(user, 1e18);
        vm.prank(user);
        token.approve(mystery, 1e18);

        vm.prank(user);
        address tokenOut = box.deposit(1e18, address(token));

        assertEq(tokenOut, address(token), "executor must return the non-zero input token");
        assertEq(token.balanceOf(address(exec)), 1e18, "deposit must land in the executor");
        assertEq(token.balanceOf(mystery), 0, "box must not retain the deposit");
        assertEq(token.allowance(mystery, address(exec)), 0, "no standing allowance left behind");

        // Custody escape hatch: the owner (ADMIN) sweeps to the multisig; there is no user dispersal path.
        vm.prank(admin);
        exec.sweep(address(token), multisig, 1e18);
        assertEq(token.balanceOf(multisig), 1e18, "swept deposit must reach the multisig");
        assertEq(token.balanceOf(address(exec)), 0, "executor must be drained by the sweep");
    }

    function test_RevertOnMainnet() public {
        vm.chainId(MAINNET_CHAIN_ID);
        DeployTestnetSettlingExecutor guarded = new DeployTestnetSettlingExecutor();
        vm.expectRevert("DeployTestnetSettlingExecutor: testnet/local chains only");
        guarded.run();
    }
}
