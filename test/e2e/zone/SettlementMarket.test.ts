import { SettlementCoreTest } from "../../core/SettlementCoreTest";
import { WithSettlements } from "../../fixtures/WithSettlements";
import { deployments } from "hardhat";
import { WipeCoreTest } from "../../core/WipeCoreTest";
import { NotYetStartedGame } from "../../fixtures/NotYetStartedGame";
import { WithEnoughResourcesInDifferentZones } from "../../fixtures/WithEnoughResourcesInDifferentZones";

describe("Settlement Market Test", async function () {
  it(`testUser1 can purchase new settlement and price drop is correct. /settlementCost, userTokenBalance/`, async function () {
    this.timeout(1_000_000);
    await deployments.fixture("ImmediatelyStartedGame");
    await SettlementCoreTest.settlementPurchaseWithPriceDropTest();
  });

  it(`testUser1 can not purchase new settlement not in acceptable radius`, async function () {
    this.timeout(1_000_000);
    await deployments.fixture("ImmediatelyStartedGame");
    await SettlementCoreTest.impossibleSettlementPurchaseNotInAcceptableRadiusTest();
  });

  it(`testUser1 can not purchase new settlement without money`, async function () {
    this.timeout(1_000_000);
    await deployments.fixture("ImmediatelyStartedGame");
    await SettlementCoreTest.impossibleSettlementPurchaseWithoutMoneyTest();
  });

  it(`testUser1 can not purchase new settlement if max token to use lower than settlement cost`, async function () {
    this.timeout(1_000_000);
    await deployments.fixture("ImmediatelyStartedGame");
    await SettlementCoreTest.impossibleSettlementPurchaseWithLowMaxTokenToUseTest();
  });

  it(`testUser1 can not purchase new settlement if zone is full`, async function () {
    this.timeout(1_000_000);
    await deployments.fixture("40Settlements");
    await SettlementCoreTest.impossibleSettlementPurchaseWithFullZoneTest();
  });

  it(`testUser1 can purchase new settlement in different zone from current settlement zone. /settlementCost, userTokenBalance/`, async function () {
    this.timeout(1_000_000);
    await WithSettlements();
    await SettlementCoreTest.settlementPurchaseInDifferentZoneTest();
  });

  it(`settlement cost after wipe does not change. /epochNumber, settlementCost/`, async function () {
    this.timeout(1_000_000);
    await deployments.fixture("40Settlements");
    await WipeCoreTest.settlementCostAfterWipeTest();
  });

  it(`settlements cost does not change before game started. /settlementCost/`, async function () {
    this.timeout(1_000_000);
    await NotYetStartedGame();
    await SettlementCoreTest.settlementCostBeforeGameStartedTest();
  });

  it(`testUser1 can not purchase new settlement after wipe if epoch is not active`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResourcesInDifferentZones();
    await WipeCoreTest.impossibleSettlementPurchaseAfterWipeTest();
  });
});
