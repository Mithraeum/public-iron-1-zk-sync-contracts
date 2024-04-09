import { WithEnoughResources } from "../../../fixtures/WithEnoughResources";
import { BuildingUpgradeCoreTest } from "../../../core/BuildingUpgradeCoreTest";
import { BuildingType } from "../../../enums/buildingType";
import { WithSettlements } from "../../../fixtures/WithSettlements";

describe("Fort Overview Test", async function () {
  it(`testUser1 can basic upgrade Fort Lvl 2. /woodQuantity, basicProductionLevel, buildingLevel, maxHealth/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.fortBasicUpgradeTest(2);
  });

  it(`testUser1 can basic upgrade Fort Lvl 10. /woodQuantity, basicProductionLevel, buildingLevel, maxHealth/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.fortBasicUpgradeTest(10);
  });

  it(`testUser1 can advanced upgrade Fort Lvl 2. /oreQuantity, advancedProductionLevel, buildingLevel, workersCap, maxHealth/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.fortAdvancedUpgradeTest(2);
  });

  it(`testUser1 can advanced upgrade Fort Lvl 10. /oreQuantity, advancedProductionLevel, buildingLevel, workersCap, maxHealth/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.fortAdvancedUpgradeTest(10);
  });

  it(`testUser1 can not basic upgrade Fort without resources`, async function () {
    this.timeout(1_000_000);
    await WithSettlements();
    await BuildingUpgradeCoreTest.impossibleBuildingBasicUpgradeWithoutResourcesTest(BuildingType.FORT);
  });

  it(`testUser1 can not advanced upgrade Fort without resources`, async function () {
    this.timeout(1_000_000);
    await WithSettlements();
    await BuildingUpgradeCoreTest.impossibleBuildingAdvancedUpgradeWithoutResourcesTest(BuildingType.FORT);
  });

  it(`testUser1 can not upgrade Fort during cooldown`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.impossibleBuildingUpgradeDuringCooldownTest(BuildingType.FORT);
  });

  it(`testUser1 can basic upgrade Fort by another user resources. /woodQuantity, basicProductionLevel, buildingLevel, maxHealth/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.fortBasicUpgradeByAnotherUserResourcesTest();
  });

  it(`testUser1 can advanced upgrade Fort by another user resources. /oreQuantity, advancedProductionLevel, buildingLevel, workersCap, maxHealth/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.fortAdvancedUpgradeByAnotherUserResourcesTest();
  });

  it(`testUser1 can not basic upgrade Fort by another user resources without approve`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.impossibleBuildingBasicUpgradeByAnotherUserResourcesWithoutApproveTest(BuildingType.FORT);
  });

  it(`testUser1 can not advanced upgrade Fort by another user resources without approve`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BuildingUpgradeCoreTest.impossibleBuildingAdvancedUpgradeByAnotherUserResourcesWithoutApproveTest(BuildingType.FORT);
  });
});
