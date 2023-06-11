declare module "@jscad/io" {
  import { Geom2, Geom3 } from "@jscad/modeling/src/geometries/types";

  export function solidsAsBlob(
    solids: (Geom2 | Geom3)[],
    params: { binary: boolean; format: "3mf" | "amf" | "stl" | "obj" }
  ): Blob;
}
