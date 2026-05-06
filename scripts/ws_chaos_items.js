import { spawn } from 'node:child_process';

const DEFAULT_PORT = Number(process.env.CHAOS_PORT || 18080 + Math.floor(Math.random() * 1000));
const WS_URL = process.env.WS_URL || `ws://127.0.0.1:${DEFAULT_PORT}`;
const STEPS = Number(process.env.CHAOS_STEPS || 50);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createClient(name) {
    const ws = new WebSocket(WS_URL);
    const state = {
        name,
        connected: false,
        roomId: null,
        token: null,
        queue: [],
        seqSeen: 0,
        clientActionInc: 0
    };

    ws.addEventListener('open', () => {
        state.connected = true;
    });

    ws.addEventListener('message', event => {
        const msg = JSON.parse(event.data);
        state.queue.push(msg);
        if (msg.type === 'connected') {
            state.token = msg.payload?.playerToken || state.token;
        }
        if (msg.type === 'room_created' || msg.type === 'room_joined' || msg.type === 'reconnected') {
            state.roomId = msg.payload?.roomId || state.roomId;
        }
        if (msg.type === 'state_sync') {
            const seq = msg.payload?.seq || 0;
            if (seq < state.seqSeen) {
                throw new Error(`${name} observed non-monotonic seq: ${seq} < ${state.seqSeen}`);
            }
            state.seqSeen = seq;
        }
    });

    return { ws, state };
}

function send(ws, type, payload = {}) {
    ws.send(JSON.stringify({ type, payload, ts: Date.now() }));
}

function nextActionId(state) {
    state.clientActionInc += 1;
    return `${state.name}-${Date.now()}-${state.clientActionInc}`;
}

async function waitUntil(predicate, timeoutMs = 8000, interval = 20) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (predicate()) return true;
        await sleep(interval);
    }
    return false;
}

function lastSync(state) {
    for (let i = state.queue.length - 1; i >= 0; i--) {
        if (state.queue[i]?.type === 'state_sync') return state.queue[i];
    }
    return null;
}

async function setupMatch(a, b) {
    send(a.ws, 'create_room');
    const created = await waitUntil(() => !!a.state.roomId);
    if (!created) throw new Error('create_room failed');

    send(b.ws, 'join_room', { roomId: a.state.roomId });
    const joined = await waitUntil(() => !!b.state.roomId);
    if (!joined) throw new Error('join_room failed');

    send(a.ws, 'ready', { ready: true });
    send(b.ws, 'ready', { ready: true });
    await waitUntil(() => {
        const sync = lastSync(a.state)?.payload;
        const vals = Object.values(sync?.readyByPlayer || {});
        return vals.length === 2 && vals.every(Boolean);
    });

    send(a.ws, 'start_match', { mode: 'BO3' });
    await waitUntil(() => lastSync(a.state)?.payload?.status === 'playing');

    const beginId = nextActionId(a.state);
    send(a.ws, 'player_action', {
        action: { kind: 'BEGIN_ROUND' },
        clientActionId: beginId,
        sentAt: Date.now()
    });
    await waitUntil(() => lastSync(a.state)?.payload?.roundState?.status === 'playing');
}

function buildRandomSyncAction(turnColor) {
    const next = turnColor === 'red' ? 'black' : 'red';
    return {
        kind: 'SYNC_STATE',
        boardState: { pieces: [], smokeEffects: [], nonce: Math.random() },
        state: {
            currentPlayer: next,
            gameMode: Math.random() > 0.5 ? 'move' : 'place',
            placeModePieceType: Math.random() > 0.5 ? 'go' : 'flip',
            riverBlockedTurns: 0,
            turnBudget: { red: 1, black: 1 },
            waitingForTarget: null
        }
    };
}

async function chaosLoop(a, b) {
    for (let i = 0; i < STEPS; i++) {
        const sync = lastSync(a.state)?.payload || lastSync(b.state)?.payload;
        const turnColor = sync?.roundState?.turnColor || 'red';
        const actor = turnColor === 'red' ? a : b;
        const wrong = turnColor === 'red' ? b : a;

        if (Math.random() < 0.25) {
            const dupId = nextActionId(actor.state);
            const action = buildRandomSyncAction(turnColor);
            send(actor.ws, 'player_action', { action, clientActionId: dupId, sentAt: Date.now() });
            send(actor.ws, 'player_action', { action, clientActionId: dupId, sentAt: Date.now() + 1 });
        } else {
            send(actor.ws, 'player_action', {
                action: buildRandomSyncAction(turnColor),
                clientActionId: nextActionId(actor.state),
                sentAt: Date.now()
            });
        }

        if (Math.random() < 0.2) {
            send(wrong.ws, 'player_action', {
                action: buildRandomSyncAction(turnColor),
                clientActionId: nextActionId(wrong.state),
                sentAt: Date.now()
            });
        }

        if (Math.random() < 0.15) {
            const roomId = actor.state.roomId;
            const token = actor.state.token;
            actor.ws.close();
            await sleep(80);
            const rc = createClient(`${actor.state.name}-re`);
            const ok = await waitUntil(() => rc.state.connected, 3000);
            if (ok) {
                send(rc.ws, 'reconnect', { roomId, playerToken: token });
                await sleep(80);
                actor.ws = rc.ws;
                actor.state.connected = rc.state.connected;
                actor.state.roomId = rc.state.roomId || roomId;
                actor.state.token = token;
                actor.state.queue.push(...rc.state.queue);
                actor.state.seqSeen = Math.max(actor.state.seqSeen, rc.state.seqSeen);
            }
        }

        await sleep(40);
    }
}

async function main() {
    const server = spawn('node', ['server/src/index.js'], {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: { ...process.env, PORT: String(DEFAULT_PORT) }
    });
    let serverFailed = false;
    server.on('exit', code => {
        if (code && code !== 0) {
            serverFailed = true;
        }
    });
    await sleep(700);
    if (serverFailed) {
        throw new Error('chaos server failed to start');
    }

    const a = createClient('A');
    const b = createClient('B');
    const opened = await waitUntil(() => a.state.connected && b.state.connected, 4000);
    if (!opened) throw new Error('clients open failed');

    await setupMatch(a, b);
    await chaosLoop(a, b);

    console.log(`PASS: chaos test passed (${STEPS} steps)`);
    a.ws.close();
    b.ws.close();
    server.kill('SIGTERM');
}

main().catch(err => {
    console.error('FAIL:', err.message);
    process.exit(1);
});
