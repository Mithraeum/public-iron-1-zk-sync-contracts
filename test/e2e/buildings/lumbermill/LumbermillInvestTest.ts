import { WithEnoughResources } from "../../../fixtures/WithEnoughResources";
import { WorkersCoreTest } from "../../../core/WorkersCoreTest";
import { ResourceCoreTest } from "../../../core/ResourceCoreTest";
import { BuildingType } from "../../../enums/buildingType";

describe("Lumbermill Invest Test", async function () {
    before(async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
    });

    it(`testUser1 can invest workers into Lumbermill Lvl 2. /investedWorkers, availableWorkers/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.workersInvestTest(2, BuildingType.LUMBERMILL);
    });

    it(`testUser1 can invest workers into Lumbermill Lvl 5. /investedWorkers, availableWorkers/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.workersInvestTest(5, BuildingType.LUMBERMILL);
    });

    it(`testUser1 can not invest more workers than max cap of Lumbermill Lvl 2`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.impossibleWorkersInvestMoreThanMaxCapTest(2, BuildingType.LUMBERMILL);
    });

    it(`testUser1 can not invest more workers than max cap of Lumbermill Lvl 5`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.impossibleWorkersInvestMoreThanMaxCapTest(5, BuildingType.LUMBERMILL);
    });

    it(`testUser1 can invest resources into Lumbermill. /userResources, userBuildingResources, zoneToxicity/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.resourceInvestTest(BuildingType.LUMBERMILL);
    });

    it(`testUser1 can not invest more resources than available into Lumbermill`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.impossibleResourceInvestMoreThanAvailableTest(BuildingType.LUMBERMILL);
    });

    it(`testUser1 can not invest not acceptable resources into Lumbermill`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.notAcceptableResourceInvestTest(BuildingType.LUMBERMILL);
    });

    it(`testUser1 can invest resources from another user into Lumbermill. /userResources, userBuildingResources, zoneToxicity/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.resourceInvestFromAnotherUserTest(BuildingType.LUMBERMILL);
    });

    it(`testUser1 can not invest resources from another user into Lumbermill without approve`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.impossibleResourceInvestFromAnotherUserWithoutApproveTest(BuildingType.LUMBERMILL);
    });
});
