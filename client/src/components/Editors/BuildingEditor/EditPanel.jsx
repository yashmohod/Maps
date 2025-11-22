import React from "react";
import InputGroup from "react-bootstrap/InputGroup";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

function EditPanel({
  curEditName,
  currentBuilding,
  setcurEditName,
  submitName,
}) {
  return (
    <>
      <div className="flex flex-col absolute z-20 top-3 left-3 bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow  items-center gap-2">
        <span className="text-sm font-medium">Current Building:</span>

        <p>
          lat: {currentBuilding.lat}
          <br />
          Lng: {currentBuilding.lng}
        </p>

        <InputGroup className="mb-3 w-full">
          <Form.Control
            placeholder="Building Name"
            value={curEditName}
            onChange={(e) => setcurEditName(e.target.value)}
          />
          <Button className="w-25" onClick={submitName}>
            Submit
          </Button>
        </InputGroup>
      </div>
    </>
  );
}

export default React.memo(EditPanel);
