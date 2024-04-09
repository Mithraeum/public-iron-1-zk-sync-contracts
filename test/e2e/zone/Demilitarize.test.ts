import { WithEnoughResources } from "../../fixtures/WithEnoughResources";
import { UnitsCoreTest } from "../../core/UnitsCoreTest";
import { UnitType } from "../../enums/unitType";

describe("Demilitarize Test", async function () {
  before(async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
  });

  it(`testUser1 can demilitarize 1 warrior on own settlement. /unitQuantity, prosperityBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsDemilitarizeTest(UnitType.WARRIOR, 1);
  });

  it(`testUser1 can demilitarize 2 warriors on own settlement. /unitQuantity, prosperityBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsDemilitarizeTest(UnitType.WARRIOR, 2);
  });

  it(`testUser1 can demilitarize 1 archer on own settlement. /unitQuantity, prosperityBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsDemilitarizeTest(UnitType.ARCHER, 1);
  });

  it(`testUser1 can demilitarize 2 archers on own settlement. /unitQuantity, prosperityBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsDemilitarizeTest(UnitType.ARCHER, 2);
  });

  it(`testUser1 can demilitarize 1 horseman on own settlement. /unitQuantity, prosperityBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsDemilitarizeTest(UnitType.HORSEMAN, 1);
  });

  it(`testUser1 can demilitarize 2 horsemen on own settlement. /unitQuantity, prosperityBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsDemilitarizeTest(UnitType.HORSEMAN, 2);
  });

  it(`testUser1 can not demilitarize units more than available`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.impossibleUnitsDemilitarizeMoreThanAvailableTest();
  });

  it(`testUser1 can not demilitarize units during battle`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.impossibleUnitsDemilitarizeDuringBattleTest();
  });

  it(`testUser1 can not demilitarize units during stun`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.impossibleUnitsDemilitarizeDuringStunTest();
  });

  it(`testUser1 can demilitarize 1 warrior on another settlement. /unitQuantity, prosperityBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsDemilitarizeOnAnotherSettlementTest(UnitType.WARRIOR, 1);
  });

  it(`testUser1 can demilitarize 2 warriors on another settlement. /unitQuantity, prosperityBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsDemilitarizeOnAnotherSettlementTest(UnitType.WARRIOR, 2);
  });

  it(`testUser1 can demilitarize 1 archer on another settlement. /unitQuantity, prosperityBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsDemilitarizeOnAnotherSettlementTest(UnitType.ARCHER, 1);
  });

  it(`testUser1 can demilitarize 2 archers on another settlement. /unitQuantity, prosperityBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsDemilitarizeOnAnotherSettlementTest(UnitType.ARCHER, 2);
  });

  it(`testUser1 can demilitarize 1 horseman on another settlement. /unitQuantity, prosperityBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsDemilitarizeOnAnotherSettlementTest(UnitType.HORSEMAN, 1);
  });

  it(`testUser1 can demilitarize 2 horsemen on another settlement. /unitQuantity, prosperityBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsDemilitarizeOnAnotherSettlementTest(UnitType.HORSEMAN, 2);
  });

  it(`testUser1 can not demilitarize units during its cooldown`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.impossibleUnitsDemilitarizeDuringCooldownTest();
  });
});
