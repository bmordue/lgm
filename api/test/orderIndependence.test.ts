import assert = require("assert");
import { applyRulesToActorOrders } from "../service/Rules";
import { Actor, ActorState, Direction, Game, OrderType, Terrain, World, ActorOrders } from "../service/Models";
import { WEAPON_TYPES } from "../config/WeaponsConfig";

describe("Order independence in applyRulesToActorOrders", () => {
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

    it("firing should be based on positions at the start of the timestep", () => {
        // Attacker at (0,0), Target at (2,0)
        // Rifle max range is 2.
        const attacker: Actor = {
            id: 1,
            pos: { x: 0, y: 0 },
            state: ActorState.ALIVE,
            owner: 1,
            health: 100,
            weapon: { ...WEAPON_TYPES.RIFLE, maxRange: 2 }
        };
        const target: Actor = {
            id: 2,
            pos: { x: 2, y: 0 },
            state: ActorState.ALIVE,
            owner: 2,
            health: 100
        };

        // Order 1: Target moves RIGHT (to (3,0)), out of range.
        // Order 2: Attacker attacks Target.
        const orders: ActorOrders[] = [
            { actorId: 2, orderType: OrderType.MOVE, ordersList: [Direction.RIGHT] },
            { actorId: 1, orderType: OrderType.ATTACK, targetId: 2 }
        ];

        const actors = [attacker, target];
        const result = applyRulesToActorOrders(game, world, orders, actors);

        const updatedTarget = result.find(a => a.id === 2)!;

        // Target should have been hit because it was in range at start of TS
        assert.ok(updatedTarget.health < 100, "Target should have been hit because it was in range at start of TS");
    });
});
