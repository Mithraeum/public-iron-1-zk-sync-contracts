// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../../IWorld.sol";
import "../battle/IBattle.sol";
import "../settlement/ISettlement.sol";
import "../siege/ISiege.sol";

/// @title Army interface
/// @notice Functions to read state/modify state in order to get current army parameters and/or interact with it
interface IArmy {
    struct MovementTiming {
        uint64 startTime;
        uint64 endTime;
    }

    struct StunTiming {
        uint64 startTime;
        uint64 endTime;
    }

    /// @notice Emitted when #burnUnits is called (#demilitarize or #exitBattle)
    /// @param unitName Name of the unit type
    /// @param value New amount of unit type presented in army
    event UnitsChanged(string unitName, uint256 value);

    /// @notice Emitted when #updatePosition is called (even though event can be emitted only on the next action related to the current army, de-facto army will update position based on 'movementTiming.endTime'
    /// @param settlementAddress Address of the settlement where army currently staying on
    /// @param position Position
    event UpdatedPosition(address settlementAddress, uint32 position);

    /// @notice Emitted when #newBattle is called. Army which attacks another army will emit this event.
    /// @param battleAddress Created battle address
    /// @param targetArmyAddress Address of the attacked army
    event NewBattle(address battleAddress, address targetArmyAddress);

    /// @notice Emitted when army joins battle. At the battle creation both armies (attacker and attacked) will emit this event. Attacker army will be side A and at attacked army will be sideB
    /// @param battleAddress Address of the battle army joined in
    /// @param side Side to which army joined (sideA = 1, sideB = 2)
    event JoinedBattle(address indexed battleAddress, uint256 side);

    /// @notice Emitted when #updateState is called (even though event can be emitted only on the next action related to the current army, de-facto army will exit battle when battle is finished)
    /// @param battleAddress Address of the battle army was in
    event ExitedFromBattle(address battleAddress);

    /// @notice Emitted when #move is called
    /// @param destinationSettlement Address of the settlement army is moving to
    /// @param movementStartTime Time at which movement began
    /// @param movementFinishTime Time at which movement will end
    /// @param path The path army is taken from starting position to destination position
    event MovingTo(
        address indexed destinationSettlement,
        uint256 indexed movementStartTime,
        uint256 indexed movementFinishTime,
        uint32[] path
    );

    // State variables

    /// @notice Settlement address to which this army belongs
    /// @dev Immutable, initialized on the army creation
    function currentSettlement() external view returns (ISettlement);

    /// @notice Position where army currently stands on
    /// @dev Updated when army updates position. It does not take into account if army is moving
    /// @dev To proper query current position use #getCurrentPosition
    function currentPosition() external view returns (uint32);

    /// @notice Position to which are is moving to
    /// @dev Updated when army starts moving. It does not take into account if army is finished move by time
    /// @dev To proper calculate destination position you need to check if army finished movement by comparing current time and movementTiming.endTime
    function destinationPosition() external view returns (uint32);

    /// @notice Battle in which army is on
    /// @dev If army is not in battle returns address(0). It does not take into account if battle is finished but army is not left the battle
    function battle() external view returns (IBattle);

    /// @notice Siege in which are army is on
    /// @dev If army is not in siege returns address(0)
    function siege() external view returns (ISiege);

    /// @notice Movement timings
    /// @dev Updated when army starts moving. It does not take into account if army is finished move by time
    function movementTiming() external view returns (uint64 startTime, uint64 endTime);

    /// @notice Stun timings
    /// @dev Updated when army finishes move or when army loses battle
    function stunTiming() external view returns (uint64 startTime, uint64 endTime);

    /// @notice Path army is taken during movement
    /// @dev Updated when army starts moving. It does not take into account if army is finished move by time
    /// @dev To proper query entire movementPath use #getMovementPath
    function movementPath(uint256 index) external view returns (uint32);

    /// @notice Time at which last demilitarization occured
    /// @dev Updated when #demilitarize is called
    function lastDemilitarizationTime() external view returns (uint256);

    // Functions

    /// @notice Proxy initializer
    /// @dev Called by factory contract which creates current instance
    /// @param settlementAddress Settlement address
    function init(address settlementAddress) external;

