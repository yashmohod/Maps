// src/components/MapEditor.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Map, Source, Layer } from "@vis.gl/react-maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

export default function MapEditor() {
  const [viewState, setViewState] = useState({
    longitude: -76.494131,
    latitude: 42.422108,
    zoom: 15,
  });

  const [geojson, setGeojson] = useState({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "a1",
        properties: { id: "a1", name: "Alpha" },
        geometry: { type: "Point", coordinates: [-76.494131, 42.422108] },
      },
      {
        type: "Feature",
        id: "b2",
        properties: { id: "b2", name: "Beta" },
        geometry: { type: "Point", coordinates: [-76.49, 42.423] },
      },
    ],
  });

  const mapRef = useRef(null);
  const [selectedId, setSelectedId] = useState(null);
  const selectedRef = useRef(null); // why: avoid stale closures in map listeners
  selectedRef.current = selectedId;

  const circleLayer = useMemo(
    () => ({
      id: "marker-circles",
      type: "circle",
      source: "markers",
      paint: {
        "circle-radius": 6,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          "#ef4444",
          "#1d4ed8",
        ],
      },
    }),
    []
  );

  function clearSelected(map) {
    const prev = selectedRef.current;
    if (prev == null) return;
    map.setFeatureState({ source: "markers", id: prev }, { selected: false });
  }

  const handleMarkerClick = (e) => {
    const map = mapRef.current?.getMap?.();
    const f = e.features?.[0];
    if (!map || !f) return;

    const fid = f.id ?? f.properties?.id;
    if (fid == null) return;

    const currentlySelected = selectedRef.current;

    if (fid === currentlySelected) {
      // toggle off
      map.setFeatureState({ source: "markers", id: fid }, { selected: false });
      setSelectedId(null);
      return;
    }
    // switch selection
    if(selectedId == null){
        console.log(selectedId)
        map.setFeatureState({ source: "markers", id: fid }, { selected: true });
        setSelectedId(fid);
    }else{
        clearSelected(map);
    }
    
  };

  useEffect(() => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;
    clearSelected(map);
    map.setFeatureState({ source: "markers", id: selectedId }, { selected: true });

    return () => {
    };
    // empty deps: attach once, rely on refs to avoid stale state
  }, [selectedId]);

  const handleMarkerEnter = () => {
    const map = mapRef.current?.getMap?.();
    if (map) map.getCanvas().style.cursor = "pointer";
  };

  const handleMarkerLeave = () => {
    const map = mapRef.current?.getMap?.();
    if (map) map.getCanvas().style.cursor = "";
  };

  const handleMapClick = (e) => {
    // if clicking a marker, layer handler already ran
    if (e.features && e.features.length) return;

    const map = mapRef.current?.getMap?.();
    if (!map) return;

    // clear selection on empty-space click
    if (selectedRef.current != null) {
      clearSelected(map);
      setSelectedId(null);
    }

    // optional: add point when clicking empty space
    const { lng, lat } = e.lngLat;
    const id = `f-${Date.now()}`;
    setGeojson((fc) => ({
      type: "FeatureCollection",
      features: [
        ...fc.features,
        {
          type: "Feature",
          id,
          properties: { id, name: `P-${fc.features.length + 1}` },
          geometry: { type: "Point", coordinates: [lng, lat] },
        },
      ],
    }));
  };

  const handleLoad = () => {
    const map = mapRef.current?.getMap?.();
    if (!map) return;

    map.off("click", "marker-circles", handleMarkerClick);
    map.off("mouseenter", "marker-circles", handleMarkerEnter);
    map.off("mouseleave", "marker-circles", handleMarkerLeave);

    map.on("click", "marker-circles", handleMarkerClick);
    map.on("mouseenter", "marker-circles", handleMarkerEnter);
    map.on("mouseleave", "marker-circles", handleMarkerLeave);
  };

  useEffect(() => {
    return () => {
      const map = mapRef.current?.getMap?.();
      if (!map) return;
      clearSelected(map);
      map.off("click", "marker-circles", handleMarkerClick);
      map.off("mouseenter", "marker-circles", handleMarkerEnter);
      map.off("mouseleave", "marker-circles", handleMarkerLeave);
    };
    // empty deps: attach once, rely on refs to avoid stale state
  }, []);

  return (
    <div className="w-full h-screen flex items-center justify-center">
      <Map
        ref={mapRef}
        {...viewState}
        interactiveLayerIds={["marker-circles"]} // needed for e.features
        onClick={handleMapClick}
        onMove={(evt) => setViewState(evt.viewState)}
        className="w-full h-full"
        mapStyle="https://api.maptiler.com/maps/base-v4/style.json?key=ezFqZj4n29WctcwDznlR"
        onLoad={handleLoad}
      >
        {/* promoteId: properties.id becomes the real feature id */}
        <Source id="markers" type="geojson" data={geojson} promoteId="id">
          <Layer {...circleLayer} />
        </Source>
      </Map>
    </div>
  );
}
