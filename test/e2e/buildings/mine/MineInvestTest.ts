import { WithEnoughResources } from "../../../fixtures/WithEnoughResources";
import { WorkersCoreTest } from "../../../core/WorkersCoreTest";
import { ResourceCoreTest } from "../../../core/ResourceCoreTest";
import { BuildingType } from "../../../enums/buildingType";

describe("Mine Invest Test", async function () {
    before(async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
    });

    it(`testUser1 can invest workers into Mine Lvl 2. /investedWorkers, availableWorkers/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.workersInvestTest(2, BuildingType.MINE);
    });

    it(`testUser1 can invest workers into Mine Lvl 5. /investedWorkers, availableWorkers/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.workersInvestTest(5, BuildingType.MINE);
    });

    it(`testUser1 can not invest more workers than max cap of Mine Lvl 2`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.impossibleWorkersInvestMoreThanMaxCapTest(2, BuildingType.MINE);
    });

    it(`testUser1 can not invest more workers than max cap of Mine Lvl 5`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.impossibleWorkersInvestMoreThanMaxCapTest(5, BuildingType.MINE);
    });

    it(`testUser1 can invest resources into Mine. /userResources, userBuildingResources, zoneToxicity/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.resourceInvestTest(BuildingType.MINE);
    });

    it(`testUser1 can not invest more resources than available into Mine`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.impossibleResourceInvestMoreThanAvailableTest(BuildingType.MINE);
    });

    it(`testUser1 can not invest not acceptable resources into Mine`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.notAcceptableResourceInvestTest(BuildingType.MINE);
    });

    it(`testUser1 can invest resources from another user into Mine. /userResources, userBuildingResources, zoneToxicity/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.resourceInvestFromAnotherUserTest(BuildingType.MINE);
    });

    it(`testUser1 can not invest resources from another user into Mine without approve`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.impossibleResourceInvestFromAnotherUserWithoutApproveTest(BuildingType.MINE);
    });
});
