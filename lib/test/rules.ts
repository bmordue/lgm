import rules = require('../service/Rules');
import assert = require('assert');
import { Actor, ActorOrders, ActorState, Direction, Game, GridPosition, World } from '../service/Models';
import { TIMESTEP_MAX } from '../service/Rules';


describe("rules tests", function () {
    const theActor: Actor = { id: 0, pos: { x: 0, y: 0 }, state: ActorState.ALIVE, owner: 0 };
    const actorsList = [theActor];

    const game: Game = { turn: 1, worldId: 0 };
    let world: World;

    before(async () => {
        const terrain = await rules.generateTerrain();
        world = { id: 0, actors: actorsList, terrain: terrain };
    });

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

    describe("applyDirection()", () => {
        const oldGridPos = { x: 1, y: 1 };

        it("no move", () => {
            const newGridPos = rules.applyDirection(oldGridPos, Direction.NONE);
            assert.deepEqual(newGridPos, { x: 1, y: 1 } as GridPosition);
        });

        it("move left", () => {
            const newGridPos = rules.applyDirection(oldGridPos, Direction.LEFT);
            assert.deepEqual(newGridPos, { x: 0, y: 1 });
        });

        it("move right", () => {
            const newGridPos = rules.applyDirection(oldGridPos, Direction.RIGHT);
            assert.deepEqual(newGridPos, { x: 2, y: 1 });
        });

        it("move up-left", () => {
            const newGridPos = rules.applyDirection(oldGridPos, Direction.UP_LEFT);
            assert.deepEqual(newGridPos, { x: 0, y: 2 });
        });

        it("move up-right", () => {
            const newGridPos = rules.applyDirection(oldGridPos, Direction.UP_RIGHT);
            assert.deepEqual(newGridPos, { x: 1, y: 2 });
        });

        it("move down-left", () => {
            const newGridPos = rules.applyDirection(oldGridPos, Direction.DOWN_LEFT);
            assert.deepEqual(newGridPos, { x: 0, y: 0 });
        });

        it("move down-right", () => {
            const newGridPos = rules.applyDirection(oldGridPos, Direction.DOWN_RIGHT);
            assert.deepEqual(newGridPos, { x: 1, y: 0 });
        });

        it("move outside of world terrain boundaries");

    });

    describe("applyMovementOrders", () => {

        beforeEach(() => {
            theActor.pos = { x: 0, y: 0 };
        });

        it("handles timestep with orders present (no movement)", async () => {
            const ao: ActorOrders = { actor: theActor, ordersList: [Direction.NONE] };
            const timestep = 0;

            const updatedActor = await rules.applyMovementOrders(ao, game, world, timestep);
            assert.deepEqual(updatedActor.pos, { x: 0, y: 0 });
        });

        it("handles timestep with orders present (with movement)", async () => {
            const ao: ActorOrders = { actor: theActor, ordersList: [Direction.UP_RIGHT] };
            const timestep = 0;

            const updatedActor = await rules.applyMovementOrders(ao, game, world, timestep);
            assert.deepEqual(updatedActor.pos, { x: 0, y: 1 });
        });

        it("handles timestep with no orders", async () => {
            const ao: ActorOrders = { actor: theActor, ordersList: [] };
            const timestep = 0;

            const updatedActor = await rules.applyMovementOrders(ao, game, world, timestep);
            assert.deepEqual(updatedActor.pos, { x: 0, y: 0 });
        });
    });

    describe("applyRulesToActorOrders", () => {

        it("handles a single updated actor with empty orders list", async () => {
            const allActorOrders: Array<ActorOrders> = [];
            const singleActorOrders: ActorOrders = {
                actor: theActor,
                ordersList: []
            };
            allActorOrders.push(singleActorOrders);
            const updatedActors = await rules.applyRulesToActorOrders(game, world, allActorOrders);
            assert.equal(updatedActors.length, allActorOrders.length);
        });

        it("handles a single updated actor with partial orders list", async () => {
            const allActorOrders: Array<ActorOrders> = [];
            const singleActorOrders: ActorOrders = {
                actor: theActor,
                ordersList: [Direction.UP_RIGHT, Direction.UP_RIGHT]
            };
            allActorOrders.push(singleActorOrders);
            const updatedActors = await rules.applyRulesToActorOrders(game, world, allActorOrders);
            assert.equal(updatedActors.length, allActorOrders.length);
        });

        it("handles a single updated actor with complete orders list", async () => {
            const allActorOrders: Array<ActorOrders> = [];
            const singleActorOrders: ActorOrders = {
                actor: theActor,
                ordersList: new Array(TIMESTEP_MAX).fill(Direction.UP_RIGHT)
            };
            allActorOrders.push(singleActorOrders);
            const updatedActors = await rules.applyRulesToActorOrders(game, world, allActorOrders);
            assert.equal(updatedActors.length, allActorOrders.length);
        });

        it("should throw if actor is not present in orders list");

        it("handles several updated actors");

        it("handles empty orders list", async () => {
            const updatedActors = await rules.applyRulesToActorOrders(game, world, []);
            assert.equal(updatedActors.length, 0);

        });
    });

});
