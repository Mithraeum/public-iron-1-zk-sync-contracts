// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "./IUnits.sol";
import "../../building/IBuilding.sol";
import "../../unitsPool/IUnitsPool.sol";
import "../../WorldAsset.sol";

contract Units is ERC20Burnable, IUnits, WorldAsset {
    /// @inheritdoc IUnits
    string public tokenName;
    /// @inheritdoc IUnits
    string public tokenSymbol;
    /// @inheritdoc IUnits
    string public override worldUnitName;

    /// @dev Removes error for compiling, default constructor does nothing because its a proxy
    constructor() ERC20("", "") public {

    }

    /// @inheritdoc IUnits
    function init(
        string memory _tokenName,
        string memory _tokenSymbol,
        string memory _worldUnitName
    ) public override initializer {
        tokenName = _tokenName;
        tokenSymbol = _tokenSymbol;
        worldUnitName = _worldUnitName;
    }

    /// @inheritdoc IERC20Metadata
    function name() public view override returns (string memory) {
        return string.concat(string.concat(tokenName, " @"), Strings.toString(WorldAssetStorageAccessor.epochNumber()));
    }

    /// @inheritdoc IERC20Metadata
    function symbol() public view override returns (string memory) {
        return string.concat(string.concat(tokenSymbol, " @"), Strings.toString(WorldAssetStorageAccessor.epochNumber()));
    }

    /// @dev ERC20 _beforeTokenTransfer hook
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        bytes32 ARMY_ASSET_TYPE = keccak256(bytes("army"));
        //1. If Cultists is minted/burned -> updateState in zone (in order to apply workers before cultists penalty is applied)
        // Mint units
        if (from == address(0) && world().worldAssets(WorldAssetStorageAccessor.epochNumber(), to) == ARMY_ASSET_TYPE) {
            IZone zone = IArmy(to).currentSettlement().currentZone();

            if (address(zone.cultistsSettlement().army()) == to) {
                zone.updateState();
            }
        }

        // Burn units
        if (to == address(0) && world().worldAssets(WorldAssetStorageAccessor.epochNumber(), from) == ARMY_ASSET_TYPE) {
            IZone zone = IArmy(from).currentSettlement().currentZone();

            if (address(zone.cultistsSettlement().army()) == from) {
                zone.updateState();
            }
        }
    }

    /// @dev ERC20 _afterTokenTransfer hook
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        bytes32 ARMY_ASSET_TYPE = keccak256(bytes("army"));
        // Minting
        if (from == address(0) && world().worldAssets(WorldAssetStorageAccessor.epochNumber(), to) == ARMY_ASSET_TYPE && isCultistsArmy(to)) {
            IArmy(to).currentSettlement().currentZone().handleCultistsSummoned(to, amount);
        }

        // Burning
        if (world().worldAssets(WorldAssetStorageAccessor.epochNumber(), from) == ARMY_ASSET_TYPE && to == address(0) && isCultistsArmy(from)) {
            IArmy(from).currentSettlement().currentZone().handleCultistsDefeated(to, amount);
        }
    }

    /// @dev Checks if provided army address belongs to cultists settlement or not
    function isCultistsArmy(address armyAddress) internal view returns (bool) {
        address armiesSettlementAddress = address(IArmy(armyAddress).currentSettlement());
        return keccak256(bytes(IWorldAssetStorageAccessor(armiesSettlementAddress).assetType())) == keccak256(bytes("CULTISTS"));
    }

    /// @dev Checks if provided address is world or world asset
    function isWorldAsset(address addressToCheck) internal view returns (bool) {
        return addressToCheck == address(world()) || world().worldAssets(WorldAssetStorageAccessor.epochNumber(), addressToCheck) != bytes32(0);
    }

    /// @inheritdoc IUnits
    function mint(address to, uint256 amount) public override onlyWorldAssetFromSameEpoch {
        _mint(to, amount);
    }

    /// @inheritdoc IERC20Burnable
    function burn(uint256 amount) public override(ERC20Burnable, IERC20Burnable) {
        ERC20Burnable.burn(amount);
    }

    /// @inheritdoc IERC20Burnable
    function burnFrom(address account, uint256 amount) public override(ERC20Burnable, IERC20Burnable) {
        if (isWorldAsset(msg.sender)) {
            _burn(account, amount);
        } else {
            ERC20Burnable.burnFrom(account, amount);
        }
    }

    /// @notice Transfer is disabled
    /// @inheritdoc IERC20
    function transfer(address to, uint256 amount) public override(ERC20, IERC20) returns (bool success) {
        revert("function disabled");
    }

    /// @notice Transfer from is disabled
    /// @inheritdoc IERC20
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override(ERC20, IERC20) returns (bool success) {
        if (isWorldAsset(msg.sender)) {
            _transfer(from, to, amount);
            return true;
        } else {
            revert("function disabled");
        }
    }
}
