# Change Log

## [0.6.0]

- Dropdown to download the model in multiple formats
  - Better naming of downloaded file
- React.js support for the UI
- Thanks @ku3mich for your contribution making this happen

## [0.5.0]

- Introduce webpack to handle dependancy management
  - Minimizes code being sent to the webview, no more sending all of node_modules
  - Dependencies can now come from parent folders
- Previewing from a single file will handle dependencies the same as previewing a folder
- Output log for extention behaviour
- Supress re-rendering if the code didn't change (helps with phantom file change events)
- Preview is restored when vscode is restarted
- Previews are unloaded to save resources when not visible
- The extension code now has eslint & prettier rules
- Thanks @ku3mich for inspiring me to make this update

## [0.4.0]

- Use webworker so UI remains reponsive
  - Aborts computation of geometry if file changes during computation instead of queuing
- Add Content-Security-Policy

## [0.3.0]

- Add .3mf download

## [0.2.0]

- Parse error details (including filename and line number)
- Loading indicator
- Exclude @jscad node module to speed up refresh

## [0.1.0]

- Initial release
