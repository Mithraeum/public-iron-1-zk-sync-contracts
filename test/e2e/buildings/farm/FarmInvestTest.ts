import { WithEnoughResources } from "../../../fixtures/WithEnoughResources";
import { WorkersCoreTest } from "../../../core/WorkersCoreTest";
import { BuildingType } from "../../../enums/buildingType";

describe("Farm Invest Test", async function () {
  before(async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
  });

  it(`testUser1 can invest workers into Farm Lvl 2. /investedWorkers, availableWorkers/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await WorkersCoreTest.workersInvestTest(2, BuildingType.FARM);
  });

  it(`testUser1 can invest workers into Farm Lvl 5. /investedWorkers, availableWorkers/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await WorkersCoreTest.workersInvestTest(5, BuildingType.FARM);
  });

  it(`testUser1 can not invest more workers than max cap of Farm Lvl 2`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await WorkersCoreTest.impossibleWorkersInvestMoreThanMaxCapTest(2, BuildingType.FARM);
  });

  it(`testUser1 can not invest more workers than max cap of Farm Lvl 5`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await WorkersCoreTest.impossibleWorkersInvestMoreThanMaxCapTest(5, BuildingType.FARM);
  });
});
