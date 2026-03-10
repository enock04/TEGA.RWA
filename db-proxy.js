/**
 * TCP proxy: listens on 0.0.0.0:15432 and forwards to Supabase IPv6 host.
 * Run this on the Windows host so Docker containers can reach Supabase via
 * host.docker.internal:15432 (Docker containers can't route IPv6 directly).
 *
 * Usage: node db-proxy.js
 */
const net = require('net');

const REMOTE_HOST = 'db.ujphhjdrnuolxtddpkzs.supabase.co';
const REMOTE_PORT = 5432;
const LOCAL_PORT  = 15432;

const server = net.createServer(socket => {
  const remote = net.createConnection(REMOTE_PORT, REMOTE_HOST);

  socket.pipe(remote);
  remote.pipe(socket);

  const cleanup = () => { socket.destroy(); remote.destroy(); };
  socket.on('error', cleanup);
  remote.on('error', cleanup);
  socket.on('close', cleanup);
  remote.on('close', cleanup);
});

server.listen(LOCAL_PORT, '0.0.0.0', () => {
  console.log(`[db-proxy] Listening on 0.0.0.0:${LOCAL_PORT} -> ${REMOTE_HOST}:${REMOTE_PORT}`);
});

server.on('error', err => {
  console.error('[db-proxy] Server error:', err.message);
  process.exit(1);
});
