// src/components/BuildingEditor.jsx
"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import toast, { Toaster } from "react-hot-toast";
import { Map as ReactMap } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import "./BE.css";

import EditPanel from "./EditPanel";
import DrawControl from "./DrawControl";

import {
  getAllBuildings,
  addBuilding,
  editBuildingName,
  updateBuildingPolyGon,
  deleteBuilding,
} from "../../../../api";

// ---------------------------------------------------------
// Map Section: memoized OUTSIDE the component
// ---------------------------------------------------------
const MapSection = React.memo(function MapSection({
  polys,
  mlMap,
  mapRef,
  stableViewState,
  onMapClick,
  onLoad,
  onCreate,
  onUpdate,
  onDelete,
  onSelectionChange,
  onModeChange,
}) {
  return (
    <ReactMap
      ref={mapRef}
      initialViewState={stableViewState}
      onClick={onMapClick}
      onLoad={onLoad}
      className="w-full h-full"
      mapStyle="https://api.maptiler.com/maps/base-v4/style.json?key=ezFqZj4n29WctcwDznlR"
    >
      <DrawControl
        map={mlMap}
        polys={polys}
        position="top-right"
        displayControlsDefault={false}
        controls={{ polygon: true, trash: true }}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onSelectionChange={onSelectionChange}
        onModeChange={onModeChange}
      />
    </ReactMap>
  );
});

// ---------------------------------------------------------
// Main Component
// ---------------------------------------------------------
export default function BuildingEditor() {
  const mapRef = useRef(null);
  const prevGeomRef = useRef(new Map());
  const lastInsertRef = useRef({ featureId: null, idx: -1, t: 0 });

  const [mlMap, setMlMap] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const buildingsRef = useRef();
  const [polys, setPolys] = useState([]);

  const [currentBuilding, setCurrentBuilding] = useState({});
  const [curEditName, setcurEditName] = useState("");

  // -------------------------------------------------------
  // Stable initial map view
  // -------------------------------------------------------
  const stableViewState = useMemo(
    () => ({
      longitude: -76.494131,
      latitude: 42.422108,
      zoom: 15.5,
    }),
    []
  );

  // -------------------------------------------------------
  // Load buildings ONCE
  // -------------------------------------------------------
  useEffect(() => {
    async function load() {
      const resp = await getAllBuildings();
      if (!resp || resp.status !== 200) {
        toast.error("Buildings failed to load");
        return;
      }

      const list = resp.data.buildings || [];
      setBuildings(list);
      buildingsRef.current = list;

      if (list.length > 0) {
        const features = list.map((b) => JSON.parse(b.polyGon));
        setPolys(features);
      }
    }
    load();
  }, []);

  // -------------------------------------------------------
  // Handlers (ALL stable)
  // -------------------------------------------------------
  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap?.();
    if (map) setMlMap(map);
  }, []);

  const onMapClick = useCallback((e) => {
    setCurrentBuilding("");
    setcurEditName("");
  }, []);

  const onCreate = useCallback(async (e) => {
    const feature = e.features[0];
    const name = `B-${Date.now()}`;
    const ring = feature.geometry.coordinates[0];

    let lat = 0,
      lng = 0;
    for (let pt of ring) {
      lng += pt[0];
      lat += pt[1];
    }
    lat /= ring.length;
    lng /= ring.length;

    const buildingId = feature.id;
    const polyGon = JSON.stringify(feature);

    const resp = await addBuilding(buildingId, name, lat, lng, polyGon);
    if (resp?.status !== 200) {
      toast.error("Could not add building");
      return;
    }

    setPolys((p) => [...p, feature]);
    setBuildings((prev) => {
      let newList = [
        ...prev,
        {
          id: buildingId,
          name,
          lat,
          lng,
          polyGon,
        },
      ];
      buildingsRef.current = newList;

      return newList;
    });
    setCurrentBuilding({
      id: buildingId,
      name,
      lat,
      lng,
      polyGon,
    });
    setcurEditName(name);
  }, []);

  // -------------------------------------------------------
  // onUpdate (stable)
  // -------------------------------------------------------
  const onUpdate = useCallback(async (e, draw) => {
    const f = e.features?.[0];
    if (!f) return;
    console.log(f);

    const cur = f.geometry;

    const updated = f;
    const ring = updated.geometry.coordinates[0];
    let lat = 0,
      lng = 0;
    for (let pt of ring) {
      lng += pt[0];
      lat += pt[1];
    }
    lat /= ring.length;
    lng /= ring.length;
    let polyGon = JSON.stringify(updated);
    let resp = await updateBuildingPolyGon(updated.id, polyGon, lat, lng);
    console.log(resp);
    if (resp.status === 200) {
      setPolys((old) => old.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      toast.error(resp.message);
    }
  }, []);

  const onDelete = useCallback(async (e) => {
    // deleteBuilding
    const f = e.features?.[0];
    let resp = await deleteBuilding(f.id);
    console.log(resp);
    if (resp.status === 200) {
      setPolys((old) => old.filter((p) => p.id !== f.id));
    } else {
      toast.error(resp.message);
    }
  }, []);

  const onSelectionChange = useCallback(
    (e, draw) => {
      if (!e.features || e.features.length === 0) return;
      const b = buildingsRef.current.find((x) => x.id === e.features[0].id);
      if (b) {
        setCurrentBuilding(b);
        setcurEditName(b.name);
      } else {
        console.log("building not found!");
      }
    },
    [buildings]
  );

  const onModeChange = useCallback(() => {}, []);

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------
  return (
    <div className="w-full h-screen relative">
      <Toaster position="top-right" reverseOrder />

      <EditPanel
        curEditName={curEditName}
        currentBuilding={currentBuilding}
        setcurEditName={setcurEditName}
        submitName={async () => {
          let resp = await editBuildingName(currentBuilding.id, curEditName);
          if ((resp.status = 200)) {
            toast.success("Name Updated!");
          } else {
            toast.error("Name could not be updated!");
          }
        }}
      />

      <MapSection
        polys={polys}
        mlMap={mlMap}
        mapRef={mapRef}
        stableViewState={stableViewState}
        onMapClick={onMapClick}
        onLoad={onLoad}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onSelectionChange={onSelectionChange}
        onModeChange={onModeChange}
      />
    </div>
  );
}

