import * as path from "path";
import * as vscode from "vscode";
import * as sourceUtils from "./sourceUtils";
import type { OpenJscadDir } from "@jscad/core";

function sourcemapify(input: { name: string; source: string }): {
  name: string;
  source: string;
} {
  let source = input.source;
  const index = source.lastIndexOf("\n");
  if (!source.substring(index).startsWith("\n//#")) {
    source = source + "\n//# sourceURL=" + input.name;
  }
  return { name: input.name, source };
}

export class DataWatcher {
  private _disposables: vscode.Disposable[] = [];
  private _watcher: vscode.FileSystemWatcher | undefined;
  private _uri: vscode.Uri | undefined;
  private _fileType:
    | vscode.FileType.File
    | vscode.FileType.Directory
    | undefined;
  private _pending = false;

  public async watch(
    uri: vscode.Uri,
    cb: (data: OpenJscadDir[]) => void,
    options: { emitInitial: boolean } = { emitInitial: true }
  ) {
    if (this._pending) {
      vscode.window.showWarningMessage(
        "Data watcher is busy, please try again later"
      );
      return;
    }

    this._pending = true;
    this.dispose();
    const stat = await vscode.workspace.fs.stat(uri);
    let glob: vscode.GlobPattern;
    if ((stat.type & vscode.FileType.File) === vscode.FileType.File) {
      glob = new vscode.RelativePattern(uri, "*");
      this._fileType = vscode.FileType.File;
    } else if (
      (stat.type & vscode.FileType.Directory) ===
      vscode.FileType.Directory
    ) {
      glob = new vscode.RelativePattern(uri, `**/*.js`);
      this._fileType = vscode.FileType.Directory;
    } else {
      vscode.window.showErrorMessage(`Unknown file type: ${uri.fsPath}`);
      this._pending = false;
      return;
    }
    this._uri = uri;
    const watcher = vscode.workspace.createFileSystemWatcher(glob!);
    const emitData = async (changedUri?: vscode.Uri) => {
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

  private async scanFilesAndCreateData() {
    if (!this._uri) {
      return;
    }
    const uri = this._uri;

    if (this._fileType === vscode.FileType.File) {
      const source = await vscode.workspace.fs.readFile(uri);

      const decoder = new TextDecoder();
      const sourceContent = decoder.decode(source);

      const files = [
        sourcemapify({
          name: "index.js",
          source: sourceContent,
        }),
      ];

      const rootPath = path.dirname(uri.path);

      const addRequires = async (filePath: string, sourceCode: string) => {
        const basePath = path.dirname(filePath)
        let requires = sourceUtils.getRequires(basePath, sourceCode);

        for (let r of requires) {
          const bin = await vscode.workspace.fs.readFile(r);
          const cnt = decoder.decode(bin);
          files.push({
            name: r.path.substring(rootPath.length + 1),
            source: cnt
          });
          await addRequires(r.path, cnt);
        }
      }

      await addRequires(uri.path, sourceContent);

      return createStructuredSource(rootPath, files);
    }

    const files: {
      name: string;
      source: string;
    }[] = [];
    let directories = [uri];
    while (directories.length > 0) {
      const nextDirectories: vscode.Uri[] = [];
      for (let dir of directories) {
        const fileAndDirectories = await vscode.workspace.fs.readDirectory(dir);

        const asyncProcessedFilesAndDirs = fileAndDirectories.map(
          async (fileOrDirectorie) => {
            const [name, type] = fileOrDirectorie;
            if (type === vscode.FileType.Directory) {
              if (name === "@jscad") {
                // The jscad library gets shimmed, so don't include it (it's also big)
                return;
              }
              nextDirectories.push(vscode.Uri.joinPath(dir, name));
            } else if (type === vscode.FileType.File && name.endsWith(".js")) {
              const fullPath = path.join(dir.fsPath, name);
              const source = await vscode.workspace.fs.readFile(
                vscode.Uri.joinPath(dir, name)
              );
              files.push(
                sourcemapify({
                  name: path.relative(uri.fsPath, fullPath),
                  source: new TextDecoder().decode(source),
                })
              );
            }
          }
        );

        await Promise.all(asyncProcessedFilesAndDirs);
      }
      directories = nextDirectories;
    }

    return createStructuredSource(path.dirname(uri.path), files);
  }

  public dispose() {
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

function createStructuredSource(basePath: string, files: { name: string; source: string }[]): OpenJscadDir[] {
  if (!files) {
    return [];
  }

  const structure = [
    {
      fullPath: basePath,
      name: path.basename(basePath),
      children: [],
    },
  ];

  files.forEach((f) => {
    const { name, source } = f;

    const slices = [basePath, ...name.split(path.sep)];

    let mountPoint = structure;
    let fullPath = "";

    slices.forEach((s) => {
      fullPath = [fullPath, s].filter((p) => !!p).join("/");

      let nextMountPoint: any = mountPoint.find((p) => p.fullPath === fullPath);

      if (!nextMountPoint) {
        nextMountPoint = { fullPath, name: s };
        mountPoint.push(nextMountPoint);
      }

      if (/\.js$/.test(s)) {
        Object.assign(nextMountPoint, { ext: "js", source });
        // the loop should end here;
      } else {
        if (!nextMountPoint.children) {
          nextMountPoint.children = [];
        }
        mountPoint = nextMountPoint.children;
      }
    });
  });

  return structure;
}
