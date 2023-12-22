import * as path from "path";
import * as vscode from "vscode";
import * as sourceUtils from "./sourceUtils";
import type { FileContent } from "./sourceUtils";
import type { OpenJscadDir, OpenJscadFile } from "@jscad/core";

function sourcemapify(input: FileContent): FileContent {
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

      const rootPath = path.dirname(uri.path);

      const files = [
        sourcemapify({
          name: path.join(rootPath, path.basename(uri.path)),
          source: sourceContent,
        }),
      ];

      const addRequires = async (filePath: string, sourceCode: string) => {
        const basePath = path.dirname(filePath)
        let requires = sourceUtils.getRequires(basePath, sourceCode);

        for (let r of requires) {
          const bin = await vscode.workspace.fs.readFile(r);
          const cnt = decoder.decode(bin);
          files.push({
            name: r.path,
            source: cnt
          });
          await addRequires(r.path, cnt);
        }
      }

      try {
        await addRequires(uri.path, sourceContent);
      }
      catch (e) {
        console.error(e);
      }

      return createStructuredSource(uri.path, files);
    }

    // *** dirictory, seems not works

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

    return createStructuredSource('', files);
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

function createStructuredSource(fsPath: string, files: FileContent[]): OpenJscadDir[] {
  if (!files) {
    return [];
  }

  // we have always format /<workspace folder>/... so 0 element is empty
  const rootName = files[0].name.split('/')[1]

  const root: OpenJscadDir = {
    children: [],
    fullPath: '/' + rootName,
    name: rootName
  }

  if (fsPath != `/${rootName}/index.js`) {
    root.children.push({
      ext: '.js',
      fullPath: '/' + rootName + "/index.js",
      source: `module.exports = require('${fsPath}')`,
      name: 'index.js'
    });
  }

  const putFile = (file: FileContent) => {
    const parts = file.name.split('/');
    let current: OpenJscadDir = root;

    // serches child in current
    const findChild = (s: string): OpenJscadDir | undefined => {
      const res = current.children.filter(v => v.name == s);
      return res[0] as OpenJscadDir;
    }

    for (let i = 2; i < parts.length - 1; i++) {
      let child = findChild(parts[i]);

      if (child) {
        current = child;
        continue;
      }

      const folder = {
        name: parts[i],
        children: [],
        fullPath: '/' + parts.slice(1, i + 1).join('/')
      }

      current.children.push(folder);

      current = folder
    }

    current.children.push({
      ext: path.extname(file.name),
      fullPath: file.name,
      source: file.source,
      name: path.basename(file.name)
    });
  }

  files.forEach(putFile);

  return [root];
}
