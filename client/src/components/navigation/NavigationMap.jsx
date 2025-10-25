// src/app/NavigationMap.jsx
"use client";
import { useRef, useState, useMemo, useEffect } from "react";
import { Map as ReactMap, Source, Layer, Marker } from "@vis.gl/react-maplibre";
import toast, { Toaster } from "react-hot-toast";
import "maplibre-gl/dist/maplibre-gl.css";
import {
    getAllMapFeature,
    getAllBuildings,
    getAllBuildingNodes,
    getAllMapFeatureADA,
    getRouteTo,
    getBuildingPos
} from "../../../api";
export default function NavigationMap() {
    const [viewState, setViewState] = useState({
        longitude: -76.494131,
        latitude: 42.422108,
        zoom: 15.5,
    });

    const [selectedDest, setSelectedDest] = useState("");
    const [showADAEntrances, setShowADAEntrances] = useState(false);
    const [showADARoutes, setShowADARoutes] = useState(false);
    const [buildings, setBuildings] = useState([]);
    const [userPos, setUserPos] = useState(null); // {lng,lat,accuracy}
    const [tracking, setTracking] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [lastGeoMsg, setLastGeoMsg] = useState(""); // debug line

    const [markers, setMarkers] = useState([]);                    // [{id,lng,lat}]
    const [edgeIndex, setEdgeIndex] = useState([]);                // [{key,from,to}]
    const mapRef = useRef(null);
    const watchIdRef = useRef(null);


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



    // Demo ADA data
    const ADA_ENTRANCES_FC = useMemo(
        () => ({}),
        []
    );

    const ADA_ROUTES_FC = useMemo(
        () => ({}),
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

    const adaRouteLayer = useMemo(
        () => ({
            id: "ada-routes",
            type: "line",
            source: "ada-routes",
            layout: { "line-cap": "round", "line-join": "round" },
            paint: { "line-width": 5, "line-color": "#16a34a", "line-opacity": 0.95 },
        }),
        []
    );

    // Accuracy ring
    const accuracyGeoJSON = useMemo(() => {
        if (!userPos?.accuracy) return null;
        return makeCircleGeoJSON(userPos.lng, userPos.lat, Math.max(userPos.accuracy, 5), 64);
    }, [userPos]);

    const accuracyFill = useMemo(
        () => ({
            id: "loc-accuracy-fill",
            type: "fill",
            source: "loc-accuracy",
            paint: { "fill-color": "#3b82f6", "fill-opacity": 0.15 },
        }),
        []
    );
    const accuracyLine = useMemo(
        () => ({
            id: "loc-accuracy-line",
            type: "line",
            source: "loc-accuracy",
            paint: { "line-color": "#3b82f6", "line-width": 2, "line-opacity": 0.6 },
        }),
        []
    );

    // Centering helper
    function ensureCenter(lng, lat, minZoom = 16) {
        const map = mapRef.current?.getMap?.();
        const zoom = Math.max(viewState.zoom ?? 0, minZoom);
        if (map && mapReady) {
            console.log("[ensureCenter] flyTo", { lng, lat, zoom });
            map.flyTo({ center: [lng, lat], zoom, essential: true });
        } else {
            console.log("[ensureCenter] setViewState (map not ready)", { lng, lat, zoom });
            setViewState((vs) => ({ ...vs, longitude: lng, latitude: lat, zoom }));
        }
    }

    function flyToSelected(id) {
        const dest = DESTINATIONS.find((d) => d.id === id);
        if (!dest) return;
        ensureCenter(dest.lng, dest.lat, 17);
    }

    // Robust geolocation
    async function diagEnv() {
        console.log("[geo] secure:", window.isSecureContext, "UA:", navigator.userAgent);
        try {
            if (navigator.permissions?.query) {
                const p = await navigator.permissions.query({ name: "geolocation" });
                console.log("[geo] permission.state:", p.state);
            }
        } catch (e) {
            console.log("[geo] permissions.query failed:", e);
        }
    }

    function handleGeoSuccess(pos) {
        const { longitude, latitude, accuracy } = pos.coords;
        setUserPos({ lng: longitude, lat: latitude, accuracy });
        ensureCenter(longitude, latitude, 16);
    }

    function handleGeoError(where, err) {
        let msg;
        switch (err.code) {
            case 1:
                msg = "Permission denied";
                break;
            case 2:
                msg = "Position unavailable";
                break;
            case 3:
                msg = "Timeout";
                break;
            default:
                msg = err?.message || "Unknown geolocation error";
        }
        console.log(`[geo] ${where} error:`, err, "=>", msg);
        setLastGeoMsg(`${where}:${msg}`);
    }

    async function locateOnceRobust() {
        console.log("here")
        await diagEnv();

        if (!("geolocation" in navigator)) {
            const msg = "Geolocation not supported";
            console.log("[geo] hard error:", msg);
            setLastGeoMsg(msg);
            alert(msg);
            return;
        }
        if (!window.isSecureContext) {
            const msg = "Location requires HTTPS (or localhost)";
            console.log("[geo] hard error:", msg);
            setLastGeoMsg(msg);
            alert(msg);
            return;
        }


        // const attemptC = () =>
        //     new Promise((resolve, reject) => {
        //         let cleared = false;
        //         const id = navigator.geolocation.watchPosition(
        //             (pos) => {
        //                 if (cleared) return;
        //                 cleared = true;
        //                 navigator.geolocation.clearWatch(id);
        //                 resolve(pos);
        //             },
        //             (err) => {
        //                 if (cleared) return;
        //                 cleared = true;
        //                 navigator.geolocation.clearWatch(id);
        //                 reject(err);
        //             },
        //             { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
        //         );
        //         setTimeout(() => {
        //             if (!cleared) {
        //                 cleared = true;
        //                 navigator.geolocation.clearWatch(id);
        //                 reject({ code: 3, message: "Watch timeout" });
        //             }
        //         }, 17000);
        //     });

        // const pos = await attemptC();


        // const { longitude, latitude, accuracy } = pos.coords;
        // // console.log(longitude, latitude, accuracy)
        // setUserPos({ lng: longitude, lat: latitude, accuracy });
        // ensureCenter(longitude, latitude, 16);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { longitude, latitude, accuracy } = position.coords;
                setUserPos({ lng: longitude, lat: latitude, accuracy });
                ensureCenter(longitude, latitude, 16);

                // console.log(resp)
            },
            (err) => {
                console.log(err.message);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );

    }


    async function showBuilding(id) {

        let resp = await getBuildingPos(id)
        console.log(resp)
        let lat = resp.data.lat
        let lng = resp.data.lng
        ensureCenter(lng, lat, 17);
    }

    async function startTracking() {

        console.log(selectedDest === "")

        if (selectedDest === "") {
            toast.error("Please select a destination before starting route.")
            return;
        }

        // let resp = await getRouteTo(selectedDest, userPos.lat, userPos.lng)
        let resp = await getRouteTo(selectedDest, 42.424500, -76.491837)
        console.log(resp)
        console.log(resp.data)
        setMarkers(resp.data.nodes)
        setEdgeIndex(resp.data.edges)

        // if (!("geolocation" in navigator)) {
        //     const msg = "Geolocation not supported";
        //     setLastGeoMsg(msg);
        //     alert(msg);
        //     return;
        // }
        // if (!window.isSecureContext) {
        //     const msg = "Location requires HTTPS (or localhost)";
        //     setLastGeoMsg(msg);
        //     alert(msg);
        //     return;
        // }
        // if (watchIdRef.current != null) return;

        // const id = navigator.geolocation.watchPosition(
        //     (pos) => {
        //         const { longitude, latitude, accuracy } = pos.coords;
        //         console.log("[geo] watch update:", { longitude, latitude, accuracy });
        //         setLastGeoMsg(
        //             `watch lat:${latitude.toFixed(6)} lng:${longitude.toFixed(6)} acc:${Math.round(accuracy)}m`
        //         );
        //         setUserPos({ lng: longitude, lat: latitude, accuracy });
        //     },
        //     (err) => {
        //         handleGeoError("watch", err);
        //         alert(err.message || "Tracking error.");
        //         stopTracking();
        //     },
        //     { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
        // );
        // watchIdRef.current = id;
        // setTracking(true);
    }

    function stopTracking() {
        if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        setTracking(false);
    }

    async function getBuildings() {
        const resp = await getAllBuildings();
        if (resp?.status === 200) setBuildings(resp.data.buildings || []);
        else toast.error("Buildings did not load!");
    }
    useEffect(() => {
        getBuildings();
        locateOnceRobust();
    }, [])

    useEffect(() => {
        if (tracking && userPos) ensureCenter(userPos.lng, userPos.lat, 16);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userPos?.lng, userPos?.lat]);

    useEffect(() => {
        return () => {
            if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, []);

    return (
        <div className="w-full h-screen relative">
            <Toaster position="top-right" reverseOrder />
            {/* On-screen debug for geolocation */}
            {/* <div className="absolute z-30 top-2 left-2 px-2 py-1 rounded bg-black/60 text-white text-xs">
                {lastGeoMsg || "geo: —"}
            </div> */}

            {/* Mobile bottom sheet (phone-first) */}
            <div className="md:hidden absolute z-20 left-0 right-0 bottom-0 px-3 pt-3 pb-[calc(env(safe-area-inset-bottom,0)+12px)] bg-white/95 backdrop-blur rounded-t-2xl shadow flex flex-col gap-3">
                <div>
                    <label htmlFor="dest-m" className="block text-xs font-medium text-gray-700 mb-1">
                        Destination
                    </label>
                    <select
                        id="dest-m"
                        className="w-full text-base rounded-lg border px-3 py-3 bg-white"
                        value={selectedDest}
                        onChange={(e) => {
                            const id = e.target.value;
                            setSelectedDest(id);
                            showBuilding(id)

                            // if (id) flyToSelected(id);
                        }}
                    >
                        <option value="">Select…</option>
                        {buildings.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        aria-pressed={showADAEntrances}
                        className={`px-3 py-3 rounded-xl text-base font-medium ${showADAEntrances ? "bg-green-600 text-white" : "bg-gray-200 text-gray-900"
                            }`}
                        onClick={() => setShowADAEntrances((v) => !v)}
                    >
                        {showADAEntrances ? "Hide ADA Entrances" : "Show ADA Entrances"}
                    </button>
                    <button
                        aria-pressed={showADARoutes}
                        className={`px-3 py-3 rounded-xl text-base font-medium ${showADARoutes ? "bg-green-600 text-white" : "bg-gray-200 text-gray-900"
                            }`}
                        onClick={() => setShowADARoutes((v) => !v)}
                    >
                        {showADARoutes ? "Hide ADA Routes" : "Show ADA Routes"}
                    </button>
                </div>
            </div>

            {/* Desktop toolbar */}
            <div className="hidden md:flex absolute z-20 top-3 left-3 right-3 items-center justify-between">
                <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow flex items-center gap-2">
                    <label htmlFor="dest-d" className="text-sm font-medium">
                        Destination:
                    </label>
                    <select
                        id="dest-d"
                        className="text-sm rounded border px-2 py-1 bg-white w-64"
                        value={selectedDest}
                        onChange={(e) => {
                            const id = e.target.value;
                            setSelectedDest(id);
                            showBuilding(id)
                            // if (id) flyToSelected(id);
                        }}
                    >
                        <option value="">Select…</option>
                        {buildings.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-xl shadow flex items-center gap-2">
                    <button
                        aria-pressed={showADAEntrances}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${showADAEntrances ? "bg-green-600 text-white" : "bg-gray-200 text-gray-900"
                            }`}
                        onClick={() => setShowADAEntrances((v) => !v)}
                        title="Toggle ADA entrances"
                    >
                        {showADAEntrances ? "Hide ADA Entrances" : "Show ADA Entrances"}
                    </button>
                    <button
                        aria-pressed={showADARoutes}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${showADARoutes ? "bg-green-600 text-white" : "bg-gray-200 text-gray-900"
                            }`}
                        onClick={() => setShowADARoutes((v) => !v)}
                        title="Toggle ADA routes"
                    >
                        {showADARoutes ? "Hide ADA Routes" : "Show ADA Routes"}
                    </button>
                </div>
            </div>

            {/* FABs (bumped up on mobile to avoid dropdown overlap) */}
            <div className="absolute z-20 right-3 bottom-[calc(env(safe-area-inset-bottom,0)+168px)] md:bottom-6 flex flex-col gap-2">
                <button
                    className="rounded-full shadow px-4 py-3 bg-white/95 backdrop-blur text-sm font-medium"
                    onClick={locateOnceRobust}
                    title="Center on my location"
                >
                    Locate Me
                </button>
                {!tracking ? (
                    <button
                        className="rounded-full shadow px-4 py-3 bg-blue-600 text-white text-sm font-medium"
                        onClick={startTracking}
                        title="Follow my location"
                    >
                        Start Tracking
                    </button>
                ) : (
                    <button
                        className="rounded-full shadow px-4 py-3 bg-red-600 text-white text-sm font-medium"
                        onClick={stopTracking}
                        title="Stop following"
                    >
                        Stop Tracking
                    </button>
                )}
            </div>

            <ReactMap
                ref={mapRef}
                {...viewState}
                onMove={(evt) => setViewState(evt.viewState)}
                className="w-full h-full"
                mapStyle="https://api.maptiler.com/maps/base-v4/style.json?key=ezFqZj4n29WctcwDznlR"
                onLoad={() => {
                    console.log("[map] onLoad: ready");
                    setMapReady(true);
                }}
            >
                {/* {showADARoutes && (
                    <Source id="ada-routes" type="geojson" data={ADA_ROUTES_FC}>
                        <Layer {...adaRouteLayer} />
                    </Source>
                )}

                {showADAEntrances && (
                    <Source id="ada-entrances" type="geojson" data={ADA_ENTRANCES_FC}>
                        <Layer {...adaEntranceLayer} />
                    </Source>
                )} */}

                {accuracyGeoJSON && (
                    <Source id="loc-accuracy" type="geojson" data={accuracyGeoJSON}>
                        <Layer {...accuracyFill} />
                        <Layer {...accuracyLine} />
                    </Source>
                )}

                <Source id="edges" type="geojson" data={edgesGeoJSON}>
                    <Layer {...lineLayer} />
                </Source>

                {/* {markers.map((m) => {


                    return (
                        <Marker
                            key={m.id}
                            longitude={m.lng}
                            latitude={m.lat}
                            anchor="center"
                        >
                            <button
                                onContextMenu={(e) => e.preventDefault()}
                            // aria-label={`marker-${m.id}`}
                            // className={`rounded-full border-2 shadow ${colorClass} border-white`}
                            // style={{ width: 16, height: 16, cursor: "pointer", boxSizing: "content-box", opacity: showNodes ? 1 : 0, pointerEvents: showNodes ? "auto" : "none" }}
                            // title={`${m.id} (${m.lng.toFixed(5)}, ${m.lat.toFixed(5)})`}
                            />
                        </Marker>
                    );
                })} */}

                {userPos && (
                    <Marker longitude={userPos.lng} latitude={userPos.lat} anchor="center">
                        <div
                            title={`You are here (${userPos.lat.toFixed(6)}, ${userPos.lng.toFixed(6)})`}
                            className="rounded-full border-2 border-white shadow"
                            style={{
                                width: 14,
                                height: 14,
                                background: "#2563eb",
                                boxShadow: "0 0 0 2px rgba(37,99,235,0.35)",
                            }}
                        />
                    </Marker>
                )}
            </ReactMap>
        </div>
    );
}

// Geometry helpers
function makeCircleGeoJSON(lng, lat, radiusMeters, points = 64) {
    const coords = [];
    const d = radiusMeters / 6378137;
    const [lon, latRad] = [toRad(lng), toRad(lat)];
    for (let i = 0; i <= points; i++) {
        const brng = (i * 2 * Math.PI) / points;
        const lat2 = Math.asin(
            Math.sin(latRad) * Math.cos(d) + Math.cos(latRad) * Math.sin(d) * Math.cos(brng)
        );
        const lon2 =
            lon +
            Math.atan2(
                Math.sin(brng) * Math.sin(d) * Math.cos(latRad),
                Math.cos(d) - Math.sin(latRad) * Math.sin(lat2)
            );
        coords.push([toDeg(lon2), toDeg(lat2)]);
    }
    return {
        type: "FeatureCollection",
        features: [
            { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } },
        ],
    };
}
function toRad(deg) { return (deg * Math.PI) / 180; }
function toDeg(rad) { return (rad * 180) / Math.PI; }
