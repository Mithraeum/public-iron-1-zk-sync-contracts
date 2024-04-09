import { WithEnoughResources } from "../../../fixtures/WithEnoughResources";
import { WorkersCoreTest } from "../../../core/WorkersCoreTest";
import { ResourceCoreTest } from "../../../core/ResourceCoreTest";
import { BuildingType } from "../../../enums/buildingType";

describe("Mine Withdraw Test", async function () {
    before(async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
    });

    it(`testUser1 can withdraw workers from Mine Lvl 2. /investedWorkers, availableWorkers/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.workersWithdrawTest(2, BuildingType.MINE);
    });

    it(`testUser1 can withdraw workers from Mine Lvl 5. /investedWorkers, availableWorkers/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.workersWithdrawTest(5, BuildingType.MINE);
    });

    it(`testUser1 can not withdraw workers more than invested into Mine Lvl 2`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.impossibleWorkersWithdrawMoreThanInvestedTest(2, BuildingType.MINE);
    });

    it(`testUser1 can not withdraw workers more than invested into Mine Lvl 5`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.impossibleWorkersWithdrawMoreThanInvestedTest(5, BuildingType.MINE);
    });

    it(`testUser1 can withdraw resources from Mine. /userResources, userBuildingResources, zoneToxicity/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.resourceWithdrawTest(BuildingType.MINE)
    });

    it(`testUser1 can not withdraw resources more than invested into Mine`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.impossibleResourceWithdrawMoreThanInvestedTest(BuildingType.MINE);
    });
});
