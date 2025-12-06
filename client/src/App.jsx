import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import "./App.css";
import RouteEditor from "./components/Editors/RouteEditor/RouteEditor";
import BuildingEditor from "./components/Editors/BuildingEditor/BuildingEditor";
import NavigationMap from "./components/navigation/NavigationMap";
import NavigationMapBlueLight from "./components/navigation/NavigationMapBlueLight";
function App() {
  return (
    <Routes>
      <Route path="/" element={<NavigationMap />} />
      <Route path="/editor/route" element={<RouteEditor />} />
      <Route path="/editor/building" element={<BuildingEditor />} />
      <Route
        path="/emergency-routing/bluelight"
        element={<NavigationMapBlueLight />}
      />
    </Routes>
  );
}

export default App;
