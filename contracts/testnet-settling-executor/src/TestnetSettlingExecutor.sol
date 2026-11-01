// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IBoxExecutor} from "obs/interfaces/IBoxExecutor.sol";
import {IERC20} from "obs/interfaces/IERC20.sol";

/// @title TestnetSettlingExecutor — SEPOLIA ONLY. NOT MAINNET-CAPABLE.
/// @notice Minimal `IBoxExecutor` for the OBS-295 attack-simulation phase (SEPOLIA-ATTACK-SIM §3, S3).
///         It holds every pulled / native deposit in its own balance until the owner sweeps it, which
///         deliberately violates the production no-custody trust model ("never holds balances between
///         transactions"). That custody stance is acceptable ONLY because this contract is confined to
///         Sepolia testnet value.
/// @dev    SEPOLIA ONLY — NEVER deploy this contract to mainnet and NEVER point a mainnet box's
///         `setExecutor` at it. It has no slippage/DEX/bridge routing, no VRF, no user payout and it
///         custodies funds; every one of those is the opposite of the production executor contract.
///         There is intentionally NO mainnet dispersal path in this contract.
contract TestnetSettlingExecutor is IBoxExecutor {
    /// @notice The only address allowed to sweep accumulated deposits (the deploy-time multisig).
    address public owner;

    event Settled(address indexed user, address indexed tokenIn, uint256 amount);
    event Swept(address indexed token, address indexed to, uint256 amount);

    error NotOwner();

    /// @dev The broadcaster (deployer EOA) is the initial owner; the operator hands custody to the
    ///      MULTISIG by sweeping immediately after deploy. There is no on-chain owner-rotation path:
    ///      `sweep` is the only privileged surface, and re-deploying is the testnet rotation mechanism.
    constructor() {
        owner = msg.sender;
    }

    /// @dev Accept native deposits forwarded by a box's `_dispatchToExecutor`. The box forwards
    ///      `msg.value == amount` inside the `execute` call, so this `receive()` exists only so that
    ///      payable dispatch lands (boxes never send bare native transfers to an executor).
    receive() external payable {}

    /// @notice Settle a single box deposit by taking custody of it pending an owner sweep.
    /// @dev    Implements the `IBoxExecutor` obligations that matter on testnet:
    ///          - ERC20 PULL model: pulls exactly `amount` of `tokenIn` from `boxType` inside the
    ///            one-shot allowance the box grants immediately before this call and resets to zero
    ///            immediately after. The pull here is the concrete implementation of the design's
    ///            `SafeTransfer.pull` placeholder, using the repo's own `IERC20` interface and checking
    ///            the boolean return so a non-standard token cannot silently no-op the pull.
    ///          - Native path: `tokenIn == address(0)` requires `msg.value == amount` (the box forwards
    ///            the deposit as value in the same call).
    ///          - Returns a non-zero output token so the calling box's zero-output guard (S7c) passes.
    ///            The output is `tokenIn` itself; this settlement sink does NOT route or pay `user`.
    /// @return tokenOut The input token (non-zero for the ERC20 path); boxes revert on a zero output.
    function execute(address user, address boxType, address tokenIn, uint256 amount, uint256)
        external
        payable
        returns (address tokenOut)
    {
        if (tokenIn == address(0)) {
            require(msg.value == amount, "TestnetSettling: wrong native value");
        } else {
            require(msg.value == 0, "TestnetSettling: unexpected native value");
            // Exact one-shot allowance set by the box; never rely on a standing allowance.
            require(IERC20(tokenIn).transferFrom(boxType, address(this), amount), "TestnetSettling: pull failed");
        }
        emit Settled(user, tokenIn, amount);
        return tokenIn; // non-zero on the ERC20 path: boxes revert on a zero output (S7c)
    }

    /// @notice Sweep a held token (or native ETH with `token == address(0)`) to `to`. Owner only.
    /// @dev    The custody escape hatch for this testnet sink: the owner sweeps deposits to the MULTISIG.
    ///         There is deliberately no user-facing withdrawal or dispersal logic.
    function sweep(address token, address to, uint256 amount) external {
        if (msg.sender != owner) revert NotOwner();
        if (token == address(0)) {
            (bool ok, ) = to.call{value: amount}("");
            require(ok, "TestnetSettling: sweep native failed");
        } else {
            require(IERC20(token).transfer(to, amount), "TestnetSettling: sweep failed");
        }
        emit Swept(token, to, amount);
    }
}
