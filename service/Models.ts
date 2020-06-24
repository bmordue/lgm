interface Game {
    id? :number;
    players? :Array<number>;
    turn :number;
    worldId :number;
}

interface World {
    id? :number;
    actors :Array<Actor>;
    terrain :Array<Array<Terrain>>
}

enum Terrain {
    EMPTY, BLOCKED
}

interface Actor {
    id :number;
    pos :GridPosition,
    state :ActorState,
    owner :number // playerId
}

interface TurnOrders {
    id? :number;
    gameId :number;
    turn :number;
    playerId :number;
    orders :Array<ActorOrders>;
}

interface TurnResult {
    id? :number,
    gameId :number,
    turn :number,
    playerId :number,
    updatedActors :Array<Actor>
}

enum Direction {
    UP_LEFT, UP_RIGHT, LEFT, RIGHT, DOWN_LEFT, DOWN_RIGHT, NONE
}

enum ActorState {
    DEAD, ALIVE
}

interface GridPosition {
    x :number,
    y :number
}

interface ActorOrders {
    actor :Actor;
    ordersList :Array<Direction>;
}
