import { useState } from 'react'
import { BrowserRouter, Routes, Route } from "react-router";
import './App.css'
import MapEditor from './components/mapEditor/MapEditor'
import NavgationMap from './components/navigation/NavigationMap';
function App() {


  return (
    <Routes>
      <Route path='/' element={<NavgationMap />} />
      <Route path="/editor" element={<MapEditor />} />
    </Routes>
  )
}

export default App
