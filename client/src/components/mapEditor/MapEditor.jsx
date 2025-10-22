// "use client";
// import toast, { Toaster } from "react-hot-toast";
// import { useMemo, useRef, useState, useEffect } from "react";
// import { Map as ReactMap, Marker, Source, Layer } from "@vis.gl/react-maplibre";
// import Buildings from "./Buildings";
// import "maplibre-gl/dist/maplibre-gl.css";
// import {
//   getAllMapFeature,
//   addNode,
//   addEdge,
//   editNode,
//   deleteFeature,
//   setADAStatus,
//   getAllBuildings,
//   getAllBuildingNodes,
//   attachNodeToBuilding,
//   detachNodeFromBuilding
// } from "../../../api";
// import Dropdown from "react-bootstrap/Dropdown";
// import DropdownButton from "react-bootstrap/DropdownButton";
// import Modal from 'react-bootstrap/Modal';
// import Button from 'react-bootstrap/Button';

// export default function MapEditor() {
//   const [viewState, setViewState] = useState({
//     longitude: -76.494131,
//     latitude: 42.422108,
//     zoom: 15.5,
//   });

//   // Nodes
//   const [markers, setMarkers] = useState([]);
//   const [curBuildingNodes, setCurBuildingNodes] = useState({}); // {nodeId: {...node, buildingId}}
//   const [curADANodes, setCurADANodes] = useState({});           // {nodeId: node}
//   const [curADAEdges, setCurADAEdges] = useState({});           // {edgeKey: {key,from,to}}
//   const [showBuildingModal, setShowBuildingModal] = useState(false);

//   const handleCloseBuildingModal = () => setShowBuildingModal(false);
//   const handleShowBuildingModal = () => setShowBuildingModal(true);

//   // Buildings (example list; replace with your source if needed)
//   const [buildings, setBuildings] = useState([]);
//   const [currentBuilding, setCurrentBuilding] = useState(null);

//   // Edges index (all edges)
//   const [edgeIndex, setEdgeIndex] = useState([]); // [{key, from, to}]
//   const [selectedId, setSelectedId] = useState(null);
//   const [mode, setMode] = useState("select");
//   const [showNodes, setShowNodes] = useState(true);
//   const [showOnlyADA, setShowOnlyADA] = useState(false);

//   const mapRef = useRef(null);
//   const modeRef = useRef(mode);
//   const selectedRef = useRef(selectedId);
//   modeRef.current = mode;
//   selectedRef.current = selectedId;

//   // Helpers
//   const edgeKey = (a, b) => [a, b].sort().join("__");
//   const findMarker = (id) => markers.find((m) => m.id === id) || null;
//   const isNodeSelectedADA = (id) => Object.prototype.hasOwnProperty.call(curADANodes, id);
//   const isEdgeSelectedADA = (key) => Object.prototype.hasOwnProperty.call(curADAEdges, key);
//   const getEdgeByKey = (key) => edgeIndex.find((e) => e.key === key) || null;
//   const hasAdjSelectedEdge = (nodeId) =>
//     Object.values(curADAEdges).some((e) => e.from === nodeId || e.to === nodeId);

//   // Edges GeoJSON (ADA flag + optional filter)
//   const edgesGeoJSON = useMemo(() => {
//     const coord = new Map(markers.map((m) => [m.id, [m.lng, m.lat]]));
//     return {
//       type: "FeatureCollection",
//       features: edgeIndex
//         .map(({ key, from, to }) => {
//           const a = coord.get(from);
//           const b = coord.get(to);
//           if (!a || !b) return null;
//           if (showOnlyADA && mode === "ada" && !isEdgeSelectedADA(key)) return null;
//           return {
//             type: "Feature",
//             properties: { key, from, to, ada: isEdgeSelectedADA(key) && mode === "ada" },
//             geometry: { type: "LineString", coordinates: [a, b] },
//           };
//         })
//         .filter(Boolean),
//     };
//   }, [markers, edgeIndex, curADAEdges, mode, showOnlyADA]);

//   // Line style
//   const lineLayer = useMemo(
//     () => ({
//       id: "graph-edges",
//       type: "line",
//       source: "edges",
//       layout: { "line-cap": "round", "line-join": "round" },
//       paint: {
//         "line-width": ["case", ["boolean", ["get", "ada"], false], 6, 5],
//         "line-color": ["case", ["boolean", ["get", "ada"], false], "#16a34a", "#111827"],
//         "line-opacity": 0.95,
//       },
//     }),
//     []
//   );

//   // Core ops
//   async function addEdgeIfMissing(a, b) {
//     if (a === b) return;
//     if (!findMarker(a) || !findMarker(b)) return;
//     const key = edgeKey(a, b);
//     if (edgeIndex.some((e) => e.key === key)) return;
//     const byId = new Map(markers.map((m) => [m.id, [m.lng, m.lat]]));
//     const ok = await addEdge(key, b, a, [byId.get(a), byId.get(b)]);
//     if (ok) setEdgeIndex((list) => [...list, { key, from: a, to: b }]);
//     else toast.error("Edge could not be added.");
//   }

