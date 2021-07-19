export class SSCDNotImplementedError extends Error {
  constructor(message) {
    this.name = "NotImplementedError";
    this.message = message || "";
  }
}
