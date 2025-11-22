// src/components/DrawControl.jsx
"use client";
import { useEffect, useRef } from "react";
import MapLibreDraw from "maplibre-gl-draw";
import "maplibre-gl-draw/dist/mapbox-gl-draw.css"; // REQUIRED

function normalizeStyles(baseStyles) {
  if (!Array.isArray(baseStyles)) return null;
  return baseStyles.map((s) => {
    const paint = s.paint || {};
    const dash = paint["line-dasharray"];
    const needsLiteral =
      Array.isArray(dash) && dash.length > 0 && typeof dash[0] === "number";
    return {
      ...s,
      paint: needsLiteral
        ? { ...paint, "line-dasharray": ["literal", dash] }
        : paint,
    };
  });
}

function fallbackStyles() {
  return [
    {
      id: "gl-draw-polygon-fill.cold",
      type: "fill",
      filter: ["all", ["==", "$type", "Polygon"], ["!=", "active", "true"]],
      paint: { "fill-color": "#3bb2d0", "fill-opacity": 0.4 },
    },
    {
      id: "gl-draw-polygon-fill.hot",
      type: "fill",
      filter: ["all", ["==", "$type", "Polygon"], ["==", "active", "true"]],
      paint: { "fill-color": "#fbb03b", "fill-opacity": 0.4 },
    },
    {
      id: "gl-draw-lines.cold",
      type: "line",
      filter: ["all", ["==", "$type", "LineString"], ["!=", "active", "true"]],
      paint: { "line-color": "#3bb2d0", "line-width": 2 },
    },
    {
      id: "gl-draw-lines.hot",
      type: "line",
      filter: ["all", ["==", "$type", "LineString"], ["==", "active", "true"]],
      paint: { "line-color": "#fbb03b", "line-width": 2 },
    },
    {
      id: "gl-draw-points.cold",
      type: "circle",
      filter: [
        "all",
        ["==", "$type", "Point"],
        ["!=", "meta", "midpoint"],
        ["!=", "active", "true"],
      ],
      paint: { "circle-radius": 5, "circle-color": "#3bb2d0" },
    },
    {
      id: "gl-draw-points.hot",
      type: "circle",
      filter: [
        "all",
        ["==", "$type", "Point"],
        ["!=", "meta", "midpoint"],
        ["==", "active", "true"],
      ],
      paint: { "circle-radius": 5, "circle-color": "#fbb03b" },
    },
    {
      id: "gl-draw-points.mid",
      type: "circle",
      filter: ["all", ["==", "$type", "Point"], ["==", "meta", "midpoint"]],
      paint: { "circle-radius": 3, "circle-color": "#fbb03b" },
    },
  ];
}

export default function DrawControl({
  map, // MapLibre map instance
  position = "top-left", // put it away from your own top-left toolbar

  controls = { polygon: true },
  displayControlsDefault = false,
  onCreate,
  onUpdate,
  onDelete,
  polys,
  onSelectionChange,
  onModeChange,
}) {
  const drawRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    // Defensive: remove any previous control (StrictMode double-mount)
    if (drawRef.current) {
      try {
        map.removeControl(drawRef.current);
      } catch {}
      drawRef.current = null;
    }

    const libStyles = normalizeStyles(MapLibreDraw.styles);
    const styles = fallbackStyles();

    const draw = new MapLibreDraw({
      displayControlsDefault,
      controls,
      styles,
    });

    map.addControl(draw, position);
    drawRef.current = draw;
    drawRef.current.add({ type: "FeatureCollection", features: polys });

    const handleCreate = (e) => onCreate?.(e, draw);
    const handleUpdate = (e) => onUpdate?.(e, draw);
    const handleDelete = (e) => onDelete?.(e, draw);

    // NEW: forward these so the parent can snapshot geometries
    const handleSelection = (e) => onSelectionChange?.(e, draw);
    const handleMode = (e) => onModeChange?.(e, draw);

    map.on("draw.selectionchange", handleSelection);
    map.on("draw.modechange", handleMode);

    map.on("draw.create", handleCreate);
    map.on("draw.update", handleUpdate);
    map.on("draw.delete", handleDelete);

    return () => {
      map.off("draw.create", handleCreate);
      map.off("draw.update", handleUpdate);
      map.off("draw.delete", handleDelete);
      try {
        map.removeControl(draw);
      } catch {}
      drawRef.current = null;
    };
  }, [
    map,
    position,
    JSON.stringify(controls),
    displayControlsDefault,
    onCreate,
    onUpdate,
    onDelete,
  ]);

  return null;
}