//   async function deleteNode(id) {
//     const ok = await deleteFeature(id, "Point");
//     if (ok) {
//       setMarkers((prev) => prev.filter((m) => m.id !== id));
//       setEdgeIndex((list) => list.filter((e) => e.from !== id && e.to !== id));
//       setCurADANodes((prev) => {
//         if (!Object.prototype.hasOwnProperty.call(prev, id)) return prev;
//         const { [id]: _, ...rest } = prev;
//         return rest;
//       });
//       setCurBuildingNodes((prev) => {
//         if (!Object.prototype.hasOwnProperty.call(prev, id)) return prev;
//         const { [id]: _, ...rest } = prev;
//         return rest;
//       });
//     } else toast.error("Feature could not be deleted.");
//     if (selectedRef.current === id) setSelectedId(null);
//   }

//   async function deleteEdgeByKey(key) {
//     const ok = await deleteFeature(key, "Edge");
//     if (ok) {
//       setEdgeIndex((list) => list.filter((e) => e.key !== key));
//       setCurADAEdges((prev) => {
//         if (!Object.prototype.hasOwnProperty.call(prev, key)) return prev;
//         const { [key]: _, ...rest } = prev;
//         return rest;
//       });
//     } else toast.error("Feature could not be deleted.");
//   }

//   // ADA node toggle
//   function setADANode(id, status) {
//     if (!status && hasAdjSelectedEdge(id)) {
//       toast.error("Can't deselect a node adjacent to a selected ADA edge.");
//       return;
//     }
//     setCurADANodes((prev) => {
//       if (!status) {
//         if (!Object.prototype.hasOwnProperty.call(prev, id)) return prev;
//         const resp = setADAStatus(id, false, "Node");
//         if (!resp) return prev;
//         const { [id]: _, ...rest } = prev;
//         return rest;
//       } else {
//         if (isNodeSelectedADA(id)) return prev;
//         const cur = markers.find((m) => m.id === id);
//         if (!cur) return prev;
//         const resp = setADAStatus(id, true, "Node");
//         if (!resp) return prev;
//         return { ...prev, [id]: cur };
//       }
//     });
//   }

//   // ADA edge toggle (sync endpoints)
//   function setADAEdge(key) {
//     const edge = getEdgeByKey(key);
//     if (!edge) return;
//     const { from, to } = edge;

//     setCurADAEdges((prev) => {
//       const selected = Object.prototype.hasOwnProperty.call(prev, key);

//       if (selected) {
//         const resp = setADAStatus(key, false, "Edge");
//         if (!resp) return prev;
//         const { [key]: _, ...restEdges } = prev;

//         const stillAdjFrom = Object.values(restEdges).some((e) => e.from === from || e.to === from);
//         const stillAdjTo = Object.values(restEdges).some((e) => e.from === to || e.to === to);
//         if (!stillAdjFrom) setADANode(from, false);
//         if (!stillAdjTo) setADANode(to, false);

//         return restEdges;
//       } else {
//         const resp = setADAStatus(key, true, "Edge");
//         if (!resp) return prev;
//         if (!isNodeSelectedADA(from)) setADANode(from, true);
//         if (!isNodeSelectedADA(to)) setADANode(to, true);
//         return { ...prev, [key]: edge };
//       }
//     });
//   }

//   async function handelBuildingSelect(id){
//     // clear previous building nodes
//     setCurrentBuilding(id)

//     const resp = await getAllBuildingNodes(id);
//     console.log(resp.data.nodes)
//     setCurBuildingNodes((prev)=>{
//       let newnodes = resp.data.nodes;
//       return newnodes
//     })
//   }

//   // Building group: add/remove node for current building
//   function addToBuildingGroup(nodeId) {
//     if (!currentBuilding) {
//       toast.error("Select a building first.");
//       return;
//     }
//     setCurBuildingNodes((prev) => {
//       if (Object.prototype.hasOwnProperty.call(prev, nodeId)) {
//         const { [nodeId]: _, ...rest } = prev;
//         const resp = detachNodeFromBuilding(currentBuilding,nodeId);
//         if(!resp) return prev;
//         return rest;
//       }
//       const cur = markers.find((m) => m.id === nodeId);
//       if (!cur) return prev;
//       const resp = attachNodeToBuilding(currentBuilding,nodeId);
//       if(!resp) return prev;
//       return { ...prev, [nodeId]:cur };
//     });
//   }

//   // Map handlers
//   async function handleMapClick(e) {
//     if (e.originalEvent?.ctrlKey) {
//       const { lng, lat } = e.lngLat;
//       const id = `n-${Date.now()}`;
//       const ok = await addNode(id, lng, lat);
//       if (ok) setMarkers((prev) => [...prev, { id, lng, lat }]);
//       else toast.error("Node could not be added.");
//       return;
//     }
//     if (modeRef.current === "select" && selectedRef.current !== null) setSelectedId(null);
//   }

//   function handleMarkerClick(e, id) {
//     e.stopPropagation();
//     if (modeRef.current === "delete") return void deleteNode(id);

//     if (modeRef.current === "buildingGroup") {
//       addToBuildingGroup(id);
//       return;
//     }

//     if (modeRef.current === "ada") {
//       setADANode(id, !isNodeSelectedADA(id));
//       return;
//     }

//     if (modeRef.current === "select") {
//       const cur = selectedRef.current;
//       if (cur === null) return setSelectedId(id);
//       if (cur === id) return setSelectedId(null);
//       addEdgeIfMissing(cur, id);
//       setSelectedId(null);
//     }
//   }

//   function handleMarkerDragEnd(e, id) {
//     const { lng, lat } = e.lngLat;
//     const ok = editNode(id, lng, lat);
//     if (ok) setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, lng, lat } : m)));
//     else toast.error("Node could not be edited.");
//   }

