declare module "most-gestures" {
  type DragData = {
    delta: { x: number; y: number };
    originalEvents: MouseEvent[];
  };

  type TapData = {
    nb: 1 | 2;
  };

  type TapGestures = {
    filter: (cb: (data: TapData) => boolean) => TapGestures;
    forEach: (cb: (data: TapData) => void) => void;
  };

  type Gestures = {
    drags: {
      forEach: (cb: (data: DragData) => void) => void;
    };
    zooms: {
      forEach: (cb: (data: number) => void) => void;
    };
    taps: TapGestures;
  };

  export const pointerGestures: (element: HTMLElement) => Gestures;
}
