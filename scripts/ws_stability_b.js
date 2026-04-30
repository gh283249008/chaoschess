const WS_URL = process.env.WS_URL || 'ws://127.0.0.1:8080';

function createClient() {
    const ws = new WebSocket(WS_URL);
    const state = { connected: false, clientId: null, token: null, roomId: null, queue: [] };

    ws.addEventListener('open', () => {
        state.connected = true;
    });

    ws.addEventListener('message', event => {
        const msg = JSON.parse(event.data);
        state.queue.push(msg);
        if (msg.type === 'connected') {
            state.clientId = msg?.payload?.clientId || null;
            state.token = msg?.payload?.playerToken || state.token;
        }
        if (msg.type === 'room_created' || msg.type === 'room_joined' || msg.type === 'reconnected') {
            state.roomId = msg?.payload?.roomId || state.roomId;
        }
    });

    return { ws, state };
}

function send(ws, type, payload = {}) {
    ws.send(JSON.stringify({ type, payload, ts: Date.now() }));
}

async function waitUntil(predicate, timeoutMs = 6000, interval = 30) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (predicate()) return true;
        await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false;
}

function lastType(queue, type) {
    for (let i = queue.length - 1; i >= 0; i -= 1) {
        if (queue[i]?.type === type) return queue[i];
    }
    return null;
}

async function main() {
    const a = createClient();
    const b = createClient();
    const connected = await waitUntil(() => a.state.connected && b.state.connected);
    if (!connected) throw new Error(`无法连接服务端 ${WS_URL}`);

    send(a.ws, 'create_room');
    const roomReady = await waitUntil(() => !!a.state.roomId);
    if (!roomReady) throw new Error('创建房间失败');

    send(b.ws, 'join_room', { roomId: a.state.roomId });
    const joined = await waitUntil(() => !!b.state.roomId);
    if (!joined) throw new Error('加入房间失败');

    send(a.ws, 'ready', { ready: true });
    send(b.ws, 'ready', { ready: true });
    const readyOk = await waitUntil(() => {
        const sync = lastType(a.state.queue, 'state_sync');
        const readyByPlayer = sync?.payload?.readyByPlayer || {};
        const vals = Object.values(readyByPlayer);
        return vals.length === 2 && vals.every(Boolean);
    });
    if (!readyOk) throw new Error('双方 ready 同步失败');

    send(a.ws, 'start_match', { mode: 'BO3' });
    const started = await waitUntil(() => {
        const sync = lastType(a.state.queue, 'state_sync');
        return sync?.payload?.status === 'playing';
    });
    if (!started) throw new Error('比赛未开始');

    const roomId = a.state.roomId;
    const token = a.state.token;
    a.ws.close();

    const offlineSeen = await waitUntil(() => {
        const sync = lastType(b.state.queue, 'state_sync');
        const players = sync?.payload?.players || [];
        const red = players.find(p => p.color === 'red');
        return red && red.online === false;
    });
    if (!offlineSeen) throw new Error('未观察到离线状态广播');

    const c = createClient();
    const cConnected = await waitUntil(() => c.state.connected);
    if (!cConnected) throw new Error('重连客户端连接失败');

    send(c.ws, 'reconnect', { roomId, playerToken: token });
    const reconnected = await waitUntil(() => !!lastType(c.state.queue, 'reconnected'));
    if (!reconnected) throw new Error('重连恢复失败');

    const recoveredOnline = await waitUntil(() => {
        const sync = lastType(c.state.queue, 'state_sync');
        const players = sync?.payload?.players || [];
        const red = players.find(p => p.color === 'red');
        return red && red.online === true;
    });
    if (!recoveredOnline) throw new Error('重连后在线状态未恢复');

    const bad = createClient();
    const badConn = await waitUntil(() => bad.state.connected);
    if (!badConn) throw new Error('非法重连客户端连接失败');
    send(bad.ws, 'reconnect', { roomId, playerToken: 'PXXXX' });
    const badErr = await waitUntil(() => {
        const msg = lastType(bad.state.queue, 'error');
        return msg?.payload?.code === 'SESSION_EXPIRED';
    });
    if (!badErr) throw new Error('非法 token 未返回 SESSION_EXPIRED');

    console.log('PASS: 里程碑 B 稳定性脚本通过');
    b.ws.close();
    c.ws.close();
    bad.ws.close();
}

main().catch(err => {
    console.error('FAIL:', err.message);
    process.exit(1);
});
