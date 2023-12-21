import {
  prepareRender,
  drawCommands,
  cameras,
  controls,
  entitiesFromSolids,
} from "@jscad/regl-renderer";
import {
  OpenJscadDir,
  OpenJscadFile,
  RebuildGeometryCallback,
} from "@jscad/core";
import { Geometry, Geom2, Geom3 } from "@jscad/modeling/src/geometries/types";

type Entity = {
  geometry: Geometry;
  visuals: {
    drawCmd: string;
    show: boolean;
    transparent: boolean;
    useVertexColors: boolean;
  };
};

import { pointerGestures } from "most-gestures";
import cleanupErrorStack from "./cleanupErrorStack";
import downloadModel from "./downloadModel";
import webworkerFactory from "./webworkerFactory";

const loadingoverlay = document.getElementById("loadingoverlay")!;
const erroroverlay = document.getElementById("erroroverlay")!;
const downloadbutton = document.getElementById("download")!;

export default function viewer() {
  const rotateSpeed = 0.002;
  const zoomSpeed = 0.08;
  const panSpeed = 1;

  const width = window.innerWidth;
  const height = window.innerHeight;
  // prepare the camera
  const camera = Object.assign({}, cameras.perspective.defaults);
  cameras.perspective.setProjection(camera, camera, { width, height });
  cameras.perspective.update(camera, camera);

  const canvas = document.getElementById("renderTarget") as HTMLCanvasElement;

  const { gl, type } = createContext(canvas);

  const viewerOptions = {
    glOptions: { gl, optionalExtensions: [] as string[] },
    camera,
    drawCommands: {
      // draw commands bootstrap themselves the first time they are run
      drawGrid: drawCommands.drawGrid, // require('./src/rendering/drawGrid/index.js'),
      drawAxis: drawCommands.drawAxis, // require('./src/rendering/drawAxis'),
      drawMesh: drawCommands.drawMesh, // require('./src/rendering/drawMesh/index.js')
    },
    // data
    entities: [],
  };
  if (type === "webgl") {
    if (gl.getExtension("OES_element_index_uint")) {
      viewerOptions.glOptions.optionalExtensions = ["oes_element_index_uint"];
    }
  }

  let grid = {
    // grid data
    // the choice of what draw command to use is also data based
    visuals: {
      drawCmd: "drawGrid",
      show: true,
      color: [0, 0, 0, 1],
      subColor: [0, 0, 1, 0.5],
      fadeOut: false,
      transparent: true,
    },
    size: [500, 500],
    ticks: [10, 1],
  };
  const axes = {
    visuals: {
      drawCmd: "drawAxis",
      show: true,
    },
  };

  const gestures = pointerGestures(canvas);

  let controlsState = controls.orbit.defaults;

  // rotate
  gestures.drags.forEach((data) => {
    const delta = [data.delta.x, data.delta.y].map((d) => -d);
    const { shiftKey } = data.originalEvents[0];
    if (!shiftKey) {
      const updated = controls.orbit.rotate(
        { controls: controlsState, camera, speed: rotateSpeed },
        delta
      );
      controlsState = { ...controlsState, ...updated.controls };
    }
    renderCameraChange();
  });
  // pan
  gestures.drags.forEach((data) => {
    const delta = [data.delta.x, data.delta.y].map((d) => d);
    const { shiftKey } = data.originalEvents[0];
    if (shiftKey) {
      const updated = controls.orbit.pan(
        { controls: controlsState, camera, speed: panSpeed },
        delta
      );
      // const fooCam = camera = { ...camera, ...updated.camera }
      camera.position = updated.camera.position;
      camera.target = updated.camera.target;
    }
    renderCameraChange();
  });

  // zoom
  gestures.zooms.forEach((x) => {
    const updated = controls.orbit.zoom(
      { controls: controlsState, camera, speed: zoomSpeed },
      -x
    );
    controlsState = { ...controlsState, ...updated.controls };
    renderCameraChange();
  });

  // auto fit
  gestures.taps
    .filter((taps) => taps.nb === 2)
    .forEach(() => {
      const updated = controls.orbit.zoomToFit({
        controls: controlsState,
        camera,
        entities,
      });
      controlsState = { ...controlsState, ...updated.controls };
      renderCameraChange();
    });

  const render = prepareRender(viewerOptions);

  let entities: Entity[] = [];
  let solids: (Geom2 | Geom3)[] = [];

  downloadbutton.onclick = () => {
    downloadModel(solids);
  };

  let pendingRender = false;
  let pendingDoResize = false;
  function requestRender(doResize = false) {
    pendingDoResize ||= doResize;
    if (!pendingRender) {
      pendingRender = true;
      requestAnimationFrame(() => {
        pendingRender = false;
        if (pendingDoResize) {
          resize(canvas);
        }

        const renderOptions = {
          ...viewerOptions,
          entities: [
            true ? grid : undefined,
            true ? axes : undefined,
            ...entities,
          ].filter((x) => x != null),
        };

        render(renderOptions);
      });
    }
  }

  function renderCameraChange() {
    let updatedA = controls.orbit.update({ controls: controlsState, camera });
    controlsState = { ...controlsState, ...updatedA.controls };
    camera.position = updatedA.camera.position;
    cameras.perspective.update(camera);
    requestRender();
  }

  window.onresize = () => requestRender(true);

  requestRender(true);

  function createContext(canvas: HTMLCanvasElement) {
    const get = (type: string) => {
      try {
        // NOTE: older browsers may return null from getContext()
        const context = canvas.getContext(type);
        return context ? { gl: context as WebGLRenderingContext, type } : null;
      } catch (e) {
        return null;
      }
    };
    function err(): never {
      throw new Error("Could not create 3D context");
    }
    return (
      get("webgl2") ||
      get("webgl") ||
      get("experimental-webgl") ||
      get("webgl-experimental") ||
      err()
    );
  }

  function resize(viewerElement: HTMLCanvasElement) {
    const pixelRatio = window.devicePixelRatio || 1;
    let width = window.innerWidth;
    let height = window.innerHeight;
    if (viewerElement !== document.body) {
      const bounds = viewerElement.getBoundingClientRect();
      width = bounds.right - bounds.left;
      height = bounds.bottom - bounds.top;
    }
    viewerElement.width = pixelRatio * width;
    viewerElement.height = pixelRatio * height;

    cameras.perspective.setProjection(camera, camera, { width, height });
  }

  const handleParsed: RebuildGeometryCallback = (error, result) => {
    if (error) {
      loadingoverlay.style.display = "none";
      const newtext = document.createTextNode(cleanupErrorStack(error.stack));

      erroroverlay.innerHTML = "";
      erroroverlay.appendChild(newtext);
      canvas.style.opacity = "0.5";
    } else if (result && result.type === "solids") {
      loadingoverlay.style.display = "none";
      canvas.style.removeProperty("opacity");
      erroroverlay.innerHTML = "";
      solids = result.solids;
      // The return type of entitiesFromSolids is wrong :-/
      entities = entitiesFromSolids(
        {},
        ...result.solids
      ) as unknown as Entity[];
      requestRender();
    } else if (result && result.type === "params") {
      // Future use
    }
  };

  let worker: Worker | null = null;
  let creatingWorker = false;
  let latestFilesAndFolders: (OpenJscadFile | OpenJscadDir)[] = [];

  let timeoutId: NodeJS.Timeout | undefined = undefined;

  // Setter for script
  return async (filesAndFolders: (OpenJscadFile | OpenJscadDir)[]) => {
    console.debug(filesAndFolders);
    //Got new data
    loadingoverlay.style.removeProperty("display");

    latestFilesAndFolders = filesAndFolders;

    if (creatingWorker) {
      // Another invocation is already starting a worker.
      return;
    }

    // Poor mans lock
    creatingWorker = true;

    if (worker != null) {
      console.log("Killing Worker");
      worker.terminate();
      worker = null;
    }

    const myworker = (worker = await webworkerFactory());
    const theseFilesAndFolders = latestFilesAndFolders;
    creatingWorker = false;

    myworker.addEventListener("message", (event) => {
      const message = event.data; // The json data that the worker sent
      switch (message.command) {
        case "geometry":
          const error = message.error;
          const result = message.result;
          handleParsed(error, result);
          break;
      }
    });
    myworker.postMessage({
      command: "files",
      filesAndFolders: theseFilesAndFolders,
    });
  };
}