// // src/components/BuildingEditor.jsx
// "use client";

// import toast, { Toaster } from "react-hot-toast";
// import { useMemo, useRef, useState, useEffect } from "react";
// import { Map as ReactMap, Source, Layer } from "@vis.gl/react-maplibre";
// import "maplibre-gl/dist/maplibre-gl.css";
// import "./BE.css";
// // import EditPanel from "./Buildings";
// import DrawControl from "./DrawControl";
// import InputGroup from "react-bootstrap/InputGroup";
// import Form from "react-bootstrap/Form";
// import Button from "react-bootstrap/Button";

// import {
//   addNode,
//   getAllBuildings,
//   setBuildingPolyGon,
//   removeBuildingPolyGon,
//   addBuilding,
//   editBuildingName,
// } from "../../../../api";

// import Dropdown from "react-bootstrap/Dropdown";
// import DropdownButton from "react-bootstrap/DropdownButton";
// import Modal from "react-bootstrap/Modal";

// export default function BuildingEditor() {
//   const [viewState, setViewState] = useState({
//     longitude: -76.494131,
//     latitude: 42.422108,
//     zoom: 15.5,
//   });

//   const [currentBuilding, setCurrentBuilding] = useState({});
//   const [curEditName, setcurEditName] = useState("");
//   const [buildings, setBuildings] = useState([]);
//   const [polys, setPolys] = useState([]);
//   const mapRef = useRef(null);
//   const [mlMap, setMlMap] = useState(null); // stable MapLibre instance

//   // Load buildings list
//   async function getBuildings() {
//     const resp = await getAllBuildings();
//     console.log(resp);
//     if (resp?.status === 200) {
//       setBuildings(resp.data.buildings || []);
//       // console.log(resp.data.buildings);
//       if (resp.data.buildings.length > 0) {
//         setCurrentBuilding(resp.data.buildings[0]);
//         setcurEditName(resp.data.buildings[0].name);
//         let features = resp.data.buildings.map((building) => {
//           let feature = JSON.parse(building.polyGon);
//           console.log(feature);
//           return feature;
//         });
//         setPolys(features);
//       }
//     } else {
//       toast.error("Buildings did not load!");
//     }
//   }

//   // Ctrl+click to add a node (demo)
//   async function handleMapClick(e) {
//     // console.log(e);
//   }

//   // Grab the raw map instance once it's ready
//   function handleLoad() {
//     const map = mapRef.current?.getMap?.();
//     if (map) setMlMap(map);
//   }

