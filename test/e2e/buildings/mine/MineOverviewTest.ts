import { WithEnoughResources } from "../../../fixtures/WithEnoughResources";
import { BuildingUpgradeCoreTest } from "../../../core/BuildingUpgradeCoreTest";
import { BuildingType } from "../../../enums/buildingType";
import { WithSettlements } from "../../../fixtures/WithSettlements";

describe("Mine Overview Test", async function () {
    it(`testUser1 can basic upgrade Mine Lvl 2. /woodQuantity, basicProductionLevel, buildingLevel, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingBasicUpgradeTest(2, BuildingType.MINE);
    });

    it(`testUser1 can basic upgrade Mine Lvl 10. /woodQuantity, basicProductionLevel, buildingLevel, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingBasicUpgradeTest(10, BuildingType.MINE);
    });

    it(`testUser1 can advanced upgrade Mine Lvl 2. /oreQuantity, advancedProductionLevel, buildingLevel, workersCap, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingAdvancedUpgradeTest(2, BuildingType.MINE);
    });

    it(`testUser1 can advanced upgrade Mine Lvl 10. /oreQuantity, advancedProductionLevel, buildingLevel, workersCap, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingAdvancedUpgradeTest(10, BuildingType.MINE);
    });

    it(`testUser1 can not basic upgrade Mine without resources`, async function () {
        this.timeout(1_000_000);
        await WithSettlements();
        await BuildingUpgradeCoreTest.impossibleBuildingBasicUpgradeWithoutResourcesTest(BuildingType.MINE);
    });

    it(`testUser1 can not advanced upgrade Mine without resources`, async function () {
        this.timeout(1_000_000);
        await WithSettlements();
        await BuildingUpgradeCoreTest.impossibleBuildingAdvancedUpgradeWithoutResourcesTest(BuildingType.MINE);
    });

    it(`testUser1 can not upgrade Mine during cooldown`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.impossibleBuildingUpgradeDuringCooldownTest(BuildingType.MINE);
    });

    it(`testUser1 can basic upgrade Mine by another user resources. /woodQuantity, basicProductionLevel, buildingLevel, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingBasicUpgradeByAnotherUserResourcesTest(BuildingType.MINE);
    });

    it(`testUser1 can advanced upgrade Mine by another user resources. /oreQuantity, advancedProductionLevel, buildingLevel, workersCap, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingAdvancedUpgradeByAnotherUserResourcesTest(BuildingType.MINE);
    });

    it(`testUser1 can not basic upgrade Mine by another user resources without approve`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.impossibleBuildingBasicUpgradeByAnotherUserResourcesWithoutApproveTest(BuildingType.MINE);
    });

    it(`testUser1 can not advanced upgrade Mine by another user resources without approve`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.impossibleBuildingAdvancedUpgradeByAnotherUserResourcesWithoutApproveTest(BuildingType.MINE);
    });
});
