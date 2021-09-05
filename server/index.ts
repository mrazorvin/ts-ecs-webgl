import { log_info } from "./log";
import { App, WebSocket, us_listen_socket_close, us_listen_socket } from "uWebSockets.js";

const PORT = 9000;
const VERSION = `0.0.1b`;

module.exports = function start() {
  const decoder = new TextDecoder();
  const app = App();
  const clients = new Set<WebSocket>();

  app.ws("/*", {
    open: (ws) => clients.add(ws),
    close: (ws) => clients.delete(ws),
    message: (ws, message, isBinary) => {
      log_info(`message: ${decoder.decode(message)}`);
      ws.send(message, isBinary, true);
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
    for (const client of clients) client.end(1012);
  };
};
