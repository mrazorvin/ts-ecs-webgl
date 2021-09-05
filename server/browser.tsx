import { h, render } from "preact";
import { useState } from "preact/hooks";

const worker = new Worker("./js/worker.js");

const render_app = () => {
  const App = () => {
    const [value, setValue] = useState("");
    const [messages, setMessage] = useState([] as Array<{ id?: number; message: string }>);
    worker.onmessage = ({ data }) => setMessage(messages.concat(data));

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          worker.postMessage(value);
          setValue("");
        }}
      >
        <input type="text" value={value} onChange={({ currentTarget }) => setValue(currentTarget.value)} />
        <input type="submit" value="Send" />
        <ul>
          {messages.map(({ id, message }) => (
            <li>
              {id} - {message}
            </li>
          ))}
        </ul>
      </form>
    );
  };

  render(<App />, document.body);
};

render_app();
