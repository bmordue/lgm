import assert = require('assert');
import { PostgresStore } from '../service/PostgresStore';
import { keys } from '../service/StoreInterface';
import { ActorState } from '../service/Models';

describe('PostgresStore', () => {
  it('persists game players in create and replace', async () => {
    const queries: Array<{ text: string; values?: any[] }> = [];
    const fakeClient = {
      query: async (text: string, values?: any[]) => {
        queries.push({ text, values });
        if (text.includes('RETURNING id')) {
          return { rows: [{ id: 7 }] };
        }
        return { rows: [{ id: 7, players: [1, 2], turn: 1, worldId: 3 }] };
      }
    } as any;

    const store = new PostgresStore(fakeClient);

    await store.create(keys.games, {
      players: [1, 2],
      maxPlayers: 4,
      gameState: 'LOBBY',
      turn: 1,
      worldId: 3
    });
    await store.replace(keys.games, 7, {
      players: [1, 2],
      maxPlayers: 4,
      gameState: 'LOBBY',
      turn: 1,
      worldId: 3
    });

    assert.strictEqual(queries[0].text.includes('"players"'), true);
    assert.strictEqual(queries[0].values?.[0], JSON.stringify([1, 2]));
    assert.strictEqual(queries[1].text.includes('"players" = $1'), true);
    assert.strictEqual(queries[1].values?.[0], JSON.stringify([1, 2]));
  });

  it('hydrates missing game players list as an empty array', async () => {
    const fakeClient = {
      query: async () => ({ rows: [{ id: 5, turn: 1, worldId: 2 }] })
    } as any;
    const store = new PostgresStore(fakeClient);

    const game = await store.read<any>(keys.games, 5);
    assert.deepStrictEqual(game.players, []);
  });

  it('keeps actor state numeric and preserves zero health values', async () => {
    const queries: Array<{ text: string; values?: any[] }> = [];
    const fakeClient = {
      query: async (text: string, values?: any[]) => {
        queries.push({ text, values });
        return { rows: [{ id: 9 }] };
      }
    } as any;
    const store = new PostgresStore(fakeClient);

    await store.create(keys.actors, {
      id: 9,
      owner: 1,
      pos: { x: 0, y: 0 },
      state: ActorState.DEAD,
      health: 0
    });

    assert.strictEqual(queries[0].values?.[1], ActorState.DEAD);
    assert.strictEqual(queries[0].values?.[3], 0);
  });

  it('returns numeric actor states on read', async () => {
    const fakeClient = {
      query: async () => ({ rows: [{ id: 11, state: ActorState.DEAD }] })
    } as any;
    const store = new PostgresStore(fakeClient);

    const actor = await store.read<any>(keys.actors, 11);
    assert.strictEqual(actor.state, ActorState.DEAD);
  });
});
