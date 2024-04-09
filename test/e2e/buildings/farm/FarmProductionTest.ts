import { WithEnoughResources } from "../../../fixtures/WithEnoughResources";
import { BuildingType } from "../../../enums/buildingType";
import { ProductionCoreTest } from "../../../core/ProductionCoreTest";

describe("Farm Production Test", async function () {
  before(async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
  });

  it(`testUser1 can produce resources by Farm Lvl 2. /basicProducedRes, totalProducedRes/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ProductionCoreTest.productionTest(2, 2, BuildingType.FARM);
  });

  it(`testUser1 can produce resources by Farm Lvl 5. /basicProducedRes, totalProducedRes/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ProductionCoreTest.productionTest(2, 5, BuildingType.FARM);
  });

  it(`testUser1 can harvest resources produced by 1 worker from Farm. /prosperityBalance, treasuryBalance, userResources/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ProductionCoreTest.harvestTest(1, BuildingType.FARM);
  });

  it(`testUser1 can harvest resources produced by 2 workers from Farm. /prosperityBalance, treasuryBalance, userResources/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ProductionCoreTest.harvestTest(2, BuildingType.FARM);
  });

  it(`testUser1's Farm Lvl 2 production slowed by production penalty. /productionSlowdownPercentage, userResources, userBuildingResources/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ProductionCoreTest.productionPenaltyTest(2, BuildingType.FARM);
  });

  it(`testUser1's Farm Lvl 5 production slowed by production penalty. /productionSlowdownPercentage, userResources, userBuildingResources/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await ProductionCoreTest.productionPenaltyTest(5, BuildingType.FARM);
  });
});
