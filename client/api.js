import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:8080",
    timeout: 30000,
});

//// editor functions
export const getAllMapFeature = async () => {

    const res = await API.get(`/map/all`);
    return res;

}

export const addNode = async (id, lng, lat) => {
    let type = "node"
    const resp = await API.post("/map/", { id, lng, lat, type });
    return resp.status == 200
}

export const editNode = async (id, lng, lat) => {
    const resp = await API.put("/map/", { id, lng, lat });
    return resp.status == 200
}

export const addEdge = async (key, to, from) => {
    let type = "edge"
    const resp = await API.post("/map/", { key, to, from, type });
    return resp.status == 200
}

export const deleteFeature = async (featureKey, featureType) => {
    const resp = await API.delete("/map/", { data: { featureKey: featureKey, featureType: featureType } });
    return resp.status == 200
}


//// building functions

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
    // console.log(resp)
    return resp.status == 200
}

export const detachNodeFromBuilding = async (buildingId, nodeId) => {
    const resp = await API.post("/building/noderemove", { buildingId, nodeId })
    return resp.status == 200
}

export const getBuildingPos = async (buildingId) => {
    const resp = await API.get("/building/buildingpos?id=" + buildingId)
    return resp

}

//// Navigation Mode functions
export const addNavMode = async (name) => {
    const resp = await API.post("/navmode/", { name });
    return resp
}

export const editNavMode = async (id, name) => {
    const resp = await API.put("/navmode/", { id, name });
    return resp
}

export const deleteNavMode = async (id) => {
    const resp = await API.delete("/navmode/", { data: { id: id } });
    return resp
}

export const getAllNavModes = async () => {
    const resp = await API.get("/navmode/")
    return resp
}

export const setNavModeStatus = async (id, value, featureType, navModeId) => {
    // console.log(id, value, featureType, navModeId)
    const resp = await API.patch("/navmode/setstatus", { id, value, featureType, navModeId });
    return resp.status == 200
}
export const getAllMapFeaturesNavModeIds = async (navModeId) => {

    const res = await API.get(`/navmode/allids?navModeId=` + navModeId);
    return res;

}
export const getAllMapFeaturesNavMode = async (navModeId) => {

    const res = await API.get(`/navmode/all?navModeId=` + navModeId);
    return res;

}




//// vehicular functions


export const getRouteTo = async (buildingId, lat, lng, navMode) => {
    console.log(buildingId, lat, lng, navMode)
    const resp = await API.get("/map/navigateTo?id=" + buildingId + "&lat=" + lat + "&lng=" + lng + "&navMode=" + navMode)

    return resp

}