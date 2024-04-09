import { WipeCoreTest } from "../../core/WipeCoreTest";
import { WithEnoughResourcesInDifferentZones } from "../../fixtures/WithEnoughResourcesInDifferentZones";

describe("Wipe Test", async function () {
  before(async function () {
    this.timeout(1_000_000);
    await WithEnoughResourcesInDifferentZones();
  });

  it(`testUser1 can destroy current epoch if summoned cultists amount reached max cap. /totalSummonedCultists, userResources, epochNumber, exchangeRatio/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResourcesInDifferentZones();
    await WipeCoreTest.worldWipeDueCultistsMaxCapTest();
  });

  it(`testUser1 can not destroy current epoch if summoned cultists amount not reached max cap`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResourcesInDifferentZones();
    await WipeCoreTest.impossibleWorldWipeDueCultistsMaxCapTest();
  });

  it(`testUser1 can not destroy current epoch during destruction delay`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResourcesInDifferentZones();
    await WipeCoreTest.impossibleWorldWipeDuringDestructionDelayTest();
  });

  it(`after wipe testUser1 can restore own settlement and activate zone where settlement was placed before wipe. /totalSummonedCultists, epochNumber, settlementEpochNumber/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResourcesInDifferentZones();
    await WipeCoreTest.settlementRestoreWithZoneActivationAfterWipeTest();
  });
});
