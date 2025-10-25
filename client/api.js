import axios from "axios";

const API = axios.create({
    baseURL: "http://127.0.0.1:8000",
    timeout: 30000,
});


export const getAllMapFeature = async () => {

    const res = await API.get(`/map/all`);
    return res;

}

export const getAllMapFeatureADA = async (editor) => {

    const res = await API.get(`/map/adaall?editor=` + editor);
    return res;

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

    const resp = await API.post("/map/", { feature });
    return resp.status == 201
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

    const resp = await API.put("/map/", { feature });
    return resp.status == 201
}

export const setADAStatus = async (key, value, featureType) => {

    const resp = await API.patch("/map/adastatus", { key, value, featureType });
    return resp.status == 200
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

    const resp = await API.post("/map/", { feature });
    return resp.status == 201
}

export const deleteFeature = async (featureKey, featureType) => {
    const resp = await API.delete("/map/", { data: { featureKey: featureKey, featureType: featureType } });
    return resp.status == 200
}



export const addBuilding = async (name) => {
    const resp = await API.post("/building/", { name });
    return resp
}

export const editBuilding = async (id, name) => {
    const resp = await API.put("/building/", { id, name });
    return resp
}

export const deleteBuilding = async (id) => {
    const resp = await API.delete("/building/", { data: { id: id } });
    return resp
}

export const getAllBuildings = async () => {
    const resp = await API.get("/building/")
    return resp
}

export const getAllBuildingNodes = async (id) => {
    const resp = await API.get("/building/nodesget?id=" + id)
    return resp
}

export const attachNodeToBuilding = async (buildingId, nodeId) => {
    const resp = await API.post("/building/nodeadd", { buildingId, nodeId })
    console.log(resp)
    return resp.status == 200
}

export const detachNodeFromBuilding = async (buildingId, nodeId) => {
    const resp = await API.post("/building/noderemove", { buildingId, nodeId })
    return resp.status == 200
}

// buildingpos

export const getBuildingPos = async (buildingId) => {
    const resp = await API.get("/navigation/buildingpos?buildingid=" + buildingId)
    return resp

}

export const getRouteTo = async (buildingId, lat, lng) => {
    console.log("/navigation/routeto?buildingid=" + buildingId + "&lat=" + lat + "&lng=" + lng)
    const resp = await API.get("/navigation/routeto?buildingid=" + buildingId + "&lat=" + lat + "&lng=" + lng)

    return resp

}