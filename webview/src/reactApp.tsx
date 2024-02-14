import "./styles.css";

import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import { parse } from "path";
import DownloadButton from "./DownloadButton";

export default function reactApp() {
  const root = document.getElementById("react-app") as HTMLElement;
  const fileName = parse(root.dataset.filename as string).name;

  ReactDOM
    //
    .createRoot(root)
    .render(
      <div>
        <DownloadButton fileName={fileName} />
      </div>,
    );
}
