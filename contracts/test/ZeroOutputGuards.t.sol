// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";

import {BoxTokenRegistry} from "../src/BoxTokenRegistry.sol";
import {TokenPricer} from "../src/TokenPricer.sol";
import {MysteryBoxBase} from "../src/MysteryBoxBase.sol";
import {IBoxExecutor} from "../src/interfaces/IBoxExecutor.sol";

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

/// @dev Executor that returns the configured output address. When the output is zero it still pulls
///      the ERC20 deposit first, so the box's zero-output guard (not the executor) is what reverts.
contract OutputReturningExecutor is IBoxExecutor {
    address public tokenOut;

    function setOutput(address _tokenOut) external {
        tokenOut = _tokenOut;
    }

    receive() external payable {}

    function execute(address user, address boxType, address tokenIn, uint256 amount, uint256)
        external
        payable
        returns (address)
    {
        if (tokenIn == address(0)) {
            require(msg.value == amount, "Executor: wrong native value");
        } else {
            require(msg.value == 0, "Executor: unexpected native value");
            GuardToken(tokenIn).transferFrom(boxType, address(this), amount);
        }

        if (tokenOut != address(0)) GuardToken(tokenOut).mint(user, amount);
        return tokenOut;
    }
}

contract GuardToken {
    string public name = "GUARD";
    string public symbol = "GRD";
    uint8 public decimals = 18;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(allowance[from][msg.sender] >= value, "insufficient allowance");
        require(balanceOf[from] >= value, "insufficient balance");
        allowance[from][msg.sender] -= value;
        balanceOf[from] -= value;
        balanceOf[to] += value;
        return true;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }
}

/// @dev Regression coverage for the LOW consistency finding from the OBS-161 review: the executor
///      zero-output guard must be present on every box variant, not only Red/Blue/Green/Mystery/White.
contract ZeroOutputGuardsTest is Test {
    BoxTokenRegistry registry;
    TokenPricer pricer;
    OutputReturningExecutor executor;
    address admin = address(0xAA);
    address user = address(0xCC);
    address tokenIn;
    address tokenOut;
    MysteryBoxBase[] boxes;

    function setUp() external {
        registry = new BoxTokenRegistry(admin);
        pricer = new TokenPricer(admin);
        executor = new OutputReturningExecutor();
        tokenIn = address(new GuardToken());
        tokenOut = address(new GuardToken());

        boxes.push(MysteryBoxBase(address(new MysteryBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new RedBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new BlueBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new GreenBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new WhiteBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new OrangeBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new YellowBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new PinkBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new PurpleBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new RainbowBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new BlackBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new CheckeredBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new SilverBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new GoldBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new DiamondBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new RussianFlagBox(registry, pricer, admin))));
        boxes.push(MysteryBoxBase(address(new CoinGatchaBox(registry, pricer, admin))));

        vm.startPrank(admin);
        registry.registerToken(tokenIn, 18);
        pricer.setPrice(tokenIn, 1e8, 18);
        for (uint256 i = 0; i < boxes.length; ++i) {
            MysteryBoxBase box = boxes[i];
            box.setExecutor(address(executor));
            registry.setPoolMembership(box.boxType(), tokenIn, true);
        }
        vm.stopPrank();

        GuardToken(tokenIn).mint(user, boxes.length * 1 ether);
    }

    function test_AllBoxVariants_RejectZeroOutputToken() public {
        for (uint256 i = 0; i < boxes.length; ++i) {
            vm.startPrank(user);
            GuardToken(tokenIn).approve(address(boxes[i]), 1 ether);
            vm.expectRevert();
            boxes[i].deposit(1 ether, tokenIn);
            vm.stopPrank();
        }
    }

    function test_AllBoxVariants_SettleWithNonZeroOutput() public {
        executor.setOutput(tokenOut);

        for (uint256 i = 0; i < boxes.length; ++i) {
            vm.startPrank(user);
            GuardToken(tokenIn).approve(address(boxes[i]), 1 ether);
            address out = boxes[i].deposit(1 ether, tokenIn);
            vm.stopPrank();

            assertEq(out, tokenOut, "box did not return executor output token");
            assertEq(GuardToken(tokenIn).balanceOf(address(boxes[i])), 0, "deposit stranded in box");
            assertEq(GuardToken(tokenIn).allowance(address(boxes[i]), address(executor)), 0, "standing allowance");
        }

        assertEq(GuardToken(tokenOut).balanceOf(user), boxes.length * 1 ether, "user was not paid");
    }
}
