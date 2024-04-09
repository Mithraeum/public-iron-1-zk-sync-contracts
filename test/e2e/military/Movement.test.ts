import { WithEnoughResources } from "../../fixtures/WithEnoughResources";
import { MovementCoreTest } from "../../core/MovementCoreTest";

describe("Movement Test", async function () {
  before(async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
  });

  it(`testUser1 army can move to another settlement and movement time is correct. /movementTime, armyPosition, stunDuration/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await MovementCoreTest.movementTest();
  });

  it(`testUser1 army can not move to another settlement during stun`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await MovementCoreTest.impossibleMovementDuringStunTest();
  });

  it(`testUser1 army movement can be speeded up by resources and movement time reduces correctly. /movementTimeWithSpeedUp, armyPosition, stunDuration/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await MovementCoreTest.movementSpeedUpTest(90);
  });

  it(`testUser1 army movement can be speeded up as much as there are enough resources. /movementTimeWithSpeedUp, armyPosition/`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await MovementCoreTest.movementSpeedUpWithLowResourceAmountTest();
  });

  it(`testUser1 army movement can not be speeded up without enough resource amount`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await MovementCoreTest.impossibleMovementSpeedUpWithoutTreasuryResourceAmountTest();
  });

  it(`testUser1 army movement can not be speeded up due resource limit`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await MovementCoreTest.impossibleMovementSpeedUpDueLimitTest();
  });

  it(`testUser1 can not move to another settlement if army is empty`, async function () {
    this.timeout(1_000_000);
    await WithEnoughResources();
    await MovementCoreTest.impossibleMovementWithEmptyArmyTest();
  });
});
