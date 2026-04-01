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
    isHost?: boolean;
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
    maxHealth?: number;              // NEW: Maximum health for regeneration tracking
    weapon?: Weapon;
    armor?: number;                  // NEW: Damage reduction (0-50)
    
    // Combat state (NEW)
    currentAmmo?: number;            // Current ammunition
    isUnderCover?: boolean;          // Currently in cover
    coverBonus?: number;             // Cover damage reduction %
    isAiming?: boolean;              // Aiming bonus active
    aimBonus?: number;               // Aim accuracy bonus %
}

export interface Weapon {
    name: string;
    minRange: number; // minimum range in hexes (0 for melee weapons)
    maxRange: number; // maximum range in hexes
    baseDamage?: number;             // NEW: Base damage (renamed from damage for clarity)
    damage?: number;                 // DEPRECATED: Keep for backward compatibility, use baseDamage
    optimalRange?: number;           // NEW: Best accuracy distance
    accuracy?: number;               // NEW: Base hit chance modifier (0-100)
    penetration?: number;            // NEW: Armor piercing (0-100)
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
    world: World
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
    actorId: number; // Using ID instead of object for API requests
    // Remove actor field to enforce ID-based access
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
