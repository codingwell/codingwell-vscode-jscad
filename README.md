# JSCAD Preview

View rendered JSCAD V2 scripts while editing.

![Example](example.png)

## Features

1. Preview a single .js file (View explorer context menu or command on active editor)
2. Preview a directory (should be a valid jscad project)
3. Auto refresh on save
4. VSCode for web support

## Requirements

Scripts must be in JSCAD Version 2 syntax

## Known Issues

1. View state is not preserved
2. Cannot preview unsaved files
3. No error messages for invalid scripts
4. No parameter support
5. Hangs the view while processing the script

## Thanks

Thanks to [crysislinux](https://github.com/crysislinux) & [KillyMXI](https://github.com/KillyMXI) for their contributions to the `vscode-openjscad` extension which was the motivation to develop this version supporting vscode on web.
