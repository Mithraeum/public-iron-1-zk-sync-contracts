import { ethers } from "hardhat";
import {
  IERC20__factory
} from "../../typechain-types";
import { EvmUtils } from "./EvmUtils";
import { toLowBN } from "../../scripts/utils/const";

export class TokenUtils {
  public static async getTokenBalance(
    tokenAddress: string,
    userAddress: string
  ) {
    const signer = await ethers.getSigner(userAddress);

    if (tokenAddress === ethers.constants.AddressZero) {
      return EvmUtils.getBalance(userAddress);
    }

    const iErc20Instance = IERC20__factory.connect(tokenAddress, signer);
    return toLowBN(await iErc20Instance.balanceOf(userAddress));
  }
}

