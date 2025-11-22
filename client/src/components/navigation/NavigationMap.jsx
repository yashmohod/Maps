// src/app/NavigationMap.jsx
"use client";
import { useRef, useState, useMemo, useEffect } from "react";
import { Map as ReactMap, Source, Layer, Marker } from "@vis.gl/react-maplibre";
import toast, { Toaster } from "react-hot-toast";
import "maplibre-gl/dist/maplibre-gl.css";
import {
    // getAllMapFeature,
    getAllBuildings,
    // getAllBuildingNodes,
    // getAllMapFeatureADA,
    getAllNavModes,
    getRouteTo,
    getBuildingPos
} from "../../../api";
import NavModeMap from "./NavModeMap";


export default function NavigationMap() {


    const defViewState = {
        longitude: -76.494131,
        latitude: 42.422108,
        zoom: 15.5,
        bearing: 0,
        pitch: 0
    }

    const [viewState, setViewState] = useState({
        longitude: -76.494131,
        latitude: 42.422108,
        zoom: 15.5,
        bearing: 0,
        pitch: 0
    });

    const topLeftBoundary = {
        lng:-76.505098,
        lat:42.427959,
    }

    const bottomRightBoundary = {
        lng:-76.483915,
        lat:42.410851,
    }

    const [selectedDest, setSelectedDest] = useState("");
    const [buildings, setBuildings] = useState([]);
    const [userPos, setUserPos] = useState(null); // {lng,lat,accuracy}
    const [destPos, setDestPos] = useState(null); // {lng,lat,accuracy}
    const [tracking, setTracking] = useState(false);
    const [navigating, setNavigating] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [curNavMode, setCurNavMode] = useState(1)
    const [markers, setMarkers] = useState([]);                    // [{id,lng,lat}]
    const [edgeIndex, setEdgeIndex] = useState([]);                // [{key,from,to}]
    const mapRef = useRef(null);
    const watchIdRef = useRef(null);
    const [path, setPath] = useState(new Set())
    const [navModes, setNavModes] = useState([])



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
    function ensureCenter(lng, lat, minZoom = 13) {
        const map = mapRef.current?.getMap?.();
        const zoom = Math.max(viewState.zoom ?? 0, minZoom);
        if (map && mapReady) {
            console.log("[ensureCenter] flyTo", { lng, lat, zoom });
            map.flyTo({ center: [lng, lat], zoom, essential: true });
        } else {
            console.log("[ensureCenter] setViewState (map not ready)", { lng, lat, zoom });
            setViewState((vs) => ({ ...vs, longitude: lng, latitude: lat, zoom: zoom, bearing: 0, pitch: 0 }));
        }
    }

    function fitToUserAndDest(extraCoords = []) {
        const map = mapRef.current?.getMap?.();
        if (!map || !userPos || !destPos) return;

        // collect [lng, lat] pairs we want to see
        const coords = [
            [userPos.lng, userPos.lat],
            [destPos.lng, destPos.lat],
            ...extraCoords,                // e.g., route coords if you have them
        ];

        // compute bbox
        const lngs = coords.map(c => c[0]);
        const lats = coords.map(c => c[1]);
        const west = Math.min(...lngs);
        const east = Math.max(...lngs);
        const south = Math.min(...lats);
        const north = Math.max(...lats);

        // responsive padding (more bottom space on mobile for your bottom sheet)
        const isMobile = window.matchMedia?.("(max-width: 768px)")?.matches ?? false;
        const padding = isMobile
            ? { top: 80, right: 24, bottom: 220, left: 24 }
            : { top: 80, right: 300, bottom: 60, left: 24 };

        map.fitBounds(
            [
                [west, south], // southwest
                [east, north], // northeast
            ],
            { padding, maxZoom: 18, duration: 800, essential: true }
        );
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


    const [routeFC, setRouteFC] = useState(null);  // FeatureCollection with one LineString
    const routeCoordsRef = useRef([]);            // ordered [lng,lat] for camera bearing


    const [useCompass, setUseCompass] = useState(false);

    async function enableCompass() {
        try {
            if (typeof DeviceOrientationEvent !== "undefined" &&
                typeof DeviceOrientationEvent.requestPermission === "function") {
                const res = await DeviceOrientationEvent.requestPermission();
                if (res !== "granted") return toast.error("Compass permission denied");
            }
            const handler = (e) => {
                // Prefer absolute heading if available; otherwise derive from alpha
                const heading = (typeof e.webkitCompassHeading === "number")
                    ? e.webkitCompassHeading                       // iOS Safari [0..360) clockwise from true north
                    : (typeof e.alpha === "number" ? 360 - e.alpha : null); // alpha is clockwise from device top → convert to north ref
                if (heading != null && !Number.isNaN(heading)) {
                    deviceHeadingRef.current = (heading + 360) % 360;
                }
            };
            window.addEventListener("deviceorientationabsolute", handler, true);
            window.addEventListener("deviceorientation", handler, true);
            setUseCompass(true);
        } catch (err) {
            toast.error("Compass not available");
        }
    }

    function disableCompass() {
        setUseCompass(false);
        deviceHeadingRef.current = null;
        window.removeEventListener("deviceorientationabsolute", () => { }, true);
        window.removeEventListener("deviceorientation", () => { }, true);
    }
    // // when you set up watchPosition:
    // const id = navigator.geolocation.watchPosition(
    //     (pos) => {
    //         const { longitude, latitude, accuracy, heading } = pos.coords;
    //         setUserPos({ lng: longitude, lat: latitude, accuracy });

    //         let bearing = null;
    //         if (typeof heading === "number" && !Number.isNaN(heading)) {
    //             bearing = heading; // already degrees clockwise from north
    //         } else if (deviceHeadingRef.current != null) {
    //             bearing = deviceHeadingRef.current;
    //         } else {
    //             // fallback: aim to next route point if you kept it around
    //             bearing = bearingAlongPath({ lng: longitude, lat: latitude }, /* routeCoords */[]);
    //         }

    //         const map = mapRef.current?.getMap?.();
    //         if (bearing != null) {
    //             setNavCamera(map, longitude, latitude, bearing, { pitch: 60, duration: 300 });
    //         } else {
    //             // at least keep user centered
    //             setNavCamera(map, longitude, latitude, map?.getBearing?.() ?? 0, { pitch: 60, duration: 300 });
    //         }
    //     },
    //     (err) => { /* your existing error handling */ },
    //     { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
    // );
    // watchIdRef.current = id;


    async function locateOnceRobust(button) {
        await diagEnv();
        // if (userPos) {
        //     ensureCenter(userPos.lng, userPos.lat, 16);
        //     return;
        // }

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

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { longitude, latitude, accuracy } = position.coords;

                if( (latitude < topLeftBoundary.lat && 
                    latitude > bottomRightBoundary.lat &&
                    longitude < bottomRightBoundary.lng &&
                    longitude > topLeftBoundary.lng ) | button
                ){
                    setUserPos({ lng: longitude, lat: latitude, accuracy });
                    ensureCenter(longitude, latitude, 16);
                }
                

            },
            (err) => {
                console.log(err.message);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );

    }


    async function showBuilding(id) {
        let resp = await getBuildingPos(id)
        let lat = resp.data.lat
        let lng = resp.data.lng
        setDestPos({
            lat: lat,
            lng: lng
        })
        ensureCenter(lng, lat, 19);
    }

    // Build quick lookups from your existing state
    function makeLookups(markers, edgeIndex) {

        const nodesById = new Map(markers.map(m => [m.id, { lng: m.lng, lat: m.lat }]));
        const edgesByKey = new Map(edgeIndex.map(e => [e.key, { from: e.from, to: e.to }]));
        return { nodesById, edgesByKey };
    }
    // Edge key is "a__b" (sorted)
    function splitEdgeKey(key) {
        const [a, b] = key.split("__");
        return (a && b) ? [a, b] : [null, null];
    }

    // Reconstruct a simple path order (no branches) from the list of edge keys
    function orderNodeIdsFromPathKeys(pathKeys, edgesByKey) {
        // Build adjacency from just the route edges
        const adj = new Map(); // nodeId -> Set(neighborIds)
        const add = (u, v) => {
            if (!adj.has(u)) adj.set(u, new Set());
            if (!adj.has(v)) adj.set(v, new Set());
            adj.get(u).add(v);
            adj.get(v).add(u);
        };

        for (const k of pathKeys) {
            const e = edgesByKey.get(k);
            if (!e) continue; // ignore unknown key
            add(e.from, e.to);
        }

        if (adj.size === 0) return [];

        // Find endpoints (degree 1). If none, it’s likely a loop—pick any start.
        const endpoints = [...adj.entries()].filter(([, s]) => s.size === 1).map(([id]) => id);
        let start = endpoints[0] ?? [...adj.keys()][0];

        // Walk the path
        const ordered = [];
        const visited = new Set();
        let cur = start, prev = null;
        while (cur != null) {
            ordered.push(cur);
            visited.add(cur);
            const next = [...(adj.get(cur) ?? [])].find(n => n !== prev && !visited.has(n));
            prev = cur;
            cur = next ?? null;
        }
        return ordered;
    }

    function nodeIdsToCoords(orderedIds, nodesById) {
        const coords = [];
        for (const id of orderedIds) {
            const p = nodesById.get(id);
            if (p) coords.push([p.lng, p.lat]);
        }
        return coords;
    }

    // Bearing helpers
    const toRad = d => d * Math.PI / 180;
    const toDeg = r => r * 180 / Math.PI;
    const normBearing = b => ((b % 360) + 360) % 360;

    function bearingTo(lng1, lat1, lng2, lat2) {
        const φ1 = toRad(lat1), φ2 = toRad(lat2);
        const λ1 = toRad(lng1), λ2 = toRad(lng2);
        const y = Math.sin(λ2 - λ1) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1);
        return normBearing(toDeg(Math.atan2(y, x)));
    }

    function aimCamera(map, lng, lat, bearingDeg, { zoom = 16, pitch = 60, duration = 400 } = {}) {
        if (!map) return;
        map.easeTo({ center: [lng, lat], zoom, bearing: bearingDeg ?? 0, pitch, duration, essential: true });
        setViewState(v => ({ ...v, longitude: lng, latitude: lat, zoom, bearingDeg, pitch }));
    }

    const routeLineLayer = useMemo(() => ({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-width": 6, "line-color": "#111827", "line-opacity": 0.9 }
    }), []);


    async function showRoute() {
        if (selectedDest === "") {
            toast.error("Please select a destination before starting route.")
            return;
        }

        let resp = await getRouteTo(selectedDest, userPos.lat, userPos.lng, curNavMode)
        // let resp = await getRouteTo(selectedDest, 42.424500, -76.491837, curNavMode)
        console.log(resp)
        setPath(new Set(resp.data.path))

        setNavigating(true)

        fitToUserAndDest()

    }
    async function startTracking() {
        if (!selectedDest) {
            toast.error("Please select a destination first.");
            return;
        }
        if (!userPos) {
            toast.error("Tap Locate Me first so I know where you are.");
            return;
        }

        // 1) Get path keys from server (array or set of keys like "a__b")
        let resp;
        try {
            resp = await getRouteTo(selectedDest, userPos.lat, userPos.lng, curNavMode);
        } catch (e) {
            toast.error("Failed to get route");
            return;
        }
        const pathKeys = Array.isArray(resp?.data?.path) ? resp.data.path
            : resp?.data?.path instanceof Set ? [...resp.data.path]
                : [];

        if (pathKeys.length === 0) {
            toast.error("No route found.");
            return;
        }

        // 2) Build ordered polyline coordinates from existing state
        const { nodesById, edgesByKey } = makeLookups(markers, edgeIndex);
        const orderedIds = orderNodeIdsFromPathKeys(pathKeys, edgesByKey);
        const coords = nodeIdsToCoords(orderedIds, nodesById);
        if (coords.length < 2) {
            toast.error("Route is too short to navigate.");
            return;
        }
        routeCoordsRef.current = coords;

        // 3) Optional: show the route as a single LineString
        setRouteFC({
            type: "FeatureCollection",
            features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } }]
        });

        // 4) Rotate camera forward immediately
        const [lng1, lat1] = [userPos.lng, userPos.lat];
        const [lng2, lat2] = coords[1]; // first forward point on the route
        const forward = typeof userPos.heading === "number" ? userPos.heading : bearingTo(lng1, lat1, lng2, lat2);
        aimCamera(mapRef.current?.getMap?.(), lng1, lat1, forward, { pitch: 60, duration: 600, zoom:20 });

        // 5) (Optional) follow user — use browser heading when available, otherwise aim to next route vertex
        if (watchIdRef.current != null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        const id = navigator.geolocation.watchPosition(
            (pos) => {
                const { longitude, latitude, heading } = pos.coords;
                setUserPos(up => ({ ...up, lng: longitude, lat: latitude, heading }));

                let brg;
                if (typeof heading === "number" && !Number.isNaN(heading)) {
                    brg = heading;
                } else if (routeCoordsRef.current.length >= 2) {
                    const [nx, ny] = routeCoordsRef.current[1];
                    brg = bearingTo(longitude, latitude, nx, ny);
                } else {
                    brg = 0;
                }
                aimCamera(mapRef.current?.getMap?.(), longitude, latitude, brg, { pitch: 60, duration: 300,zoom:20 });
            },
            (err) => {
                console.log("watchPosition error:", err);
                toast.error(err.message || "Tracking error");
                stopTracking();
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 1000 }
        );
        watchIdRef.current = id;
        setTracking(true);
    }


    function stopTracking() {

        // ensureCenter(userPos.lng, userPos.lat, 16);
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setViewState(defViewState)
        routeCoordsRef.current = []
        locateOnceRobust()
        setPath(new Set());
        setNavigating(false);
        setTracking(false);
        disableCompass();
        // aimCamera(mapRef.current?.getMap?.(), userPos.lng, userPos.lat, forward, { pitch: 0, duration: 600 });
    }

    async function getBuildings() {
        const resp = await getAllBuildings();
        if (resp?.status === 200) setBuildings(resp.data.buildings || []);
        else toast.error("Buildings did not load!");
    }

    async function getNavModes() {
        const resp = await getAllNavModes();
        let curNavModes = resp.data.NavModes
        if (curNavModes.length > 0) {
            setCurNavMode(curNavModes[0].id);
        }

        setNavModes(curNavModes)
    }


    useEffect(() => {
        getBuildings();
        locateOnceRobust(false);
        getNavModes();
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
                            setNavigating(false)
                            setTracking(false)
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
                    <label htmlFor="dest-d" className="text-sm font-medium">
                        Navigation Mode
                    </label>
                    <select
                        id="dest-d"
                        className="text-sm rounded border px-2 py-1 bg-white w-64"
                        value={curNavMode}
                        defaultValue={"pedestrian"}
                        onChange={(e) => {
                            setCurNavMode(e.target.value)
                            // if (id) flyToSelected(id);
                        }}
                    >
                        {navModes.map((d) => (
                            <option key={d.id} value={d.id}>
                                {d.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="absolute z-20 right-3 bottom-[calc(env(safe-area-inset-bottom,0)+168px)] md:bottom-6 flex flex-col gap-2">
                <button
                    className={`rounded-full shadow px-4 py-3 ${useCompass ? "bg-green-600 text-white" : "bg-white/95"} text-sm font-medium`}
                    onClick={() => (useCompass ? disableCompass() : enableCompass())}
                >
                    {useCompass ? "Compass On" : "Use Compass"}
                </button>
                <button
                    className="rounded-full shadow px-4 py-3 bg-white/95 backdrop-blur text-sm font-medium"
                    onClick={() => locateOnceRobust(true)}
                    title="Center on my location"
                >
                    Locate Me
                </button>
                {!navigating ?
                    <>
                        <button
                            className="rounded-full shadow px-4 py-3 bg-blue-600 text-white text-sm font-medium"
                            onClick={() => showRoute()}
                            title="Follow my location"
                        >
                            Find Route
                        </button>
                    </> :
                    <>
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
                    </>
                }

            </div>

            <ReactMap
                ref={mapRef}
                {...viewState}
                onMove={(e) => setViewState((prev) => ({ ...prev, ...e.viewState }))}
                className="w-full h-full"
                mapStyle="https://api.maptiler.com/maps/base-v4/style.json?key=ezFqZj4n29WctcwDznlR"
                onLoad={() => { setMapReady(true); }}
            >

                <NavModeMap path={path} navMode={curNavMode} markers={markers} setMarkers={setMarkers} edgeIndex={edgeIndex} setEdgeIndex={setEdgeIndex} />
                

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