//   function handleEdgeLayerClick(e) {
//     const f = e.features?.[0];
//     const key = f?.properties?.key;
//     if (!key) return;

//     if (modeRef.current === "ada") return void setADAEdge(key);
//     if (modeRef.current === "delete") return void deleteEdgeByKey(key);
//   }

//   function handleEdgeEnter() {
//     const map = mapRef.current?.getMap?.();
//     if (map) map.getCanvas().style.cursor = "pointer";
//   }
//   function handleEdgeLeave() {
//     const map = mapRef.current?.getMap?.();
//     if (map) map.getCanvas().style.cursor = "";
//   }

//   function handleLoad() {
//     const map = mapRef.current?.getMap?.();
//     if (!map) return;
//     map.off("click", "graph-edges", handleEdgeLayerClick);
//     map.off("mouseenter", "graph-edges", handleEdgeEnter);
//     map.off("mouseleave", "graph-edges", handleEdgeLeave);
//     map.on("click", "graph-edges", handleEdgeLayerClick);
//     map.on("mouseenter", "graph-edges", handleEdgeEnter);
//     map.on("mouseleave", "graph-edges", handleEdgeLeave);
//   }

//   // Initial fetch
//   async function getAllFeature() {
//     const fc = await getAllMapFeature();
//     if (markers.length > 0) return;
//     if (fc?.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
//       alert("Invalid GeoJSON FeatureCollection.");
//       return;
//     }
//     const nextMarkers = [];
//     const nextEdges = [];
//     for (const f of fc.features) {
//       if (f?.geometry?.type === "Point") {
//         const id = f.id ?? f.properties?.id;
//         const [lng, lat] = f.geometry.coordinates || [];
//         if (id && Number.isFinite(lng) && Number.isFinite(lat)) nextMarkers.push({ id, lng, lat });
//       } else if (f?.geometry?.type === "LineString") {
//         const from = f.properties?.from;
//         const to = f.properties?.to;
//         if (from && to) nextEdges.push({ key: edgeKey(from, to), from, to });
//       }
//     }
//     const ids = new Set(nextMarkers.map((m) => m.id));
//     if (ids.size !== nextMarkers.length) {
//       alert("Duplicate node ids in import.");
//       return;
//     }
//     setMarkers(nextMarkers);
//     const uniq = [];
//     const seen = new Set();
//     for (const e of nextEdges) {
//       if (seen.has(e.key)) continue;
//       seen.add(e.key);
//       uniq.push(e);
//     }
//     setEdgeIndex(uniq);
//     setSelectedId(null);
//   }

//   async function getBuildings(){

//     let resp = await getAllBuildings();

//     if(resp.status == 200){
//       setBuildings(resp.data.buildings)
//     }else{
//       toast.error("Buildings did not load!")
//     }

//     // setBuildings
//   }

//   useEffect(() => {
//     getAllFeature();
//     getBuildings();
//     return () => {
//       const map = mapRef.current?.getMap?.();
//       if (!map) return;
//       map.off("click", "graph-edges", handleEdgeLayerClick);
//       map.off("mouseenter", "graph-edges", handleEdgeEnter);
//       map.off("mouseleave", "graph-edges", handleEdgeLeave);
//     };
//   }, []);

//   // Reset Show Only ADA when leaving ADA mode
//   useEffect(() => {
//     if (mode !== "ada" && showOnlyADA) setShowOnlyADA(false);
//   }, [mode, showOnlyADA]);

//   // UI
//   function exportGeoJSON() {
//     const nodes = markers.map((m) => ({
//       type: "Feature",
//       id: m.id,
//       properties: { id: m.id },
//       geometry: { type: "Point", coordinates: [m.lng, m.lat] },
//     }));
//     const data = { type: "FeatureCollection", features: [...nodes, ...edgesGeoJSON.features] };
//     const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "graph.geojson";
//     a.click();
//     URL.revokeObjectURL(url);
//   }

//   function importGeoJSON(ev) {
//     const file = ev.target.files?.[0];
//     if (!file) return;
//     const reader = new FileReader();
//     reader.onload = () => {
//       try {
//         const fc = JSON.parse(reader.result);
//         if (fc?.type !== "FeatureCollection" || !Array.isArray(fc.features)) {
//           alert("Invalid GeoJSON FeatureCollection.");
//           return;
//         }
//         const nextMarkers = [];
//         const nextEdges = [];
//         for (const f of fc.features) {
//           if (f?.geometry?.type === "Point") {
//             const id = f.id ?? f.properties?.id;
//             const [lng, lat] = f.geometry.coordinates || [];
//             if (id && Number.isFinite(lng) && Number.isFinite(lat)) nextMarkers.push({ id, lng, lat });
//           } else if (f?.geometry?.type === "LineString") {
//             const from = f.properties?.from;
//             const to = f.properties?.to;
//             if (from && to) nextEdges.push({ key: edgeKey(from, to), from, to });
//           }
//         }
//         const ids = new Set(nextMarkers.map((m) => m.id));
//         if (ids.size !== nextMarkers.length) {
//           alert("Duplicate node ids in import.");
//           return;
//         }
//         setMarkers(nextMarkers);
//         const uniq = [];
//         const seen = new Set();
//         for (const e of nextEdges) {
//           if (seen.has(e.key)) continue;
//           seen.add(e.key);
//           uniq.push(e);
//         }
//         setEdgeIndex(uniq);
//         setSelectedId(null);
//         ev.target.value = "";
//       } catch {
//         alert("Failed to parse GeoJSON.");
//       }
//     };
//     reader.readAsText(file);
//   }

