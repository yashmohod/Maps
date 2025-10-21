// "use client";
// import toast, { Toaster } from "react-hot-toast";
// import { useMemo, useRef, useState, useEffect } from "react";
// import { Map as ReactMap, Marker, Source, Layer } from "@vis.gl/react-maplibre";
// import "maplibre-gl/dist/maplibre-gl.css";
// import {
//   getAllMapFeature,
//   addNode,
//   addEdge,
//   editNode,
//   deleteFeature,
//   setADAStatus,
// } from "../../../api";
// import Dropdown from "react-bootstrap/Dropdown";
// import DropdownButton from "react-bootstrap/DropdownButton";

// export default function MapEditor() {
//   const [viewState, setViewState] = useState({
//     longitude: -76.494131,
//     latitude: 42.422108,
//     zoom: 15.5,
//   });

//   const [markers, setMarkers] = useState([]);
//   const [curBuildingNodes, setCurBuildingNodes] = useState({});
//   const [curADANodes, setCurADANodes] = useState({});   // {nodeId: node}
//   const [curADAEdges, setCurADAEdges] = useState({});   // {edgeKey: {key,from,to}}
//   const [edgeIndex, setEdgeIndex] = useState([]);       // [{key, from, to}]
//   const [selectedId, setSelectedId] = useState(null);
//   const [mode, setMode] = useState("select");
//   const [showNodes, setShowNodes] = useState(true);

//   // NEW: show-only-ADA toggle
//   const [showOnlyADA, setShowOnlyADA] = useState(false);

//   const mapRef = useRef(null);
//   const modeRef = useRef(mode);
//   const selectedRef = useRef(selectedId);
//   modeRef.current = mode;
//   selectedRef.current = selectedId;

//   // helpers
//   const edgeKey = (a, b) => [a, b].sort().join("__");
//   const findMarker = (id) => markers.find((m) => m.id === id) || null;
//   const isNodeSelected = (id) => Object.prototype.hasOwnProperty.call(curADANodes, id);
//   const isEdgeSelected = (key) => Object.prototype.hasOwnProperty.call(curADAEdges, key);
//   const getEdgeByKey = (key) => edgeIndex.find((e) => e.key === key) || null;
//   const hasAdjSelectedEdge = (nodeId) =>
//     Object.values(curADAEdges).some((e) => e.from === nodeId || e.to === nodeId);

//   // Only ADA edges when toggle is on (and only in ADA mode)
//   const edgesGeoJSON = useMemo(() => {
//     const coord = new Map(markers.map((m) => [m.id, [m.lng, m.lat]]));
//     return {
//       type: "FeatureCollection",
//       features: edgeIndex
//         .map(({ key, from, to }) => {
//           const a = coord.get(from);
//           const b = coord.get(to);
//           if (!a || !b) return null;
//           if (showOnlyADA && mode === "ada" && !isEdgeSelected(key)) return null; // hide non-ADA
//           return {
//             type: "Feature",
//             properties: { key, from, to, ada: isEdgeSelected(key) && mode === "ada" },
//             geometry: { type: "LineString", coordinates: [a, b] },
//           };
//         })
//         .filter(Boolean),
//     };
//   }, [markers, edgeIndex, curADAEdges, mode, showOnlyADA]);

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

//   // ADA node toggle with protection
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
//         if (isNodeSelected(id)) return prev;
//         const cur = markers.find((m) => m.id === id);
//         if (!cur) return prev;
//         const resp = setADAStatus(id, true, "Node");
//         if (!resp) return prev;
//         return { ...prev, [id]: cur };
//       }
//     });
//   }

//   // ADA edge toggle syncs endpoints
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
//         if (!isNodeSelected(from)) setADANode(from, true);
//         if (!isNodeSelected(to)) setADANode(to, true);
//         return { ...prev, [key]: edge };
//       }
//     });
//   }

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
//       setCurBuildingNodes((prev) => {
//         if (Object.prototype.hasOwnProperty.call(prev, id)) {
//           const { [id]: _, ...rest } = prev;
//           return rest;
//         }
//         const cur = markers.find((m) => m.id === id);
//         if (!cur) return prev;
//         return { ...prev, [id]: cur };
//       });
//       return;
//     }

//     if (modeRef.current === "ada") {
//       // Toggle node but block deselect if attached to selected edge
//       setADANode(id, !isNodeSelected(id));
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

//     if (modeRef.current === "ada") {
//       setADAEdge(key);
//       return;
//     }
//     if (modeRef.current === "delete") {
//       deleteEdgeByKey(key);
//     }
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

