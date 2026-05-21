import assert = require("assert");
import { simulateTurn } from "../service/Rules";
import { Actor, ActorState, Direction, Game, OrderType, Terrain, World, TurnOrders, ActorOrders } from "../service/Models";
import { WEAPON_TYPES } from "../config/WeaponsConfig";

describe("simulateTurn (pure)", () => {
    const terrain: Terrain[][] = Array(10).fill(null).map(() => Array(10).fill(Terrain.EMPTY));
    const world: World = {
        id: 1,
        terrain: terrain,
        actorIds: [1, 2]
    };
    const game: Game = {
        id: 1,
        turn: 1,
        worldId: 1,
        players: [1, 2]
    };

    it("should handle movement correctly", () => {
        const actors: Actor[] = [
            { id: 1, pos: { x: 0, y: 0 }, state: ActorState.ALIVE, owner: 1 }
        ];
        const orders: ActorOrders[] = [
            { actorId: 1, orderType: OrderType.MOVE, ordersList: [Direction.RIGHT] }
        ];

        const result = simulateTurn(game, world, orders, actors);

        assert.strictEqual(result.updatedActors.length, 1);
        assert.strictEqual(result.updatedActors[0].pos.x, 1);
        assert.strictEqual(result.updatedActors[0].pos.y, 0);
    });

    it("should handle combat correctly", () => {
        const attacker: Actor = {
            id: 1,
            pos: { x: 0, y: 0 },
            state: ActorState.ALIVE,
            owner: 1,
            health: 100,
            weapon: { ...WEAPON_TYPES.RIFLE }
        };
        const target: Actor = {
            id: 2,
            pos: { x: 1, y: 0 },
            state: ActorState.ALIVE,
            owner: 2,
            health: 100
        };
        const actors = [attacker, target];
        const orders: ActorOrders[] = [
            { actorId: 1, orderType: OrderType.ATTACK, targetId: 2 }
        ];

        const result = simulateTurn(game, world, orders, actors);

        const updatedTarget = result.updatedActors.find(a => a.id === 2)!;
        assert.ok(updatedTarget.health < 100);
    });

    it("should generate turn results for all players", () => {
        const actors: Actor[] = [
            { id: 1, pos: { x: 0, y: 0 }, state: ActorState.ALIVE, owner: 1 }
        ];
        const result = simulateTurn(game, world, [], actors);

        assert.strictEqual(result.turnResults.length, 2);
        assert.strictEqual(result.turnResults[0].playerId, 1);
        assert.strictEqual(result.turnResults[1].playerId, 2);
    });

    it("should respect blocked terrain for movement", () => {
        const blockedWorld = {
            ...world,
            terrain: terrain.map((row, x) => row.map((tile, y) => (x === 1 && y === 0 ? Terrain.BLOCKED : tile)))
        };
        const actors: Actor[] = [
            { id: 1, pos: { x: 0, y: 0 }, state: ActorState.ALIVE, owner: 1 }
        ];
        const orders: ActorOrders[] = [
            { actorId: 1, orderType: OrderType.MOVE, ordersList: [Direction.RIGHT] }
        ];

        const result = simulateTurn(game, blockedWorld, orders, actors);

        assert.strictEqual(result.updatedActors[0].pos.x, 0);
        assert.strictEqual(result.updatedActors[0].pos.y, 0);
    });
});
