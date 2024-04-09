import { WithEnoughResources } from "../../../fixtures/WithEnoughResources";
import { WorkersCoreTest } from "../../../core/WorkersCoreTest";
import { BuildingType } from "../../../enums/buildingType";

describe("Farm Withdraw Test", async function () {
    before(async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
    });

    it(`testUser1 can withdraw workers from Farm Lvl 2. /investedWorkers, availableWorkers/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.workersWithdrawTest(2, BuildingType.FARM);
    });

    it(`testUser1 can withdraw workers from Farm Lvl 5. /investedWorkers, availableWorkers/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.workersWithdrawTest(5, BuildingType.FARM);
    });

    it(`testUser1 can not withdraw workers more than invested into Farm Lvl 2`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.impossibleWorkersWithdrawMoreThanInvestedTest(2, BuildingType.FARM);
    });

    it(`testUser1 can not withdraw workers more than invested into Farm Lvl 5`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.impossibleWorkersWithdrawMoreThanInvestedTest(5, BuildingType.FARM);
    });
});
