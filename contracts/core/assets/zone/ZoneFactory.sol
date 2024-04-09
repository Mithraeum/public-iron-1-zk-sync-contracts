// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IZone.sol";
import "../WorldAssetFactory.sol";
import "./IZoneFactory.sol";

contract ZoneFactory is IZoneFactory, WorldAssetFactory {
    /// @inheritdoc IZoneFactory
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName,
        uint16 zoneId
    ) public returns (address) {
        IZone zone = IZone(createAndSet(worldAddress, epochNumber, "zone", assetName));
        zone.init(zoneId);
        return address(zone);
    }
}
