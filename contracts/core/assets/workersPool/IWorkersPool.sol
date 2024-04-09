// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../zone/IZone.sol";
import "../tokens/workers/IWorkers.sol";
import "../tokens/prosperity/IProsperity.sol";

/// @title Zone workers pool interface
/// @notice Functions to read state/modify state in order to mint workers/swap prosperity for workers
interface IWorkersPool {
    /// @notice Emitted when #swapProsperityForExactWorkers or #swapExactProsperityForWorkers is called
    /// @param buyer The address of settlement which bought workers
    /// @param workersBought Amount of workers bought
    /// @param prosperitySpent Amount of prosperity spent
    event WorkersBought(
        address buyer,
        uint256 workersBought,
        uint256 prosperitySpent
    );

    // State variables

    /// @notice Zone to which this pool belongs
    /// @dev Immutable, initialized on the zone creation
    function currentZone() external view returns (IZone);

    /// @notice Time at which last purchase is performed
    /// @dev Updated every time when #swapProsperityForExactWorkers is called
    function lastPurchaseTime() external view returns (uint256);

    /// @notice Starting unit price
    /// @dev Updated every time when #swapProsperityForExactWorkers is called
    function startingPrice() external view returns (uint256);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by factory contract which creates current instance
    /// @param zoneAddress Zone address
    function init(
        address zoneAddress
    ) external;

    /// @notice Swaps prosperity() for exact workers()
    /// @dev Even though function is opened, it can be executed only by ISettlement because only ISettlement can have prosperity
    /// @param workersToBuy Exact amount of workers
    /// @param maxProsperityToSell Maximum amount of prosperity to be taken for exact amount of workers
    /// @return workersCount Amount of workers bought by prosperity
    function swapProsperityForExactWorkers(uint256 workersToBuy, uint256 maxProsperityToSell) external returns (uint256 workersCount);

    /// @notice Calculates input of prosperity based on output whole amount of workers
    /// @dev Returns valid output only for integer workersToBuy value
    /// @param workersToBuy Amount of workers to buy
    /// @return prosperityToSell Amount of prosperity needed for workersToBuy
    /// @return newStartingPrice New starting price
    function getAmountIn(uint256 workersToBuy) external returns (uint256 prosperityToSell, uint256 newStartingPrice);
}
