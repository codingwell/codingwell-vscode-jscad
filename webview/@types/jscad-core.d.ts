declare module "@jscad/core" {
  import { geometries } from "@jscad/modeling";
  import Geom2 = geometries.geom2.Geom2;
  import Geom3 = geometries.geom3.Geom3;

  type GroupParameter = {
    name: string;
    type: "group";
    initial: undefined | "closed";
    caption: string;
  };

  // { name: 'text', type: 'text', initial: '', size: 20, maxLength: 20, caption: 'Plain Text:', placeholder: '20 characters' },
  // { name: 'int', type: 'int', initial: 20, min: 1, max: 100, step: 1, caption: 'Integer:' },
  // { name: 'number', type: 'number', initial: 2.0, min: 1.0, max: 10.0, step: 0.1, caption: 'Number:' },
  // { name: 'date', type: 'date', initial: '2020-01-01', min: '2020-01-01', max: '2030-12-31', caption: 'Date:', placeholder: 'YYYY-MM-DD' },
  // { name: 'email', type: 'email', initial: 'me@example.com', caption: 'Email:' },
  // { name: 'url', type: 'url', initial: 'www.example.com', size: 40, maxLength: 40, caption: 'Url:', placeholder: '40 characters' },
  // { name: 'password', type: 'password', initial: '', caption: 'Password:' },

  // { name: 'color', type: 'color', initial: '#FFB431', caption: 'Color:' },
  // { name: 'slider', type: 'slider', initial: 3, min: 1, max: 10, step: 1, caption: 'Slider:' },
  // { name: 'choice1', type: 'choice', caption: 'Dropdown Menu:', values: [0, 1, 2, 3], captions: ['No', 'Yes', 'Maybe', 'So so'], initial: 2 },
  // { name: 'choice3', type: 'choice', caption: 'Dropdown Menu:', values: ['No', 'Yes', 'Maybe', 'So so'], initial: 'No' },

  type CheckboxParameter<T extends string | number | boolean> = {
    name: string;
    type: "checkbox";
    checked: boolean;
    caption?: string;
    initial?: T;
  };

  type RadioParameter<T extends string | number | boolean> = {
    name: string;
    type: "radio";
    caption?: string;
    initial?: T;
    values?: T[];
    captions?: string[];
  };

  type Parameter =
    | GroupParameter
    | RadioParameter<string | number | boolean>
    | CheckboxParameter<string | number | boolean>;

  type Params = {
    type: "params";
    parameterDefaults: { [key: string]: string | number | boolean };
    parameterDefinitions: Parameter[];
  };
  type Solids = {
    type: "solids";
    solids: Geom2[] | Geom3[]; // solidsData.solids,
    lookup: any; //solidsData.lookup,
    lookupCounts: any; // solidsData.lookupCounts
  };
  type ParamsOrSolids = Params | Solids;

  export type RebuildGeometryCallback = (
    error: {
      type: "errors";
      name: string;
      message: string;
      description: string;
      number: string;
      fileName: string;
      lineNumber: string;
      columnNumber: string;
      stack: string;
    } | null,
    result: ParamsOrSolids | null
  ) => void;

  export const evaluation: {
    rebuildGeometry: (
      options: {
        /** @default '' */
        mainPath?: string | null;
        /** @default '@jscad/modeling' */
        apiMainPath?: string | null | undefined;
        /** @default false */
        serialize?: boolean | null | undefined;
        lookup?: any;
        lookupCounts?: any;
        /** @default {} */
        parameterValues?: { [key: string]: string | number | boolean };
        filesAndFolders: {
          name: string;
          ext: string;
          source: string;
          fullPath: string;
        }[];
      },
      callback: RebuildGeometryCallback
    ) => void;
  };
}
