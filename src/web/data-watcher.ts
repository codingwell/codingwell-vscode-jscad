import * as vscode from "vscode";
import type { OpenJscadDir } from "@jscad/core";
import packager from "./packager";
import { out } from "./logging";

export class DataWatcher {
  private _disposables: vscode.Disposable[] = [];
  private _watcher: vscode.FileSystemWatcher | undefined;
  private _uri: vscode.Uri | undefined;
  private _fileType:
    | vscode.FileType.File
    | vscode.FileType.Directory
    | undefined;
  private _pending = false;
  private _previousHash = "";

  public async watch(
    uri: vscode.Uri,
    cb: (data: OpenJscadDir[]) => void,
    options: { emitInitial: boolean } = { emitInitial: true },
  ) {
    if (this._pending) {
      vscode.window.showWarningMessage(
        "Data watcher is busy, please try again later",
      );
      return;
    }

    this._pending = true;
    this.dispose();
    const stat = await vscode.workspace.fs.stat(uri);
    if ((stat.type & vscode.FileType.File) === vscode.FileType.File) {
      this._fileType = vscode.FileType.File;
    } else if (
      (stat.type & vscode.FileType.Directory) ===
      vscode.FileType.Directory
    ) {
      this._fileType = vscode.FileType.Directory;
    } else {
      vscode.window.showErrorMessage(`Unknown file type: ${uri.fsPath}`);
      this._pending = false;
      return;
    }
    this._uri = uri;
    const watcher = vscode.workspace.createFileSystemWatcher("**/*.js");
    const emitData = async (_changedUri?: vscode.Uri) => {
      const data = await this.scanFilesAndCreateData();
      if (data) {
        cb(data);
      }
    };
    const d1 = watcher.onDidChange(emitData);
    const d2 = watcher.onDidCreate(emitData);

    this._watcher = watcher;
    this._disposables = [d1, d2];

    if (options.emitInitial) {
      emitData();
    }
    this._pending = false;
  }

  private async scanFilesAndCreateData(): Promise<OpenJscadDir[] | undefined> {
    if (!this._uri) {
      return;
    }
    const uri = this._uri;
    const result = await packager(uri.toString());

    const hashBuffer = await global.crypto.subtle.digest(
      "SHA-1",
      new TextEncoder().encode(result.source ?? ""),
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""); // convert bytes to hex string

    out.appendLine(`Hash: ${hashHex}`);

    const previousHash = this._previousHash;
    this._previousHash = hashHex;
    if (previousHash === hashHex) {
      return;
    }

    return [
      {
        fullPath: "/root",
        name: "root",
        children: [
          {
            ext: ".js",
            fullPath: "/root/index.js",
            name: "index.js",
            source: result.source || "",
          },
        ],
      },
    ];
  }

  public dispose() {
    if (this._uri != null) {
      out.appendLine(`Stopped Watching ${this._uri}`);
    }
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
    if (this._watcher) {
      this._watcher.dispose();
      this._watcher = undefined;
    }
    this._uri = undefined;
    this._fileType = undefined;
  }
}
