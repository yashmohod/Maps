// src/components/MapEditor.jsx
"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Map as ReactMap, Marker, Source, Layer } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

export default function MapEditor() {
  const [viewState, setViewState] = useState({
    longitude: -76.494131,
    latitude: 42.422108,
    zoom: 15,
  });

  // Nodes
  const [markers, setMarkers] = useState([
  ]);

  // Undirected edges by node ids
  const [edgeIndex, setEdgeIndex] = useState([]); // [{key, from, to}]
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("select"); // 'select' | 'edit' | 'delete'

  const mapRef = useRef(null);
  const modeRef = useRef(mode);            // why: avoid stale closures in map listeners
  const selectedRef = useRef(selectedId);  // why: avoid stale closures in map listeners
  modeRef.current = mode;
  selectedRef.current = selectedId;

  // Build edges GeoJSON from nodes + edgeIndex
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
            properties: { key, from, to },
            geometry: { type: "LineString", coordinates: [a, b] },
          };
        })
        .filter(Boolean),
    };
  }, [markers, edgeIndex]);

  // Edge line styling
  const lineLayer = useMemo(
    () => ({
      id: "graph-edges",
      type: "line",
      source: "edges",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-width": 3, "line-color": "#111827", "line-opacity": 0.9 },
    }),
    []
  );

  // Helpers
  const edgeKey = (a, b) => [a, b].sort().join("__");
  const findMarker = (id) => markers.find((m) => m.id === id) || null;

  function addEdgeIfMissing(a, b) {
    if (a === b) return;
    if (!findMarker(a) || !findMarker(b)) return;
    const key = edgeKey(a, b);
    setEdgeIndex((list) => (list.some((e) => e.key === key) ? list : [...list, { key, from: a, to: b }]));
  }

  function deleteNode(id) {
    setMarkers((prev) => prev.filter((m) => m.id !== id));
    setEdgeIndex((list) => list.filter((e) => e.from !== id && e.to !== id));
    if (selectedRef.current === id) setSelectedId(null);
  }

  function deleteEdgeByKey(key) {
    setEdgeIndex((list) => list.filter((e) => e.key !== key));
  }

  // Map-level click: clear selection; Shift+Click to add a node
  function handleMapClick(e) {
    // if (e.originalEvent?.shiftKey) {
      const { lng, lat } = e.lngLat;
      const id = `n-${Date.now()}`;
      setMarkers((prev) => [...prev, { id, lng, lat }]);
      return;
    // }
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

    // edit mode: click does nothing
  }

  // Drag end in edit mode
  function handleMarkerDragEnd(e, id) {
    const { lng, lat } = e.lngLat;
    setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, lng, lat } : m)));
    // edges recompute via useMemo
  }

  // Edge layer click handler (used for Delete mode)
  function handleEdgeLayerClick(e) {
    if (modeRef.current !== "delete") return;
    const f = e.features?.[0];
    const key = f?.properties?.key;
    if (key) deleteEdgeByKey(key);
  }

  // Wire/unwire edge layer listeners
  function handleLoad() {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    map.off("click", "graph-edges", handleEdgeLayerClick);
    map.on("click", "graph-edges", handleEdgeLayerClick);
  }

  useEffect(() => {
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

  return (
    <div className="w-full h-screen relative">
      {/* Toolbar */}
      <div className="absolute z-10 top-3 left-3 bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow flex items-center gap-2">
        <span className="text-sm font-medium">Mode:</span>
        <button
          className={`px-2 py-1 rounded ${mode === "select" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setMode("select")}
        >
          Select
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
          Tip: Shift+Click map to add node • Selected: {selectedId ?? "none"}
        </span> */}
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
          const isSelected = m.id === selectedId && mode === "select";
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
                style={{ width: 16, height: 16, cursor: "pointer", boxSizing: "content-box" }}
                title={`${m.id} (${m.lng.toFixed(5)}, ${m.lat.toFixed(5)})`}
              />
            </Marker>
          );
        })}
      </ReactMap>
    </div>
  );
}
