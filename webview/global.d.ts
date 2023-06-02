export interface WebviewApi {
  postMessage(message: unknown): void;
}

declare global {
  function acquireVsCodeApi(): WebviewApi;
}
