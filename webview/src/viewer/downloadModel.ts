import { solidsAsBlob } from "@jscad/io";
import { Geom2, Geom3 } from "@jscad/modeling/src/geometries/types";

export default function downloadModel(
  solids: (Geom2 | Geom3)[],
  name: string,
  format: "3mf" | "amf" | "stl" | "obj")
//
{
  const blob = solidsAsBlob(solids, { binary: true, format });

  const blobUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.target = "_blank";
  anchor.download = `${name}.${format}`;

  // Auto click on a element, trigger the file download
  anchor.click();

  // This is required
  URL.revokeObjectURL(blobUrl);
}
