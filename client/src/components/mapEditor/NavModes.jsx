import { addNavMode, editNavMode, deleteNavMode } from "../../../api";
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Modal from 'react-bootstrap/Modal';

export default function NavModes({ navModes, getNavModes }) {
    const [currentName, setCurrentName] = useState("");
    const [curEditId, setcurEditId] = useState("");
    const [curEditName, setcurEditName] = useState("");
    const [show, setShow] = useState(false);
    const handleShow = () => setShow(true);
    const handleClose = () => setShow(false);

    async function deleteNavModeHandler(id) {
        let resp = await deleteNavMode(id)
        console.log(resp)
        if (resp.status == 200) {
            toast.success("NavMode Name updated!")
            getNavModes()
        } else {
            toast.error(resp.message)
        }

    }

    async function editNavModeHandler() {
        let resp = await editNavMode(curEditId, curEditName)
        console.log(resp)
        if (resp.status == 200) {
            setcurEditId("")
            setcurEditName("")
            toast.success("NavMode Name updated!")
            getNavModes()
            handleClose()
        } else {
            toast.error(resp.message)
        }

    }

    async function addNavModeHandler() {
        let resp = await addNavMode(currentName)
        console.log(resp)
        if (resp.status == 201) {
            setCurrentName("")
            getNavModes()
        } else {
            toast.error(resp.message)
        }
    }


    return (<>
        <div className="w-full ">
            <InputGroup className="mb-3">
                <Form.Control
                    aria-label="Default"
                    aria-describedby="inputGroup-sizing-default"
                    placeholder="NavMode Name"
                    value={currentName}
                    onChange={(e) => setCurrentName(e.target.value)}
                />
                <Button className="w-25" onClick={() => addNavModeHandler()}>Add</Button>
            </InputGroup>

        </div>
        <div className="w-full">

            <ListGroup>
                {navModes.map((b) => {
                    return (
                        <ListGroup.Item className="d-flex justify-content-between align-items-start" key={b.id}>
                            {b.name}
                            <div className="flex flex-row">
                                <Button variant="success" onClick={() => { handleShow(); setcurEditId(b.id); setcurEditName(b.name) }}>Edit</Button>
                                <div className="ml-2">
                                    <Button variant="danger" onClick={() => deleteNavModeHandler(b.id)}>X</Button>
                                </div>
                            </div>
                        </ListGroup.Item>
                    )
                })}
            </ListGroup>

        </div>

        <Modal
            show={show}
            onHide={handleClose}
            backdrop="static"
            keyboard={false}
        >
            <Modal.Header closeButton>
                <Modal.Title>Edit Name</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="w-full ">
                    <InputGroup className="mb-3">
                        <Form.Control
                            aria-label="Default"
                            aria-describedby="inputGroup-sizing-default"
                            placeholder="NavMode Name"
                            value={curEditName}
                            onChange={(e) => setcurEditName(e.target.value)}
                        />
                        <Button className="w-25" onClick={() => editNavModeHandler()}>Submit</Button>
                    </InputGroup>

                </div>
            </Modal.Body>
            <Modal.Footer>
                {/* <Button variant="secondary" onClick={handleClosenavModeModal}>
            Close
          </Button> */}
            </Modal.Footer>
        </Modal>
    </>)
}