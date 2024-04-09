import { WithEnoughResources } from "../../../fixtures/WithEnoughResources";
import { BuildingType } from "../../../enums/buildingType";
import { ProductionCoreTest } from "../../../core/ProductionCoreTest";

describe("Lumbermill Production Test", async function () {
  before(async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
  });

  it(`testUser1 can produce resources by Lumbermill Lvl 2. /basicProducedRes, advancedProducedRes, totalProducedRes/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ProductionCoreTest.productionTest(2, 2, BuildingType.LUMBERMILL);
  });

  it(`testUser1 can produce resources by Lumbermill Lvl 5. /basicProducedRes, advancedProducedRes, totalProducedRes/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ProductionCoreTest.productionTest(2, 5, BuildingType.LUMBERMILL);
  });

  it(`testUser1 can harvest resources produced by 1 worker from Lumbermill. /prosperityBalance, treasuryBalance, userResources/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ProductionCoreTest.harvestTest(1, BuildingType.LUMBERMILL);
  });

  it(`testUser1 can harvest resources produced by 2 workers from Lumbermill. /prosperityBalance, treasuryBalance, userResources/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ProductionCoreTest.harvestTest(2, BuildingType.LUMBERMILL);
  });

  it(`testUser1's Lumbermill Lvl 2 production slowed by production penalty. /productionSlowdownPercentage, userResources, userBuildingResources/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ProductionCoreTest.productionPenaltyTest(2, BuildingType.LUMBERMILL);
  });

  it(`testUser1's Lumbermill Lvl 5 production slowed by production penalty. /productionSlowdownPercentage, userResources, userBuildingResources/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ProductionCoreTest.productionPenaltyTest(5, BuildingType.LUMBERMILL);
  });

  it(`testUser1 can withdraw resources during production by Lumbermill. /userBuildingSpendingResources, produceTimeLeft/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ProductionCoreTest.resourceWithdrawDuringProductionTest(BuildingType.LUMBERMILL);
  });
});
