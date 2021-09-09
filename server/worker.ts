import { Dexie } from "dexie";

function uuidv4() {
  const a = crypto.getRandomValues(new Uint16Array(8));
  let i = 0;
  // @ts-expect-error
  return "00-0-4-1-000".replace(/[^-]/g, (s: string) => ((a[i++] + s * 0x10000) >> s).toString(16).padStart(4, "0"));
}

class Socket {
  id: string;
  interval: undefined | ReturnType<typeof setInterval>;
  sockets: WebSocket[];
  next_socket: number;

  constructor(public pool_size: number, public on_message: (message: string) => unknown) {
    this.id = uuidv4();
    this.sockets = [];
    this.next_socket = 0;
  }

  connect() {
    if (this.sockets.length < this.pool_size) {
      for (let i = this.sockets.length; i < this.pool_size; i++) {
        const ws = new WebSocket(`ws://localhost:9000?id=${this.id}`);
        ws.onmessage = (event) => this.on_message(event.data);
        ws.onclose = () => (this.sockets = this.sockets.filter((socket) => socket !== ws));
        ws.onerror = console.error;
        this.sockets.push(ws);
      }
    }

    if (this.interval == null) {
      this.interval = setInterval(() => this.connect(), 1000);
    }
  }

  send(message: string) {
    if (this.next_socket >= this.sockets.length) this.next_socket = 0;

    for (let i = this.next_socket; i < this.sockets.length; i++) {
      const socket = this.sockets[i];
      if (socket.readyState === 1) {
        socket.send(message);
        break;
      }
    }

    this.next_socket += 1;
  }
}

interface Database {
  messages: Dexie.Table<{ id?: number; message: string }, number>; // number = type of the primkey
}

class Database extends Dexie {
  constructor() {
    super("messages_db");
    this.version(1).stores({
      messages: "++id, message",
    });
  }
}

const subject = {
  subscribers: [] as Array<(message: string) => unknown>,
  subscribe: (fn: (message: string) => unknown) => {
    subject.subscribers.push(fn);
  },
  unsubscribe: (fn: any) => (subject.subscribers = subject.subscribers.filter((subscriber) => subscriber !== fn)),
  next: (message: string) => {
    for (const subscriber of subject.subscribers) subscriber(message);
  },
};

function start() {
  const db = new Database();

  const messages: Array<{ id?: number; message: string }> = [];
  db.messages
    .each((message) => messages.push(message))
    .then(() => {
      postMessage(messages);
    });

  onmessage = ({ data }) => socket.send(JSON.stringify(data));
  const on_message = (message: string) => {
    const data = JSON.parse(message);
    db.messages.put({ message: data }).then((id) => {
      postMessage([{ message: data, id }]);
    });
  };

  const socket = new Socket(6, on_message);
  socket.connect();
}

start();
