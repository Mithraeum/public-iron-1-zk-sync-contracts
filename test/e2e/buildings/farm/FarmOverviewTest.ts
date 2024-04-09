import { WithEnoughResources } from "../../../fixtures/WithEnoughResources";
import { BuildingUpgradeCoreTest } from "../../../core/BuildingUpgradeCoreTest";
import { BuildingType } from "../../../enums/buildingType";
import { WithSettlements } from "../../../fixtures/WithSettlements";

describe("Farm Overview Test", async function () {
  it(`testUser1 can basic upgrade Farm Lvl 2. /woodQuantity, basicProductionLevel, buildingLevel, treasuryCap/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.buildingBasicUpgradeTest(2, BuildingType.FARM);
  });

  it(`testUser1 can basic upgrade Farm Lvl 10. /woodQuantity, basicProductionLevel, buildingLevel, treasuryCap/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.buildingBasicUpgradeTest(10, BuildingType.FARM);
  });

  it(`testUser1 can advanced upgrade Farm Lvl 2. /oreQuantity, advancedProductionLevel, buildingLevel, workersCap, treasuryCap/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.buildingAdvancedUpgradeTest(2, BuildingType.FARM);
  });

  it(`testUser1 can advanced upgrade Farm Lvl 10. /oreQuantity, advancedProductionLevel, buildingLevel, workersCap, treasuryCap/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.buildingAdvancedUpgradeTest(10, BuildingType.FARM);
  });

  it(`testUser1 can not basic upgrade Farm without resources`, async function () {
    this.timeout(1_000_000);
    await WithSettlements();
    await BuildingUpgradeCoreTest.impossibleBuildingBasicUpgradeWithoutResourcesTest(BuildingType.FARM);
  });

  it(`testUser1 can not advanced upgrade Farm without resources`, async function () {
    this.timeout(1_000_000);
    await WithSettlements();
    await BuildingUpgradeCoreTest.impossibleBuildingAdvancedUpgradeWithoutResourcesTest(BuildingType.FARM);
  });

  it(`testUser1 can not upgrade Farm during cooldown`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.impossibleBuildingUpgradeDuringCooldownTest(BuildingType.FARM);
  });

  it(`testUser1 can basic upgrade Farm by another user resources. /woodQuantity, basicProductionLevel, buildingLevel, treasuryCap/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.buildingBasicUpgradeByAnotherUserResourcesTest(BuildingType.FARM);
  });

  it(`testUser1 can advanced upgrade Farm by another user resources. /oreQuantity, advancedProductionLevel, buildingLevel, workersCap, treasuryCap/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.buildingAdvancedUpgradeByAnotherUserResourcesTest(BuildingType.FARM);
  });

  it(`testUser1 can not basic upgrade Farm by another user resources without approve`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.impossibleBuildingBasicUpgradeByAnotherUserResourcesWithoutApproveTest(BuildingType.FARM);
  });

  it(`testUser1 can not advanced upgrade Farm by another user resources without approve`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.impossibleBuildingAdvancedUpgradeByAnotherUserResourcesWithoutApproveTest(BuildingType.FARM);
  });
});
