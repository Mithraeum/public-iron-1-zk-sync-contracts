// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../core/IWorld.sol";
import "../core/assets/epoch/IEpoch.sol";
import "../core/assets/IWorldAsset.sol";

contract EpochView {
    /// @notice Returns user settlements by provided banners ids
    /// @dev Useful to batch query settlement addresses by banners ids
    /// @param epochAddress Epoch address
    /// @param ownerTokenIds Banners ids
    /// @return userSettlements Settlement addresses
    function getUserSettlements(
        address epochAddress,
        uint256[] memory ownerTokenIds
    ) public view returns (address[] memory) {
        IEpoch currentEpoch = IEpoch(epochAddress);

        address[] memory result = new address[](ownerTokenIds.length);

        for (uint256 i = 0; i < ownerTokenIds.length; i++) {
            result[i] = address(currentEpoch.userSettlements(ownerTokenIds[i]));
        }

        return result;
    }

    /// @notice If necessary activates zone and restores settlement
    /// @dev Restores settlement on position and activates zone if it is not activated yet
    /// @param epochAddress Epoch address
    /// @param position Position
    function restoreSettlementWithZoneActivation(
        address epochAddress,
        uint32 position
    ) public {
        IEpoch epoch = IEpoch(epochAddress);
        IWorldAsset epochWorldAsset = IWorldAsset(epochAddress);

        IWorld world = epochWorldAsset.world();
        uint16 zoneId = world.geography().getZoneIdByPosition(position);
        if (address(epoch.zones(zoneId)) == address(0)) {
            epoch.activateZone(zoneId);
        }

        epoch.restoreSettlement(position);
    }
}
