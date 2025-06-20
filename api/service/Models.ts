export enum Terrain {
    EMPTY, BLOCKED, UNEXPLORED
}

export enum Direction {
    UP_LEFT, UP_RIGHT, LEFT, RIGHT, DOWN_LEFT, DOWN_RIGHT, NONE
}

export enum ActorState {
    DEAD, ALIVE
}

export interface Game {
    id?: number;
    players?: Array<number>;
    turn: number;
    worldId: number;
}

export interface World {
    id?: number;
    actors: Array<Actor>; // TODO: should be actor IDs instead?
    terrain: Array<Array<Terrain>>
}

export interface Actor {
    id: number;
    pos: GridPosition,
    state: ActorState,
    owner: number // playerId
    health?: number;
    weapon?: Weapon;
}

export interface Weapon {
    name: string;
    range: number; // in hexes
    damage: number;
    ammo?: number; // optional
}

export interface TurnOrders {
    id?: number;
    gameId: number;
    turn: number;
    playerId: number;
    orders: Array<ActorOrders>;
}

export interface TurnResult {
    id?: number,
    gameId: number,
    turn: number,
    playerId: number,
    updatedActors: Array<Actor>
}

export interface TurnStatus {
    complete: boolean,
    msg?: string,
    turn?: number
}

export interface GridPosition {
    x: number,
    y: number
}

export enum OrderType {
    MOVE,
    ATTACK
}

export interface ActorOrders {
    actor: Actor; // Or actorId: number; depending on current usage
    orderType: OrderType;
    ordersList?: Array<Direction>; // For MOVE orders
    targetId?: number; // For ATTACK orders, ID of the target Actor
}
