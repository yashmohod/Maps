import axios from "axios";

const API = axios.create({
    baseURL: "http://127.0.0.1:8000",
    timeout: 30000,
});


export const getAllMapFeature = async () => {

    const res = await API.get(`/map/all`);
    return res.data;

}

export const addNode = async (id, lng, lat) => {

    let feature = {
        "type": "Feature",
        "id": id,
        "properties": {
            "id": id
        },
        "geometry": {
            "type": "Point",
            "coordinates": [
                lng,
                lat
            ]
        }
    }

    const res = await API.post("/map/", { feature });
    if (res.status == 201) {
        return true;
    } else {
        return false;
    }
}

export const editNode = async (id, lng, lat) => {

    let feature = {
        "type": "Feature",
        "id": id,
        "properties": {
            "id": id
        },
        "geometry": {
            "type": "Point",
            "coordinates": [
                lng,
                lat
            ]
        }
    }

    const res = await API.put("/map/", { feature });
    if (res.status == 201) {
        return true;
    } else {
        return false;
    }
}


export const addEdge = async (key, to, from, cords) => {

    let feature = {
        "type": "Feature",
        "properties": {
            "key": key,
            "from": from,
            "to": to
        },
        "geometry": {
            "type": "LineString",
            "coordinates": cords
        }
    }

    const res = await API.post("/map/", { feature });
    if (res.status == 201) {
        return true;
    } else {
        return false;
    }
}

export const deleteFeature = async (featureKey, featureType) => {
    const res = await API.delete("/map/", { data: { featureKey: featureKey, featureType: featureType } });

    if (res.status == 200) {
        return true;
    } else {
        return false;
    }
}