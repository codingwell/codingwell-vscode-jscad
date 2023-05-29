
import { prepareRender,
    drawCommands,
    cameras,
    controls,
    entitiesFromSolids } from '@jscad/regl-renderer';
import { evaluation } from '@jscad/core';

import { pointerGestures } from 'most-gestures';


const rotateSpeed = 0.002
const zoomSpeed = 0.08
const panSpeed = 1


const width = window.innerWidth;
const height = window.innerHeight;
// prepare the camera
const camera = Object.assign({}, cameras.perspective.defaults)
cameras.perspective.setProjection(camera, camera, { width, height })
cameras.perspective.update(camera, camera)

const canvas = document.getElementById("renderTarget") as HTMLCanvasElement;

const { gl, type } = createContext(canvas);

const viewerOptions = {
  glOptions: { gl, optionalExtensions: [] as string[] },
  camera,
  drawCommands: {
  // draw commands bootstrap themselves the first time they are run
    drawGrid: drawCommands.drawGrid, // require('./src/rendering/drawGrid/index.js'),
    drawAxis: drawCommands.drawAxis, // require('./src/rendering/drawAxis'),
    drawMesh: drawCommands.drawMesh // require('./src/rendering/drawMesh/index.js')
  },
  // data
  entities: []
};
if (type === 'webgl') {
    if (gl.getExtension('OES_element_index_uint')) {
      viewerOptions.glOptions.optionalExtensions = ['oes_element_index_uint']
    }
  }


let grid = { // grid data
    // the choice of what draw command to use is also data based
    visuals: {
      drawCmd: 'drawGrid',
      show: true,
      color: [0, 0, 0, 1],
      subColor: [0, 0, 1, 0.5],
      fadeOut: false,
      transparent: true
    },
    size: [500, 500],
    ticks: [10, 1]
  }
  const axes =
    {
      visuals: {
        drawCmd: 'drawAxis',
        show: true
      }
    }

    const gestures = pointerGestures(canvas);

    
let controlsState = controls.orbit.defaults

    // rotate
    gestures.drags
      .forEach(data => {
        const delta = [data.delta.x, data.delta.y].map(d => -d)
        const { shiftKey } = data.originalEvents[0]
        if (!shiftKey) {
          const updated =  controls.orbit.rotate({ controls: controlsState, camera, speed: rotateSpeed }, delta)
          controlsState = { ...controlsState, ...updated.controls }
        }
        renderCameraChange();
      })
    // pan
    gestures.drags
      .forEach(data => {
        const delta = [data.delta.x, data.delta.y].map(d => d)
        const { shiftKey } = data.originalEvents[0]
        if (shiftKey) {
          const updated =  controls.orbit.pan({ controls: controlsState, camera, speed: panSpeed }, delta)
          // const fooCam = camera = { ...camera, ...updated.camera }
          camera.position = updated.camera.position
          camera.target = updated.camera.target
        }
        renderCameraChange();
      })

    // zoom
    gestures.zooms
      .forEach(x => {
        const updated =  controls.orbit.zoom({ controls: controlsState, camera, speed: zoomSpeed }, -x)
        controlsState = { ...controlsState, ...updated.controls }
        renderCameraChange();
      })

    // auto fit
    gestures.taps
      .filter(taps => taps.nb === 2)
      .forEach(x => {
        const updated =  controls.orbit.zoomToFit({ controls: controlsState, camera, entities })
        controlsState = { ...controlsState, ...updated.controls }
        renderCameraChange();
      })

    

const render = prepareRender(viewerOptions);

const entities: never[] = [];

const renderOptions = {
    ...viewerOptions,
 entities: [
    true ? grid : undefined,
    true ? axes : undefined,
    ...entities
  ]    .filter(x => x != null)
};

let pendingRender = false;
let pendingDoResize = false;
function requestRender(doResize = false) {
    pendingDoResize ||= doResize;
    if(!pendingRender) {
    pendingRender = true;
    requestAnimationFrame(() => {
        pendingRender = false;
        if(pendingDoResize) {resize(canvas);}
        render(renderOptions);
    });
  }
}

function renderCameraChange() {
    let updatedA = controls.orbit.update({ controls:controlsState, camera })
    controlsState = { ...controlsState, ...updatedA.controls }
    camera.position = updatedA.camera.position
    cameras.perspective.update(camera)
    requestRender();
}

window.onresize = () => requestRender(true)

requestRender(true);

evaluation.rebuildGeometry({
    // mainPath: '',
    // apiMainPath: '@jscad/modeling',s
    // serialize: false,
    // lookup: null,
    // lookupCounts: null,
    // parameterValues: {}
    filesAndFolders: [ { name: "bob", ext: "js", source: `
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

module.exports = { main };

    `, fullPath: '/fake/foo.js' } ]
}, console.warn);

function createContext (canvas: HTMLCanvasElement) {
    const get = (type: string) => {
      try {
        // NOTE: older browsers may return null from getContext()
        const context = canvas.getContext(type);
        return context ? { gl: context as WebGLRenderingContext, type } : null
      } catch (e) {
        return null
      }
    }
    function err(): never {
        throw new Error("Could not create 3D context");
    }
    return (
      get('webgl2') ||
      get('webgl') ||
      get('experimental-webgl') ||
      get('webgl-experimental') ||
      err()
    )
  }

  function resize(viewerElement: HTMLCanvasElement) {
    const pixelRatio = window.devicePixelRatio || 1
    let width = window.innerWidth
    let height = window.innerHeight
    if (viewerElement !== document.body) {
      const bounds = viewerElement.getBoundingClientRect()
      width = bounds.right - bounds.left
      height = bounds.bottom - bounds.top
    }
    viewerElement.width = pixelRatio * width
    viewerElement.height = pixelRatio * height

    
  cameras.perspective.setProjection(camera, camera, { width, height });
  }
  