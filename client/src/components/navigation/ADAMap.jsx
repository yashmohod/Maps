"use client";
import { useRef, useState, useMemo, useEffect } from "react";
import { Map as ReactMap, Source, Layer, Marker } from "@vis.gl/react-maplibre";
import toast, { Toaster } from "react-hot-toast";
import "maplibre-gl/dist/maplibre-gl.css";
import {
    getAllBuildings,
    getAllMapFeatureADA,
    getRouteTo,
    getBuildingPos
} from "../../../api";
export default function ADAMap() {
    const [viewState, setViewState] = useState({
        longitude: -76.494131,
        latitude: 42.422108,
        zoom: 15.5,
    });

    const [showADAEntrances, setShowADAEntrances] = useState(false);
    const [showADARoutes, setShowADARoutes] = useState(false);
    const [markers, setMarkers] = useState([]);                    // [{id,lng,lat}]
    const [edgeIndex, setEdgeIndex] = useState([]);                // [{key,from,to}]
    const mapRef = useRef(null);



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

    const adaRouteLayer = useMemo(
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

    // Map layers
    const adaEntranceLayer = useMemo(
        () => ({
            id: "ada-entrances",
            type: "circle",
            source: "ada-entrances",
            paint: {
                "circle-radius": 6,
                "circle-color": "#16a34a",
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
            },
        }),
        []
    );

    useEffect(() => {
    }, [])


    return (
        <>
            {showADARoutes && (
                <Source id="ada-routes" type="geojson" data={ADA_ROUTES_FC}>
                    <Layer {...adaRouteLayer} />
                </Source>
            )}
            {showADAEntrances && (
                <Source id="ada-entrances" type="geojson" data={ADA_ENTRANCES_FC}>
                    <Layer {...adaEntranceLayer} />
                </Source>
            )}
        </>
    );
}

