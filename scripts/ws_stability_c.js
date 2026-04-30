const WS_URL = process.env.WS_URL || 'ws://127.0.0.1:8080';

function createClient() {
    const ws = new WebSocket(WS_URL);
    const state = { connected: false, roomId: null, queue: [] };

    ws.addEventListener('open', () => {
        state.connected = true;
    });

    ws.addEventListener('message', event => {
        const msg = JSON.parse(event.data);
        state.queue.push(msg);
        if (msg.type === 'room_created' || msg.type === 'room_joined' || msg.type === 'reconnected') {
            state.roomId = msg?.payload?.roomId || state.roomId;
        }
    });

    return { ws, state };
}

function send(ws, type, payload = {}) {
    ws.send(JSON.stringify({ type, payload, ts: Date.now() }));
}

function lastByType(queue, type) {
    for (let i = queue.length - 1; i >= 0; i -= 1) {
        if (queue[i]?.type === type) return queue[i];
    }
    return null;
}

async function waitUntil(predicate, timeoutMs = 6000, interval = 20) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (predicate()) return true;
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false;
}

async function main() {
    const red = createClient();
    const black = createClient();

    const connected = await waitUntil(() => red.state.connected && black.state.connected);
    if (!connected) throw new Error(`无法连接服务端 ${WS_URL}`);

    send(red.ws, 'create_room');
    const roomCreated = await waitUntil(() => !!red.state.roomId);
    if (!roomCreated) throw new Error('创建房间失败');

    send(black.ws, 'join_room', { roomId: red.state.roomId });
    const joined = await waitUntil(() => !!black.state.roomId);
    if (!joined) throw new Error('加入房间失败');

    send(red.ws, 'ready', { ready: true });
    send(black.ws, 'ready', { ready: true });
    const bothReady = await waitUntil(() => {
        const sync = lastByType(red.state.queue, 'state_sync');
        const values = Object.values(sync?.payload?.readyByPlayer || {});
        return values.length === 2 && values.every(Boolean);
    });
    if (!bothReady) throw new Error('双方 ready 未同步');

    send(red.ws, 'start_match', { mode: 'BO3' });
    const started = await waitUntil(() => {
        const sync = lastByType(red.state.queue, 'state_sync');
        return sync?.payload?.roundState?.status === 'buying';
    });
    if (!started) throw new Error('未进入 buying 阶段');

    const buyingSync = lastByType(red.state.queue, 'state_sync');
    const buyingSeq = buyingSync?.payload?.seq || 0;

    send(black.ws, 'player_action', {
        action: {
            kind: 'SYNC_STATE',
            boardState: { pieces: [] },
            state: { currentPlayer: 'red', gameMode: 'move', riverBlockedTurns: 0, extraTurns: 0 }
        },
        clientActionId: 'c-not-turn',
        sentAt: Date.now()
    });

    const notTurn = await waitUntil(() => {
        const err = lastByType(black.state.queue, 'error');
        return err?.payload?.code === 'INVALID_PHASE';
    });
    if (!notTurn) throw new Error('buying 阶段 SYNC_STATE 未返回 INVALID_PHASE');

    send(black.ws, 'player_action', {
        action: { kind: 'NEXT_ROUND' },
        clientActionId: 'c-next-invalid',
        sentAt: Date.now()
    });
    const invalidPhase = await waitUntil(() => {
        const err = lastByType(black.state.queue, 'error');
        return err?.payload?.code === 'INVALID_PHASE';
    });
    if (!invalidPhase) throw new Error('buying 阶段 NEXT_ROUND 未返回 INVALID_PHASE');

    send(red.ws, 'player_action', {
        action: { kind: 'SYNC_STATE', state: { currentPlayer: 'black' } },
        clientActionId: 'c-invalid-payload',
        sentAt: Date.now()
    });
    const invalidAction = await waitUntil(() => {
        const err = lastByType(red.state.queue, 'error');
        return err?.payload?.code === 'INVALID_PHASE' || err?.payload?.code === 'INVALID_ACTION';
    });
    if (!invalidAction) throw new Error('无效 payload 未被拒绝');

    send(red.ws, 'player_action', { action: { kind: 'BEGIN_ROUND' }, clientActionId: 'c-begin-round', sentAt: Date.now() });
    const enteredPlaying = await waitUntil(() => {
        const sync = lastByType(red.state.queue, 'state_sync');
        return sync?.payload?.roundState?.status === 'playing';
    });
    if (!enteredPlaying) throw new Error('BEGIN_ROUND 后未进入 playing');

    const playingSync = lastByType(red.state.queue, 'state_sync');
    const seqBeforeSync = playingSync?.payload?.seq || 0;

    send(black.ws, 'player_action', {
        action: {
            kind: 'SYNC_STATE',
            boardState: { step: 1 },
            state: { currentPlayer: 'red', gameMode: 'move', riverBlockedTurns: 0, extraTurns: 0 }
        },
        clientActionId: 'c-wrong-turn',
        sentAt: Date.now()
    });

    const notYourTurn = await waitUntil(() => {
        const err = lastByType(black.state.queue, 'error');
        return err?.payload?.code === 'NOT_YOUR_TURN';
    });
    if (!notYourTurn) throw new Error('非行动方 SYNC_STATE 未返回 NOT_YOUR_TURN');

    send(red.ws, 'player_action', {
        action: {
            kind: 'SYNC_STATE',
            boardState: { step: 2 },
            state: { currentPlayer: 'black', gameMode: 'move', riverBlockedTurns: 0, extraTurns: 0 }
        },
        clientActionId: 'c-valid-sync',
        sentAt: Date.now()
    });

    const seqIncreased = await waitUntil(() => {
        const sync = lastByType(red.state.queue, 'state_sync');
        const nextSeq = sync?.payload?.seq || 0;
        return nextSeq > seqBeforeSync;
    });
    if (!seqIncreased) throw new Error('合法 SYNC_STATE 后 seq 未递增');

    const latest = lastByType(red.state.queue, 'state_sync');
    if (latest?.payload?.reason !== 'PLAYER_ACTION_APPLIED') {
        throw new Error('合法动作后 reason 不是 PLAYER_ACTION_APPLIED');
    }

    if ((latest?.payload?.seq || 0) <= buyingSeq) {
        throw new Error('seq 未保持单调递增');
    }

    console.log('PASS: 里程碑 C 稳定性脚本通过');
    red.ws.close();
    black.ws.close();
}

main().catch(error => {
    console.error('FAIL:', error.message);
    process.exit(1);
});
