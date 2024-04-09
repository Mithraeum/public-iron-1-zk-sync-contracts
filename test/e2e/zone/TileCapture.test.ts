import { TileCaptureCoreTest } from "../../core/TileCaptureCoreTest";
import { BuildingType } from "../../enums/buildingType";
import { WithEnoughResources } from "../../fixtures/WithEnoughResources";
import { WithSettlementsInDifferentZones } from "../../fixtures/WithSettlementsInDifferentZones";
import { WithSettlements } from "../../fixtures/WithSettlements";

describe("Tile Capture Test", async function () {
  it(`testUser1 can capture tile with Farm bonus in zone number 1 and bonus workers amount is correct. /advancedProductionTileBonusType, prosperityBalance, investedWorkers, productionPerSecond/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await TileCaptureCoreTest.tileCaptureTest(BuildingType.FARM, 1);
  });

  it(`testUser1 can capture tile with Lumbermill bonus in zone number 2 and bonus workers amount is correct. /advancedProductionTileBonusType, prosperityBalance, investedWorkers, productionPerSecond/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await TileCaptureCoreTest.tileCaptureTest(BuildingType.LUMBERMILL, 2);
  });

  it(`testUser1 can capture tile with Mine bonus in zone number 3 and bonus workers amount is correct. /advancedProductionTileBonusType, prosperityBalance, investedWorkers, productionPerSecond/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await TileCaptureCoreTest.tileCaptureTest(BuildingType.MINE, 3);
  });

  it(`testUser1 can capture tile with Smithy bonus in zone number 4 and bonus workers amount is correct. /advancedProductionTileBonusType, prosperityBalance, investedWorkers, productionPerSecond/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await TileCaptureCoreTest.tileCaptureTest(BuildingType.SMITHY, 4);
  });

  it(`testUser1 can capture tile with Fort bonus in zone number 1 and bonus workers amount is correct. /advancedProductionTileBonusType, prosperityBalance, investedWorkers, productionPerSecond/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await TileCaptureCoreTest.fortTileCaptureTest(1);
  });

  it(`testUser1 can not capture tile without prosperity`, async function () {
    this.timeout(1_000_000);
    await WithSettlements();
    await TileCaptureCoreTest.impossibleTileCaptureWithoutProsperity();
  });

  it(`testUser1 can not capture tile by zero stake`, async function () {
    this.timeout(1_000_000);
    await WithSettlements();
    await TileCaptureCoreTest.impossibleTileCaptureByZeroStake();
  });

  it(`testUser1 can not claim tile without prosperity`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await TileCaptureCoreTest.impossibleTileClaimWithoutProsperity();
  });

  it(`testUser1 can not claim tile during capture`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await TileCaptureCoreTest.impossibleTileClaimDuringCapture();
  });

  it(`testUser1 can not capture more than one tile at the same time`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await TileCaptureCoreTest.impossibleTilesCaptureAtTheSameTimeTest();
  });

  it(`testUser1 can not capture more tiles than max limit`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await TileCaptureCoreTest.impossibleTileCaptureDueMaxLimitTest();
  });

  it(`testUser1 can not get building tile buff greater than max buff limit. /advancedProductionTileBonusType, advancedProductionTileBonusPercent, prosperityBalance, investedWorkers/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await TileCaptureCoreTest.tileMaxBuffLimitTest();
  });

  it(`testUser1 can give up tile with bonus. /advancedProductionTileBonusType, prosperityBalance, tileOwner, investedWorkers/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await TileCaptureCoreTest.tileGiveUpTest();
  });

  it(`testUser2 can capture tile with bonus captured by testUser1. /prosperityBalance, tileOwner/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await TileCaptureCoreTest.tileCaptureByAnotherUserTest();
  });

  it(`testUser1 can cancel tile capture with bonus. /prosperityBalance, tileOwner/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await TileCaptureCoreTest.cancelTileCaptureTest();
  });

  it(`testUser1 can purchase settlement on tile with bonus. /advancedProductionTileBonusType, investedWorkers/`, async function () {
    this.timeout(1_000_000);
    await WithSettlementsInDifferentZones();
    await TileCaptureCoreTest.settlementPurchaseOnTileWithBonusTest();
  });

  it(`testUser1 can capture own tile with bonus. /advancedProductionTileBonusType, tileOwner/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await TileCaptureCoreTest.ownTileCaptureTest();
  });

  it(`testUser1 can not capture own tile if prosperity threshold not reached`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await TileCaptureCoreTest.impossibleOwnTileCaptureIfProsperityThresholdNotReachedTest();
  });
});
