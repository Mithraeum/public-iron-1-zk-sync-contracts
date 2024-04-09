import { deployments, getNamedAccounts } from "hardhat";
import { WithSettlementsInDifferentZones } from "./WithSettlementsInDifferentZones";
import { ensureEnoughResourcesSet } from "./common/ensureEnoughResourcesSet";

export const WithEnoughResourcesInDifferentZones = deployments.createFixture(
  async () => {
    await WithSettlementsInDifferentZones();

    const {testUser1, testUser2, testUser3 } = await getNamedAccounts();

    console.log(`Minting enough resources started`);
    await ensureEnoughResourcesSet(testUser1, 1);
    await ensureEnoughResourcesSet(testUser2, 1);
    await ensureEnoughResourcesSet(testUser2, 2);
    await ensureEnoughResourcesSet(testUser3, 1);
    console.log(`Minting enough resources finished`);
  }
);