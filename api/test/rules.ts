import rules = require('../service/Rules');
import assert = require('assert');
import { Actor, ActorOrders, ActorState, Direction, Game, GridPosition, World, Terrain, OrderType, Weapon } from '../service/Models';
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
            assert.deepEqual(newGridPos, { x: 1, y: 0 });
        });

        it("move down-right", () => {
            const newGridPos = rules.applyDirection(oldGridPos, Direction.DOWN_RIGHT);
            assert.deepEqual(newGridPos, { x: 2, y: 0 });
        });

    });

    describe("applyMovementOrders", () => {

        const timestep = 0;

        beforeEach(() => {
            theActor.pos = { x: 0, y: 0 };
        });

        describe("valid orders", () => {
            it("handles timestep with orders present (no movement)", async () => {
                const ao: ActorOrders = { actor: theActor, ordersList: [Direction.NONE], orderType: OrderType.MOVE };
                const updatedActor = await rules.applyMovementOrders(ao, game, world, timestep);
                assert.deepEqual(updatedActor.pos, { x: 0, y: 0 });
            });

            it("handles timestep with orders present (with movement)", async () => {
                const ao: ActorOrders = { actor: theActor, ordersList: [Direction.UP_RIGHT], orderType: OrderType.MOVE  };
                const updatedActor = await rules.applyMovementOrders(ao, game, world, timestep);
                assert.deepEqual(updatedActor.pos, { x: 0, y: 1 });
            });

            it("handles timestep with no orders", async () => {
                const ao: ActorOrders = { actor: theActor, ordersList: [], orderType: OrderType.MOVE  };
                const updatedActor = await rules.applyMovementOrders(ao, game, world, timestep);
                assert.deepEqual(updatedActor.pos, { x: 0, y: 0 });
            });
        });

        describe("should not be able to move into BLOCKED terrain", () => {
            it("should remain place if new position is BLOCKED", async () => {
                // terrain[1][3] = Terrain.BLOCKED; // from rules.generateTerain()
                const startPos = { x: 1, y: 2 };
                theActor.pos = startPos;
                assert.deepEqual(rules.applyDirection(startPos, Direction.UP_RIGHT), { x: 1, y: 3 }); // just checking

                const ao: ActorOrders = { actor: theActor, ordersList: [Direction.UP_RIGHT], orderType: OrderType.MOVE  };

                const updatedActor = await rules.applyMovementOrders(ao, game, world, timestep);
                assert.deepEqual(updatedActor.pos, startPos);
            });
        });

        describe("should respect world terrain boundaries", () => {

            async function testMoveOutsideTerrain(startPos: GridPosition, direction: Direction) {
                theActor.pos = startPos;
                const ao: ActorOrders = { actor: theActor, ordersList: [direction], orderType: OrderType.MOVE  };
                const updatedActor = await rules.applyMovementOrders(ao, game, world, timestep);
                assert.deepEqual(updatedActor.pos, startPos);
            }

            it("replace DOWN_LEFT move outside of world terrain boundaries with NONE", async () => {
                await testMoveOutsideTerrain({ x: 3, y: 0 }, Direction.DOWN_LEFT);
            });

            it("replace DOWN_RIGHT move outside of world terrain boundaries with NONE", async () => {
                await testMoveOutsideTerrain({ x: 3, y: 0 }, Direction.DOWN_RIGHT);
            });

            it("replace LEFT move outside of world terrain boundaries with NONE", async () => {
                await testMoveOutsideTerrain({ x: 0, y: 3 }, Direction.LEFT);
            });

            it("replace RIGHT move outside of world terrain boundaries with NONE", async () => {
                await testMoveOutsideTerrain({ x: 9, y: 3 }, Direction.RIGHT);
            });

            it("replace UP_LEFT move outside of world terrain boundaries with NONE", async () => {
                await testMoveOutsideTerrain({ x: 3, y: 9 }, Direction.UP_LEFT);
            });

            it("replace UP_RIGHT move outside of world terrain boundaries with NONE", async () => {
                await testMoveOutsideTerrain({ x: 3, y: 9 }, Direction.UP_RIGHT);
            });
        });
    });

    describe("applyRulesToActorOrders", () => {

        it("handles a single updated actor with empty orders list", async () => {
            const allActorOrders: Array<ActorOrders> = [];
            const singleActorOrders: ActorOrders = {
                actor: theActor,
                ordersList: [],
                orderType: OrderType.MOVE 
            };
            allActorOrders.push(singleActorOrders);
            const updatedActors = await rules.applyRulesToActorOrders(game, world, allActorOrders);
            assert.equal(updatedActors.length, allActorOrders.length);
        });

        it("handles a single updated actor with partial orders list", async () => {
            const allActorOrders: Array<ActorOrders> = [];
            const singleActorOrders: ActorOrders = {
                actor: theActor,
                ordersList: [Direction.UP_RIGHT, Direction.UP_RIGHT],
                orderType: OrderType.MOVE 
            };
            allActorOrders.push(singleActorOrders);
            const updatedActors = await rules.applyRulesToActorOrders(game, world, allActorOrders);
            assert.equal(updatedActors.length, allActorOrders.length);
        });

        it("handles a single updated actor with complete orders list", async () => {
            const allActorOrders: Array<ActorOrders> = [];
            const singleActorOrders: ActorOrders = {
                actor: theActor,
                ordersList: new Array(TIMESTEP_MAX).fill(Direction.UP_RIGHT),
                orderType: OrderType.MOVE 
            };
            allActorOrders.push(singleActorOrders);
            const updatedActors = await rules.applyRulesToActorOrders(game, world, allActorOrders);
            assert.equal(updatedActors.length, allActorOrders.length);
        });

        it("handles several updated actors", async () => {
            const actorTwo: Actor = { id: 1, pos: { x: 0, y: 1 }, state: ActorState.ALIVE, owner: 0 };
            const allActorOrders: Array<ActorOrders> = [
                { actor: actorTwo, ordersList: [Direction.UP_RIGHT, Direction.DOWN_LEFT], orderType: OrderType.MOVE },
                { actor: theActor, ordersList: [Direction.UP_RIGHT, Direction.UP_LEFT], orderType: OrderType.MOVE }
            ];
            const updatedActors = await rules.applyRulesToActorOrders(game, world, allActorOrders);
            assert.equal(updatedActors.length, allActorOrders.length);
        });

        it("handles empty orders list", async () => {
            const updatedActors = await rules.applyRulesToActorOrders(game, world, []);
            assert.equal(updatedActors.length, 0);
        });
    });

    describe("filterWorldForPlayer", () => {
        const playerId = 1;
        const enemyPlayerId = 2;
        let baseWorld: World;

        beforeEach(async () => {
            const terrain = await rules.generateTerrain(); // Using the standard 10x10 terrain
            baseWorld = {
                id: 1,
                actors: [],
                terrain: terrain
            };
        });

        it("should show player's own actors", async () => {
            const playerActor: Actor = { id: 1, pos: { x: 1, y: 1 }, state: ActorState.ALIVE, owner: playerId };
            baseWorld.actors.push(playerActor);

            const filteredWorld = await rules.filterWorldForPlayer(baseWorld, playerId);
            assert.deepEqual(filteredWorld.actors, [playerActor]);
            // Check a tile known to be visible around the player's actor
            assert.notEqual(filteredWorld.terrain[1][1], Terrain.UNEXPLORED);
        });

        it("should not show enemy actors if not visible", async () => {
            const playerActor: Actor = { id: 1, pos: { x: 0, y: 0 }, state: ActorState.ALIVE, owner: playerId };
            // Enemy actor far away, guaranteed not to be seen initially with default visibility range
            const enemyActor: Actor = { id: 2, pos: { x: 9, y: 9 }, state: ActorState.ALIVE, owner: enemyPlayerId };
            baseWorld.actors.push(playerActor, enemyActor);

            const filteredWorld = await rules.filterWorldForPlayer(baseWorld, playerId);
            assert.deepEqual(filteredWorld.actors, [playerActor]);
             // Check enemy's tile is unexplored
            assert.equal(filteredWorld.terrain[9][9], Terrain.UNEXPLORED);
        });

        it("should show enemy actors if they are on a visible tile", async () => {
            const playerActor: Actor = { id: 1, pos: { x: 1, y: 1 }, state: ActorState.ALIVE, owner: playerId };
            const enemyActor: Actor = { id: 2, pos: { x: 1, y: 2 }, state: ActorState.ALIVE, owner: enemyPlayerId }; // Close to playerActor
            baseWorld.actors.push(playerActor, enemyActor);

            const filteredWorld = await rules.filterWorldForPlayer(baseWorld, playerId);
            assert.equal(filteredWorld.actors.length, 2, "Should see both player and enemy actor");
            assert.ok(filteredWorld.actors.find(a => a.id === playerActor.id), "Player actor missing");
            assert.ok(filteredWorld.actors.find(a => a.id === enemyActor.id), "Enemy actor missing");
            assert.notEqual(filteredWorld.terrain[1][2], Terrain.UNEXPLORED, "Enemy actor's tile should be visible");
        });

        it("should mark non-visible terrain as UNEXPLORED", async () => {
            // Player actor at (0,0). Visibility range is <10. So (9,9) should be UNEXPLORED.
            const playerActor: Actor = { id: 1, pos: { x: 0, y: 0 }, state: ActorState.ALIVE, owner: playerId };
            baseWorld.actors.push(playerActor);

            const filteredWorld = await rules.filterWorldForPlayer(baseWorld, playerId);
            assert.equal(filteredWorld.terrain[0][0], baseWorld.terrain[0][0]); // Actor's tile
            assert.equal(filteredWorld.terrain[9][9], Terrain.UNEXPLORED);
        });

        it("should show terrain visible by any of the player's actors", async () => {
            const playerActor1: Actor = { id: 1, pos: { x: 0, y: 0 }, state: ActorState.ALIVE, owner: playerId };
            // Actor 2 is placed such that it sees (0,5), which actor 1 might not if range is small or blocked
            const playerActor2: Actor = { id: 3, pos: { x: 0, y: 4 }, state: ActorState.ALIVE, owner: playerId };
            baseWorld.actors.push(playerActor1, playerActor2);
            // Assuming (0,5) is EMPTY and visible from (0,4)
            baseWorld.terrain[0][5] = Terrain.EMPTY;


            const filteredWorld = await rules.filterWorldForPlayer(baseWorld, playerId);
            assert.notEqual(filteredWorld.terrain[0][5], Terrain.UNEXPLORED, "Tile (0,5) should be visible due to playerActor2");
        });

        it("terrain should be UNEXPLORED if no player actors", async () => {
            // Add an enemy actor, but no player actors
            const enemyActor: Actor = { id: 2, pos: { x: 5, y: 5 }, state: ActorState.ALIVE, owner: enemyPlayerId };
            baseWorld.actors.push(enemyActor);

            const filteredWorld = await rules.filterWorldForPlayer(baseWorld, playerId);
            assert.equal(filteredWorld.actors.length, 0, "No player actors should be in the filtered world");
            for (let i = 0; i < filteredWorld.terrain.length; i++) {
                for (let j = 0; j < filteredWorld.terrain[i].length; j++) {
                    assert.equal(filteredWorld.terrain[i][j], Terrain.UNEXPLORED, `Tile (${i},${j}) should be UNEXPLORED`);
                }
            }
        });

        it("should handle blocked terrain correctly for visibility", async () => {
            const playerActor: Actor = { id: 1, pos: { x: 0, y: 0 }, state: ActorState.ALIVE, owner: playerId };
            baseWorld.actors.push(playerActor);
            // Block tile (0,1), so (0,2) should not be visible if direct line of sight is assumed.
            // The visibility function handles complex occlusion, this is a simplified check.
            baseWorld.terrain[0][1] = Terrain.BLOCKED;

            const filteredWorld = await rules.filterWorldForPlayer(baseWorld, playerId);
            assert.equal(filteredWorld.terrain[0][0], baseWorld.terrain[0][0]); // Actor's tile
            assert.equal(filteredWorld.terrain[0][1], Terrain.BLOCKED); // Visible blocked tile

            // Current visibility logic with findPath:
            // Path from (0,0) to (1,1) can be (0,0)->(0,1)->(1,1). (0,1) is blocked by test setup.
            // findPath returns [(0,0)] because current becomes (0,1) which is BLOCKED.
            // In visibility(), path is [(0,0)]. Occlusion loop does not run effectively.
            // lastPathElement is (0,0). terrain[1][1] is EMPTY. path.some for (1,1) is false. visible[1][1] = false.
            assert.equal(filteredWorld.terrain[1][1], Terrain.UNEXPLORED, "Tile (1,1) should be UNEXPLORED due to findPath route via (0,1) blockage");

            // (5,5) is within range. However, path from (0,0) to (5,5) can be occluded by other blocks in generateTerrain() (e.g. terrain[3][4]).
            // If visibility() returns false for (5,5), then it should be UNEXPLORED.
            assert.equal(filteredWorld.terrain[5][5], Terrain.UNEXPLORED, "Tile (5,5) should be UNEXPLORED due to occlusion by a standard map block");
        });
    });

    describe("applyFiringRules", function () {
        // Test setup variables will go here
        let game: Game;
        let world: World;
        let attacker: Actor;
        let target: Actor;
        const defaultWeapon: Weapon = { name: "Test Blaster", range: 5, damage: 10 };
        const longRangeWeapon: Weapon = { name: "Test Sniper", range: 10, damage: 25 };

        beforeEach(async () => {
            // Initialize a simple 10x10 empty terrain for most tests
            const terrain: Terrain[][] = Array(10).fill(null).map(() => Array(10).fill(Terrain.EMPTY));

            attacker = {
                id: 1,
                pos: { x: 0, y: 0 },
                state: ActorState.ALIVE,
                owner: 1,
                health: 100,
                weapon: { ...defaultWeapon }
            };
            target = {
                id: 2,
                pos: { x: 0, y: 1 },
                state: ActorState.ALIVE,
                owner: 2,
                health: 100,
                weapon: { ...defaultWeapon }
            };

            world = {
                id: 0,
                actors: [attacker, target],
                terrain: terrain
            };
            game = { turn: 1, worldId: 0, players: [1, 2] };
        });

        // --- Test Cases for Weapon Range ---
        it("should allow attack if target is within range and LoS is clear", async () => {
            attacker.pos = { x: 0, y: 0 };
            target.pos = { x: 0, y: 1 }; // Distance 1, range 5
            const order: ActorOrders = { actor: attacker, orderType: OrderType.ATTACK, targetId: target.id };

            await rules.applyRulesToActorOrders(game, world, [order]); // Using applyRulesToActorOrders to invoke applyFiringRules

            assert.strictEqual(target.health, 90, "Target health should be reduced");
        });

        it("should not apply damage if target is out of range", async () => {
            attacker.pos = { x: 0, y: 0 };
            target.pos = { x: 0, y: 6 }; // Distance 6, range 5
            const order: ActorOrders = { actor: attacker, orderType: OrderType.ATTACK, targetId: target.id };

            await rules.applyRulesToActorOrders(game, world, [order]);

            assert.strictEqual(target.health, 100, "Target health should not change if out of range");
        });

        it("should allow attack at exact maximum range", async () => {
            attacker.pos = { x: 0, y: 0 };
            target.pos = { x: 0, y: 5 }; // Distance 5, range 5
            const order: ActorOrders = { actor: attacker, orderType: OrderType.ATTACK, targetId: target.id };

            await rules.applyRulesToActorOrders(game, world, [order]);

            assert.strictEqual(target.health, 90, "Target health should be reduced at max range");
        });

        // --- Test Cases for Damage Calculation ---
        it("should reduce target health by weapon damage", async () => {
            attacker.pos = { x: 0, y: 0 };
            target.pos = { x: 0, y: 1 };
            attacker.weapon.damage = 25;
            const order: ActorOrders = { actor: attacker, orderType: OrderType.ATTACK, targetId: target.id };

            await rules.applyRulesToActorOrders(game, world, [order]);

            assert.strictEqual(target.health, 75, "Target health should be 100 - 25");
        });

        it("should set target state to DEAD if health drops to 0", async () => {
            attacker.pos = { x: 0, y: 0 };
            target.pos = { x: 0, y: 1 };
            target.health = 5;
            attacker.weapon.damage = 10;
            const order: ActorOrders = { actor: attacker, orderType: OrderType.ATTACK, targetId: target.id };

            await rules.applyRulesToActorOrders(game, world, [order]);

            assert.strictEqual(target.health, 0, "Target health should be 0");
            assert.strictEqual(target.state, ActorState.DEAD, "Target state should be DEAD");
        });

        it("should set target health to 0 if damage exceeds current health (not negative)", async () => {
            attacker.pos = { x: 0, y: 0 };
            target.pos = { x: 0, y: 1 };
            target.health = 5;
            attacker.weapon.damage = 100;
            const order: ActorOrders = { actor: attacker, orderType: OrderType.ATTACK, targetId: target.id };

            await rules.applyRulesToActorOrders(game, world, [order]);

            assert.strictEqual(target.health, 0, "Target health should be capped at 0");
            assert.strictEqual(target.state, ActorState.DEAD, "Target state should be DEAD");
        });

        // --- Test Cases for Line of Sight (LoS) ---
        it("should not apply damage if LoS is blocked by terrain", async () => {
            attacker.pos = { x: 0, y: 0 };
            target.pos = { x: 0, y: 2 }; // Distance 2, range 5
            world.terrain[0][1] = Terrain.BLOCKED; // Block LoS between (0,0) and (0,2)
            const order: ActorOrders = { actor: attacker, orderType: OrderType.ATTACK, targetId: target.id };

            await rules.applyRulesToActorOrders(game, world, [order]);

            assert.strictEqual(target.health, 100, "Target health should not change if LoS blocked by terrain");
        });

        it("should not apply damage if LoS is blocked by another actor", async () => {
            attacker.pos = { x: 0, y: 0 };
            target.pos = { x: 0, y: 2 }; // Distance 2, range 5
            const blocker: Actor = {
                id: 3,
                pos: { x: 0, y: 1 }, // Positioned between attacker and target
                state: ActorState.ALIVE,
                owner: 3,
                health: 100,
                weapon: { ...defaultWeapon }
            };
            world.actors.push(blocker);
            const order: ActorOrders = { actor: attacker, orderType: OrderType.ATTACK, targetId: target.id };

            await rules.applyRulesToActorOrders(game, world, [order]);

            assert.strictEqual(target.health, 100, "Target health should not change if LoS blocked by another actor");
        });

        it("should allow attack if LoS is clear (even with other actors not in path)", async () => {
            attacker.pos = { x: 0, y: 0 };
            target.pos = { x: 0, y: 1 };
            const otherActor: Actor = { id: 3, pos: {x: 5, y: 5}, state: ActorState.ALIVE, owner: 3, health: 100, weapon: defaultWeapon};
            world.actors.push(otherActor); // Add another actor far away
            const order: ActorOrders = { actor: attacker, orderType: OrderType.ATTACK, targetId: target.id };

            await rules.applyRulesToActorOrders(game, world, [order]);

            assert.strictEqual(target.health, 90, "Target health should be reduced with clear LoS");
        });

        // --- Test Cases for Attack Orders ---
        it("should not do anything if orderType is not ATTACK", async () => {
            attacker.pos = { x: 0, y: 0 };
            target.pos = { x: 0, y: 1 };
            const order: ActorOrders = { actor: attacker, orderType: OrderType.MOVE, ordersList: [Direction.NONE], targetId: target.id }; // MOVE order

            await rules.applyRulesToActorOrders(game, world, [order]);

            assert.strictEqual(target.health, 100, "Target health should not change for MOVE order");
        });

        it("should not attack if targetId is missing", async () => {
            attacker.pos = { x: 0, y: 0 };
            const order: ActorOrders = { actor: attacker, orderType: OrderType.ATTACK }; // No targetId

            await rules.applyRulesToActorOrders(game, world, [order]);

            assert.strictEqual(target.health, 100, "Target health should not change if targetId is missing");
        });

        it("should not attack if attacker has no weapon", async () => {
            attacker.pos = { x: 0, y: 0 };
            target.pos = { x: 0, y: 1 };
            (attacker as any).weapon = undefined; // Remove weapon
            const order: ActorOrders = { actor: attacker, orderType: OrderType.ATTACK, targetId: target.id };

            await rules.applyRulesToActorOrders(game, world, [order]);

            assert.strictEqual(target.health, 100, "Target health should not change if attacker has no weapon");
        });

        it("should not attack if target actor does not exist", async () => {
            attacker.pos = { x: 0, y: 0 };
            const order: ActorOrders = { actor: attacker, orderType: OrderType.ATTACK, targetId: 999 }; // Non-existent target

            await rules.applyRulesToActorOrders(game, world, [order]);
            // No direct assertion on health of a non-existent target, but code should not crash.
            // We can check attacker's state or if any error was logged if needed, but for now, just graceful execution.
            assert.ok(true, "Execution should complete without error for non-existent target.");
        });

        it("should not attack if target is already DEAD", async () => {
            attacker.pos = { x: 0, y: 0 };
            target.pos = { x: 0, y: 1 };
            target.state = ActorState.DEAD;
            target.health = 0;
            const order: ActorOrders = { actor: attacker, orderType: OrderType.ATTACK, targetId: target.id };

            await rules.applyRulesToActorOrders(game, world, [order]);

            assert.strictEqual(target.health, 0, "Dead target's health should remain 0");
        });

        it("should not allow actor to attack itself", async () => {
            attacker.pos = { x: 0, y: 0 };
            const order: ActorOrders = { actor: attacker, orderType: OrderType.ATTACK, targetId: attacker.id }; // Target self

            await rules.applyRulesToActorOrders(game, world, [order]);

            assert.strictEqual(attacker.health, 100, "Attacker health should not change when targeting self");
        });
    });
});
