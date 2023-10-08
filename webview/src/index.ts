import viewer from "./viewer/viewer";

const vscode = acquireVsCodeApi();

const setFiles = viewer();

// Handle messages sent from the extension to the webview
window.addEventListener("message", (event) => {
  const message = event.data; // The json data that the extension sent
  switch (message.command) {
    case "setData":
      setFiles(message.data);
      break;
  }
});

vscode.postMessage({
  command: "ready",
});
