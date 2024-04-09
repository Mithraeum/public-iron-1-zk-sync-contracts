import { WithEnoughResources } from "../../../fixtures/WithEnoughResources";
import { BuildingUpgradeCoreTest } from "../../../core/BuildingUpgradeCoreTest";
import { BuildingType } from "../../../enums/buildingType";
import { WithSettlements } from "../../../fixtures/WithSettlements";

describe("Smithy Overview Test", async function () {
    it(`testUser1 can basic upgrade Smithy Lvl 2. /woodQuantity, basicProductionLevel, buildingLevel, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingBasicUpgradeTest(2, BuildingType.SMITHY);
    });

    it(`testUser1 can basic upgrade Smithy Lvl 10. /woodQuantity, basicProductionLevel, buildingLevel, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingBasicUpgradeTest(10, BuildingType.SMITHY);
    });

    it(`testUser1 can advanced upgrade Smithy Lvl 2. /oreQuantity, advancedProductionLevel, buildingLevel, workersCap, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingAdvancedUpgradeTest(2, BuildingType.SMITHY);
    });

    it(`testUser1 can advanced upgrade Smithy Lvl 10. /oreQuantity, advancedProductionLevel, buildingLevel, workersCap, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingAdvancedUpgradeTest(10, BuildingType.SMITHY);
    });

    it(`testUser1 can not basic upgrade Smithy without resources`, async function () {
        this.timeout(1_000_000);
        await WithSettlements();
        await BuildingUpgradeCoreTest.impossibleBuildingBasicUpgradeWithoutResourcesTest(BuildingType.SMITHY);
    });

    it(`testUser1 can not advanced upgrade Smithy without resources`, async function () {
        this.timeout(1_000_000);
        await WithSettlements();
        await BuildingUpgradeCoreTest.impossibleBuildingAdvancedUpgradeWithoutResourcesTest(BuildingType.SMITHY);
    });

    it(`testUser1 can not upgrade Smithy during cooldown`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.impossibleBuildingUpgradeDuringCooldownTest(BuildingType.SMITHY);
    });

    it(`testUser1 can basic upgrade Smithy by another user resources. /woodQuantity, basicProductionLevel, buildingLevel, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingBasicUpgradeByAnotherUserResourcesTest(BuildingType.SMITHY);
    });

    it(`testUser1 can advanced upgrade Smithy by another user resources. /oreQuantity, advancedProductionLevel, buildingLevel, workersCap, treasuryCap/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.buildingAdvancedUpgradeByAnotherUserResourcesTest(BuildingType.SMITHY);
    });

    it(`testUser1 can not basic upgrade Smithy by another user resources without approve`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.impossibleBuildingBasicUpgradeByAnotherUserResourcesWithoutApproveTest(BuildingType.SMITHY);
    });

    it(`testUser1 can not advanced upgrade Smithy by another user resources without approve`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await BuildingUpgradeCoreTest.impossibleBuildingAdvancedUpgradeByAnotherUserResourcesWithoutApproveTest(BuildingType.SMITHY);
    });
});