//   function toggleNodes() {
//     setShowNodes((v) => {
//       if (v && selectedRef.current) setSelectedId(null);
//       return !v;
//     });
//   }

//   return (
//     <div className="w-full h-screen relative">
//       <Toaster position="top-right" reverseOrder />

//       {/* Top Toolbar */}
//       <div className="absolute z-10 top-3 left-3 bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow flex items-center gap-2">
//         <span className="text-sm font-medium">Mode:</span>
//         <button className={`px-2 py-1 rounded ${mode === "select" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setMode("select")}>Draw</button>
//         <button className={`px-2 py-1 rounded ${mode === "ada" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setMode("ada")}>ADA Select</button>
//         <button className={`px-2 py-1 rounded ${mode === "buildingGroup" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setMode("buildingGroup")}>Building Select</button>
//         <button className={`px-2 py-1 rounded ${mode === "edit" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setMode("edit")}>Edit</button>
//         <button className={`px-2 py-1 rounded ${mode === "delete" ? "bg-red-600 text-white" : "bg-gray-200"}`} onClick={() => setMode("delete")}>Delete</button>

//         <div className="mx-2 w-px h-5 bg-gray-300" />
//         <button className="px-2 py-1 rounded bg-gray-800 text-white" onClick={exportGeoJSON}>Export</button>
//         <label className="px-2 py-1 rounded bg-gray-200 cursor-pointer">
//           Import
//           <input type="file" accept=".json,.geojson,application/geo+json" onChange={importGeoJSON} hidden />
//         </label>

//         <div className="mx-2 w-px h-5 bg-gray-300" />
//         <button className="px-2 py-1 rounded bg-gray-200" onClick={toggleNodes}>
//           {showNodes ? "Hide Nodes" : "Show Nodes"}
//         </button>

//         {/* Show Only ADA — visible only in ADA mode */}
//         {mode === "ada" && (
//           <>
//             <div className="mx-2 w-px h-5 bg-gray-300" />
//             <button
//               className={`px-2 py-1 rounded ${showOnlyADA ? "bg-green-600 text-white" : "bg-gray-200"}`}
//               onClick={() => setShowOnlyADA((v) => !v)}
//               title={showOnlyADA ? "Show all routes" : "Show only ADA routes"}
//             >
//               {showOnlyADA ? "Show All (ADA Mode)" : "Show Only ADA"}
//             </button>
//           </>
//         )}
//       </div>

//       {/* Building selector — visible only in Building Select mode */}
//       {mode === "buildingGroup" && (
//         <div className="absolute z-10 top-16 left-3 bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow flex items-center gap-3">
//           <span className="text-sm font-medium">Current Building:</span>
//           <DropdownButton
//             id="building-selector"
//             title={
//               currentBuilding
//                 ? buildings.find((b) => b.id === currentBuilding)?.name || currentBuilding
//                 : "Select building"
//             }
//             variant="light"
//           >
//             {buildings.map((b) => (
//               <Dropdown.Item key={b.id} onClick={() => handelBuildingSelect(b.id)}>
//                 {b.name}
//               </Dropdown.Item>
//             ))}
//           </DropdownButton>

//           {/* Optional: quick add demo building */}
//           <button className="px-2 py-1 rounded bg-gray-200" onClick={() => handleShowBuildingModal()}>Manage Buildings</button>
//         </div>
//       )}

//       <ReactMap
//         ref={mapRef}
//         {...viewState}
//         onMove={(evt) => setViewState(evt.viewState)}
//         onClick={handleMapClick}
//         className="w-full h-full"
//         mapStyle="https://api.maptiler.com/maps/base-v4/style.json?key=ezFqZj4n29WctcwDznlR"
//         onLoad={handleLoad}
//       >
//         <Source id="edges" type="geojson" data={edgesGeoJSON}>
//           <Layer {...lineLayer} />
//         </Source>

//         {markers.map((m) => {
//           const isSelected =
//             mode === "select"
//               ? m.id === selectedId
//               : mode === "ada"
//               ? isNodeSelectedADA(m.id)
//               : mode === "buildingGroup"
//               ? Object.prototype.hasOwnProperty.call(curBuildingNodes, m.id)
//               : false;

//           // If showing only ADA nodes in ADA mode
//           if (mode === "ada" && showOnlyADA && !isSelected) {
//             // hide non-ADA nodes when filtered
//             return null;
//           }

//           return (
//             <Marker
//               key={m.id}
//               longitude={m.lng}
//               latitude={m.lat}
//               anchor="center"
//               draggable={mode === "edit"}
//               onDragEnd={(e) => handleMarkerDragEnd(e, m.id)}
//             >
//               <button
//                 onClick={(e) => handleMarkerClick(e, m.id)}
//                 onContextMenu={(e) => e.preventDefault()}
//                 aria-label={`marker-${m.id}`}
//                 className={`rounded-full border-2 shadow ${
//                   isSelected ? "bg-red-600 border-white" : "bg-blue-600 border-white"
//                 }`}
//                 style={{
//                   width: 16,
//                   height: 16,
//                   cursor: "pointer",
//                   boxSizing: "content-box",
//                   opacity: showNodes ? 1 : 0,
//                   pointerEvents: showNodes ? "auto" : "none",
//                 }}
//                 title={`${m.id} (${m.lng.toFixed(5)}, ${m.lat.toFixed(5)})`}
//               />
//             </Marker>
//           );
//         })}
//       </ReactMap>



