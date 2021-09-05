import * as fs from "fs";
import * as crypto from "crypto";
import * as http from "http";
import * as url from "url";

function parse_cookies(str: string) {
  let rx = /([^;=\s]*)=([^;]*)/g;
  let obj: { [key: string]: string } = {};
  for (let m; (m = rx.exec(str)); ) obj[m[1]] = decodeURIComponent(m[2]);
  return obj;
}

function stringify_cookies(cookies: { [key: string]: string }) {
  return Object.entries(cookies)
    .map(([k, v]) => k + "=" + encodeURIComponent(v))
    .join("; ");
}

function body(request: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    request.on("readable", () => (body += request.read() ?? ""));
    request.on("end", () => resolve(body));
  });
}

const origin_headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
  "Access-Control-Max-Age": 2592000,
};

const connections = new Map<
  string,
  {
    response: http.ServerResponse;
    offer: string;
    id: string;
    answer?: string;
  }
>();
const server = http.createServer(async (request, response) => {
  const cookies = request.headers.cookie !== undefined ? parse_cookies(request.headers.cookie) : {};
  const url_parts = url.parse(request.url ?? "");

  const respond = (
    code: number,
    body?: { type: string; content: any } | false,
    header: { [key: string]: string } = {}
  ) => {
    response.writeHead(code, {
      ...origin_headers,
      ...header,
      ...(body ? { "Content-Type": body.type } : {}),
      "Set-Cookie": stringify_cookies(cookies),
    });

    if (body === false) return;
    if (body?.content !== undefined) return response.end(body.content);
    else return response.end();
  };

  if (request.method === "OPTIONS") return respond(204);

  if (request.method === "GET") {
    if (url_parts.pathname?.endsWith("offer")) {
      if (connections.size > 0) {
        for (let [client_id, offer] of connections) {
          return respond(200, {
            content: JSON.stringify({ offer: offer.offer, id: client_id }),
            type: "application/json",
          });
        }
      }

      return respond(200, {
        content: JSON.stringify({}),
        type: "application/json",
      });
    }
  }

  if (request.method === "POST") {
    if (url_parts.pathname?.endsWith("answer")) {
      try {
        const _body = await body(request);
        console.log({ _body });
        const { answer, id } = JSON.parse(_body);
        const connection = connections.get(id);
        if (connection !== undefined) {
          const message = JSON.stringify({ answer });
          const id = new Date().toISOString();
          connection.response.write("id: " + id + "\n");
          connection.response.write("data: " + message + "\n\n");
        }
      } catch (error) {
        console.error(error);
      }

      return respond(200, {
        content: JSON.stringify({}),
        type: "application/json",
      });
    }
  }

  if (request.headers.accept && request.headers.accept.includes("text/event-stream")) {
    if (connections.has(cookies.client_id)) {
      return respond(500, {
        content: `[simple-signal-server] your pc already connected to the server`,
        type: "text/plain",
      });
    }

    const client_id = cookies.client_id || crypto.randomUUID();
    connections.set(client_id, { response, ...JSON.parse(decodeURIComponent(url_parts.query ?? "")) });
    response.on("close", () => connections.delete(client_id));

    respond(200, false, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
  } else {
    respond(200, {
      content: fs.readFileSync("./index.html"),
      type: "text/html; charset=UTF-8",
    });
  }
});

server.listen(3000);
