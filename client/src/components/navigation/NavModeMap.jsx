// src/app/NavigationMap.jsx
"use client";
import { useRef, useState, useMemo, useEffect } from "react";
import { Map as ReactMap, Source, Layer, Marker } from "@vis.gl/react-maplibre";
import toast, { Toaster } from "react-hot-toast";
import "maplibre-gl/dist/maplibre-gl.css";
import {
    // getAllMapFeature,
    // getAllBuildings,
    // getAllBuildingNodes,
    // getAllMapFeatureADA,
    // getRouteTo,
    // getBuildingPos,
    getAllMapFeaturesNavMode
} from "../../../api";
export default function NavModeMap({ path, navMode }) {

    const [markers, setMarkers] = useState([]);                    // [{id,lng,lat}]
    const [edgeIndex, setEdgeIndex] = useState([]);                // [{key,from,to}]

    function isInPath(id) {

        return path.has(id);
    }

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
                        properties: { key, from, to, path: isInPath(key) },
                        geometry: { type: "LineString", coordinates: [a, b] },
                    };
                })
                .filter(Boolean),
        };
    }, [markers, edgeIndex, path]);

    const lineLayer = useMemo(
        () => ({
            id: "graph-edges",
            type: "line",
            source: "edges",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
                "line-width": ["case", ["boolean", ["get", "path"], false], 6, 2],
                "line-color": ["case", ["boolean", ["get", "path"], false], "#66d9ff", "#000000"],
                "line-opacity": ["case", ["boolean", ["get", "path"], false], 0.95, 0.4],
            },
        }),
        []
    );

    async function getNavModeFeatures() {
        const resp = await getAllMapFeaturesNavMode(navMode);

        console.log(resp)
        setMarkers(resp.data.nodes)
        setEdgeIndex(resp.data.edges)
    }

    useEffect(() => {
        console.log("pedestrian!")
        getNavModeFeatures()
    }, [navMode, path])

    return (
        <Source id="edges" type="geojson" data={edgesGeoJSON}>
            <Layer {...lineLayer} />
        </Source>
    );
}
