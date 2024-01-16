export interface WebviewApi {
  postMessage(message: unknown): void;
  setState(s: any): void;
  getState(): any;
}

declare global {
  function acquireVsCodeApi(): WebviewApi;
  function mySetState(msg: any): void;
}
