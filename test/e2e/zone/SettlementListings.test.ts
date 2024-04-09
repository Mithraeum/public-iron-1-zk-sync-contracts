import { BuildingType } from "../../enums/buildingType";
import { SettlementListingsTest } from "../../external/SettlementListingsTest";
import { TokenType } from "../../enums/tokenType";
import { WithEnoughResources } from "../../fixtures/WithEnoughResources";

describe("Settlement Listings Test", async function () {
  before(async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
  });

  it(`testUser2 can order testUser1's settlement with shares by bless. /orderStatus, userTokenBalance, userSharesBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SettlementListingsTest.settlementOrderWithSharesTest(TokenType.BLESS, [BuildingType.FARM, BuildingType.LUMBERMILL, BuildingType.MINE, BuildingType.SMITHY]);
  });

  it(`testUser2 can order testUser1's settlement with shares by food. /orderStatus, userTokenBalance, userSharesBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SettlementListingsTest.settlementOrderWithSharesTest(TokenType.FOOD, [BuildingType.FARM, BuildingType.LUMBERMILL, BuildingType.MINE, BuildingType.SMITHY]);
  });

  it(`testUser2 can order testUser1's settlement with shares by wood. /orderStatus, userTokenBalance, userSharesBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SettlementListingsTest.settlementOrderWithSharesTest(TokenType.WOOD, [BuildingType.FARM, BuildingType.LUMBERMILL, BuildingType.MINE, BuildingType.SMITHY]);
  });

  it(`testUser2 can order testUser1's settlement with shares by ore. /orderStatus, userTokenBalance, userSharesBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SettlementListingsTest.settlementOrderWithSharesTest(TokenType.ORE, [BuildingType.FARM, BuildingType.LUMBERMILL, BuildingType.MINE, BuildingType.SMITHY]);
  });

  it(`testUser2 can order testUser1's settlement with shares by weapon. /orderStatus, userTokenBalance, userSharesBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SettlementListingsTest.settlementOrderWithSharesTest(TokenType.WEAPON, [BuildingType.FARM, BuildingType.LUMBERMILL, BuildingType.MINE, BuildingType.SMITHY]);
  });

  it(`testUser2 can not order testUser1's settlement with shares more than max cap by bless`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SettlementListingsTest.impossibleSettlementOrderWithSharesMoreThanMaxCapTest();
  });

  it(`testUser1 can cancel his own settlement order. /orderStatus/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SettlementListingsTest.cancelSettlementOrderTest();
  });

  it(`testUser1 can modify his own settlement order. /orderStatus, orderPrice/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SettlementListingsTest.modifySettlementOrderTest();
  });

  it(`testUser2 can order testUser1's settlement with reduced shares amount. /userSharesBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SettlementListingsTest.settlementOrderWithReducedSharesAmountTest();
  });

  it(`testUser2 can not order testUser1's settlement if shares were transferred after order was created`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SettlementListingsTest.impossibleSettlementOrderWithLowerSharesAmountThanWasOnOrderCreationTest();
  });
});
