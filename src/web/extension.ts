// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "jscad" is now active in the web extension host!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('jscad.helloWorld', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from jscad in a web extension host!');

		const panel = vscode.window.createWebviewPanel(
			"jscad",
			"JSCAD",
			vscode.ViewColumn.Beside,
			{
        enableScripts: true,
        retainContextWhenHidden: true,
				// localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
			}
		);
		
		const extensionURI = panel.webview.asWebviewUri(context.extensionUri);

		panel.webview.html = `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<style>
				.container {
					width: 100%;
					height: 100%;
					position: absolute;
					top: 0px;
					left: 0px;
					right: 0px;
					bottom: 0px;
				}
			</style>
		</head>
		<body>
			<div class="container" id="app">Hello World!</div>
			<canvas id='renderTarget' style="border: 0px; margin: 0px; padding: 0px; top: 0px; left: 0px; width: 100%; height: 100%; position: absolute;"> </canvas>
			<script src="${extensionURI}/dist/web/webview.js"></script>
		</body>
		</html>`;
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
