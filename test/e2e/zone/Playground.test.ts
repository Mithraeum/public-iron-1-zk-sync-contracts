import BigNumber from "bignumber.js";
import {expect} from "chai";

describe("Playground Test", async function () {
    it(`1`, async function () {
        expect(new BigNumber(0)).not.isInCloseRangeWith(new BigNumber(1.001));
    });

    it(`2`, async function () {
        expect(new BigNumber(0)).isInCloseRangeWith(new BigNumber(0.001));
    });

    it(`3`, async function () {
        expect(new BigNumber(0)).eq(new BigNumber(0));
        expect(new BigNumber(0)).eql(new BigNumber(0));
        expect(new BigNumber(0)).eqls(new BigNumber(0));
        expect(new BigNumber(0)).equal(new BigNumber(0));
        expect(new BigNumber(0)).equals(new BigNumber(0));
    });

    it(`4`, async function () {
        expect(new BigNumber(0)).to.be.below(new BigNumber(1));
        expect(new BigNumber(0)).lte(new BigNumber(1));
    });

    it(`5`, async function () {
        expect(0).to.be.below(1);
    });

    it(`6`, async function () {
        // Will fail, type mismatch
        expect(0).to.be.below(new BigNumber(1));
    });
});
