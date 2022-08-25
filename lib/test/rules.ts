import rules = require('../service/Rules');
import assert = require('assert');

describe("rules tests", function () {
    describe("unique()", function () {
        it("input array contains only unique items", function () {
            const alreadyUnique = [1, 2, 3];
            assert.deepEqual(rules.unique(alreadyUnique), alreadyUnique);
        });

        it("input array contains duplicates", function () {
            const input = [1, 2, 2, 3, 4, 4, 5];
            const expected = [1, 2, 3, 4, 5];
            assert.deepEqual(rules.unique(input), expected);
        });
    });

    describe("flatten()", () => {
        it("flattens array of numbers into a single array", () => {
            const input = [[1, 2, 3], [4, 5, 6]];
            const expected = [1, 2, 3, 4, 5, 6];

            assert.deepEqual(rules.flatten(input), expected);

        });
    });

});