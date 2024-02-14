
import React from 'react';
import { CloudDownload } from 'react-bootstrap-icons';
import Dropdown from 'react-bootstrap/Dropdown';

const postDownload = (fileName:string, format:string) => () => {
    window.postMessage({
        //
        type: 'download',
        format,
        fileName,
    });
};

export default function DownloadButton({fileName}: {fileName: string}) {
    return (
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
    );
};
