import { WithEnoughResources } from "../../fixtures/WithEnoughResources";
import { SiegeCoreTest } from "../../core/SiegeCoreTest";
import { BuildingType } from "../../enums/buildingType";

describe("Siege Test", async function () {
  before(async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
  });

  it(`testUser3 can liquidate testUser1's army during siege. /armyUnits in battle, armyUnits in siege/`, async function() {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SiegeCoreTest.armyLiquidationDuringSiegeTest();
  });

  it(`testUser1 can not siege testUser2's settlement during stun`, async function() {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SiegeCoreTest.impossibleSiegeDuringStunTest();
  });

  it(`testUser1 can rob testUser2's Farm. /robberyTokensCap, userResources, userBuildingTreasury, robberyTokens after siege/`, async function() {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SiegeCoreTest.robberyTest(BuildingType.FARM);
  });

  it(`testUser1 can rob testUser2's Lumbermill. /robberyTokensCap, userResources, userBuildingTreasury, robberyTokens after siege/`, async function() {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SiegeCoreTest.robberyTest(BuildingType.LUMBERMILL);
  });

  it(`testUser1 can rob testUser2's Mine. /robberyTokensCap, userResources, userBuildingTreasury, robberyTokens after siege/`, async function() {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SiegeCoreTest.robberyTest(BuildingType.MINE);
  });

  it(`testUser1 can rob testUser2's Smithy. /robberyTokensCap, userResources, userBuildingTreasury, robberyTokens after siege/`, async function() {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SiegeCoreTest.robberyTest(BuildingType.SMITHY);
  });

  it(`testUser1 can not rob testUser2's building without robbery tokens`, async function() {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SiegeCoreTest.impossibleRobberyWithoutRobberyTokensTest();
  });

  it(`testUser1 can destruct testUser2's Fort. /fortHealth, robberyTokens after siege/`, async function() {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SiegeCoreTest.fortDestructionTest();
  });

  it(`testUser2 can repair own Fort during testUser1's siege. /fortHealth, structureResources/`, async function() {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SiegeCoreTest.fortRepairmentDuringSiegeTest();
  });

  it(`testUser1 can destruct testUser2's Fort during testUser2's repairment. /fortHealth, buildingResources, tokenRegenPerSecond/`, async function() {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SiegeCoreTest.fortDestructionDuringRepairmentTest();
  });
});
