import { WithEnoughResources } from "../../fixtures/WithEnoughResources";
import { BattleCoreTest } from "../../core/BattleCoreTest";
import { UnitType } from "../../enums/unitType";
import { MovementCoreTest } from "../../core/MovementCoreTest";
import { UnitsCoreTest } from "../../core/UnitsCoreTest";
import { WithArmiesOnOneSettlement } from "../../fixtures/WithArmiesOnOneSettlement";
import { WithEnoughResourcesInDifferentZones } from "../../fixtures/WithEnoughResourcesInDifferentZones";

describe("Battle Test", async function () {
  it(`testUser3 can join side A into battle between testUser1 and testUser2 and armies casualties are correct. /battleDuration, casualties, winningSide, stunDuration/`, async function() {
    this.timeout(1_000_000);
    await WithArmiesOnOneSettlement();
    await BattleCoreTest.joinBattleAndCalculateCasualtiesTest(1);
  });

  it(`testUser3 can join side B into battle between testUser1 and testUser2 and armies casualties are correct. /battleDuration, casualties, winningSide, stunDuration/`, async function() {
    this.timeout(1_000_000);
    await WithArmiesOnOneSettlement();
    await BattleCoreTest.joinBattleAndCalculateCasualtiesTest(2);
  });

  it(`testUser3 can not join side A into battle between testUser1 and testUser2 during stun`, async function() {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BattleCoreTest.impossibleJoinBattleDuringStunTest(1);
  });

  it(`testUser3 can not join side B into battle between testUser1 and testUser2 during stun`, async function() {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BattleCoreTest.impossibleJoinBattleDuringStunTest(2);
  });

  it(`testUser1 can not start battle during stun`, async function() {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BattleCoreTest.impossibleBattleDuringStunTest();
  });

  it(`battle between testUser1 and testUser2 can be ended in a draw. /winningSide, stunDuration/`, async function() {
    this.timeout(1_000_000);
    await WithArmiesOnOneSettlement();
    await BattleCoreTest.battleDrawTest();
  });

  it(`testUser1's unit quantity in battle does not change if siege ends /armyUnits, armyUnits in battle/`, async function() {
    this.timeout(1_000_000);
    await WithArmiesOnOneSettlement();
    await BattleCoreTest.siegeEndDuringBattleTest();
  });

  it(`testUser1's army can be attacked by another user during its movement and armies casualties are proportional to reduced battle duration. /battleEndTime, battleDuration, casualties/`, async function () {
    this.timeout(1_000_000);
    await WithArmiesOnOneSettlement();
    await MovementCoreTest.battleDuringMovementAndCalculateCasualtiesTest();
  });

  it(`battle duration versus cultists does not depend on the amount of army and battle duration is correct. /battleDuration/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResourcesInDifferentZones();
    await BattleCoreTest.cultistsBattleWithDifferentArmiesAmountTest();
  });

  it(`production penalty after battle versus cultists is correct. /productionSlowdownPercentage/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await BattleCoreTest.productionPenaltyReduceAfterCultistsBattleTest();
  });

  it(`testUser2 can hire warriors during battle but units amount in battle does not change. /armyUnits, armyUnits in battle/`, async function () {
    this.timeout(1_000_000);
    await WithArmiesOnOneSettlement();
    await UnitsCoreTest.unitsHireDuringBattleTest(UnitType.WARRIOR);
  });

  it(`testUser2 can hire archers during battle but units amount in battle does not change. /armyUnits, armyUnits in battle/`, async function () {
    this.timeout(1_000_000);
    await WithArmiesOnOneSettlement();
    await UnitsCoreTest.unitsHireDuringBattleTest(UnitType.ARCHER);
  });

  it(`testUser2 can hire horsemen during battle but units amount in battle does not change. /armyUnits, armyUnits in battle/`, async function () {
    this.timeout(1_000_000);
    await WithArmiesOnOneSettlement();
    await UnitsCoreTest.unitsHireDuringBattleTest(UnitType.HORSEMAN);
  });

  it(`testUser1 army movement to home can not be speeded up by resources if army is empty`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await MovementCoreTest.impossibleMovementSpeedUpWithEmptyArmyTest();
  });
});
