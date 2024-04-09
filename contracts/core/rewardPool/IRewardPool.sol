// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

interface IRewardPool {
    // State variables

    /// @notice Represents how much of weapons must be given for one unit of token
    /// @dev Updated when #handleEpochDestroyed is called
    function ratio() external view returns (int256);

    /// @notice Represents how much bless tokens must be repaid first to the mighty creator
    /// @dev Updated when #investIntoPrizePool is called
    function invested() external view returns (uint256);

    /// @notice Represents last reward pool total balance after repayment and function(s) are done
    /// @dev Updated when #investIntoPrizePool or #handleEpochDestroyed or #swapWeaponsForTokens or #withdrawRepayment are called
    function lastBalance() external view returns (uint256);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by address which created current instance
    /// @param worldAddress World address
    function init(address worldAddress) external;

    /// @notice Handler of epoch destruction
    /// @dev Must be called when epoch is destroyed
    function handleEpochDestroyed() external;

    /// @notice Swap provided amount of weapons
    /// @dev If resourcesOwner == address(0) -> resources will be taken from msg.sender
    /// @dev If resourcesOwner != address(0) and resourcesOwner has given allowance to msg.sender >= weaponsAmount -> resources will be taken from resourcesOwner
    /// @param resourcesOwner Resources owner
    /// @param weaponsAmount Amount of weapons to swap
    function swapWeaponsForTokens(
        address resourcesOwner,
        uint256 weaponsAmount
    ) external;

    /// @notice Invests specified amount of tokens into prize pool
    /// @dev Bless tokens must be sent to this function (if its type=eth) or will be deducted from msg.sender (if its type=erc20)
    /// @param amountToInvest Amount of tokens to invest
    function investIntoPrizePool(uint256 amountToInvest) external payable;

    /// @notice Withdraws potential bless token added balance to the mighty creator
    /// @dev Triggers withdraw of potential added balance
    function withdrawRepayment() external;
}
