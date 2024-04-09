import { WithEnoughResources } from "../../fixtures/WithEnoughResources";
import { RewardsCoreTest } from "../../core/RewardsCoreTest";

describe("Reward Pool Test", async function () {
  before(async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
  });

  it(`testUser1 can exchange weapons to tokens. /userTokenBalance, rewardPoolBalance, userResourceBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await RewardsCoreTest.rewardsExchangeTest();
  });

  it(`testUser1 can exchange weapons to tokens by another user resources. /userTokenBalance, rewardPoolBalance, userResourceBalance/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await RewardsCoreTest.rewardsExchangeByAnotherUserResourcesTest();
  });

  it(`testUser1 can not exchange weapons to tokens by another user resources without approve`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await RewardsCoreTest.impossibleRewardsExchangeByAnotherUserResourcesWithoutApproveTest();
  });

  it(`testUser1 can not exchange weapons, upgrade building or hire units if game is closed due to empty reward pool`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await RewardsCoreTest.impossibleActionsAfterGameClosedTest();
  });
});
