// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SignedMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./IRewardPool.sol";
import "../WorldInitializable.sol";
import "../../periphery/ProxyReentrancyGuard.sol";

contract RewardPool is IRewardPool, WorldInitializable, ProxyReentrancyGuard {
    /// @inheritdoc IRewardPool
    int256 public override ratio;
    /// @inheritdoc IRewardPool
    uint256 public override invested;
    /// @inheritdoc IRewardPool
    uint256 public override lastBalance;

    event RewardPoolUpdated();

    /// @dev Allows caller to be only world
    modifier onlyWorld() {
        require(msg.sender == address(world), "onlyWorld");
        _;
    }

    /// @dev Repays newly added balance to mighty creator
    modifier syncBalances(uint256 msgValue) {
        uint256 blessBalanceBefore = getBlessBalance() - msgValue;
        uint256 addedBalance = blessBalanceBefore - lastBalance;
        if (addedBalance > 0) {
            uint256 toRepay = Math.min(invested, addedBalance);

            if (toRepay > 0) {
                sendTokens(world.registry().mightyCreator(), toRepay);
                invested -= toRepay;
            }
        }
        _;
        lastBalance = getBlessBalance();
        emit RewardPoolUpdated();
    }

    /// @dev Reads current bless balance
    function getBlessBalance() internal returns (uint256) {
        return
            address(world.blessToken()) == address(0)
                ? address(this).balance
                : world.blessToken().balanceOf(address(this));
    }

    /// @dev Sends bless tokens from this contract to specified address (either eth or erc20)
    function sendTokens(address to, uint256 amount) internal {
        if (address(world.blessToken()) == address(0)) {
            Address.sendValue(payable(to), amount);
        } else {
            world.blessToken().transfer(to, amount);
        }
    }

    /// @dev Increases ratio
    /// @dev At start it is positive -> user need to pay RATIO weapons for 1 bless token
    /// @dev when it has become negative -> user need to pay 1 weapons for abs(RATIO) bless token
    function increaseRatio() internal {
        if (ratio > 0) {
            ratio = ratio / 2;

            if (ratio == 0) {
                ratio = -2;
            }
        } else {
            ratio = ratio * 2;
        }
    }

    /// @dev Check if current bless balance is ok for current ratio
    function hasBalanceForRatio() internal returns (bool) {
        uint256 minBalanceRequired = ratio > 0 ? 1 : SignedMath.abs(ratio);
        return getBlessBalance() >= minBalanceRequired;
    }

    /// @inheritdoc IRewardPool
    function init(address worldAddress) public override initializer {
        setWorld(worldAddress);
        ratio = 4;
    }

    /// @inheritdoc IRewardPool
    function investIntoPrizePool(uint256 amountToInvest) public payable syncBalances(msg.value) {
        if (address(world.blessToken()) != address(0)) {
            require(msg.value == 0, "eth invest is disabled");
        }

        if (address(world.blessToken()) == address(0)) {
            invested += msg.value;
        } else {
            world.blessToken().transferFrom(msg.sender, address(this), amountToInvest);
            invested += amountToInvest;
        }
    }

    /// @inheritdoc IRewardPool
    function handleEpochDestroyed() public override onlyWorld syncBalances(0) {
        increaseRatio();

        if (!hasBalanceForRatio()) {
            world.setGameFinishTime(block.timestamp);
        }
    }

    /// @inheritdoc IRewardPool
    function swapWeaponsForTokens(
        address resourcesOwner,
        uint256 weaponsAmount
    ) public override nonReentrant syncBalances(0) {
        IResource weapons = world.epochs(world.currentEpochNumber()).resources("WEAPON");

        uint256 tokensToBeReceived = 0;
        if (ratio > 0) {
            weaponsAmount = weaponsAmount - (weaponsAmount % uint256(ratio));
            tokensToBeReceived = weaponsAmount / uint256(ratio);
        } else {
            tokensToBeReceived = weaponsAmount * SignedMath.abs(ratio);
        }

        if (resourcesOwner == address(0)) {
            weapons.transferFrom(msg.sender, address(this), weaponsAmount);
        } else {
            weapons.spendAllowance(resourcesOwner, msg.sender, weaponsAmount);
            weapons.transferFrom(resourcesOwner, address(this), weaponsAmount);
        }

        sendTokens(msg.sender, tokensToBeReceived);

        if (!hasBalanceForRatio()) {
            world.setGameFinishTime(block.timestamp);
        }
    }

    /// @inheritdoc IRewardPool
    function withdrawRepayment() public syncBalances(0) {}

    receive() external payable {
        require(address(world.blessToken()) == address(0), "unable to receive ether bless token");
        emit RewardPoolUpdated();
    }
}
