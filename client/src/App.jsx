import { useState } from 'react'
import { BrowserRouter, Routes, Route } from "react-router";
import './App.css'
import RouteEditor from './components/Editors/RouteEditor/RouteEditor'
import BuildingEditor from './components/Editors/BuildingEditor/BuildingEditor';
import NavgationMap from './components/navigation/NavigationMap';
function App() {


  return (
    <Routes>
      <Route path='/' element={<NavgationMap />} />
      <Route path="/editor/route" element={<RouteEditor />} />
      <Route path="/editor/building" element={<BuildingEditor />} />
    </Routes>
  )
}

export default App
