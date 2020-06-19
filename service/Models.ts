interface Game {
    id? :number;
    players? :Array<number>;
    turn :number;
    worldId :number;
}

interface World {
    id? :number;
    actors :Array<Actor>;
}

interface Actor {
    id? :number;
}

interface TurnOrders {
    id? :number;
    gameId :number;
    turn :number;
    playerId :number;
    body :Array<ActorOrders>;
}

enum direction {
    UP_LEFT, UP_RIGHT, LEFT, RIGHT, DOWN_LEFT, DOWN_RIGHT
}

interface ActorOrders {
    id? :number;
    actorId :number;
    ordersList :Array<direction>;
}