import * as vscode from "vscode";
import { Compiler, NormalModule, webpack } from "webpack";

import { createFsFromVolume, Volume } from "memfs";

import * as Stream from "stream";
import { out } from "./logging";

// Monkeypatch for webpack
process.hrtime = require("browser-process-hrtime");
require("setimmediate");

const fs = createFsFromVolume(new Volume());

//vscode.workspace.fs
const vsFileSystem: Compiler["inputFileSystem"] = {
  readlink: (path: string, callback) => {
    setTimeout(() => callback(new Error("readlink not supported")), 0);
  },
  readFile: async (path, callback) => {
    path = path.replace(/^\/__vscode_fake__\//, "");
    const vfs = vscode.workspace.fs;
    try {
      const file = await vfs.readFile(vscode.Uri.parse(path));
      callback(null, Buffer.from(file));
    } catch (e) {
      callback(e as NodeJS.ErrnoException);
    }
  },
  stat: async (path, callback) => {
    path = path.replace(/^\/__vscode_fake__\//, "");
    const vfs = vscode.workspace.fs;
    try {
      const stats = await vfs.stat(vscode.Uri.parse(path));
      stats.permissions;
      callback(null, {
        isFile: () => !!(stats.type & vscode.FileType.File),
        isDirectory: () => !!(stats.type & vscode.FileType.Directory),
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isSymbolicLink: () => !!(stats.type & vscode.FileType.SymbolicLink),
        isFIFO: () => false,
        isSocket: () => false,
        dev: 0,
        ino: 0,
        mode: 0o444,
        nlink: 1,
        uid: 0,
        gid: 0,
        rdev: 0,
        size: stats.size,
        blksize: 0,
        blocks: 0,
        atimeMs: stats.mtime,
        mtimeMs: stats.mtime,
        ctimeMs: stats.ctime,
        birthtimeMs: stats.ctime,
        atime: new Date(stats.mtime),
        mtime: new Date(stats.mtime),
        ctime: new Date(stats.ctime),
        birthtime: new Date(stats.ctime),
      });
    } catch (e) {
      callback(e as NodeJS.ErrnoException);
    }
  },
  readdir: async (path, callback) => {
    path = path.replace(/^\/__vscode_fake__\//, "");
    const vfs = vscode.workspace.fs;
    try {
      const files = await vfs.readDirectory(vscode.Uri.parse(path));
      callback(
        null,
        files.map(([name, type]) => ({
          isFile: () => !!(type & vscode.FileType.File),
          isDirectory: () => !!(type & vscode.FileType.Directory),
          isBlockDevice: () => false,
          isCharacterDevice: () => false,
          isSymbolicLink: () => !!(type & vscode.FileType.SymbolicLink),
          isFIFO: () => false,
          isSocket: () => false,
          name,
        })),
      );
    } catch (e) {
      callback(e as NodeJS.ErrnoException);
    }
  },
};

export default async function packager(uri: string): Promise<{
  error?: string;
  source: string | null;
  resources: string[];
}> {
  //Write to output.
  out.appendLine(`Bundling ${uri}`);

  const outStream = new Stream.Writable();
  outStream._write = (chunk, _encoding, _callback) => {
    out.appendLine(`STDERR: ${chunk}`);
  };

  try {
    const compiler = webpack({
      mode: "none", // this leaves the source code as close as possible to the original
      target: "webworker", // extensions run in a webworker context
      entry: {
        bundled: "/__vscode_fake__/" + uri,
      },
      output: {
        filename: "[name].js",
        path: "/out/",
        libraryTarget: "commonjs2",
        devtoolModuleFilenameTemplate: "../../[resource-path]",
      },
      externals: {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "@jscad/modeling": "commonjs @jscad/modeling",
      },
      devtool: "eval",
      infrastructureLogging: {
        // process.stderr doesn't exist
        stream: outStream,
        level: "verbose",
        appendOnly: true,
      },
    });

    compiler.inputFileSystem = vsFileSystem;
    compiler.outputFileSystem = fs;

    const p = new Promise<{
      error?: string;
      source: string | null;
      resources: string[];
    }>((resolve) => {
      compiler.run((err, stats) => {
        try {
          if (err) {
            out.appendLine(`Error: ${err}`);
          }

          // Read the output later:
          const content = fs.readFileSync("/out/bundled.js");
          // out.appendLine(`Content: ${content?.toString()}`);

          compiler.close((_closeErr) => {
            // ...
          });

          const inputs = Array.from(
            stats?.compilation?.codeGenerationResults?.map?.keys?.() || [],
          );
          const resources = inputs
            .map((input) => (input as NormalModule).resource)
            .filter((r) => r != null);

          resolve({ source: content.toString(), resources });
        } catch (e) {
          if (e instanceof Error) {
            out.appendLine(`E Run: ${e} ${e.stack}`);
          } else {
            out.appendLine(`E Run: ${e}`);
          }
          resolve({ error: `${e}`, source: null, resources: [] });
        }
      });
    });
    return await p;
  } catch (e) {
    if (e instanceof Error) {
      out.appendLine(`E: ${e} ${e.stack}`);
    } else {
      out.appendLine(`E: ${e}`);
    }
    return { error: `${e}`, source: null, resources: [] };
  }
}
