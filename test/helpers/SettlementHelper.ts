import {
    Army,
    Army__factory, Banners__factory,
    Building,
    Building__factory,
    Farm,
    Farm__factory,
    Fort,
    Fort__factory,
    Lumbermill,
    Lumbermill__factory,
    Mine,
    Mine__factory,
    Settlement, SettlementsMarket__factory,
    Smithy,
    Smithy__factory, Zone
} from "../../typechain-types";
import { ethers } from "hardhat";
import { toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import { DEFAULT_BANNER_PARTS } from "../constants/banners";
import { BuildingType } from "../enums/buildingType";

export class SettlementHelper {
    public static async getBuilding(
        settlementInstance: Settlement,
        buildingName: string
    ): Promise<Building> {
        const buildingAddress = await settlementInstance.buildings(buildingName);
        return Building__factory.connect(buildingAddress, settlementInstance.signer);
    }

    public static async getFarm(
        settlementInstance: Settlement
    ): Promise<Farm> {
        const building = await SettlementHelper.getBuilding(settlementInstance, BuildingType.FARM)
        return Farm__factory.connect(building.address, settlementInstance.signer);
    }

    public static async getLumbermill(
        settlementInstance: Settlement
    ): Promise<Lumbermill> {
        const building = await SettlementHelper.getBuilding(settlementInstance, BuildingType.LUMBERMILL)
        return Lumbermill__factory.connect(building.address, settlementInstance.signer);
    }

    public static async getMine(
        settlementInstance: Settlement
    ): Promise<Mine> {
        const building = await SettlementHelper.getBuilding(settlementInstance, BuildingType.MINE)
        return Mine__factory.connect(building.address, settlementInstance.signer);
    }

    public static async getSmithy(
        settlementInstance: Settlement
    ): Promise<Smithy> {
        const building = await SettlementHelper.getBuilding(settlementInstance, BuildingType.SMITHY)
        return Smithy__factory.connect(building.address, settlementInstance.signer);
    }

    public static async getArmy(
        settlementInstance: Settlement
    ): Promise<Army> {
        const armyAddress = await settlementInstance.army();
        return Army__factory.connect(armyAddress, settlementInstance.signer);
    }

    public static async getFort(
      settlementInstance: Settlement
    ): Promise<Fort> {
        const building = await SettlementHelper.getBuilding(settlementInstance, BuildingType.FORT)
        return Fort__factory.connect(building.address, settlementInstance.signer);
    }

    public static async createSettlement(
      zoneInstance: Zone,
      position: number,
      bannerName: string,
      bannersAddress: string,
      tokenAddress: string
    ) {
        const settlementsMarketAddress = await zoneInstance.settlementsMarket();
        const settlementsMarketInstance = SettlementsMarket__factory.connect(settlementsMarketAddress, zoneInstance.signer);

        const bannersInstance = Banners__factory.connect(bannersAddress, zoneInstance.signer);
        await bannersInstance.mint(bannerName, DEFAULT_BANNER_PARTS, "0x").then((tx) => tx.wait());

        const userBanners = await bannersInstance.getBannerDataByUserBatch(zoneInstance.signer.getAddress());
        const lastBannerIndex = userBanners.tokenIds.length - 1;

        const settlementCost = toLowBN(await settlementsMarketInstance.getNewSettlementCost());
        await settlementsMarketInstance
          .buySettlement(
            position,
            userBanners.tokenIds[lastBannerIndex].toString(),
            ethers.constants.MaxUint256.toString(),
            tokenAddress === ethers.constants.AddressZero
              ? {value: transferableFromLowBN(settlementCost)}
              : {}
          )
          .then((tx) => tx.wait());
    }
}
