import { WithEnoughResources } from "../../fixtures/WithEnoughResources";
import { WorkersCoreTest } from "../../core/WorkersCoreTest";
import { NotYetStartedGame } from "../../fixtures/NotYetStartedGame";
import { WithSettlements } from "../../fixtures/WithSettlements";

describe("Workers Pool Test", async function () {
  it(`testUser1 can hire 1 worker and price drop is correct. /workerPrice, prosperityBalance, workersQuantity/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await WorkersCoreTest.workersHireWithPriceDropTest(1);
  });

  it(`testUser1 can hire 2 workers and price drop is correct. /workerPrice, prosperityBalance, workersQuantity/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await WorkersCoreTest.workersHireWithPriceDropTest(2);
  });

  it(`testUser1 can not hire workers without prosperity`, async function () {
    this.timeout(1_000_000);
    await WithSettlements();
    await WorkersCoreTest.impossibleWorkersHireWithoutProsperityTest();
  });

  it(`workers cost does not change before game started. /workerPrice/`, async function () {
    this.timeout(1_000_000);
    await NotYetStartedGame();
    await WorkersCoreTest.workersCostBeforeGameStartedTest();
  });
});
