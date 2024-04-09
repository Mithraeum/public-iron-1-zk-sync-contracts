// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../building/IBuilding.sol";
import "../army/IArmy.sol";
import "../siege/ISiege.sol";
import "../zone/IZone.sol";

/// @title Settlement interface
/// @notice Functions to read state/modify state in order to get current settlement parameters and/or interact with it
interface ISettlement {
    /// @notice Emitted when new building is placed, all building are placed on settlement creation
    /// @param contractAddress New building address
    /// @param scriptName Building name
    event NewBuilding(address contractAddress, string scriptName);

    /// @notice Emitted when settlements army is created, is it created on settlement creation
    /// @param armyAddress New army address
    /// @param position Position
    event NewArmy(address armyAddress, uint32 position);

    /// @notice Emitted when siege is created on settlement if not present. During settlements lifetime multiple sieges can be created (one after another, not multiple simultaneously)
    /// @param siegeAddress New siege address
    event SiegeCreated(address indexed siegeAddress);

    /// @notice Emitted when #addGovernor or #removeGovernor is called
    /// @param currentEpoch Current governor epoch
    /// @param governorAddress Address of the governor event is applicable
    /// @param status Is governor became active/inactive
    event GovernorChanged(uint256 indexed currentEpoch, address indexed governorAddress, bool status);

    /// @notice Emitted when #removeGovernors is called
    /// @param currentEpoch New governor epoch
    event NewSettlementEpoch(uint256 currentEpoch);

    // State variables

    /// @notice Zone to which this settlement belongs
    /// @dev Immutable, initialized on the settlement creation
    function currentZone() external view returns (IZone);

    /// @notice Banner token id to which current settlement belongs
    /// @dev Immutable, initialized on the settlement creation
    function ownerTokenId() external view returns (uint256);

    /// @notice Siege of the settlement
    /// @dev If any army is sieging settlement not address(0), otherwise address(0)
    function siege() external view returns (ISiege);

    /// @notice Mapping containing settlements buildings
    /// @dev Types of buildings supported can be queried from registry
    function buildings(string memory buildingName) external view returns (IBuilding);

    /// @notice Current governors epoch
    /// @dev Modified when #removeGovernors is called
    function currentGovernorsEpoch() external view returns (uint256);

    /// @notice Current settlements governors
    /// @dev Modified when #addGovernor or #removeGovernor is called
    function governors(uint256 epoch, address isGovernor) external view returns (bool);

    /// @notice Settlements army
    /// Immutable, initialized on the settlement creation
    function army() external view returns (IArmy);

    /// @notice Extra prosperity amount gained from demilitarization of any army on this settlement
    /// @dev Used for determination amount of real prosperity this settlement has
    function extraProsperity() external view returns (uint256);

    /// @notice Position on which settlement is created
    /// @dev Immutable, initialized on the settlement creation
    function position() external view returns (uint32);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by factory contract which creates current instance
    /// @param createdWithOwnerTokenId Banner token id to which current settlement belongs
    /// @param zoneAddress Zone address to which this settlement belongs
    /// @param settlementPosition Position on which settlement is created
    function init(
        uint256 createdWithOwnerTokenId,
        address zoneAddress,
        uint32 settlementPosition
    ) external;

    /// @notice Withdraws game resources from settlement to specified address
    /// @dev In case if someone accidentally transfers game resource to the settlement
    /// @param resourceName Game resource name
    /// @param to Address that will receive resources
    /// @param amount Amount to transfer
    function withdrawResources(
        string memory resourceName,
        address to,
        uint256 amount
    ) external;

    /// @notice Transfers game resources from msg.sender and workers from settlement to building
    /// @dev Assigns resources+workers to building in single transaction
    /// @dev If resourcesOwner == address(0) -> resources will be taken from msg.sender
    /// @dev If resourcesOwner != address(0) and resourcesOwner has given allowance to msg.sender >= resourcesAmount -> resources will be taken from resourcesOwner
    /// @param buildingAddress Building address
    /// @param workersAmount Workers amount (in 1e18 precision)
    /// @param resourceTypes Resource types
    /// @param resourcesAmounts Resources amounts
    function assignResourcesAndWorkersToBuilding(
        address resourcesOwner,
        address buildingAddress,
        uint256 workersAmount,
        string[] memory resourceTypes,
        uint256[] memory resourcesAmounts
    ) external;

    /// @notice Creates new building
    /// @dev All buildings are created on settlement creation
    /// @param buildingName Building name
    /// @return buildingAddress Address of created building
    function newBuilding(string memory buildingName) external returns (address buildingAddress);

    /// @notice Calculates current fort health and damage dealt at specified timestamp
    /// @dev Uses fort production and siege parameters to forecast health and damage will be dealt at specified time
    /// @param timestamp Time at which calculate parameters
    /// @return currentHealth Health value at specified time
    /// @return damage Amount of damage dealt from fort.production.lastUpdateState to specified timestamp
    function calculateCurrentHealthAndDamage(uint256 timestamp)
        external
        view
        returns (uint256 currentHealth, uint256 damage);

    /// @notice Updates settlement health to current block
    /// @dev Can be called by everyone
    function updateCurrentHealth() external;

    /// @notice Creates empty siege
    /// @dev Can be called by everyone
    function createSiege() external;

    /// @notice Updates fort health
    /// @dev Even though function is opened it can be called only by world or world asset
    /// @param healthDiff Health delta between current value and new value
    /// @param isProduced Banner, whether health is produced or removed
    function updateFortHealth(uint256 healthDiff, bool isProduced) external;

    /// @notice Applies production of every building which produces prosperity
    /// @dev Can be used by everyone
    function massUpdate() external;

    /// @notice Calculates current prosperity at specified timestamp
    /// @dev Uses buildings productions to forecast amount of prosperity will settlement will have at specified time
    /// @param timestamp Time at which calculate current prosperity
    /// @return currentProsperity Amount of prosperity at specified time
    function accumulatedCurrentProsperity(uint256 timestamp) external view returns (int256 currentProsperity);

    /// @notice Calculates total siege power presented at current time
    /// @dev Updated when army add/remove units from siege
    /// @return currentSiegePower Amount of total siege power at current time
    function getCurrentSiegePower() external view returns (uint256 currentSiegePower);

    /// @notice Calculates current settlement owner
    /// @dev Settlements owner is considered an address, which holds ownerTokenId NFT
    /// @return settlementOwner Settlement owner
    function getSettlementOwner() external view returns (address settlementOwner);

    /// @notice Calculates whether provided address is settlement ruler or not
    /// @dev Settlements ruler is an address which owns settlement or an address(es) by which settlement is/are governed
    /// @param potentialRuler Address to check
    /// @return isRuler Banner, whether specified address is ruler or not
    function isRuler(address potentialRuler) external view returns (bool isRuler);

    /// @notice Extends current settlement prosperity by specified amount
    /// @dev Even though function is opened it can be called only by world or world asset
    /// @param prosperityAmount Amount of prosperity to which extend current prosperity
    function extendProsperity(uint256 prosperityAmount) external;

    /// @notice Begins tile capture
    /// @param position Position
    /// @param prosperityStake Prosperity stake
    function beginTileCapture(uint32 position, uint256 prosperityStake) external;

    /// @notice Cancels tile capture
    /// @param position Position
    function cancelTileCapture(uint32 position) external;

    /// @notice Gives up captured tile
    /// @param position Position
    function giveUpCapturedTile(uint32 position) external;

    /// @notice Claims captured tile
    /// @param position Position
    function claimCapturedTile(uint32 position) external;
}
