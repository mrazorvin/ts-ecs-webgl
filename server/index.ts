import { log_info } from "./log";
import { App, WebSocket, us_listen_socket_close, us_listen_socket } from "uWebSockets.js";

const PORT = 9000;
const VERSION = `0.0.1b`;

module.exports = function start() {
  const decoder = new TextDecoder();
  const app = App();
  const clients = new Map<string, { sockets: WebSocket[]; next_id: number }>();

  app.ws("/*", {
    upgrade: (res, req, context) => {
      res.upgrade(
        { url: new URLSearchParams(req.getQuery()).get("id") ?? "" },
        req.getHeader("sec-websocket-key"),
        req.getHeader("sec-websocket-protocol"),
        req.getHeader("sec-websocket-extensions"),
        context
      );
    },
    open: (ws) => {
      const id = ws.url;
      const client = clients.get(id) ?? { next_id: 0, sockets: [] };
      client.sockets.push(ws);
      clients.set(id, client);
    },
    close: (ws) => {
      const id = ws.url;
      const client = clients.get(id);
      if (client != null) {
        client.sockets = client.sockets.filter((socket) => socket !== ws);
      }
    },
    message: (ws, message, isBinary) => {
      const id = ws.url;
      const client = clients.get(id);
      if (client == null) return;
      if (client.next_id >= client.sockets.length) client.next_id = 0;
      const socket = client.sockets[client.next_id];
      socket?.send(message, isBinary, true);
      log_info(`message: [${id}:${client.next_id}] ${decoder.decode(message)}`);
      client.next_id += 1;
    },
  });

  app.get("/*", (res) => {
    res.writeStatus("200 OK").end(`[ws-server] v${VERSION}`);
  });

  let listen_socket: us_listen_socket;
  app.listen(PORT, (socket) => {
    if (socket) {
      log_info(`listen on: ${PORT}`);
      listen_socket = socket;
    } else {
      throw new Error(`[Start()] can't listen on port ${PORT}`);
    }
  });

  return () => {
    us_listen_socket_close(listen_socket);
    for (const client of clients.values()) client.sockets.forEach((socket) => socket.end(1012));
    clients.clear();
  };
};