//   async function onCreate(e) {
//     const name = `B-${Date.now()}`;

//     const cords = e.features[0].geometry.coordinates[0];
//     let lat = 0;
//     let lng = 0;
//     for (let x = 0; x < cords.length; x++) {
//       lng += cords[x][0];
//       lat += cords[x][1];
//     }
//     lat /= cords.length;
//     lng /= cords.length;

//     let buildingId = e.features[0].id;
//     let polyGon = JSON.stringify(e.features[0]);

//     let resp = await addBuilding(buildingId, name, lat, lng, polyGon);
//     console.log(resp);
//     if (resp.status == 200) {
//       setPolys((prev) => [...prev, ...e.features]);
//       setBuildings((prev) => [
//         ...prev,
//         ...{
//           id: buildingId,
//           name: name,
//           lat: lat,
//           lng: lng,
//           polyGon: polyGon,
//         },
//       ]);
//       // getBuildings();
//     } else {
//       toast.error("Building could not be added!");
//     }
//   }

//   function onUpdate(e, draw) {
//     const f = e.features?.[0];
//     if (!f) return;

//     const prev = prevGeomRef.current.get(f.id);
//     const cur = f.geometry;

//     const { kind, changedIdxs } = classifyPolygonChange(prev, cur);

//     // Detect & de-dupe the immediate "post-insert move":
//     // When a vertex is inserted, Draw will:
//     //   (A) fire update where ring length increases (we won't see that here if it happened earlier),
//     //   (B) immediately fire update while the new vertex is being dragged (same length, 1 changed idx).
//     // We'll mark the new index at (A), then ignore one quick (B).
//     const now = performance.now();
//     const last = lastInsertRef.current;

//     if (prev && outerRing(prev).length + 1 === outerRing(cur).length) {
//       // This update *is* the insert (length grew). Figure out which index was inserted.
//       const prevR = outerRing(prev),
//         curR = outerRing(cur);
//       // naive diff to find the first index that doesn't match prev
//       let insIdx = -1;
//       for (let i = 0; i < curR.length; i++) {
//         const p = prevR[i] || prevR[i - 1]; // tolerate ring shift
//         if (
//           !p ||
//           Math.abs(curR[i][0] - p[0]) > EPS ||
//           Math.abs(curR[i][1] - p[1]) > EPS
//         ) {
//           insIdx = i;
//           break;
//         }
//       }
//       lastInsertRef.current = { featureId: f.id, idx: insIdx, t: now };
//       // You can handle “vertex added” here if needed.
//     } else if (kind === "vertex-move" && changedIdxs.length === 1) {
//       const idx = changedIdxs[0];
//       const isImmediatePostInsert =
//         last.featureId === f.id && last.idx === idx && now - last.t < 200; // 200ms window
//       let curFeature = e.features[0];
//       let curPolys = polys.map((cur) => {
//         if (cur.id === curFeature.id) {
//           return curFeature;
//         } else {
//           cur;
//         }
//       });
//       console.log(e);
//       setPolys(curPolys);
//       if (isImmediatePostInsert) {
//         // treat as part of the insert; swallow or handle differently
//         // console.debug("squelch: initial placement of newly inserted vertex");
//       } else {
//         // real vertex drag after the fact
//         // persist or update app state here
//         // console.debug("vertex moved", idx);
//       }
//     } else if (kind === "move") {
//       // whole feature dragged
//       // console.debug("feature moved");
//     } else if (kind === "reshape") {
//       // multiple vertices changed (e.g., via handles or programmatic ops)
//       // console.debug("reshape");
//     }

//     // refresh snapshot for next comparison

//     prevGeomRef.current.set(f.id, cloneGeom(cur));
//   }
//   function onDelete(e) {
//     console.log(e);
//   }

//   useEffect(() => {
//     getBuildings();
//   }, []);

//   const EPS = 1e-9;

//   function cloneGeom(g) {
//     return JSON.parse(JSON.stringify(g));
//   }

//   function outerRing(geom) {
//     if (!geom || geom.type !== "Polygon") return [];
//     return geom.coordinates?.[0] ?? [];
//   }

