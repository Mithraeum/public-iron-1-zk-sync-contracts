import { WithEnoughResources } from "../../fixtures/WithEnoughResources";
import { WipeCoreTest } from "../../core/WipeCoreTest";

describe("Cultists Test", async function () {
  before(async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
  });

  it(`summoned cultists amount after summon delay is proportional to zone toxicity. /summonedCultists/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await WipeCoreTest.cultistSummonTest();
  });

  it(`cultists can not be summoned during summon delay`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await WipeCoreTest.impossibleCultistSummonDuringSummonDelayTest();
  });
});