//       <Modal
//         show={showBuildingModal}
//         onHide={handleCloseBuildingModal}
//         backdrop="static"
//         keyboard={false}
//       >
//         <Modal.Header closeButton>
//           <Modal.Title>Buildings</Modal.Title>
//         </Modal.Header>
//         <Modal.Body>
//           <Buildings buildings={buildings} getBuildings={getBuildings} />
//         </Modal.Body>
//         <Modal.Footer>
//           {/* <Button variant="secondary" onClick={handleCloseBuildingModal}>
//             Close
//           </Button> */}
//         </Modal.Footer>
//       </Modal>
//     </div>
//   );
// }


// src/components/MapEditor.jsx
"use client";
import toast, { Toaster } from "react-hot-toast";
import { useMemo, useRef, useState, useEffect } from "react";
import { Map as ReactMap, Marker, Source, Layer } from "@vis.gl/react-maplibre";
import Buildings from "./Buildings";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  getAllMapFeature,
  addNode,
  addEdge,
  editNode,
  deleteFeature,
  setADAStatus,
  getAllBuildings,
  getAllBuildingNodes,
  attachNodeToBuilding,
  detachNodeFromBuilding,
} from "../../../api";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";
import Modal from "react-bootstrap/Modal";

export default function MapEditor() {
  const [viewState, setViewState] = useState({
    longitude: -76.494131,
    latitude: 42.422108,
    zoom: 15.5,
  });

  // Graph
  const [markers, setMarkers] = useState([]);
  const [edgeIndex, setEdgeIndex] = useState([]); // [{key, from, to}]
  const [selectedId, setSelectedId] = useState(null);

  // ADA
  const [curADANodes, setCurADANodes] = useState({}); // {id: true}
  const [curADAEdges, setCurADAEdges] = useState({}); // {key: {key,from,to}}
  const [showOnlyADA, setShowOnlyADA] = useState(false);

  // Buildings
  const [buildings, setBuildings] = useState([]);
  const [currentBuilding, setCurrentBuilding] = useState(null);
  const [curBuildingNodes, setCurBuildingNodes] = useState(new Set()); // Set<string>
  const [curBuildingOrder, setCurBuildingOrder] = useState([]);        // string[]
  const [showBuildingModal, setShowBuildingModal] = useState(false);

  // UI
  const [mode, setMode] = useState("select");
  const [showNodes, setShowNodes] = useState(true);

  const mapRef = useRef(null);
  const modeRef = useRef(mode);
  const selectedRef = useRef(selectedId);
  modeRef.current = mode;
  selectedRef.current = selectedId;

  // Helpers
  const edgeKey = (a, b) => [a, b].sort().join("__");
  const findMarker = (id) => markers.find((m) => m.id === id) || null;
  const isNodeSelectedADA = (id) => Object.prototype.hasOwnProperty.call(curADANodes, id);
  const isEdgeSelectedADA = (key) => Object.prototype.hasOwnProperty.call(curADAEdges, key);
  const getEdgeByKey = (key) => edgeIndex.find((e) => e.key === key) || null;
  const hasAdjSelectedEdge = (nodeId) =>
    Object.values(curADAEdges).some((e) => e.from === nodeId || e.to === nodeId);

  // Edges FC (with ADA flag + optional filter)
  const edgesGeoJSON = useMemo(() => {
    const coord = new Map(markers.map((m) => [m.id, [m.lng, m.lat]]));
    return {
      type: "FeatureCollection",
      features: edgeIndex
        .map(({ key, from, to }) => {
          const a = coord.get(from);
          const b = coord.get(to);
          if (!a || !b) return null;
          if (showOnlyADA && mode === "ada" && !isEdgeSelectedADA(key)) return null;
          return {
            type: "Feature",
            properties: { key, from, to, ada: isEdgeSelectedADA(key) && mode === "ada" },
            geometry: { type: "LineString", coordinates: [a, b] },
          };
        })
        .filter(Boolean),
    };
  }, [markers, edgeIndex, curADAEdges, mode, showOnlyADA]);

  // Line style
  const lineLayer = useMemo(
    () => ({
      id: "graph-edges",
      type: "line",
      source: "edges",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-width": ["case", ["boolean", ["get", "ada"], false], 6, 5],
        "line-color": ["case", ["boolean", ["get", "ada"], false], "#16a34a", "#111827"],
        "line-opacity": 0.95,
      },
    }),
    []
  );

  // Graph ops
  async function addEdgeIfMissing(a, b) {
    if (a === b) return;
    if (!findMarker(a) || !findMarker(b)) return;
    const key = edgeKey(a, b);
    if (edgeIndex.some((e) => e.key === key)) return;
    const byId = new Map(markers.map((m) => [m.id, [m.lng, m.lat]]));
    const ok = await addEdge(key, b, a, [byId.get(a), byId.get(b)]);
    if (ok) setEdgeIndex((list) => [...list, { key, from: a, to: b }]);
    else toast.error("Edge could not be added.");
  }

  async function deleteNode(id) {
    const ok = await deleteFeature(id, "Point");
    if (!ok) return toast.error("Feature could not be deleted.");
    setMarkers((prev) => prev.filter((m) => m.id !== id));
    setEdgeIndex((list) => list.filter((e) => e.from !== id && e.to !== id));
    setCurADANodes((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, id)) return prev;
      const { [id]: _, ...rest } = prev;
      return rest;
    });
    setCurBuildingNodes((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setCurBuildingOrder((prev) => prev.filter((nid) => nid !== id));
    if (selectedRef.current === id) setSelectedId(null);
  }

  async function deleteEdgeByKey(key) {
    const ok = await deleteFeature(key, "Edge");
    if (!ok) return toast.error("Feature could not be deleted.");
    setEdgeIndex((list) => list.filter((e) => e.key !== key));
    setCurADAEdges((prev) => {
      if (!Object.prototype.hasOwnProperty.call(prev, key)) return prev;
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }

  // ADA ops
  function setADANode(id, status) {
    if (!status && hasAdjSelectedEdge(id)) {
      toast.error("Can't deselect a node adjacent to a selected ADA edge.");
      return;
    }
    setCurADANodes((prev) => {
      if (!status) {
        if (!Object.prototype.hasOwnProperty.call(prev, id)) return prev;
        const resp = setADAStatus(id, false, "Node");
        if (!resp) return prev;
        const { [id]: _, ...rest } = prev;
        return rest;
      } else {
        if (isNodeSelectedADA(id)) return prev;
        const cur = markers.find((m) => m.id === id);
        if (!cur) return prev;
        const resp = setADAStatus(id, true, "Node");
        if (!resp) return prev;
        return { ...prev, [id]: true };
      }
    });
  }

  function setADAEdge(key) {
    const edge = getEdgeByKey(key);
    if (!edge) return;
    const { from, to } = edge;
    setCurADAEdges((prev) => {
      const selected = Object.prototype.hasOwnProperty.call(prev, key);
      if (selected) {
        const resp = setADAStatus(key, false, "Edge");
        if (!resp) return prev;
        const { [key]: _, ...rest } = prev;
        const stillAdjFrom = Object.values(rest).some((e) => e.from === from || e.to === from);
        const stillAdjTo = Object.values(rest).some((e) => e.from === to || e.to === to);
        if (!stillAdjFrom) setADANode(from, false);
        if (!stillAdjTo) setADANode(to, false);
        return rest;
      } else {
        const resp = setADAStatus(key, true, "Edge");
        if (!resp) return prev;
        if (!isNodeSelectedADA(from)) setADANode(from, true);
        if (!isNodeSelectedADA(to)) setADANode(to, true);
        return { ...prev, [key]: edge };
      }
    });
  }

  // Buildings
  async function handelBuildingSelect(id) {
    setCurrentBuilding(id);
    const resp = await getAllBuildingNodes(id);
    const ids = (resp?.data?.nodes || []).map((n) => (typeof n === "string" ? n : n.id));
    setCurBuildingNodes(new Set(ids));
    setCurBuildingOrder(ids);
  }

  async function addToBuildingGroup(nodeId) {
    if (!currentBuilding) return toast.error("Select a building first.");
    const isSelected = curBuildingNodes.has(nodeId);

    if (isSelected) {
      const resp = await detachNodeFromBuilding(currentBuilding, nodeId);
      if (!resp) return toast.error("Failed to detach node.");
      setCurBuildingNodes((prev) => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
      setCurBuildingOrder((prev) => prev.filter((id) => id !== nodeId));
    } else {
      const resp = await attachNodeToBuilding(currentBuilding, nodeId);
      if (!resp) return toast.error("Failed to attach node.");
      setCurBuildingNodes((prev) => {
        const next = new Set(prev);
        next.add(nodeId);
        return next;
      });
      setCurBuildingOrder((prev) => (prev.includes(nodeId) ? prev : [...prev, nodeId]));
    }
  }

  async function clearAllBuildingNodes() {
    if (!currentBuilding || curBuildingNodes.size === 0) return;
    const ids = Array.from(curBuildingNodes);
    const results = await Promise.allSettled(
      ids.map((nid) => detachNodeFromBuilding(currentBuilding, nid))
    );
    const succeeded = ids.filter(
      (_, i) => results[i].status === "fulfilled" && results[i].value
    );
    if (succeeded.length === ids.length) {
      setCurBuildingNodes(new Set());
      setCurBuildingOrder([]);
    } else {
      toast.error("Some nodes failed to detach.");
      setCurBuildingNodes((prev) => {
        const next = new Set(prev);
        for (const id of succeeded) next.delete(id);
        return next;
      });
      setCurBuildingOrder((prev) => prev.filter((id) => !succeeded.includes(id)));
    }
  }

  // Map events
  async function handleMapClick(e) {
    if (e.originalEvent?.ctrlKey) {
      const { lng, lat } = e.lngLat;
      const id = `n-${Date.now()}`;
      const ok = await addNode(id, lng, lat);
      if (ok) setMarkers((prev) => [...prev, { id, lng, lat }]);
      else toast.error("Node could not be added.");
      return;
    }
    if (modeRef.current === "select" && selectedRef.current !== null) setSelectedId(null);
  }

  function handleMarkerClick(e, id) {
    e.stopPropagation();
    if (modeRef.current === "delete") return void deleteNode(id);
    if (modeRef.current === "buildingGroup") return void addToBuildingGroup(id);
    if (modeRef.current === "ada") return void setADANode(id, !isNodeSelectedADA(id));
    if (modeRef.current === "select") {
      const cur = selectedRef.current;
      if (cur === null) return setSelectedId(id);
      if (cur === id) return setSelectedId(null);
      addEdgeIfMissing(cur, id);
      setSelectedId(null);
    }
  }

  function handleMarkerDragEnd(e, id) {
    const { lng, lat } = e.lngLat;
    const ok = editNode(id, lng, lat);
    if (ok) setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, lng, lat } : m)));
    else toast.error("Node could not be edited.");
  }

  function handleEdgeLayerClick(e) {
    const f = e.features?.[0];
    const key = f?.properties?.key;
    if (!key) return;
    if (modeRef.current === "ada") return void setADAEdge(key);
    if (modeRef.current === "delete") return void deleteEdgeByKey(key);
  }

  function handleEdgeEnter() {
    const map = mapRef.current?.getMap?.();
    if (map) map.getCanvas().style.cursor = "pointer";
  }
  function handleEdgeLeave() {
    const map = mapRef.current?.getMap?.();
    if (map) map.getCanvas().style.cursor = "";
  }

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

  // Bootstrap
  async function getAllFeature() {
    const fc = await getAllMapFeature();
    if (markers.length > 0) return;
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
        if (id && Number.isFinite(lng) && Number.isFinite(lat)) nextMarkers.push({ id, lng, lat });
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
  }

  async function getBuildings() {
    const resp = await getAllBuildings();
    if (resp?.status === 200) setBuildings(resp.data.buildings);
    else toast.error("Buildings did not load!");
  }

  useEffect(() => {
    getAllFeature();
    getBuildings();
    return () => {
      const map = mapRef.current?.getMap?.();
      if (!map) return;
      map.off("click", "graph-edges", handleEdgeLayerClick);
      map.off("mouseenter", "graph-edges", handleEdgeEnter);
      map.off("mouseleave", "graph-edges", handleEdgeLeave);
    };
  }, []);

  useEffect(() => {
    if (mode !== "ada" && showOnlyADA) setShowOnlyADA(false);
  }, [mode, showOnlyADA]);

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
            if (id && Number.isFinite(lng) && Number.isFinite(lat)) nextMarkers.push({ id, lng, lat });
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

  function toggleNodes() {
    setShowNodes((v) => {
      if (v && selectedRef.current) setSelectedId(null);
      return !v;
    });
  }

  // DnD state for building list
  const dragState = useRef({ draggingId: null });
  function onDragStart(id) { dragState.current.draggingId = id; }
  function onDragOver(e) { e.preventDefault(); }
  function onDrop(overId) {
    const fromId = dragState.current.draggingId;
    dragState.current.draggingId = null;
    if (!fromId || fromId === overId) return;
    setCurBuildingOrder((prev) => {
      const ids = prev.filter((id) => curBuildingNodes.has(id));
      const fromIdx = ids.indexOf(fromId);
      const toIdx = ids.indexOf(overId);
      if (fromIdx < 0 || toIdx < 0) return prev;
      ids.splice(toIdx, 0, ids.splice(fromIdx, 1)[0]);
      const rest = prev.filter((id) => !curBuildingNodes.has(id));
      return [...ids, ...rest];
    });
  }

  function zoomToNode(id) {
    const m = findMarker(id);
    const map = mapRef.current?.getMap?.();
    if (!m || !map) return;
    map.flyTo({ center: [m.lng, m.lat], zoom: 18, essential: true });
  }

  return (
    <div className="w-full h-screen relative">
      <Toaster position="top-right" reverseOrder />

      {/* Top Toolbar */}
      <div className="absolute z-20 top-3 left-3 bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow flex items-center gap-2">
        <span className="text-sm font-medium">Mode:</span>
        <button className={`px-2 py-1 rounded ${mode === "select" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setMode("select")}>Draw</button>
        <button className={`px-2 py-1 rounded ${mode === "ada" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setMode("ada")}>ADA Select</button>
        <button className={`px-2 py-1 rounded ${mode === "buildingGroup" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setMode("buildingGroup")}>Building Select</button>
        <button className={`px-2 py-1 rounded ${mode === "edit" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setMode("edit")}>Edit</button>
        <button className={`px-2 py-1 rounded ${mode === "delete" ? "bg-red-600 text-white" : "bg-gray-200"}`} onClick={() => setMode("delete")}>Delete</button>

        <div className="mx-2 w-px h-5 bg-gray-300" />
        <button className="px-2 py-1 rounded bg-gray-800 text-white" onClick={exportGeoJSON}>Export</button>
        <label className="px-2 py-1 rounded bg-gray-200 cursor-pointer">
          Import
          <input type="file" accept=".json,.geojson,application/geo+json" onChange={importGeoJSON} hidden />
        </label>

        <div className="mx-2 w-px h-5 bg-gray-300" />
        <button className="px-2 py-1 rounded bg-gray-200" onClick={toggleNodes}>
          {showNodes ? "Hide Nodes" : "Show Nodes"}
        </button>

        {mode === "ada" && (
          <>
            <div className="mx-2 w-px h-5 bg-gray-300" />
            <button
              className={`px-2 py-1 rounded ${showOnlyADA ? "bg-green-600 text-white" : "bg-gray-200"}`}
              onClick={() => setShowOnlyADA((v) => !v)}
              title={showOnlyADA ? "Show all routes" : "Show only ADA routes"}
            >
              {showOnlyADA ? "Show All (ADA Mode)" : "Show Only ADA"}
            </button>
          </>
        )}
      </div>

      {/* Building selector (left, under toolbar) */}
      {mode === "buildingGroup" && (
        <div className="absolute z-20 top-16 left-3 bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow flex items-center gap-3">
          <span className="text-sm font-medium">Current Building:</span>
          <DropdownButton
            id="building-selector"
            title={
              currentBuilding
                ? buildings.find((b) => b.id === currentBuilding)?.name || currentBuilding
                : "Select building"
            }
            variant="light"
          >
            {buildings.map((b) => (
              <Dropdown.Item key={b.id} onClick={() => handelBuildingSelect(b.id)}>
                {b.name}
              </Dropdown.Item>
            ))}
          </DropdownButton>
          <button className="px-2 py-1 rounded bg-gray-200" onClick={() => setShowBuildingModal(true)}>
            Manage Buildings
          </button>
        </div>
      )}

      {/* Building nodes list — mobile: under selector; desktop: docked right */}
      {mode === "buildingGroup" && (
        <>
          {/* Mobile / small screens: stack under selector */}
          <div className="absolute md:hidden z-10 top-28 left-3 right-3 bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Selected Nodes ({curBuildingNodes.size})</span>
              <button
                className="text-xs px-2 py-1 rounded bg-gray-200 disabled:opacity-50"
                disabled={!currentBuilding || curBuildingNodes.size === 0}
                onClick={clearAllBuildingNodes}
                title="Detach all nodes from current building"
              >
                Clear all
              </button>
            </div>
            <div className="max-h-56 overflow-auto">
              {curBuildingNodes.size === 0 ? (
                <div className="text-sm text-gray-500">None selected</div>
              ) : (
                <ul className="space-y-1">
                  {curBuildingOrder
                    .filter((id) => curBuildingNodes.has(id))
                    .map((id) => (
                      <li
                        key={id}
                        className="flex items-center justify-between rounded bg-gray-100 px-2 py-1"
                        draggable
                        onDragStart={() => onDragStart(id)}
                        onDragOver={onDragOver}
                        onDrop={() => onDrop(id)}
                        title="Drag to reorder"
                      >
                        <span className="text-sm truncate">{id}</span>
                        <div className="flex items-center gap-2">
                          <button className="text-xs px-2 py-0.5 rounded bg-gray-200" onClick={() => zoomToNode(id)}>
                            Zoom
                          </button>
                          <button className="text-xs text-red-600" onClick={() => addToBuildingGroup(id)}>
                            remove
                          </button>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>

          {/* Desktop / md+: dock right, vertically centered */}
          <div className="hidden md:flex flex-col absolute z-10 top-1/2 -translate-y-1/2 right-3 w-80 bg-white/90 backdrop-blur px-3 py-3 rounded-xl shadow">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Selected Nodes ({curBuildingNodes.size})</span>
              <button
                className="text-xs px-2 py-1 rounded bg-gray-200 disabled:opacity-50"
                disabled={!currentBuilding || curBuildingNodes.size === 0}
                onClick={clearAllBuildingNodes}
                title="Detach all nodes from current building"
              >
                Clear all
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              {curBuildingNodes.size === 0 ? (
                <div className="text-sm text-gray-500">None selected</div>
              ) : (
                <ul className="space-y-1">
                  {curBuildingOrder
                    .filter((id) => curBuildingNodes.has(id))
                    .map((id) => (
                      <li
                        key={id}
                        className="flex items-center justify-between rounded bg-gray-100 px-2 py-1"
                        draggable
                        onDragStart={() => onDragStart(id)}
                        onDragOver={onDragOver}
                        onDrop={() => onDrop(id)}
                        title="Drag to reorder"
                      >
                        <span className="text-sm truncate">{id}</span>
                        <div className="flex items-center gap-2">
                          <button className="text-xs px-2 py-0.5 rounded bg-gray-200" onClick={() => zoomToNode(id)}>
                            Zoom
                          </button>
                          <button className="text-xs text-red-600" onClick={() => addToBuildingGroup(id)}>
                            remove
                          </button>
                        </div>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      <ReactMap
        ref={mapRef}
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={handleMapClick}
        className="w-full h-full"
        mapStyle="https://api.maptiler.com/maps/base-v4/style.json?key=ezFqZj4n29WctcwDznlR"
        onLoad={handleLoad}
      >
        <Source id="edges" type="geojson" data={edgesGeoJSON}>
          <Layer {...lineLayer} />
        </Source>

        {markers.map((m) => {
          const isBuildingSel = mode === "buildingGroup" && curBuildingNodes.has(m.id);
          const isADASel = mode === "ada" && isNodeSelectedADA(m.id);
          const isDrawSel = mode === "select" && m.id === selectedId;

          if (mode === "ada" && showOnlyADA && !isADASel) return null;

          const colorClass = isBuildingSel
            ? "bg-amber-500"
            : isADASel || isDrawSel
            ? "bg-red-600"
            : "bg-blue-600";

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
                className={`rounded-full border-2 shadow ${colorClass} border-white`}
                style={{
                  width: 16,
                  height: 16,
                  cursor: "pointer",
                  boxSizing: "content-box",
                  opacity: showNodes ? 1 : 0,
                  pointerEvents: showNodes ? "auto" : "none",
                }}
                title={`${m.id} (${m.lng.toFixed(5)}, ${m.lat.toFixed(5)})`}
              />
            </Marker>
          );
        })}
      </ReactMap>

      <Modal show={showBuildingModal} onHide={() => setShowBuildingModal(false)} backdrop="static" keyboard={false}>
        <Modal.Header closeButton>
          <Modal.Title>Buildings</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Buildings buildings={buildings} getBuildings={getBuildings} />
        </Modal.Body>
        <Modal.Footer />
      </Modal>
    </div>
  );
}
