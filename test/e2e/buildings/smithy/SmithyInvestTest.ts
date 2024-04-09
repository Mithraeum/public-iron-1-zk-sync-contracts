import { WithEnoughResources } from "../../../fixtures/WithEnoughResources";
import { WorkersCoreTest } from "../../../core/WorkersCoreTest";
import { ResourceCoreTest } from "../../../core/ResourceCoreTest";
import { BuildingType } from "../../../enums/buildingType";

describe("Smithy Invest Test", async function () {
    before(async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
    });

    it(`testUser1 can invest workers into Smithy Lvl 2. /investedWorkers, availableWorkers/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.workersInvestTest(2, BuildingType.SMITHY);
    });

    it(`testUser1 can invest workers into Smithy Lvl 5. /investedWorkers, availableWorkers/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.workersInvestTest(5, BuildingType.SMITHY);
    });

    it(`testUser1 can not invest more workers than max cap of Smithy Lvl 2`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.impossibleWorkersInvestMoreThanMaxCapTest(2, BuildingType.SMITHY);
    });

    it(`testUser1 can not invest more workers than max cap of Smithy Lvl 5`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.impossibleWorkersInvestMoreThanMaxCapTest(5, BuildingType.SMITHY);
    });

    it(`testUser1 can invest resources into Smithy. /userResources, userBuildingResources, zoneToxicity/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.resourceInvestTest(BuildingType.SMITHY);
    });

    it(`testUser1 can not invest more resources than available into Smithy`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.impossibleResourceInvestMoreThanAvailableTest(BuildingType.SMITHY);
    });

    it(`testUser1 can invest resources from another user into Smithy. /userResources, userBuildingResources, zoneToxicity/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.resourceInvestFromAnotherUserTest(BuildingType.SMITHY);
    });

    it(`testUser1 can not invest resources from another user into Smithy without approve`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.impossibleResourceInvestFromAnotherUserWithoutApproveTest(BuildingType.SMITHY);
    });
});
