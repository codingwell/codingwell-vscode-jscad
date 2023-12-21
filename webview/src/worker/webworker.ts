import { RebuildGeometryCallback, evaluation } from "@jscad/core";

const handleParsed: RebuildGeometryCallback = (error, result) => {
  self.postMessage({
    command: "geometry",
    error,
    result
  });
};

// Handle messages sent from the extension to the webview
addEventListener("message", (event) => {
  const message = event.data; // The json data that the extension sent
  const filesAndFolders = message.filesAndFolders;

  switch (message.command) {
    case "files":
      evaluation.rebuildGeometry(
        {
          // mainPath: '',
          // apiMainPath: '@jscad/modeling',
          // serialize: false,
          // lookup: null,
          // lookupCounts: null,
          // parameterValues: {}
          filesAndFolders,
        },
        handleParsed
      );
      break;
  }
});
