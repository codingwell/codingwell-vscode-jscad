import './styles.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { CloudDownload } from 'react-bootstrap-icons';
import Dropdown from 'react-bootstrap/Dropdown';

import 'bootstrap/dist/css/bootstrap.min.css';
import { parse } from 'path';

const postDownload = (fileName, format) => () => {
    window.postMessage({
        //
        type: 'download',
        format,
        fileName,
    });
};

const App = () => {
    return (
        <div>
            <Dropdown>
                <Dropdown.Toggle id="dropdown-basic">
                    <CloudDownload />
                </Dropdown.Toggle>

                <Dropdown.Menu>
                    <Dropdown.Item onClick={postDownload(fileName, 'stl')}>Download as STL</Dropdown.Item>
                    <Dropdown.Item onClick={postDownload(fileName, 'amf')}>Download as AMF</Dropdown.Item>
                    <Dropdown.Item onClick={postDownload(fileName, '3mf')}>Download as 3MF</Dropdown.Item>
                    <Dropdown.Item onClick={postDownload(fileName, 'obj')}>Download as OBJ</Dropdown.Item>
                </Dropdown.Menu>
            </Dropdown>
        </div>
    );
};
window.process = {};
const root = document.getElementById('react-app');
const fileName = parse(root.dataset.filename).name;

ReactDOM
    //
    .createRoot(root)
    .render(<App />);
