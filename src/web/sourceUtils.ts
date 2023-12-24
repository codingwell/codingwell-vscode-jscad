import * as vscode from "vscode";
import type { OpenJscadDir } from "@jscad/core";

export interface FileContent {
  name: string;
  source: string;
}

export const getRequires = (root: string, source: string): vscode.Uri[] => {
  let result = [];

  let sourceLines = source.split("\n");
  for (let line of sourceLines) {
    let m = line.match(/require\(["']([.\/_\-!@#$%^{}\[\]`~A-Za-z0-9]+)["']\)/);
    if (m && m[1]) {
      let moduleName = m[1];
      if (!moduleName.endsWith(".js"))
        moduleName += ".js"

      if (moduleName.startsWith("./") || moduleName.startsWith("../"))
        result.push(vscode.Uri.joinPath(vscode.Uri.file(root), moduleName));

      if (moduleName.startsWith("/"))
        result.push(vscode.Uri.file(moduleName));
    }
  }

  return result;
}