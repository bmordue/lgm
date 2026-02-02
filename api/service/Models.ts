export enum Terrain {
    EMPTY, BLOCKED, UNEXPLORED
}

export enum Direction {
    UP_LEFT, UP_RIGHT, LEFT, RIGHT, DOWN_LEFT, DOWN_RIGHT, NONE
}

export enum ActorState {
    DEAD, ALIVE
}

export enum GameState {
    LOBBY = 'LOBBY',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED'
}

export interface Game {
    id?: number;
    players?: Array<number>;
    hostPlayerId?: number;
    maxPlayers?: number;
    gameState?: GameState;
    turn: number;
    worldId: number;
    createdAt?: Date;
    startedAt?: Date;
}

export interface Player {
    id?: number;
    gameId: number;
    username?: string;
    joinedAt?: Date;
    sessionId?: string;
}

export interface World {
    id?: number;
    actorIds: Array<number>;
    actors?: Array<Actor>; // Optional, populated for API responses
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
    world: World // Changed from updatedActors to world
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

export interface Player {
    id?: number;
    gameId: number;
    username?: string;
    isHost?: boolean;                // NEW: Host flag
    joinedAt?: Date;                 // NEW: Join timestamp
    sessionId?: string;              // NEW: Session tracking
}