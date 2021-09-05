import { Dexie } from "dexie";

let ws: undefined | WebSocket;
let connecting: undefined | ReturnType<typeof setInterval>;

function connect(on_message: (data: string) => unknown, subject: { subscribe: any; unsubscribe: any }) {
  if (ws != null && ws.readyState < 2) ws.close();
  try {
    const send_message = (message: string) => ws?.send(message);
    ws = new WebSocket("ws://localhost:9000");
    ws.onopen = () => subject.subscribe(send_message);
    ws.onmessage = (event) => on_message(event.data as string);
    ws.onclose = () => {
      subject.unsubscribe(send_message);
      if (connecting != null) connecting = clearInterval(connecting)!;
      connecting = setInterval(() => connect(on_message, subject), 1000);
    };
    if (connecting != null) clearInterval(connecting);
  } catch (error) {
    console.error(error);
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
  const on_message = (message: string) => {
    const data = JSON.parse(message);
    db.messages.put({ message: data }).then((id) => {
      postMessage([{ message: data, id }]);
    });
  };

  const messages: Array<{ id?: number; message: string }> = [];
  db.messages
    .each((message) => messages.push(message))
    .then(() => {
      postMessage(messages);
    });

  connecting = setInterval(() => connect(on_message, subject), 1000);
  onmessage = ({ data }) => subject.next(JSON.stringify(data));
}

start();