//   // returns {kind, changedIdxs, delta} where
//   // - kind: "vertex-add-or-remove" | "move" | "vertex-move" | "reshape" | "unknown"
//   // - changedIdxs: indices that changed (for same-length comparisons)
//   // - delta: [dx,dy] if detected a uniform move
//   function classifyPolygonChange(prevGeom, nextGeom) {
//     const prev = outerRing(prevGeom);
//     const next = outerRing(nextGeom);
//     if (!prev.length || !next.length)
//       return { kind: "unknown", changedIdxs: [] };

//     if (prev.length !== next.length) {
//       return { kind: "vertex-add-or-remove", changedIdxs: [] };
//     }

//     // same length — find which indices changed
//     const changedIdxs = [];
//     for (let i = 0; i < prev.length; i++) {
//       const [x1, y1] = prev[i],
//         [x2, y2] = next[i];
//       if (Math.abs(x1 - x2) > EPS || Math.abs(y1 - y2) > EPS)
//         changedIdxs.push(i);
//     }
//     if (changedIdxs.length === 0) return { kind: "unknown", changedIdxs };

//     // check for uniform translation
//     const [dx, dy] = [next[0][0] - prev[0][0], next[0][1] - prev[0][1]];
//     const uniform = prev.every((p, i) => {
//       const q = next[i];
//       return (
//         Math.abs(q[0] - p[0] - dx) <= EPS && Math.abs(q[1] - p[1] - dy) <= EPS
//       );
//     });
//     if (uniform) return { kind: "move", changedIdxs, delta: [dx, dy] };

//     // one vertex changed → vertex drag; more than one → general reshape
//     return {
//       kind: changedIdxs.length === 1 ? "vertex-move" : "reshape",
//       changedIdxs,
//     };
//   }

//   const prevGeomRef = useRef(new Map()); // featureId -> previous geometry
//   const lastInsertRef = useRef({ featureId: null, idx: -1, t: 0 });

//   // store snapshot when selection changes
//   function onSelectionChange(e, draw) {
//     console.log(e);
//     let nextCurBuilding = buildings.find((cur) => cur.id === e.features[0].id);
//     setCurrentBuilding(nextCurBuilding);
//     setcurEditName(nextCurBuilding.name);
//     (e.features || []).forEach((f) => {
//       prevGeomRef.current.set(f.id, cloneGeom(f.geometry));
//     });
//   }

//   // optional: track current mode if you care (direct_select vs simple_select)
//   function onModeChange(e, draw) {
//     // e.mode
//     // console.log(e);
//     // console.log(draw);
//   }

//   return (
//     <div className="w-full h-screen relative">
//       <Toaster position="top-right" reverseOrder />

//       {/* Top Toolbar */}
//       <div className="flex flex-col absolute z-20 top-3 left-3 bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow  items-center gap-2">
//         <div className=" flex flex-row w-full items-center gap-2">
//           <span className="text-sm font-medium">Current Building:</span>
//         </div>

//         <div className="w-full ">
//           <InputGroup className="mb-3">
//             <Form.Control
//               aria-label="Default"
//               aria-describedby="inputGroup-sizing-default"
//               placeholder="Building Name"
//               value={curEditName}
//               onChange={(e) => setcurEditName(e.target.value)}
//             />
//             <Button
//               className="w-25"
//               onClick={async () => {
//                 editBuildingName(currentBuilding.id, curEditName);
//               }}
//             >
//               Submit
//             </Button>
//           </InputGroup>
//         </div>
//       </div>

//       <ReactMap
//         ref={mapRef}
//         initialViewState={viewState}
//         // onMove={(evt) => setViewState(evt.viewState)}
//         onClick={handleMapClick}
//         className="w-full h-full"
//         mapStyle="https://api.maptiler.com/maps/base-v4/style.json?key=ezFqZj4n29WctcwDznlR"
//         onLoad={handleLoad}
//       >
//         {/* Draw toolbar (uses maplibre-gl-draw under the hood) */}
//         <DrawControl
//           map={mlMap} // <-- pass the real map (null until onLoad)
//           position="top-right" // avoid overlap with your own top-left toolbar
//           displayControlsDefault={false}
//           controls={{ polygon: true, trash: true }}
//           onCreate={onCreate}
//           onUpdate={onUpdate}
//           onDelete={(e) => {
//             // clear snapshots for deleted features
//             (e.features || []).forEach((f) => prevGeomRef.current.delete(f.id));
//           }}
//           onSelectionChange={onSelectionChange}
//           onModeChange={onModeChange}
//           polys={polys}
//         />
//       </ReactMap>
//     </div>
//   );
// }