    /// @notice Path army is taken during movement
    /// @dev Useful to get entire movement path rather than querying each path item by index. It does not take into account if army is finished move by time
    /// @return path Entire path army is taken during movement
    function getMovementPath() external view returns (uint32[] memory path);

    /// @notice Updates army state to the current block
    /// @dev Called on every action which are based on army state and time
    function updateState() external;

    /// @notice Initiates army movement to the settlement
    /// @dev Even though path can be provided artificial only allowed movement to a settlement
    /// @param path Path army will take to the settlement
    /// @param foodToSpendOnFeeding Amount of food army will take from current position settlements FARM in order to decrease total time army will take to get to destination position
    function move(uint32[] memory path, uint256 foodToSpendOnFeeding) external;

    /// @notice Demilitarizes part of the army. Demilitarization provides prosperity to the settlement army is currently staying on
    /// @dev Even though demilitarization of 0 units may seem reasonable, it is disabled
    /// @param unitNames Names of the unit types for demilitarization
    /// @param unitsCount Amount of units for demilitarization for every unit type
    function demilitarize(string[] memory unitNames, uint256[] memory unitsCount) external;

    /// @notice Sets battle
    /// @dev Can only be called by world or world asset
    /// @param battleAddress Battle address
    function setBattle(address battleAddress) external;

    /// @notice Initiates battle with another army is both are not in battle
    /// @dev Creates IBattle and sets both armies in created battle
    /// @param armyAddress Address of the army this army will attack
    /// @param maxUnitTypesToAttack Max units types to attack
    /// @param maxUnitsToAttack Max units to attack
    function newBattle(
        address armyAddress,
        string[] calldata maxUnitTypesToAttack,
        uint256[] calldata maxUnitsToAttack
    ) external;

    /// @notice Joins current army in battle to the provided side
    /// @dev Moving army is able to join battle only if caller is another army (drags it into battle)
    /// @param battleAddress Battle address army will join
    /// @param side Side of the battle army will join (sideA = 1, sideB = 2)
    function joinBattle(address battleAddress, uint256 side) external;

    /// @notice Burns units from the army
    /// @dev Can only be called by world or world asset
    /// @param unitTypes Unit types for burning
    /// @param unitAmounts Amount of units for burning for every unit type
    function burnUnits(string[] memory unitTypes, uint256[] memory unitAmounts) external;

    /// @notice Calculates current position taking to the account #movementTimings
    /// @dev This method should be used to determine real army position
    /// @return position Position
    function getCurrentPosition() external view returns (uint32 position);

    /// @notice Sets and withdraw units to/from siege
    /// @dev Provides ability to atomically setup/re-setup siege
    /// @param addUnitsNames Names of the unit types to put in siege
    /// @param addUnitsCount Amount of units to put in siege for every unit type
    /// @param removeUnitsNames Names of the unit types to withdraw from siege
    /// @param removeUnitsCount Amount of units to withdraw from siege for every unit type
    function setUnitsInSiege(
        string[] memory addUnitsNames,
        uint256[] memory addUnitsCount,
        string[] memory removeUnitsNames,
        uint256[] memory removeUnitsCount
    ) external;

    /// @notice Swaps accumulated robbery tokens in siege for resource
    /// @dev Amount of points will be taken may be lesser if building does not have resources in its treasury
    /// @param buildingAddress Address of the building treasury of which will be robbed
    /// @param points Amount of points to spend for resources
    function claimResources(address buildingAddress, uint256 points) external;

    /// @notice Calculates total siege support of the army
    /// @dev For every unit type placed in siege calculates sum of all of them
    /// @return totalSiegeSupport Total siege support of the army
    function getTotalSiegeSupport() external view returns (uint256 totalSiegeSupport);

    /// @notice Sets siege
    /// @dev Can only be called by world or world asset
    /// @param siegeAddress Siege address
    function setSiege(address siegeAddress) external;

    /// @notice Return owner of the army
    /// @dev Same as owner of the settlement to which this army belongs
    /// @return ownerAddress Address of the owner of the army
    function getOwner() external view returns (address ownerAddress);

    /// @notice Calculates is army on its home position
    /// @dev Takes into account if army movement is finished
    /// @return isHomePosition Is army on home position
    function isHomePosition() external view returns (bool isHomePosition);
}
