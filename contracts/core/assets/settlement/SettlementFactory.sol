// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ISettlement.sol";
import "../WorldAssetFactory.sol";
import "./ISettlementFactory.sol";

contract SettlementFactory is ISettlementFactory, WorldAssetFactory {
    /// @inheritdoc ISettlementFactory
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName,
        uint256 ownerTokenId,
        address zoneAddress,
        uint32 settlementPosition
    ) public returns (address) {
        ISettlement settlement = ISettlement(createAndSet(worldAddress, epochNumber, "settlement", assetName));
        settlement.init(ownerTokenId, zoneAddress, settlementPosition);
        return address(settlement);
    }
}
