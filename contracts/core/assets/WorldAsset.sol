// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "../IWorld.sol";
import "./WorldAssetStorage.sol";
import "./IWorldAsset.sol";
import "./WorldAssetStorageAccessor.sol";

/// @title Abstract world asset
/// @notice World asset must inherit this basic contract
abstract contract WorldAsset is IWorldAsset, WorldAssetStorageAccessor, Initializable {
    /// Allows caller to be only mighty creator
    modifier onlyMightyCreator() {
        require(msg.sender == registry().mightyCreator(), "onlyMightyCreator");
        _;
    }

    /// @dev Allows caller to be only world or world asset
    modifier onlyWorldAssetFromSameEpoch() {
        require(
            msg.sender == address(world()) ||
                world().worldAssets(WorldAssetStorageAccessor.epochNumber(), msg.sender) != bytes32(0),
            "onlyWorldAssetFromSameEpoch"
        );
        _;
    }

    /// @dev Allows function to be callable only while game is active
    modifier onlyActiveGame() {
        uint256 gameFinishTime = world().gameFinishTime();
        require(gameFinishTime == 0 || block.timestamp < gameFinishTime, "game closed");
        _;
    }

    /// @inheritdoc IWorldAsset
    function world() public view override(IWorldAsset, WorldAssetStorageAccessor) returns (IWorld) {
        return WorldAssetStorageAccessor.world();
    }

    /// @inheritdoc IWorldAsset
    function registry() public view override returns (IRegistry) {
        return world().registry();
    }

    /// @inheritdoc IWorldAsset
    function epoch() public view override returns (IEpoch) {
        return world().epochs(WorldAssetStorageAccessor.epochNumber());
    }
}