//   useEffect(() => {
//     getAllFeature();
//     return () => {
//       const map = mapRef.current?.getMap?.();
//       if (!map) return;
//       map.off("click", "graph-edges", handleEdgeLayerClick);
//       map.off("mouseenter", "graph-edges", handleEdgeEnter);
//       map.off("mouseleave", "graph-edges", handleEdgeLeave);
//     };
//   }, []);

//   // Auto-reset showOnlyADA if leaving ADA mode
//   useEffect(() => {
//     if (mode !== "ada" && showOnlyADA) setShowOnlyADA(false);
//   }, [mode, showOnlyADA]);

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

//       {/* Toolbar */}
//       <div className="absolute z-10 top-3 left-3 bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow flex items-center gap-2">
//         <span className="text-sm font-medium">Mode:</span>
//         <button className={`px-2 py-1 rounded ${mode === "select" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setMode("select")}>Draw</button>
//         <button className={`px-2 py-1 rounded ${mode === "ada" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setMode("ada")}>ADA Select</button>
//         <button className={`px-2 py-1 rounded ${mode === "buildingGroup" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setMode("buildingGroup")}>Building Select</button>
//         <button className={`px-2 py-1 rounded ${mode === "edit" ? "bg-blue-600 text-white" : "bg-gray-200"}`} onClick={() => setMode("edit")}>Edit</button>
//         <button className={`px-2 py-1 rounded ${mode === "delete" ? "bg-red-600 text-white" : "bg-gray-200"}`} onClick={() => setMode("delete")}>Delete</button>

//         <div className="mx-2 w-px h-5 bg-gray-300" />

//         {/* Export / Import */}
//         <button className="px-2 py-1 rounded bg-gray-800 text-white" onClick={exportGeoJSON}>Export</button>
//         <label className="px-2 py-1 rounded bg-gray-200 cursor-pointer">
//           Import
//           <input type="file" accept=".json,.geojson,application/geo+json" onChange={importGeoJSON} hidden />
//         </label>

//         <div className="mx-2 w-px h-5 bg-gray-300" />

//         <button className="px-2 py-1 rounded bg-gray-200" onClick={toggleNodes}>
//           {showNodes ? "Hide Nodes" : "Show Nodes"}
//         </button>

//         {/* NEW: Show Only ADA toggle (visible only in ADA mode) */}
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
//           // In ADA mode with "show only ADA", hide non-ADA nodes
//           if (mode === "ada" && showOnlyADA && !isNodeSelected(m.id)) return null;

//           const isSelected =
//             mode === "select"
//               ? m.id === selectedId
//               : mode === "ada"
//               ? isNodeSelected(m.id)
//               : mode === "buildingGroup"
//               ? Object.prototype.hasOwnProperty.call(curBuildingNodes, m.id)
//               : false;

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
//     </div>
//   );
// }


// src/components/MapEditor.jsx
"use client";
import toast, { Toaster } from "react-hot-toast";
import { useMemo, useRef, useState, useEffect } from "react";
import { Map as ReactMap, Marker, Source, Layer } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  getAllMapFeature,
  addNode,
  addEdge,
  editNode,
  deleteFeature,
  setADAStatus,
} from "../../../api";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";

