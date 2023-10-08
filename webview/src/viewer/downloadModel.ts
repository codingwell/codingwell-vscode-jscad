import { solidsAsBlob } from "@jscad/io";
import { Geom2, Geom3 } from "@jscad/modeling/src/geometries/types";

export default async function downloadModel(solids: (Geom2 | Geom3)[]) {
  const blob = solidsAsBlob(solids, { binary: true, format: "3mf" });

  const blobUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.target = "_blank";
  anchor.download = "my-model.3mf";

  // Auto click on a element, trigger the file download
  anchor.click();

  // This is required
  URL.revokeObjectURL(blobUrl);
}
