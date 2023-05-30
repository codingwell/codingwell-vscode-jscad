import {
  prepareRender,
  drawCommands,
  cameras,
  controls,
  entitiesFromSolids,
} from "@jscad/regl-renderer";
import { RebuildGeometryCallback, evaluation } from "@jscad/core";
import { Geometry } from "@jscad/modeling/src/geometries/types";

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

const handleParsed: RebuildGeometryCallback = (error, result) => {
  if (result && result.type === "solids") {
    // The return type of entitiesFromSolids is wrong :-/
    entities = entitiesFromSolids({}, ...result.solids) as unknown as Entity[];
    requestRender();
  }
};

evaluation.rebuildGeometry(
  {
    // mainPath: '',
    // apiMainPath: '@jscad/modeling',s
    // serialize: false,
    // lookup: null,
    // lookupCounts: null,
    // parameterValues: {}
    filesAndFolders: [
      {
        name: "bob",
        ext: "js",
        source: `
const jscad = require("@jscad/modeling");
const { hull, hullChain } = jscad.hulls;
const { cube, sphere, square, circle, cuboid, roundedCuboid } = jscad.primitives;
const { translate, align, rotateY, rotateX } = jscad.transforms;
const { colorize } = jscad.colors;
const { union, subtract, intersect } = jscad.booleans;
const { extrudeLinear } = jscad.extrusions;
const { degToRad } = jscad.utils;

const debug = false;

const lampHeight = 58;
const filterHeight = 40;
const lipHeight = 3;

/**
 * @param {number} width
 * @param {number} depth
 *
 */
function createFunnelSlice(width, depth) {
  const radius = 0.5;
  const s1 = translate([-width / 2 + radius, radius, 0], circle({ radius }));
  const s2 = translate([0, depth - radius, 0], circle({ radius }));
  const s3 = translate([width / 2 - radius, radius, 0], circle({ radius }));

  const extruded = extrudeLinear({ height: 0 }, hull(s1, s2, s3));
  return extruded;
}

function createHopperSlice(width, depth) {
  const radius = 0.5;
  const s1 = translate([-width / 2 + radius, radius, 0], circle({ radius }));
  const s2 = translate(
    [-width / 2 + radius, depth - radius, 0],
    circle({ radius })
  );
  const s3 = translate(
    [width / 2 - radius, depth - radius, 0],
    circle({ radius })
  );
  const s4 = translate([width / 2 - radius, radius, 0], circle({ radius }));

  const extruded = extrudeLinear({ height: 0 }, hull(s1, s2, s3, s4));
  return extruded;
}

/**
 * @param {number} inset
 */
function triangleInset(inset) {
  // const orig_center = (0 + height + 0)/3;
  // const inset_center = (0 + height - inset * 2 + 0)/3;
  // return orig_center - inset_center;

  //aka
  return (inset * 2) / 3.0;
}

/**
 * @param {number} inset
 */
function createFunnel(inset = 0) {
  const fn = debug ? union : hullChain;

  const i = inset * 2;

  return fn(
    translate(
      [0, 0, triangleInset(inset)],
      rotateX(degToRad(90), createFunnelSlice(20 - i, 25 - i))
    ),

    translate(
      [0, filterHeight + lipHeight + inset, triangleInset(inset)],
      rotateX(degToRad(90), createFunnelSlice(20 - i, 20 - i))
    ),

    translate(
      [0, lampHeight + lipHeight + 5, inset],
      rotateX(degToRad(90), createHopperSlice(74 - i, 30 - i))
    ),

    translate(
      [0, lampHeight + lipHeight + 5 + 65, inset],
      rotateX(degToRad(90), createHopperSlice(74 - i, 30 - i))
    )
  );
}

function holders() {
  return union(
    cuboid({ center: [0, lampHeight+lipHeight+1, 25/2], size: [59, 2, 25] }),
    cuboid({ center: [0, lampHeight+lipHeight+1, 120/2 + 25], size: [59, 2, 120] }),
    roundedCuboid({ roundRadius: 0.2, center: [0, lampHeight+lipHeight+2, 120/2 + 25], size: [10, 2, 118] }),
    roundedCuboid({ roundRadius: 0.2, center: [-28.5, lampHeight+lipHeight+2, 120/2 + 25], size: [2, 2, 118] }),
    roundedCuboid({ roundRadius: 0.2, center: [28.5, lampHeight+lipHeight+2, 120/2 + 25], size: [2, 2, 118] }),
    cuboid({ center: [0, lipHeight+1, 20], size: [10, 2, 40] })
  );
}

const main = () => {
  return [
    subtract(
      union(createFunnel(), holders()),
      createFunnel(2),
      cuboid({ center: [0, 116, 30], size: [70, 100, 5] })
    ),
  ];
};


const getParameterDefinitions = () => {
  return [
    { name: 'group1', type: 'group', caption: 'Group 1: Text Entry' },
    { name: 'text', type: 'text', initial: '', size: 20, maxLength: 20, caption: 'Plain Text:', placeholder: '20 characters' },
    { name: 'int', type: 'int', initial: 20, min: 1, max: 100, step: 1, caption: 'Integer:' },
    { name: 'number', type: 'number', initial: 2.0, min: 1.0, max: 10.0, step: 0.1, caption: 'Number:' },
    { name: 'date', type: 'date', initial: '2020-01-01', min: '2020-01-01', max: '2030-12-31', caption: 'Date:', placeholder: 'YYYY-MM-DD' },
    { name: 'email', type: 'email', initial: 'me@example.com', caption: 'Email:' },
    { name: 'url', type: 'url', initial: 'www.example.com', size: 40, maxLength: 40, caption: 'Url:', placeholder: '40 characters' },
    { name: 'password', type: 'password', initial: '', caption: 'Password:' },

    { name: 'group2', type: 'group', caption: 'Group 2: Interactive Controls' },
    { name: 'checkbox', type: 'checkbox', checked: true, initial: '20', caption: 'Checkbox:' },
    { name: 'color', type: 'color', initial: '#FFB431', caption: 'Color:' },
    { name: 'slider', type: 'slider', initial: 3, min: 1, max: 10, step: 1, caption: 'Slider:' },
    { name: 'choice1', type: 'choice', caption: 'Dropdown Menu:', values: [0, 1, 2, 3], captions: ['No', 'Yes', 'Maybe', 'So so'], initial: 2 },
    { name: 'choice3', type: 'choice', caption: 'Dropdown Menu:', values: ['No', 'Yes', 'Maybe', 'So so'], initial: 'No' },
    { name: 'choice2', type: 'radio', caption: 'Radio Buttons:', values: [0, 1, 2, 3, 4, 5], captions: ['a', 'b', 'c', 'd', 'e'], initial: 5 },

    { name: 'group3', type: 'group', initial: 'closed', caption: 'Group 3: Initially Closed Group' },
    { name: 'checkbox2', type: 'checkbox', checked: true, initial: '20', caption: 'Optional Checkbox:' }
   ];
}

module.exports = { main, getParameterDefinitions };

    `,
        fullPath: "/fake/foo.js",
      },
    ],
  },
  handleParsed
);

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
