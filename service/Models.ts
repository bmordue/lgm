export enum Terrain {
    EMPTY, BLOCKED
}

export enum Direction {
    UP_LEFT, UP_RIGHT, LEFT, RIGHT, DOWN_LEFT, DOWN_RIGHT, NONE
}

export enum ActorState {
    DEAD, ALIVE
}

export interface Game {
    id? :number;
    players? :Array<number>;
    turn :number;
    worldId :number;
}

export interface World {
    id? :number;
    actors :Array<Actor>;
    terrain :Array<Array<Terrain>>
}

export interface Actor {
    id :number;
    pos :GridPosition,
    state :ActorState,
    owner :number // playerId
}

export interface TurnOrders {
    id? :number;
    gameId :number;
    turn :number;
    playerId :number;
    orders :Array<ActorOrders>;
}

export interface TurnResult {
    id? :number,
    gameId :number,
    turn :number,
    playerId :number,
    updatedActors :Array<Actor>
}

export interface TurnStatus {
    complete :Boolean,
    msg? :string,
    turn? :number
}

export interface GridPosition {
    x :number,
    y :number
}

export interface ActorOrders {
    actor :Actor;
    ordersList :Array<Direction>;
}
