import { ethers, getNamedAccounts } from "hardhat";
import { UserHelper } from "../helpers/UserHelper";
import { expect } from "chai";
import { toLowBN, transferableFromLowBN } from "../../scripts/utils/const";
import { ResourceHelper } from "../helpers/ResourceHelper";
import BigNumber from "bignumber.js";
import { WorkersPool__factory, Zone__factory } from "../../typechain-types";
import { WorldHelper } from "../helpers/WorldHelper";
import { BuildingType } from "../enums/buildingType";
import { ProductionHelper } from "../helpers/ProductionHelper";
import { EvmUtils } from "../helpers/EvmUtils";
import { BuildingHelper } from "../helpers/BuildingHelper";
import { ONE_DAY_IN_SECONDS } from "../constants/time";

export class WorkersCoreTest {
    public static async workersHireWithPriceDropTest(workerQuantity: number){
        const {testUser1} = await getNamedAccounts();

        const prosperityAmount = 50;
        const priceDropTime = 10;

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const prosperityInstance = await WorldHelper.getProsperityInstance();

        const zoneInstance = Zone__factory.connect(await userSettlementInstance.currentZone(), userSettlementInstance.signer);
        const workersPoolInstance = WorkersPool__factory.connect(await zoneInstance.workersPool(), userSettlementInstance.signer);

        await ProductionHelper.increaseProsperityByBuilding(userSettlementInstance, BuildingType.SMITHY, prosperityAmount);

        const workerPriceBeforeDrop = toLowBN((await workersPoolInstance.getAmountIn(1))[0]);
        const timeBeforeDrop = await EvmUtils.getCurrentTime();

        await EvmUtils.increaseTime(priceDropTime);

        const timeAfterDrop = await EvmUtils.getCurrentTime();
        const passedTime = timeAfterDrop - timeBeforeDrop;

        let expectedWorkerPriceAfterDrop = workerPriceBeforeDrop;
        for (let i = 0; i < passedTime; i++) {
            expectedWorkerPriceAfterDrop = expectedWorkerPriceAfterDrop.minus(
              (expectedWorkerPriceAfterDrop.multipliedBy(0.33).dividedBy(ONE_DAY_IN_SECONDS)));
        }

        let workerPrice = toLowBN((await workersPoolInstance.getAmountIn(1))[0]);
        expect(workerPrice).isInCloseRangeWith(expectedWorkerPriceAfterDrop);

        let totalWorkerPrice = toLowBN((await workersPoolInstance.getAmountIn(1))[0]);
        for (let i = 1; i < workerQuantity; i++) {
            workerPrice = workerPrice.plus(workerPrice.multipliedBy(0.004));
            totalWorkerPrice = totalWorkerPrice.plus(workerPrice);
        }

        const workersQuantityBefore = await ResourceHelper.getUnassignedWorkersQuantity(userSettlementInstance);
        const prosperityBalanceBefore = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));

        //workers hire
        await userSettlementInstance.swapProsperityForExactWorkers(
          transferableFromLowBN(new BigNumber(workerQuantity)),
          transferableFromLowBN(new BigNumber(prosperityBalanceBefore))
        ).then(tx => tx.wait());

        const expectedProsperityBalance = prosperityBalanceBefore.minus(totalWorkerPrice);
        const expectedWorkersQuantity = workersQuantityBefore.plus(workerQuantity);
        const expectedWorkerPrice = workerPrice.plus(workerPrice.multipliedBy(0.004));

        const actualProsperityBalance = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
        const actualWorkersQuantity = await ResourceHelper.getUnassignedWorkersQuantity(userSettlementInstance);
        const actualWorkerPrice = toLowBN((await workersPoolInstance.getAmountIn(1))[0]);

        expect(actualProsperityBalance).isInCloseRangeWith(expectedProsperityBalance);
        expect(actualWorkersQuantity).eql(expectedWorkersQuantity, 'Workers Quantity is not correct');
        expect(actualWorkerPrice).isInCloseRangeWith(expectedWorkerPrice);
    }

    public static async workersInvestTest(buildingLevel: number, buildingType: BuildingType){
        const { testUser1 } = await getNamedAccounts();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        await BuildingHelper.upgradeBuildingToSpecifiedLevel(buildingInstance, buildingLevel, true);

        const workersInvestedBefore = toLowBN(await buildingInstance.getWorkers());
        const workersAvailableBefore = await ResourceHelper.getUnassignedWorkersQuantity(userSettlementInstance);
        const workersCapOnCurrentLevel = toLowBN(await buildingInstance.getMaxWorkers());

        const expectedInvestedWorkers = workersInvestedBefore.plus(workersCapOnCurrentLevel);
        const expectedAvailableWorkers = workersAvailableBefore.minus(workersCapOnCurrentLevel);
        expect(workersInvestedBefore).eql(new BigNumber(0));

        await userSettlementInstance.assignResourcesAndWorkersToBuilding(
          ethers.constants.AddressZero.toString(),
          buildingInstance.address,
          transferableFromLowBN(new BigNumber(workersCapOnCurrentLevel)),
          [],
          []
        ).then(tx => tx.wait());

        const actualInvestedWorkers = toLowBN(await buildingInstance.getWorkers());
        const actualAvailableWorkers = await ResourceHelper.getUnassignedWorkersQuantity(userSettlementInstance);

        expect(actualInvestedWorkers).eql(expectedInvestedWorkers, 'Invested Workers quantity is not correct');
        expect(actualAvailableWorkers).eql(expectedAvailableWorkers, 'Available Workers quantity is not correct');
    }

    public static async impossibleWorkersInvestMoreThanMaxCapTest(buildingLevel: number, buildingType: BuildingType){
        const { testUser1 } = await getNamedAccounts();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        await BuildingHelper.upgradeBuildingToSpecifiedLevel(buildingInstance, buildingLevel, true);

        const workersInvestedBefore = toLowBN(await buildingInstance.getWorkers());
        const workersAvailableBefore = await ResourceHelper.getUnassignedWorkersQuantity(userSettlementInstance);
        const workersCapOnCurrentLevel = toLowBN(await buildingInstance.getMaxWorkers());
        expect(workersInvestedBefore).eql(new BigNumber(0));

        await expect(
          userSettlementInstance.assignResourcesAndWorkersToBuilding(
            ethers.constants.AddressZero.toString(),
            buildingInstance.address,
            transferableFromLowBN(new BigNumber(workersCapOnCurrentLevel).plus(1)),
            [],
            []
          ).then(tx => tx.wait())
        ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'settlement balance exceed limit'");

        const actualInvestedWorkers = toLowBN(await buildingInstance.getWorkers());
        const actualAvailableWorkers = await ResourceHelper.getUnassignedWorkersQuantity(userSettlementInstance);

        expect(actualInvestedWorkers).eql(workersInvestedBefore, "Invested Workers quantity is not correct");
        expect(actualAvailableWorkers).eql(workersAvailableBefore, "Available Workers quantity is not correct");
    }

    public static async workersWithdrawTest(buildingLevel: number, buildingType: BuildingType) {
        const {testUser1} = await getNamedAccounts();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        await BuildingHelper.upgradeBuildingToSpecifiedLevel(buildingInstance, buildingLevel, true);

        const workersCapOnCurrentLevel = toLowBN(await buildingInstance.getMaxWorkers());

        await userSettlementInstance.assignResourcesAndWorkersToBuilding(
          ethers.constants.AddressZero.toString(),
          buildingInstance.address,
          transferableFromLowBN(new BigNumber(workersCapOnCurrentLevel)),
          [],
          []
        ).then(tx => tx.wait());

        const workersInvestedBefore = toLowBN(await buildingInstance.getWorkers());
        const workersAvailableBefore = await ResourceHelper.getUnassignedWorkersQuantity(userSettlementInstance);

        await buildingInstance.removeResourcesAndWorkers(
          userSettlementInstance.address,
          transferableFromLowBN(new BigNumber(workersCapOnCurrentLevel)),
          testUser1,
          [],
          []
        ).then(tx => tx.wait());

        const expectedInvestedWorkers = workersInvestedBefore.minus(workersCapOnCurrentLevel);
        const expectedAvailableWorkers = workersAvailableBefore.plus(workersCapOnCurrentLevel);

        const actualInvestedWorkers = toLowBN(await buildingInstance.getWorkers());
        const actualAvailableWorkers = await ResourceHelper.getUnassignedWorkersQuantity(userSettlementInstance);

        expect(actualInvestedWorkers).eql(expectedInvestedWorkers, 'Invested Workers quantity is not correct');
        expect(actualAvailableWorkers).eql(expectedAvailableWorkers, 'Available Workers quantity is not correct');
    }

    public static async impossibleWorkersWithdrawMoreThanInvestedTest(buildingLevel: number, buildingType: BuildingType) {
        const { testUser1 } = await getNamedAccounts();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const buildingInstance = await BuildingHelper.getSettlementBuildingInstanceByType(userSettlementInstance, buildingType);

        await BuildingHelper.upgradeBuildingToSpecifiedLevel(buildingInstance, buildingLevel, true);

        const workersCapOnCurrentLevel = toLowBN(await buildingInstance.getMaxWorkers());

        await userSettlementInstance.assignResourcesAndWorkersToBuilding(
          ethers.constants.AddressZero.toString(),
          buildingInstance.address,
          transferableFromLowBN(new BigNumber(workersCapOnCurrentLevel)),
          [],
          []
        ).then(tx => tx.wait());

        const workersInvestedBefore = toLowBN(await buildingInstance.getWorkers());
        const workersAvailableBefore = await ResourceHelper.getUnassignedWorkersQuantity(userSettlementInstance);

        await expect(
          buildingInstance.removeResourcesAndWorkers(
            userSettlementInstance.address,
            transferableFromLowBN(new BigNumber(workersCapOnCurrentLevel).plus(1)),
            testUser1,
            [],
            []
          ).then(tx => tx.wait())
        ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'ERC20: transfer amount exceeds balance'");

        const actualInvestedWorkers = toLowBN(await buildingInstance.getWorkers());
        const actualAvailableWorkers = await ResourceHelper.getUnassignedWorkersQuantity(userSettlementInstance);

        expect(actualInvestedWorkers).eql(workersInvestedBefore, "Invested Workers quantity is not correct");
        expect(actualAvailableWorkers).eql(workersAvailableBefore, "Available Workers quantity is not correct");
    }

    public static async impossibleWorkersHireWithoutProsperityTest() {
        const {testUser1} = await getNamedAccounts();

        const userSettlementInstance = await UserHelper.getUserSettlementByNumber(testUser1, 1);
        const prosperityInstance = await WorldHelper.getProsperityInstance();

        const zoneInstance = Zone__factory.connect(await userSettlementInstance.currentZone(), userSettlementInstance.signer);
        const workersPoolInstance = WorkersPool__factory.connect(await zoneInstance.workersPool(), userSettlementInstance.signer);

        const prosperityBalance = toLowBN(await prosperityInstance.balanceOf(userSettlementInstance.address));
        const workerPrice = toLowBN((await workersPoolInstance.getAmountIn(1))[0]);
        expect(prosperityBalance).lt(workerPrice);

        await expect(
          userSettlementInstance.swapProsperityForExactWorkers(
            transferableFromLowBN(new BigNumber(1)),
            transferableFromLowBN(prosperityBalance)
          ).then(tx => tx.wait())
        ).to.be.revertedWith("VM Exception while processing transaction: reverted with reason string 'Insufficient maximum prosperity sell amount'");
    }

    public static async workersCostBeforeGameStartedTest() {
        const {testUser1} = await getNamedAccounts();
        const signer = await ethers.getSigner(testUser1);

        const epochInstance = await WorldHelper.getCurrentEpochInstance();
        const zoneAddress = await epochInstance.zones(1);
        const zoneInstance = Zone__factory.connect(zoneAddress, signer);
        const workersPoolInstance = WorkersPool__factory.connect(await zoneInstance.workersPool(), signer);

        const workerCost = toLowBN((await workersPoolInstance.getAmountIn(1))[0]);

        await EvmUtils.increaseTime(100);

        const workerCostBeforeStart = toLowBN((await workersPoolInstance.getAmountIn(1))[0]);
        expect(workerCostBeforeStart).eql(workerCost);

        await EvmUtils.increaseTime(ONE_DAY_IN_SECONDS);

        const workerCostAfterStart = toLowBN((await workersPoolInstance.getAmountIn(1))[0]);
        expect(workerCostAfterStart).lt(workerCostBeforeStart);
    }
}
