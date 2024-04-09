import { WithEnoughResources } from "../../fixtures/WithEnoughResources";
import { UnitsCoreTest } from "../../core/UnitsCoreTest";
import { UnitType } from "../../enums/unitType";
import { WithSettlements } from "../../fixtures/WithSettlements";
import { WithEnoughResourcesInDifferentZones } from "../../fixtures/WithEnoughResourcesInDifferentZones";
import { NotYetStartedGame } from "../../fixtures/NotYetStartedGame";

describe("Units Pool Test", async function () {
  it(`testUser1 can hire 1 warrior and price drop is correct. /unitPrice, userResources, unitQuantity/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsHireWithPriceDropTest(UnitType.WARRIOR, 1);
  });

  it(`testUser1 can hire 2 warriors and price drop is correct. /unitPrice, userResources, unitQuantity/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsHireWithPriceDropTest(UnitType.WARRIOR, 2);
  });

  it(`testUser1 can hire 1 archer and price drop is correct. /unitPrice, userResources, unitQuantity/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsHireWithPriceDropTest(UnitType.ARCHER, 1);
  });

  it(`testUser1 can hire 2 archers and price drop is correct. /unitPrice, userResources, unitQuantity/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsHireWithPriceDropTest(UnitType.ARCHER, 2);
  });

  it(`testUser1 can hire 1 horseman and price drop is correct. /unitPrice, userResources, unitQuantity/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsHireWithPriceDropTest(UnitType.HORSEMAN, 1);
  });

  it(`testUser1 can hire 2 horsemen and price drop is correct. /unitPrice, userResources, unitQuantity/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsHireWithPriceDropTest(UnitType.HORSEMAN, 2);
  });

  it(`testUser1 can hire 1 warrior by another user resources. /unitPrice, userResources, unitQuantity/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsHireByAnotherUserResourcesTest(UnitType.WARRIOR, 1);
  });

  it(`testUser1 can hire 2 warriors by another user resources. /unitPrice, userResources, unitQuantity/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsHireByAnotherUserResourcesTest(UnitType.WARRIOR, 2);
  });

  it(`testUser1 can hire 1 archer by another user resources. /unitPrice, userResources, unitQuantity/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsHireByAnotherUserResourcesTest(UnitType.ARCHER, 1);
  });

  it(`testUser1 can hire 2 archers by another user resources. /unitPrice, userResources, unitQuantity/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsHireByAnotherUserResourcesTest(UnitType.ARCHER, 2);
  });

  it(`testUser1 can hire 1 horseman by another user resources. /unitPrice, userResources, unitQuantity/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsHireByAnotherUserResourcesTest(UnitType.HORSEMAN, 1);
  });

  it(`testUser1 can hire 2 horsemen by another user resources. /unitPrice, userResources, unitQuantity/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.unitsHireByAnotherUserResourcesTest(UnitType.HORSEMAN, 2);
  });

  it(`testUser1 can not hire units by another user without approve`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.impossibleUnitsHireByAnotherUserWithoutApproveTest();
  });

  it(`testUser1 can not hire units more than Fort health amount`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.impossibleUnitsHireMoreThanFortHealthAmountTest();
  });

  it(`testUser1 can not hire units during stun`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.impossibleUnitsHireDuringStunTest();
  });

  it(`testUser1 can not hire units without resources`, async function () {
    this.timeout(1_000_000);
    await WithSettlements();
    await UnitsCoreTest.impossibleUnitsHireWithoutResourcesTest();
  });

  it(`testUser1 can not hire units on another settlement`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await UnitsCoreTest.impossibleUnitsHireOnAnotherSettlementTest();
  });

  it(`testUser1 can not hire units from another zone`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResourcesInDifferentZones();
    await UnitsCoreTest.impossibleUnitsHireFromAnotherZoneTest();
  });

  it(`units cost does not change before game started. /unitPrice/`, async function () {
    this.timeout(1_000_000);
    await NotYetStartedGame();
    await UnitsCoreTest.unitsCostBeforeGameStartedTest();
  });
});
