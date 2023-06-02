import testscript from "./testscript";
import viewer from "./viewer";

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

// setFiles([
//   {
//     name: "file",
//     ext: "js",
//     source: testscript,
//     fullPath: "/fake/foo.js",
//   },
// ]);
