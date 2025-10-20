// src/components/MapEditor.jsx
"use client";
import toast, { Toaster } from "react-hot-toast";
import { useMemo, useRef, useState, useEffect } from "react";
import { Map as ReactMap, Marker, Source, Layer } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { getAllMapFeature, addNode, addEdge, editNode, deleteFeature } from "../../../api";
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';

export default function MapEditor() {
  const [viewState, setViewState] = useState({
    longitude: -76.494131,
    latitude: 42.422108,
    zoom: 15.5,
  });

  // Nodes
  const [markers, setMarkers] = useState([]);
  const [curBuildingMarkers, setCurBuildingMarkers] = useState({});
  const [curADAFeature, setCurADAFeature] = useState({});

  // Undirected edges by node ids
  const [edgeIndex, setEdgeIndex] = useState([]); // [{key, from, to}]
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("select"); // 'select' | 'edit' | 'delete'
  const [showNodes, setShowNodes] = useState(true);
  // const [buildingAdd, setBuildingAdd] = useState(false);

  const mapRef = useRef(null);
  const modeRef = useRef(mode);            // why: avoid stale closures in map listeners
  const selectedRef = useRef(selectedId);  // why: avoid stale closures in map listeners
  modeRef.current = mode;
  selectedRef.current = selectedId;

  // // Build edges GeoJSON from nodes + edgeIndex
  // const edgesGeoJSON = useMemo(() => {
  //   const coord = new Map(markers.map((m) => [m.id, [m.lng, m.lat]]));
  //   return {
  //     type: "FeatureCollection",
  //     features: edgeIndex
  //       .map(({ key, from, to }) => {
  //         const a = coord.get(from);
  //         const b = coord.get(to);
  //         if (!a || !b) return null;
  //         return {
  //           type: "Feature",
  //           properties: { key, from, to },
  //           geometry: { type: "LineString", coordinates: [a, b] },
  //         };
  //       })
  //       .filter(Boolean),
  //   };
  // }, [markers, edgeIndex]);

  // // Edge line styling
  // const lineLayer = useMemo(
  //   () => ({
  //     id: "graph-edges",
  //     type: "line",
  //     source: "edges",
  //     layout: { "line-cap": "round", "line-join": "round" },
  //     paint: { "line-width": 5, "line-color": "#111827", "line-opacity": 0.9 },
  //   }),
  //   []
  // );

  const edgesGeoJSON = useMemo(() => {
    const coord = new Map(markers.map((m) => [m.id, [m.lng, m.lat]]));
    return {
      type: "FeatureCollection",
      features: edgeIndex
        .map(({ key, from, to }) => {
          const a = coord.get(from);
          const b = coord.get(to);
          if (!a || !b) return null;
          return {
            type: "Feature",
            properties: {
              key,
              from,
              to,
              ada: !!curADAFeature[key], // << mark ADA-selected edges
            },
            geometry: { type: "LineString", coordinates: [a, b] },
          };
        })
        .filter(Boolean),
    };
  }, [markers, edgeIndex, curADAFeature]); // << include ADA map so style updates

  // --- Line layer: color/width change when ADA-selected ---
  const lineLayer = useMemo(
    () => ({
      id: "graph-edges",
      type: "line",
      source: "edges",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-width": [
          "case",
          ["boolean", ["get", "ada"], false],
          6, // wider when ADA
          5,
        ],
        "line-color": [
          "case",
          ["boolean", ["get", "ada"], false],
          "#e11717ff", // ADA = green
          "#111827", // default = dark gray
        ],
        "line-opacity": 0.95,
      },
    }),
    []
  );


  // Helpers
  const edgeKey = (a, b) => [a, b].sort().join("__");
  const findMarker = (id) => markers.find((m) => m.id === id) || null;

  async function addEdgeIfMissing(a, b) {
    if (a === b) return;
    if (!findMarker(a) || !findMarker(b)) return;
    const key = edgeKey(a, b);
    const coord = new Map(markers.map((m) => [m.id, [m.lng, m.lat]]));
    const ac = coord.get(a);
    const bc = coord.get(b);
    let foundE = edgeIndex.some((e) => e.key === key)
    if (foundE) {
      return;
    } else {
      let response = await addEdge(key, b, a, [ac, bc])
      if (response) {
        setEdgeIndex((list) => ([...list, { key, from: a, to: b }]));
      } else {
        toast.error("Edge could not be added.")
      }
    }
  }

  async function deleteNode(id) {
    let response = await deleteFeature(id, "Point")

    if (response) {
      setMarkers((prev) => prev.filter((m) => m.id !== id));
      setEdgeIndex((list) => list.filter((e) => e.from !== id && e.to !== id));
    } else {
      toast.error("Feature could not be deleted.")
    }

    if (selectedRef.current === id) setSelectedId(null);
  }

  async function deleteEdgeByKey(key) {

    let response = await deleteFeature(key, "Edge")

    if (response) {
      setEdgeIndex((list) => list.filter((e) => e.key !== key));
    } else {
      toast.error("Feature could not be deleted.")
    }

  }

  // Map-level click: clear selection
  async function handleMapClick(e) {
    // console.log(e)
    if (e.originalEvent?.ctrlKey) {
      const { lng, lat } = e.lngLat;
      const id = `n-${Date.now()}`;
      let response = await addNode(id, lng, lat)
      if (response) {
        setMarkers((prev) => [...prev, { id, lng, lat }]);
        return;
      } else {
        toast.error("Node could not be added.")
        return;
      }
    }
    if (modeRef.current === "select" && selectedRef.current !== null) {
      setSelectedId(null);
    }
  }

  // Node click per mode
  function handleMarkerClick(e, id) {
    e.stopPropagation(); // why: prevent map click behavior
    if (modeRef.current === "delete") {
      deleteNode(id);
      return;
    }

    if (modeRef.current === "buildingGroup") {

      // immutable toggle
      setCurBuildingMarkers((prev) => {
        // selected?
        if (Object.prototype.hasOwnProperty.call(prev, id)) {
          // remove key immutably
          const { [id]: _removed, ...rest } = prev; // <-- new object
          return rest;
        }
        // add key immutably
        const cur = markers.find((m) => m.id === id);
        if (!cur) return prev;
        return { ...prev, [id]: cur };
      });
      
      // building node
      return;
    }

    if (modeRef.current === "ada") {

      // immutable toggle
      setCurADAFeature((prev) => {
        // selected?
        if (Object.prototype.hasOwnProperty.call(prev, id)) {
          // remove key immutably
          const { [id]: _removed, ...rest } = prev; // <-- new object
          return rest;
        }
        // add key immutably
        const cur = markers.find((m) => m.id === id);
        if (!cur) return prev;
        return { ...prev, [id]: cur };
      });
      
      // building node
      return;
    }

    if (modeRef.current === "select") {
      const cur = selectedRef.current;
      if (cur === null) {
        setSelectedId(id);
        return;
      }
      if (cur === id) {
        setSelectedId(null);
        return;
      }
      addEdgeIfMissing(cur, id);
      setSelectedId(null);
      return;
    }

  }

  // Drag end in edit mode
  function handleMarkerDragEnd(e, id) {
    const { lng, lat } = e.lngLat;
    // setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, lng, lat } : m)));
    let response = editNode(id, lng, lat)
    if (response) {
      setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, lng, lat } : m)));
      return;
    } else {
      toast.error("Node could not be edited.")
      return;
    }
    // edges recompute via useMemo
  }

  // Edge layer click handler (used for Delete mode)
  function handleEdgeLayerClick(e) {
    const f = e.features?.[0];
    const key = f?.properties?.key;
    if (modeRef.current === "buildingGroup") {

      // immutable toggle
      setCurBuildingMarkers((prev) => {
        // selected?
        if (Object.prototype.hasOwnProperty.call(prev, key)) {
          // remove key immutably
          const { [key]: _removed, ...rest } = prev; // <-- new object
          return rest;
        }
        // add key immutably
        const cur = edgeIndex.find((m) => m.key === key);
        if (!cur) return prev;
        return { ...prev, [key]: cur };
      });
      
      // building node
      return;
    }

    if (modeRef.current === "ada") {

      // immutable toggle
      setCurADAFeature((prev) => {
        // selected?
        if (Object.prototype.hasOwnProperty.call(prev, key)) {
          // remove key immutably
          const { [key]: _removed, ...rest } = prev; // <-- new object
          return rest;
        }
        // add key immutably
        const cur = edgeIndex.find((m) => m.key === key);
        if (!cur) return prev;
        return { ...prev, [key]: cur };
      });
      
      // building node
      return;
    }
    if (modeRef.current === "delete"){
      if (key){
        let response = deleteFeature(key,"Edge")
        deleteEdgeByKey(key)
      }
    }
  }
  // NEW: change cursor when hovering edges
  function handleEdgeEnter() {
    const map = mapRef.current?.getMap?.();
    if (map) map.getCanvas().style.cursor = "pointer"; // UX cue
  }
  function handleEdgeLeave() {
    const map = mapRef.current?.getMap?.();
    if (map) map.getCanvas().style.cursor = "";
  }
  // Wire/unwire edge layer listeners
  function handleLoad() {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    map.off("click", "graph-edges", handleEdgeLayerClick);
    map.off("mouseenter", "graph-edges", handleEdgeEnter);
    map.off("mouseleave", "graph-edges", handleEdgeLeave);

    map.on("click", "graph-edges", handleEdgeLayerClick);
    map.on("mouseenter", "graph-edges", handleEdgeEnter);
    map.on("mouseleave", "graph-edges", handleEdgeLeave);
  }


  async function getAllFeature() {
    let response = await getAllMapFeature()
    const fc = response;
    if (markers.length > 0) {
      return
    }
    if (fc?.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
      alert("Invalid GeoJSON FeatureCollection.");
      return;
    }
    const nextMarkers = [];
    const nextEdges = [];
    for (const f of fc.features) {
      if (f?.geometry?.type === "Point") {
        const id = f.id ?? f.properties?.id;
        const [lng, lat] = f.geometry.coordinates || [];
        if (id && Number.isFinite(lng) && Number.isFinite(lat)) {
          nextMarkers.push({ id, lng, lat });
        }
      } else if (f?.geometry?.type === "LineString") {
        const from = f.properties?.from;
        const to = f.properties?.to;
        if (from && to) nextEdges.push({ key: edgeKey(from, to), from, to });
      }
    }
    const ids = new Set(nextMarkers.map((m) => m.id));
    if (ids.size !== nextMarkers.length) {
      alert("Duplicate node ids in import.");
      return;
    }
    setMarkers(nextMarkers);
    const uniq = [];
    const seen = new Set();
    for (const e of nextEdges) {
      if (seen.has(e.key)) continue;
      seen.add(e.key);
      uniq.push(e);
    }
    setEdgeIndex(uniq);
    setSelectedId(null);
    ev.target.value = "";
  }


  useEffect(() => {

    getAllFeature()
    return () => {
      const map = mapRef.current?.getMap?.();
      if (map) map.off("click", "graph-edges", handleEdgeLayerClick);
    };
  }, []);

  // Export: single FeatureCollection (Points + LineStrings)
  function exportGeoJSON() {
    const nodes = markers.map((m) => ({
      type: "Feature",
      id: m.id,
      properties: { id: m.id },
      geometry: { type: "Point", coordinates: [m.lng, m.lat] },
    }));
    const data = { type: "FeatureCollection", features: [...nodes, ...edgesGeoJSON.features] };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "graph.geojson";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import: parse points (need id) + lines ({from,to})
  function importGeoJSON(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const fc = JSON.parse(reader.result);
        if (fc?.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
          alert("Invalid GeoJSON FeatureCollection.");
          return;
        }
        const nextMarkers = [];
        const nextEdges = [];
        for (const f of fc.features) {
          if (f?.geometry?.type === "Point") {
            const id = f.id ?? f.properties?.id;
            const [lng, lat] = f.geometry.coordinates || [];
            if (id && Number.isFinite(lng) && Number.isFinite(lat)) {
              nextMarkers.push({ id, lng, lat });
            }
          } else if (f?.geometry?.type === "LineString") {
            const from = f.properties?.from;
            const to = f.properties?.to;
            if (from && to) nextEdges.push({ key: edgeKey(from, to), from, to });
          }
        }
        const ids = new Set(nextMarkers.map((m) => m.id));
        if (ids.size !== nextMarkers.length) {
          alert("Duplicate node ids in import.");
          return;
        }
        setMarkers(nextMarkers);
        const uniq = [];
        const seen = new Set();
        for (const e of nextEdges) {
          if (seen.has(e.key)) continue;
          seen.add(e.key);
          uniq.push(e);
        }
        setEdgeIndex(uniq);
        setSelectedId(null);
        ev.target.value = "";
      } catch {
        alert("Failed to parse GeoJSON.");
      }
    };
    reader.readAsText(file);
  }

   // Toggle handler: also clear selection so no hidden active node remains
  function toggleNodes() {
    setShowNodes((v) => {
      if (v && selectedRef.current) setSelectedId(null); // visible→hidden
      return !v;
    });
  }

  return (
    <div className="w-full h-screen relative">
      <Toaster
        position="top-right"
        reverseOrder={true}
      />
      {/* Toolbar */}
      <div className="absolute z-10 top-3 left-3 bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow flex items-center gap-2">
        <span className="text-sm font-medium">Mode:</span>
        <button
          className={`px-2 py-1 rounded ${mode === "select" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setMode("select")}
          title="Place nodes and connect them to form routes."
        >
          Draw
        </button>
        <button
          className={`px-2 py-1 rounded ${mode === "ada" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setMode("ada")}
          title="Select the edges and nodes that are accessiable."
        >
          ADA Select
        </button>
        <button
          className={`px-2 py-1 rounded ${mode === "buildingGroup" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setMode("buildingGroup")}
          title="Select the node at the entrance of a building."
        >
          Building Select
        </button>
        <button
          className={`px-2 py-1 rounded ${mode === "edit" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setMode("edit")}
        >
          Edit
        </button>
        <button
          className={`px-2 py-1 rounded ${mode === "delete" ? "bg-red-600 text-white" : "bg-gray-200"}`}
          onClick={() => setMode("delete")}
        >
          Delete
        </button>
        <div className="mx-2 w-px h-5 bg-gray-300" />
        <button className="px-2 py-1 rounded bg-gray-800 text-white" onClick={exportGeoJSON}>
          Export
        </button>
        <label className="px-2 py-1 rounded bg-gray-200 cursor-pointer">
          Import
          <input type="file" accept=".json,.geojson,application/geo+json" onChange={importGeoJSON} hidden />
        </label>
        {/* <span className="ml-2 text-xs text-gray-600">
          {mode=="select" ?"Tip: Ctrl+Click map to add node":null} 
          {mode=="ada" ?"Tip: Select the edges and nodes that are accessiable":null} 
          {mode=="buildingGroup" ?"Tip: Select the node at the entrance of a building.":null} 
           {mode=="edit" ?"Tip: Ctrl+Click map to add node":null} 
          {mode=="delete" ?"Tip: Ctrl+Click map to add node":null}  
          • Selected: {selectedId ?? "none"}
        </span> */}
      </div>
      <div className="absolute z-10 top-16 left-3 bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow flex flex-col items-center gap-2">
        <div className="flex flex-row w-full items-center">
          <span className="text-sm font-medium w-50">Building Nodes:</span>
          <DropdownButton id="dropdown-basic-button" title="Dropdown button" className="pl-2">
            <Dropdown.Item href="#/action-1">Action</Dropdown.Item>
            <Dropdown.Item href="#/action-2">Another action</Dropdown.Item>
            <Dropdown.Item href="#/action-3">Something else</Dropdown.Item>
          </DropdownButton>
          <div className="pl-2">
            <button
              className={`px-3 py-2  rounded ${mode === "select" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
              onClick={() =>{}}
            >
              Add
            </button>
          </div>
        </div>

        <div className="">

        </div>

      </div>

      <ReactMap
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={handleMapClick}
        className="w-full h-full"
        mapStyle="https://api.maptiler.com/maps/base-v4/style.json?key=ezFqZj4n29WctcwDznlR"
        onLoad={handleLoad}
      >
        {/* Edges */}
        <Source id="edges" type="geojson" data={edgesGeoJSON}>
          <Layer {...lineLayer} />
        </Source>

        {/* Nodes */}
        {markers.map((m) => {
          let isSelected = m.id === selectedId && mode === "select";
          if(mode === "select"){
            isSelected = m.id === selectedId
          }else if(mode === "ada"){
            isSelected = m.id in curADAFeature
          }
          else if(mode === "buildingGroup"){
            // console.log(m.id in curBuildingMarkers)
            isSelected = m.id in curBuildingMarkers
          }


          return (
            <Marker
              key={m.id}
              longitude={m.lng}
              latitude={m.lat}
              anchor="center"
              draggable={mode === "edit"}
              onDragEnd={(e) => handleMarkerDragEnd(e, m.id)}
            >

              <button
                  onClick={(e) => handleMarkerClick(e, m.id)}
                  onContextMenu={(e) => e.preventDefault()}
                  aria-label={`marker-${m.id}`}
                  className={`rounded-full border-2 shadow ${
                    isSelected ? "bg-red-600 border-white" : "bg-blue-600 border-white"
                  }`}
                  style={{ width: 16, height: 16, cursor: "pointer", boxSizing: "content-box",opacity: showNodes ? 1 : 0, pointerEvents: showNodes ? 'auto' : 'none'}}
                  title={`${m.id} (${m.lng.toFixed(5)}, ${m.lat.toFixed(5)})`}
                />
            </Marker>
          );
        })}
      </ReactMap>
    </div>
  );
}
