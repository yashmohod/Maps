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
    // getBuildingPos
} from "../../../api";
export default function VehicularMap({ path }) {

    const [markers, setMarkers] = useState([]);                    // [{id,lng,lat}]
    const [edgeIndex, setEdgeIndex] = useState([]);                // [{key,from,to}]


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

    const lineLayer = useMemo(
        () => ({
            id: "graph-edges",
            type: "line",
            source: "edges",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: {
                "line-width": 5,
                "line-color": "#16a34a",
                "line-opacity": 0.95,
            },
        }),
        []
    );

    async function getPedestiranFeatures() {
        const resp = await getAllPedestiranMapFeature();
        setMarkers(resp.data.nodes)
        setEdgeIndex(resp.data.edges)
    }

    useEffect(() => {
        // getPedestiranFeatures()
    }, [])

    return (
        <>
            Pedestria
            <Source id="edges" type="geojson" data={edgesGeoJSON}>
                <Layer {...lineLayer} />
            </Source>
        </>
    );
}

