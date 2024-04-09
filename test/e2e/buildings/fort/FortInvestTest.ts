import { WithEnoughResources } from "../../../fixtures/WithEnoughResources";
import { WorkersCoreTest } from "../../../core/WorkersCoreTest";
import { BuildingType } from "../../../enums/buildingType";
import { ResourceCoreTest } from "../../../core/ResourceCoreTest";

describe("Fort Invest Test", async function () {
  before(async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
  });

  it(`testUser1 can invest workers into Fort Lvl 2. /investedWorkers, availableWorkers/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await WorkersCoreTest.workersInvestTest(2, BuildingType.FORT);
  });

  it(`testUser1 can invest workers into Fort Lvl 5. /investedWorkers, availableWorkers/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await WorkersCoreTest.workersInvestTest(5, BuildingType.FORT);
  });

  it(`testUser1 can not invest more workers than max cap of Fort Lvl 2`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await WorkersCoreTest.impossibleWorkersInvestMoreThanMaxCapTest(2, BuildingType.FORT);
  });

  it(`testUser1 can not invest more workers than max cap of Fort Lvl 5`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await WorkersCoreTest.impossibleWorkersInvestMoreThanMaxCapTest(5, BuildingType.FORT);
  });

  it(`testUser1 can invest resources into Fort. /userResources, userBuildingResources, zoneToxicity/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ResourceCoreTest.resourceInvestTest(BuildingType.FORT);
  });

  it(`testUser1 can not invest not acceptable resources into Fort`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ResourceCoreTest.notAcceptableResourceInvestTest(BuildingType.FORT);
  });

  it(`testUser1 can not invest more resources than available into Fort`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ResourceCoreTest.impossibleResourceInvestMoreThanAvailableTest(BuildingType.FORT);
  });
});
