const WS_URL = process.env.WS_URL || 'ws://127.0.0.1:8080';

function createClient(name) {
    const ws = new WebSocket(WS_URL);
    const state = {
        name,
        connected: false,
        roomId: null,
        clientId: null,
        queue: []
    };

    ws.addEventListener('open', () => {
        state.connected = true;
    });

    ws.addEventListener('message', event => {
        const data = JSON.parse(event.data);
        state.queue.push(data);
        if (data.type === 'connected') {
            state.clientId = data?.payload?.clientId || null;
        }
        if (data.type === 'room_created' || data.type === 'room_joined') {
            state.roomId = data?.payload?.roomId || null;
        }
    });

    return { ws, state };
}

function send(ws, type, payload = {}) {
    ws.send(JSON.stringify({ type, payload, ts: Date.now() }));
}

async function waitUntil(predicate, timeoutMs = 5000, interval = 20) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (predicate()) return true;
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false;
}

function lastStateSync(queue) {
    for (let i = queue.length - 1; i >= 0; i -= 1) {
        if (queue[i]?.type === 'state_sync') {
            return queue[i];
        }
    }
    return null;
}

async function main() {
    const a = createClient('A');
    const b = createClient('B');

    const openOk = await waitUntil(() => a.state.connected && b.state.connected, 5000);
    if (!openOk) {
        throw new Error(`连接失败，请确认服务端已启动: ${WS_URL}`);
    }

    send(a.ws, 'create_room');
    const created = await waitUntil(() => !!a.state.roomId);
    if (!created) throw new Error('A 创建房间失败');

    send(b.ws, 'join_room', { roomId: a.state.roomId });
    const joined = await waitUntil(() => !!b.state.roomId);
    if (!joined) throw new Error('B 加入房间失败');

    send(a.ws, 'ready', { ready: true });
    send(b.ws, 'ready', { ready: true });

    const bothReady = await waitUntil(() => {
        const sync = lastStateSync(a.state.queue);
        const readyByPlayer = sync?.payload?.readyByPlayer || {};
        const values = Object.values(readyByPlayer);
        return values.length === 2 && values.every(Boolean);
    }, 5000);
    if (!bothReady) throw new Error('双方 ready 未同步完成');

    send(a.ws, 'start_match', { mode: 'BO3' });

    const started = await waitUntil(() => {
        const sync = lastStateSync(a.state.queue);
        return sync?.payload?.status === 'playing' && sync?.payload?.roundState?.status === 'buying';
    }, 5000);
    if (!started) throw new Error('比赛未进入 playing/buying');

    send(a.ws, 'player_action', { action: { kind: 'BEGIN_ROUND' }, clientActionId: 'dup-1', sentAt: Date.now() });
    await new Promise(resolve => setTimeout(resolve, 100));
    const firstSync = lastStateSync(a.state.queue);
    const firstSeq = firstSync?.payload?.seq || 0;

    send(a.ws, 'player_action', { action: { kind: 'BEGIN_ROUND' }, clientActionId: 'dup-1', sentAt: Date.now() + 1 });
    await new Promise(resolve => setTimeout(resolve, 150));
    const secondSync = lastStateSync(a.state.queue);
    const secondSeq = secondSync?.payload?.seq || 0;

    if (secondSeq !== firstSeq) {
        throw new Error(`重复 action 不应推进 seq: first=${firstSeq}, second=${secondSeq}`);
    }

    const protocolVersion = secondSync?.payload?.protocolVersion;
    if (protocolVersion !== '1') {
        throw new Error(`protocolVersion 异常: ${protocolVersion}`);
    }

    const reason = secondSync?.payload?.reason;
    if (!reason) {
        throw new Error('state_sync 缺少 reason 字段');
    }

    console.log('PASS: 里程碑 A 稳定性脚本通过');
    a.ws.close();
    b.ws.close();
}

main().catch(error => {
    console.error('FAIL:', error.message);
    process.exit(1);
});
