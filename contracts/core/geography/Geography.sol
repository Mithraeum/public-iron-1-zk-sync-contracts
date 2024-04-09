// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IGeography.sol";
import "../WorldInitializable.sol";

contract Geography is IGeography, WorldInitializable {
    /// @notice Mapping containing packed zone ids by specified slot number
    /// @dev Each returned element is is packed zoneIds (16 per slot). Values are accessible via #getZoneIdByPosition
    mapping(uint32 => uint256) private packedZoneIds;

    /// @notice Mapping containing packed tile bonuses by specified slot number
    /// @dev Each returned element is is packed TileBonuses (16 per slot). Values are accessible via #getTileBonusByPosition
    mapping(uint32 => uint256) private packedTileBonuses;

    /// @notice Mapping containing zones activation params
    /// @dev Values are accessible via #getZoneActivationParams
    mapping(uint16 => ZoneActivationParams) private zonesActivationParams;

    /// @notice Amount of created zones
    /// @dev Value is accessible via #getZonesCount
    uint16 private zonesCount;

    /// @dev Allows caller to be only mighty creator
    modifier onlyMightyCreator() {
        require(msg.sender == world.registry().mightyCreator(), "onlyMightyCreator");
        _;
    }

    /// @inheritdoc IGeography
    function init(address worldAddress) public override initializer {
        setWorld(worldAddress);
    }

    /// @inheritdoc IGeography
    function getZonesCount() public view override returns (uint256) {
        return zonesCount;
    }

    /// @inheritdoc IGeography
    function createZone(
        uint32[] memory positions,
        uint256 cultistsCoordinateIndex,
        TileBonus[] memory zoneTileBonuses
    ) public override onlyMightyCreator {
        require(getZonesCount() != type(uint16).max, "exceeded zones limit");

        uint16 newZoneId = uint16(zonesCount + 1);
        for (uint256 i = 0; i < positions.length; i++) {
            uint32 position = positions[i];
            require(!isPositionExist(position), "zone intersects with current world");
            setZoneIdForPosition(position, newZoneId);

            if (zoneTileBonuses[i].tileBonusType != TileBonusType.NO_BONUS) {
                setTileBonusForPosition(position, zoneTileBonuses[i]);
            }
        }

        uint32 cultistsPosition = positions[cultistsCoordinateIndex];
        zonesActivationParams[newZoneId] = ZoneActivationParams({cultistsPosition: cultistsPosition});
        zonesCount++;
        emit NewZoneCreated(newZoneId, positions, cultistsPosition, zoneTileBonuses);
    }

    /// @inheritdoc IGeography
    function isPathValid(uint32[] memory path) public view override returns (bool) {
        if (path.length == 0) {
            return false;
        }

        for (uint256 i = 1; i < path.length; i++) {
            if (!isNeighborTo(path[i], path[i - 1])) {
                return false;
            }
        }

        return true;
    }

    /// @inheritdoc IGeography
    function isNeighborTo(uint32 position, uint32 neighbor) public pure override returns (bool) {
        if (position == neighbor) {
            return false;
        }

        (uint16 positionX, uint16 positionY) = getCoordinates(position);
        (uint16 neighborX, uint16 neighborY) = getCoordinates(neighbor);
        bool isCloseByY = ((positionY > neighborY && positionY - neighborY == 1) ||
        (neighborY > positionY && neighborY - positionY == 1));
        if (positionX == neighborX && isCloseByY) {
            return true;
        }

        bool isCloseByX = ((positionX > neighborX && positionX - neighborX == 1) ||
        (neighborX > positionX && neighborX - positionX == 1));
        if (positionY == neighborY && isCloseByX) {
            return true;
        }

        bool isEvenCell = positionX % 2 == 0;
        if (isEvenCell && positionY > neighborY && positionY - neighborY == 1 && isCloseByX) {
            return true;
        }

        if (!isEvenCell && neighborY > positionY && neighborY - positionY == 1 && isCloseByX) {
            return true;
        }

        return false;
    }

    /// @inheritdoc IGeography
    function getZoneIdByPosition(uint32 position) public view override returns (uint16) {
        uint32 slotNumber = position >> 4;
        uint32 itemNumber = position % 16;
        uint256 packedZoneIdsSlot = packedZoneIds[slotNumber];
        return uint16(packedZoneIdsSlot >> ((15 - itemNumber) << 4));
    }

    /// @inheritdoc IGeography
    function getZoneActivationParams(uint16 zoneId) public view override returns (ZoneActivationParams memory) {
        return zonesActivationParams[zoneId];
    }

    /// @inheritdoc IGeography
    function getTileBonusByPosition(uint32 position) public view override returns (TileBonus memory) {
        uint32 slotNumber = position >> 4;
        uint32 itemNumber = position % 16;
        uint256 packedTileBonusesSlot = packedTileBonuses[slotNumber];
        uint16 packedTileBonus = uint16(packedTileBonusesSlot >> ((15 - itemNumber) << 4));
        return getUnpackedTileBonus(packedTileBonus);
    }

    /// @inheritdoc IGeography
    function getRingPositions(uint32 position, uint256 radius) public pure override returns (uint32[] memory, uint256) {
        uint32[] memory ringPositions = new uint32[](radius * 6);

        (uint16 _x, uint16 _y) = getCoordinates(position);
        int128 movingX = int128(uint128(_x));
        int128 movingY = int128(uint128(_y));

        for (uint256 i = 0; i < radius; i++) {
            (movingX, movingY) = getNeighborCoordinates(movingX, movingY, 4);
        }

        uint256 _index = 0;
        for (uint256 i = 0; i < 6; i++) {
            for (uint256 j = 0; j < radius; j++) {
                if (isValidCoordinates(movingX, movingY)) {
                    ringPositions[_index] = getPosition(uint16(int16(movingX)), uint16(int16(movingY)));
                    _index++;
                }

                (movingX, movingY) = getNeighborCoordinates(movingX, movingY, i);
            }
        }

        return (ringPositions, _index);
    }

    /// @inheritdoc IGeography
    function getDistanceBetweenPositions(uint32 position1, uint32 position2) public pure override returns (uint32) {
        (uint16 position1Q, uint16 position1R) = getAxialCoordinates(position1);
        (uint16 position2Q, uint16 position2R) = getAxialCoordinates(position2);

    //    return (abs(1.q - 2.q)
    //    + abs((1.q + 1.r) - (2.q + 2.r))
    //    + abs(1.r - 2.r)) / 2

        uint32 _abs1QMinus2Q = position1Q >= position2Q ? position1Q - position2Q : position2Q - position1Q;
        uint32 _abs1RMinus2R = position1R >= position2R ? position1R - position2R : position2R - position1R;

        uint32 _1 = position1Q + position1R;
        uint32 _2 = position2Q + position2R;

        uint32 _abs1Minus2 = _1 >= _2 ? _1 - _2 : _2 - _1;

        return (_abs1QMinus2Q + _abs1Minus2 + _abs1RMinus2R) / 2;
    }

    /// @dev Converts position into axial coordinates
    function getAxialCoordinates(uint32 position) internal pure returns (uint16, uint16) {
        (uint16 positionX, uint16 positionY) = getCoordinates(position);
        return (positionX, positionY - (positionX - (positionX & 1)) / 2);
    }

    /// @dev Checks if provided x, y is valid
    function isValidCoordinates(int128 x, int128 y) internal pure returns (bool) {
        return x >= 0 && x < 65536 && y >= 0 && y < 65536;
    }

    /// @dev Calculates neighbor position of position according to provided direction
    function getNeighborCoordinates(int128 x, int128 y, uint256 direction) internal pure returns (int128 neighborX, int128 neighborY) {
        bool isEven = (x & 1) == 0;

        if (direction == 0) {
            return (x, y - 1);
        }

        if (direction == 1) {
            if (isEven) {
                return (x + 1, y - 1);
            } else {
                return (x + 1, y);
            }
        }

        if (direction == 2) {
            if (isEven) {
                return (x + 1, y);
            } else {
                return (x + 1, y + 1);
            }
        }

        if (direction == 3) {
            return (x, y + 1);
        }

        if (direction == 4) {
            if (isEven) {
                return (x - 1, y);
            } else {
                return (x - 1, y + 1);
            }
        }

        if (direction == 5) {
            if (isEven) {
                return (x - 1, y - 1);
            } else {
                return (x - 1, y);
            }
        }

        revert("invalid state");
    }

    /// @dev Checks if provided position exists
    function isPositionExist(uint32 position) internal view returns (bool) {
        return getZoneIdByPosition(position) != 0;
    }

    /// @dev Sets zone id by provided position
    function setZoneIdForPosition(uint32 position, uint16 zoneId) internal {
        uint32 slotNumber = position >> 4;
        uint32 itemNumber = position % 16;
        uint256 packedZoneIdsSlot = packedZoneIds[slotNumber];

        uint256 offset = (15 - itemNumber) << 4;
        packedZoneIds[slotNumber] =
            (packedZoneIdsSlot & ~(uint256(type(uint16).max) << offset)) |
            (uint256(zoneId) << offset);
    }

    /// @dev Sets tile bonus by provided position
    function setTileBonusForPosition(uint32 position, TileBonus memory tileBonus) internal {
        uint32 slotNumber = position >> 4;
        uint32 itemNumber = position % 16;
        uint256 packedTileBonusesSlot = packedTileBonuses[slotNumber];

        uint16 packedTileBonus = getPackedTileBonus(tileBonus);

        uint256 offset = (15 - itemNumber) << 4;
        packedTileBonuses[slotNumber] =
            (packedTileBonusesSlot & ~(uint256(type(uint16).max) << offset)) |
            (uint256(packedTileBonus) << offset);
    }

    /// @dev Calculates position by coordinates
    function getPosition(uint16 x, uint16 y) internal pure returns (uint32) {
        return (uint32(y) << 16) + uint32(x);
    }

    /// @dev Calculates coordinates by position
    function getCoordinates(uint32 position) internal pure returns (uint16, uint16) {
        uint16 y = uint16(position >> 16);
        uint16 x = uint16(position);
        return (x, y);
    }

    /// @dev Packs tileBonus struct into 16 bit value
    function getPackedTileBonus(TileBonus memory tileBonus) internal pure returns (uint16) {
        return (uint16(tileBonus.tileBonusType) << 8) | uint16(tileBonus.tileBonusVariation);
    }

    /// @dev Unpacks tileBonus struct from 16 bit value
    function getUnpackedTileBonus(uint16 tileBonus) internal pure returns (TileBonus memory) {
        uint8 tileBonusType = uint8(tileBonus >> 8);
        uint8 tileBonusVariation = uint8(tileBonus);
        return TileBonus(TileBonusType(tileBonusType), tileBonusVariation);
    }
}
