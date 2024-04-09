import { WithEnoughResources } from "../../../fixtures/WithEnoughResources";
import { BuildingUpgradeCoreTest } from "../../../core/BuildingUpgradeCoreTest";
import { BuildingType } from "../../../enums/buildingType";
import { WithSettlements } from "../../../fixtures/WithSettlements";

describe("Lumbermill Overview Test", async function () {
    it(`testUser1 can basic upgrade Lumbermill Lvl 2. /woodQuantity, basicProductionLevel, buildingLevel, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingBasicUpgradeTest(2, BuildingType.LUMBERMILL);
    });

    it(`testUser1 can basic upgrade Lumbermill Lvl 10. /woodQuantity, basicProductionLevel, buildingLevel, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingBasicUpgradeTest(10, BuildingType.LUMBERMILL);
    });

    it(`testUser1 can advanced upgrade Lumbermill Lvl 2. /oreQuantity, advancedProductionLevel, buildingLevel, workersCap, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingAdvancedUpgradeTest(2, BuildingType.LUMBERMILL);
    });

    it(`testUser1 can advanced upgrade Lumbermill Lvl 10. /oreQuantity, advancedProductionLevel, buildingLevel, workersCap, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingAdvancedUpgradeTest(10, BuildingType.LUMBERMILL);
    });

    it(`testUser1 can not basic upgrade Lumbermill without resources`, async function () {
        this.timeout(1_000_000);
        await WithSettlements();
        await BuildingUpgradeCoreTest.impossibleBuildingBasicUpgradeWithoutResourcesTest(BuildingType.LUMBERMILL);
    });

    it(`testUser1 can not advanced upgrade Lumbermill without resources`, async function () {
        this.timeout(1_000_000);
        await WithSettlements();
        await BuildingUpgradeCoreTest.impossibleBuildingAdvancedUpgradeWithoutResourcesTest(BuildingType.LUMBERMILL);
    });

    it(`testUser1 can not upgrade Lumbermill during cooldown`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.impossibleBuildingUpgradeDuringCooldownTest(BuildingType.LUMBERMILL);
    });

    it(`testUser1 can basic upgrade Lumbermill by another user resources. /woodQuantity, basicProductionLevel, buildingLevel, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingBasicUpgradeByAnotherUserResourcesTest(BuildingType.LUMBERMILL);
    });

    it(`testUser1 can advanced upgrade Lumbermill by another user resources. /oreQuantity, advancedProductionLevel, buildingLevel, workersCap, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingAdvancedUpgradeByAnotherUserResourcesTest(BuildingType.LUMBERMILL);
    });

    it(`testUser1 can not basic upgrade Lumbermill by another user resources without approve`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.impossibleBuildingBasicUpgradeByAnotherUserResourcesWithoutApproveTest(BuildingType.LUMBERMILL);
    });

    it(`testUser1 can not advanced upgrade Lumbermill by another user resources without approve`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.impossibleBuildingAdvancedUpgradeByAnotherUserResourcesWithoutApproveTest(BuildingType.LUMBERMILL);
    });
});
