// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./ISettlementMarketFactory.sol";
import "./ISettlementMarket.sol";
import "../WorldAssetFactory.sol";

contract SettlementsMarketFactory is ISettlementsMarketFactory, WorldAssetFactory {
    /// @inheritdoc ISettlementsMarketFactory
    function create(
        address worldAddress,
        uint256 epochNumber,
        string memory assetName,
        address zoneAddress
    ) public returns (address) {
        ISettlementsMarket settlementsMarket = ISettlementsMarket(createAndSet(worldAddress, epochNumber, "settlementsMarket", assetName));
        settlementsMarket.init(zoneAddress);
        return address(settlementsMarket);
    }
}
