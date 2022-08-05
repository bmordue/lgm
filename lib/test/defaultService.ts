import lgm = require('../service/DefaultService');
import assert = require('assert');

describe("unit tests", function() {
    describe("fillOrTruncateOrdersList()", function() {
        it("orders list too short", function() {
            const tooShort = [1, 1, 1];
            const filled = [1, 1, 1, 6, 6, 6, 6, 6, 6, 6];
            assert.equal(filled.length, 10);
            assert.deepEqual(lgm.fillOrTruncateOrdersList(tooShort), filled);

        });

        it("orders list too long", function() {
            const tooLong = new Array(11).fill(1);
            assert.equal(tooLong.length, 11);
            const truncated = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
            assert.equal(truncated.length, 10);
            assert.deepEqual(lgm.fillOrTruncateOrdersList(tooLong), truncated);
        });

        it("orders list just right", function() {
            const justRight = [2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
            assert.deepEqual(lgm.fillOrTruncateOrdersList(justRight), justRight);
        });
    });
});