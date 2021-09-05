const color = (function (colors) {
  const fn = (code: number, str: string) => `\x1b[${code}m${str}\x1b[39m`;
  const obj = { grey: fn.bind(null, 90) } as { [key: string]: (arg: string) => string };
  for (let i = 0; i < colors.length; i++) obj[colors[i]] = fn.bind(null, 30 + i);
  return obj as { [K in typeof colors[any] | "grey"]: (str: string) => string };
})(["black", "red", "green", "yellow", "blue", "magenta", "cyan", "white"] as const);

let current_ms: number | undefined;
const diff = () => {
  const prev_ms = current_ms;
  current_ms = performance.now();
  if (prev_ms === undefined) {
    return 0;
  } else {
    return Math.round(current_ms - prev_ms);
  }
};

export function log_info(info: string) {
  const time = color.cyan(new Date().toTimeString().substring(0, 8));
  const severity = color.blue("INFO");
  console.log(`[${time} +${diff()}mn] ${severity} ${info}`);
}

export function log_warn(warning: string) {
  const time = color.cyan(new Date().toTimeString().substring(0, 8));
  const severity = color.yellow("WARN");
  console.log(`[${time} +${diff()}ns] ${severity} ${warning}`);
}

export function log_error(error: string) {
  const time = color.cyan(new Date().toTimeString().substring(0, 8));
  const severity = color.red("ERROR");
  console.log(`[${time} +${diff()}ns] ${severity} ${error}`);
}
