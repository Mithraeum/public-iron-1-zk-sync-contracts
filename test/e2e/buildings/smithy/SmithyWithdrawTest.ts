import { WithEnoughResources } from "../../../fixtures/WithEnoughResources";
import { WorkersCoreTest } from "../../../core/WorkersCoreTest";
import { ResourceCoreTest } from "../../../core/ResourceCoreTest";
import { BuildingType } from "../../../enums/buildingType";

describe("Smithy Withdraw Test", async function () {
    before(async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
    });

    it(`testUser1 can withdraw workers from Smithy Lvl 2. /investedWorkers, availableWorkers/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.workersWithdrawTest(2, BuildingType.SMITHY);
    });

    it(`testUser1 can withdraw workers from Smithy Lvl 5. /investedWorkers, availableWorkers/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.workersWithdrawTest(5, BuildingType.SMITHY);
    });

    it(`testUser1 can not withdraw workers more than invested into Smithy Lvl 2`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.impossibleWorkersWithdrawMoreThanInvestedTest(2, BuildingType.SMITHY);
    });

    it(`testUser1 can not withdraw workers more than invested into Smithy Lvl 5`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await WorkersCoreTest.impossibleWorkersWithdrawMoreThanInvestedTest(5, BuildingType.SMITHY);
    });

    it(`testUser1 can withdraw resources from Smithy. /userResources, userBuildingResources, zoneToxicity/`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.resourceWithdrawTest(BuildingType.SMITHY)
    });

    it(`testUser1 can not withdraw resources more than invested into Smithy`, async function () {
        this.timeout(1_000_000);
        await WithEnoughResources();
        await ResourceCoreTest.impossibleResourceWithdrawMoreThanInvestedTest(BuildingType.SMITHY);
    });
});
