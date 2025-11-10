import { addBuilding,editBuilding,deleteBuilding } from "../../../api";
import Button from 'react-bootstrap/Button';
import InputGroup from 'react-bootstrap/InputGroup';
import Form from 'react-bootstrap/Form';
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import ListGroup from 'react-bootstrap/ListGroup';
import Badge from 'react-bootstrap/Badge';
import Modal from 'react-bootstrap/Modal';

export default function Buildings({buildings, getBuildings}){
    const [currentName,setCurrentName] = useState("");
    const [curEditId,setcurEditId] = useState("");
    const [curEditName,setcurEditName] = useState("");
    const [show,setShow] = useState(false);
    const handleShow = ()=>setShow(true);
    const handleClose = ()=>setShow(false);
    
    async function deleteBuildingHandler(id){
        let resp = await deleteBuilding(id)
        console.log(resp)
        if(resp.status == 200){
            toast.success("Building Name updated!") 
            getBuildings()
        }else{
            toast.error(resp.message)
        }

    }
    
    async function editBuildingHandler(){
        let resp = await editBuilding(curEditId,curEditName)
        console.log(resp)
        if(resp.status == 200){
           setcurEditId("")
           setcurEditName("")
           toast.success("Building Name updated!") 
           getBuildings()
           handleClose()
        }else{
            toast.error(resp.message)
        }

    } 

    async function addBuildingHandler(){
        let resp = await addBuilding(currentName)
        console.log(resp)
        if(resp.status == 200){
            setCurrentName("")
            getBuildings()
        }else{
            toast.error(resp.message)
        }
    }


return(<>
<div className="w-full ">
    <InputGroup className="mb-3">
        <Form.Control
          aria-label="Default"
          aria-describedby="inputGroup-sizing-default"
          placeholder="Building Name"
          value={currentName}
          onChange={(e)=>setCurrentName(e.target.value)}
        />
       <Button className="w-25" onClick={()=>addBuildingHandler()}>Add</Button>
      </InputGroup>
    
</div>
<div className="w-full">

<ListGroup>
{buildings.map((b)=>{
    return(
        <ListGroup.Item className="d-flex justify-content-between align-items-start" key={b.id}>
            {b.name}
            <div className="flex flex-row">
            <Button variant="success" onClick={()=>{handleShow(); setcurEditId(b.id); setcurEditName(b.name) }}>Edit</Button>
            <div className="ml-2">
            <Button variant="danger" onClick={()=>deleteBuildingHandler(b.id)}>X</Button>
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
                    placeholder="Building Name"
                    value={curEditName}
                    onChange={(e)=>setcurEditName(e.target.value)}
                    />
                <Button className="w-25" onClick={()=>editBuildingHandler()}>Submit</Button>
                </InputGroup>
                
            </div>         
        </Modal.Body>
        <Modal.Footer>
          {/* <Button variant="secondary" onClick={handleCloseBuildingModal}>
            Close
          </Button> */}
        </Modal.Footer>
      </Modal>
</>)
}