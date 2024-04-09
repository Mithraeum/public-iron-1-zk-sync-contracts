// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../tokens/units/IUnits.sol";
import "../zone/IZone.sol";

/// @title Zone units pool interface
/// @notice Functions to read state/modify state in order to mint units/swap weapons for units
interface IUnitsPool {
    /// @notice Emitted when #swapWeaponsForExactUnits or #swapWeaponsForExactUnitsByZone is called
    /// @param spender The address which payed weapons
    /// @param armyAddress The address of the army which received units
    /// @param unitsBought Amount of units bought
    /// @param weaponsSpent Amount of weapons spent
    event UnitsBought(
        address spender,
        address armyAddress,
        uint256 unitsBought,
        uint256 weaponsSpent
    );

    // State variables

    /// @notice Zone to which this pool belongs
    /// @dev Immutable, initialized on the zone creation
    function currentZone() external view returns (IZone);

    /// @notice Units type
    /// @dev Immutable, initialized on the zone creation
    function unitsType() external view returns (string memory);

    /// @notice Time at which last purchase is performed
    /// @dev Updated every time when #swapWeaponsForExactUnits or #swapWeaponsForExactUnitsByZone is called
    function lastPurchaseTime() external view returns (uint256);

    /// @notice Starting unit price
    /// @dev Updated every time when #swapWeaponsForExactUnits or #swapWeaponsForExactUnitsByZone is called
    function startingPrice() external view returns (uint256);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by factory contract which creates current instance
    /// @param zoneAddress Zone address
    /// @param unitsType Units type
    function init(
        address zoneAddress,
        string memory unitsType
    ) external;

    /// @notice Swaps weapons() for exact units()
    /// @dev If resourcesOwner == address(0) -> resources will be taken from msg.sender
    /// @dev If resourcesOwner != address(0) and resourcesOwner has given allowance to msg.sender >= amount of weapons for units -> resources will be taken from resourcesOwner
    /// @param resourcesOwner Resources owner
    /// @param settlementAddress Settlement address, army of which, will receive units
    /// @param unitsToBuy Exact amount of units
    /// @param maxWeaponsToSell Maximum amount of weapons to be taken for exact amount of units
    /// @return unitsCount Amount of units bought by weapons
    function swapWeaponsForExactUnits(
        address resourcesOwner,
        address settlementAddress,
        uint256 unitsToBuy,
        uint256 maxWeaponsToSell
    ) external returns (uint256 unitsCount);

    /// @notice Swaps weapons() for exact units()
    /// @dev Even though function is opened it can be called only by zone
    /// @dev If resourcesOwner == address(0) -> resources will be taken from msg.sender
    /// @dev If resourcesOwner != address(0) and resourcesOwner has given allowance to msg.sender >= amount of weapons for units -> resources will be taken from resourcesOwner
    /// @param resourcesOwner Resources owner
    /// @param msgSender msg.sender from zone call
    /// @param settlementAddress Settlement address, army of which, will receive units
    /// @param unitsToBuy Exact amount of units
    /// @param maxWeaponsToSell Maximum amount of weapons to be taken for exact amount of units
    /// @return unitsCount Amount of units bought by weapons
    function swapWeaponsForExactUnitsByZone(
        address resourcesOwner,
        address msgSender,
        address settlementAddress,
        uint256 unitsToBuy,
        uint256 maxWeaponsToSell
    ) external returns (uint256 unitsCount);

    /// @notice Calculates input of weapons based on output whole amount of units
    /// @dev Returns valid output only for integer unitsToBuy value (not in 1e18 precision)
    /// @param unitsToBuy Amount of workers to buy
    /// @return weaponsToSell Amount of weapons needed for unitsToBuy
    /// @return newStartingPrice New starting price
    function getAmountIn(uint256 unitsToBuy) external returns (uint256 weaponsToSell, uint256 newStartingPrice);
}