export default function MapEditor() {
  const [viewState, setViewState] = useState({
    longitude: -76.494131,
    latitude: 42.422108,
    zoom: 15.5,
  });

  // Nodes
  const [markers, setMarkers] = useState([]);
  const [curBuildingNodes, setCurBuildingNodes] = useState({}); // {nodeId: {...node, buildingId}}
  const [curADANodes, setCurADANodes] = useState({});           // {nodeId: node}
  const [curADAEdges, setCurADAEdges] = useState({});           // {edgeKey: {key,from,to}}

  // Buildings (example list; replace with your source if needed)
  const [buildings, setBuildings] = useState([
    { id: "bldg-a", name: "Building A" },
    { id: "bldg-b", name: "Building B" },
    { id: "bldg-c", name: "Building C" },
  ]);
  const [currentBuilding, setCurrentBuilding] = useState(null);

  // Edges index (all edges)
  const [edgeIndex, setEdgeIndex] = useState([]); // [{key, from, to}]
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("select");
  const [showNodes, setShowNodes] = useState(true);
  const [showOnlyADA, setShowOnlyADA] = useState(false);

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

  // Edges GeoJSON (ADA flag + optional filter)
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

  // Core ops
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
    if (ok) {
      setMarkers((prev) => prev.filter((m) => m.id !== id));
      setEdgeIndex((list) => list.filter((e) => e.from !== id && e.to !== id));
      setCurADANodes((prev) => {
        if (!Object.prototype.hasOwnProperty.call(prev, id)) return prev;
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      setCurBuildingNodes((prev) => {
        if (!Object.prototype.hasOwnProperty.call(prev, id)) return prev;
        const { [id]: _, ...rest } = prev;
        return rest;
      });
    } else toast.error("Feature could not be deleted.");
    if (selectedRef.current === id) setSelectedId(null);
  }

  async function deleteEdgeByKey(key) {
    const ok = await deleteFeature(key, "Edge");
    if (ok) {
      setEdgeIndex((list) => list.filter((e) => e.key !== key));
      setCurADAEdges((prev) => {
        if (!Object.prototype.hasOwnProperty.call(prev, key)) return prev;
        const { [key]: _, ...rest } = prev;
        return rest;
      });
    } else toast.error("Feature could not be deleted.");
  }

  // ADA node toggle
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
        return { ...prev, [id]: cur };
      }
    });
  }

  // ADA edge toggle (sync endpoints)
  function setADAEdge(key) {
    const edge = getEdgeByKey(key);
    if (!edge) return;
    const { from, to } = edge;

    setCurADAEdges((prev) => {
      const selected = Object.prototype.hasOwnProperty.call(prev, key);

      if (selected) {
        const resp = setADAStatus(key, false, "Edge");
        if (!resp) return prev;
        const { [key]: _, ...restEdges } = prev;

        const stillAdjFrom = Object.values(restEdges).some((e) => e.from === from || e.to === from);
        const stillAdjTo = Object.values(restEdges).some((e) => e.from === to || e.to === to);
        if (!stillAdjFrom) setADANode(from, false);
        if (!stillAdjTo) setADANode(to, false);

        return restEdges;
      } else {
        const resp = setADAStatus(key, true, "Edge");
        if (!resp) return prev;
        if (!isNodeSelectedADA(from)) setADANode(from, true);
        if (!isNodeSelectedADA(to)) setADANode(to, true);
        return { ...prev, [key]: edge };
      }
    });
  }

  // Building group: add/remove node for current building
  function addToBuildingGroup(nodeId) {
    if (!currentBuilding) {
      toast.error("Select a building first.");
      return;
    }
    setCurBuildingNodes((prev) => {
      if (Object.prototype.hasOwnProperty.call(prev, nodeId)) {
        const { [nodeId]: _, ...rest } = prev;
        return rest;
      }
      const cur = markers.find((m) => m.id === nodeId);
      if (!cur) return prev;
      return { ...prev, [nodeId]: { ...cur, buildingId: currentBuilding } };
    });
  }

  // Map handlers
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

    if (modeRef.current === "buildingGroup") {
      addToBuildingGroup(id);
      return;
    }

    if (modeRef.current === "ada") {
      setADANode(id, !isNodeSelectedADA(id));
      return;
    }

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

  // Initial fetch
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

  useEffect(() => {
    getAllFeature();
    return () => {
      const map = mapRef.current?.getMap?.();
      if (!map) return;
      map.off("click", "graph-edges", handleEdgeLayerClick);
      map.off("mouseenter", "graph-edges", handleEdgeEnter);
      map.off("mouseleave", "graph-edges", handleEdgeLeave);
    };
  }, []);

  // Reset Show Only ADA when leaving ADA mode
  useEffect(() => {
    if (mode !== "ada" && showOnlyADA) setShowOnlyADA(false);
  }, [mode, showOnlyADA]);

  // UI
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

  return (
    <div className="w-full h-screen relative">
      <Toaster position="top-right" reverseOrder />

      {/* Top Toolbar */}
      <div className="absolute z-10 top-3 left-3 bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow flex items-center gap-2">
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

        {/* Show Only ADA — visible only in ADA mode */}
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

      {/* Building selector — visible only in Building Select mode */}
      {mode === "buildingGroup" && (
        <div className="absolute z-10 top-16 left-3 bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow flex items-center gap-3">
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
              <Dropdown.Item key={b.id} onClick={() => setCurrentBuilding(b.id)}>
                {b.name}
              </Dropdown.Item>
            ))}
          </DropdownButton>

          {/* Optional: quick add demo building */}
          {/* <button className="px-2 py-1 rounded bg-gray-200" onClick={() => {
            const id = `bldg-${Date.now()}`;
            setBuildings((prev) => [...prev, { id, name: `Building ${prev.length + 1}` }]);
            setCurrentBuilding(id);
          }}>+ Add Building</button> */}
        </div>
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
          const isSelected =
            mode === "select"
              ? m.id === selectedId
              : mode === "ada"
              ? isNodeSelectedADA(m.id)
              : mode === "buildingGroup"
              ? Object.prototype.hasOwnProperty.call(curBuildingNodes, m.id)
              : false;

          // If showing only ADA nodes in ADA mode
          if (mode === "ada" && showOnlyADA && !isSelected) {
            // hide non-ADA nodes when filtered
            return null;
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
    </div>
  );
}
