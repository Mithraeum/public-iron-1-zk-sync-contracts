import {ethers} from "hardhat";
import {
    Epoch__factory,
    Banners__factory,
    Settlement,
    Settlement__factory
} from "../../typechain-types";
import { WorldHelper } from "./WorldHelper";

export class UserHelper {
    public static async getUserBanners(
        userAddress: string
    ) {
        const signer = await ethers.getSigner(userAddress);

        const worldInstance = await WorldHelper.getWorldInstance(userAddress);

        const bannersAddress = await worldInstance.bannerContract();
        const bannersInstance = Banners__factory.connect(bannersAddress, signer);

        return await bannersInstance.getBannerDataByUserBatch(userAddress);
    }

    public static async getUserSettlementsViaBanners(
        userAddress: string
    ) {
        const signer = await ethers.getSigner(userAddress);

        const worldInstance = await WorldHelper.getWorldInstance(userAddress);

        const userBanners = await UserHelper.getUserBanners(userAddress);

        const currentEpochNumber = await worldInstance.currentEpochNumber();
        const currentEpochAddress = await worldInstance.epochs(currentEpochNumber);
        const currentEpochInstance = Epoch__factory.connect(currentEpochAddress, signer);

        return await Promise.all(
            userBanners.tokenIds.map(async tokenId => {
                return await currentEpochInstance.userSettlements(tokenId.toString());
            })
        )
    }

    public static async getUserSettlementByNumber(
      userAddress: string,
      settlementNumber: number
    ): Promise<Settlement> {
        const signer = await ethers.getSigner(userAddress);

        const userSettlements = await UserHelper.getUserSettlementsViaBanners(userAddress);
        const userSettlement = userSettlements[settlementNumber - 1];

        return Settlement__factory.connect(
          userSettlement,
          signer,
        );
    }
}

