import { deployments, getNamedAccounts } from "hardhat";
import { ensureSettlementCreated } from "./common/ensureSettlementCreated";

export const WithSettlements = deployments.createFixture(async () => {
    await deployments.fixture("ImmediatelyStartedGame");

    const worldAddress = (await deployments.get("WorldProxy")).address;

    const {worldDeployer, testUser1, testUser2, testUser3} = await getNamedAccounts();

    console.log("Settlements deployment started");

    await ensureSettlementCreated(worldDeployer, testUser1, worldAddress, "testUser1BannerName", 2, {
        x: 32757,
        y: 32757,
    });

    await ensureSettlementCreated(worldDeployer, testUser2, worldAddress, "testUser2BannerName", 2,{
        x: 32757,
        y: 32760,
    });

    await ensureSettlementCreated(worldDeployer, testUser3, worldAddress, "testUser3BannerName", 2,{
        x: 32754,
        y: 32760,
    });

    console.log("Settlements deployment finished");
});