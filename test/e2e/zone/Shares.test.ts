import { BuildingType } from "../../enums/buildingType";
import { WithEnoughResources } from "../../fixtures/WithEnoughResources";
import { SharesCoreTest } from "../../core/SharesCoreTest";

describe("Shares Test", async function () {
  before(async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
  });

  it(`testUser1 can send Farm shares to another user and resource distribution when harvesting is correct. /userSharesBalance, producedResources/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.sendSharesAndHarvestTest(BuildingType.FARM, 40);
  });

  it(`testUser1 can send Lumbermill shares to another user and resource distribution when harvesting is correct. /userSharesBalance, producedResources/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.sendSharesAndHarvestTest(BuildingType.LUMBERMILL, 40);
  });

  it(`testUser1 can send Mine shares to another user and resource distribution when harvesting is correct. /userSharesBalance, producedResources/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.sendSharesAndHarvestTest(BuildingType.MINE, 40);
  });

  it(`testUser1 can send Smithy shares to another user and resource distribution when harvesting is correct. /userSharesBalance, producedResources/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.sendSharesAndHarvestTest(BuildingType.SMITHY, 40);
  });

  it(`testUser1 can not send Farm shares more than max cap to another user`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.impossibleSendSharesMoreThanMaxCapTest(BuildingType.FARM);
  });

  it(`testUser1 can not send Lumbermill shares more than max cap to another user`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.impossibleSendSharesMoreThanMaxCapTest(BuildingType.LUMBERMILL);
  });

  it(`testUser1 can not send Mine shares more than max cap to another user`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.impossibleSendSharesMoreThanMaxCapTest(BuildingType.MINE);
  });

  it(`testUser1 can not send Smithy shares more than max cap to another user`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.impossibleSendSharesMoreThanMaxCapTest(BuildingType.SMITHY);
  });

  it(`testUser1 can return his own Farm shares. /userSharesBalance, buildingDistributionId/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.returnSharesTest(BuildingType.FARM, 40);
  });

  it(`testUser1 can return his own Lumbermill shares. /userSharesBalance, buildingDistributionId/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.returnSharesTest(BuildingType.LUMBERMILL, 40);
  });

  it(`testUser1 can return his own Mine shares. /userSharesBalance, buildingDistributionId/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.returnSharesTest(BuildingType.MINE, 40);
  });

  it(`testUser1 can return his own Smithy shares. /userSharesBalance, buildingDistributionId/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.returnSharesTest(BuildingType.SMITHY, 40);
  });

  it(`testUser1 can not return his own Farm shares if treasury amount more than acceptable`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.impossibleReturnSharesDueHighTreasuryAmountTest(BuildingType.FARM, 40);
  });

  it(`testUser1 can not return his own Lumbermill shares if treasury amount more than acceptable`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.impossibleReturnSharesDueHighTreasuryAmountTest(BuildingType.LUMBERMILL, 40);
  });

  it(`testUser1 can not return his own Mine shares if treasury amount more than acceptable`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.impossibleReturnSharesDueHighTreasuryAmountTest(BuildingType.MINE, 40);
  });

  it(`testUser1 can not return his own Smithy shares if treasury amount more than acceptable`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await SharesCoreTest.impossibleReturnSharesDueHighTreasuryAmountTest(BuildingType.SMITHY, 40);
  });
});
