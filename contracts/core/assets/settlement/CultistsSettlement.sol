// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../army/IArmyFactory.sol";
import "../zone/IZone.sol";
import "./ISettlement.sol";
import "../WorldAsset.sol";

contract CultistsSettlement is WorldAsset, ISettlement {
    /// @inheritdoc ISettlement
    IZone public override currentZone;
    /// @inheritdoc ISettlement
    IArmy public override army;
    /// @inheritdoc ISettlement
    uint32 public override position;

    /// @inheritdoc ISettlement
    function init(
        uint256 createdWithOwnerTokenId,
        address zoneAddress,
        uint32 settlementPosition
    ) public override initializer {
        currentZone = IZone(zoneAddress);
        position = settlementPosition;

        createNewArmy();
    }

    /// @dev Creates settlements army
    function createNewArmy() internal {
        IArmyFactory armyFactory = IArmyFactory(registry().factoryContracts(keccak256(bytes(("army")))));
        army = IArmy(armyFactory.create(address(world()), epochNumber(), "BASIC", address(this)));
        emit NewArmy(address(army), position);
    }

    /// @notice For cultists settlement any provided address is not ruler
    /// @inheritdoc ISettlement
    function isRuler(address _user) public view override returns (bool) {
        return false;
    }

    // Stubs for ISettlement

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function getSettlementOwner() public view override returns (address) {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function ownerTokenId() public view returns (uint256) {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function siege() public view returns (ISiege) {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function buildings(string memory buildingName) public view returns (IBuilding) {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function currentGovernorsEpoch() public view returns (uint256) {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function governors(uint256 epoch, address isGovernor) public view returns (bool) {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function extraProsperity() public view returns (uint256) {
        revert("unavailable");
    }

    // Functions

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function assignResourcesAndWorkersToBuilding(
        address resourcesOwner,
        address buildingAddress,
        uint256 workersAmount,
        string[] memory resourceTypes,
        uint256[] memory resourcesAmounts
    ) public override {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function withdrawResources(
        string memory resourceName,
        address _to,
        uint256 _amount
    ) public override {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function newBuilding(string memory _scriptName) public override returns (address) {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function calculateCurrentHealthAndDamage(uint256 timestamp)
        public
        view
        override
        returns (uint256 currentHealth, uint256 damage)
    {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function updateCurrentHealth() public override {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function createSiege() public override {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function updateFortHealth(uint256 _healthDiff, bool _isProduced) public override {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function massUpdate() public override {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function accumulatedCurrentProsperity(uint256 _timestamp) public view override returns (int256) {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function getCurrentSiegePower() public view override returns (uint256) {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function extendProsperity(uint256 prosperityAmount) public override {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function beginTileCapture(uint32 position, uint256 prosperityStake) public override {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function cancelTileCapture(uint32 position) public override {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function giveUpCapturedTile(uint32 position) public override {
        revert("unavailable");
    }

    /// @notice For cultists settlement this function is disabled
    /// @inheritdoc ISettlement
    function claimCapturedTile(uint32 position) public override {
        revert("unavailable");
    }
}
