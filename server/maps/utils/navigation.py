import numpy as np 
from scipy.spatial import cKDTree
import pandas as pd  
from collections import deque 
from maps.models.map import *
from maps import db
# services/nearest.py
from sqlalchemy import select, func, literal


# If your lat/lng are degrees but stored as INT, set SCALE=1.0
# If stored as micro-degrees (e.g., 42345678 means 42.345678°), set SCALE=1e6
SCALE = 1.0

EARTH_R_M = 6371000.0  # mean Earth radius in meters

def _deg(expr):
    """Convert stored integer to degrees as REAL inside SQL."""
    return (expr / SCALE).cast(db.Float)

def haversine_meters_sql(target_lat_deg: float, target_lng_deg: float):
    # a = sin²(dlat/2) + cos(lat1)cos(lat2)sin²(dlon/2)
    dlat = func.radians(_deg(Nodes.lat) - literal(target_lat_deg))
    dlon = func.radians(_deg(Nodes.lng) - literal(target_lng_deg))
    lat1 = func.radians(literal(target_lat_deg))
    lat2 = func.radians(_deg(Nodes.lat))

    sin_dlat2 = func.sin(dlat / 2.0)
    sin_dlon2 = func.sin(dlon / 2.0)

    a = (sin_dlat2 * sin_dlat2) + func.cos(lat1) * func.cos(lat2) * (sin_dlon2 * sin_dlon2)
    c = 2.0 * func.atan2(func.sqrt(a), func.sqrt(1.0 - a))
    return EARTH_R_M * c  # SQL expression

def nearest_node(session, lat_deg: float, lng_deg: float):
    dist_expr = haversine_meters_sql(lat_deg, lng_deg).label("distance_m")

    stmt = (
        select(Nodes, dist_expr)
        .order_by(dist_expr)   # nearest first
        .limit(1)
    )

    row = session.execute(stmt).first()
    if not row:
        return None, None

    node, distance_m = row
    return node, float(distance_m)



# def latlon_to_cartesian(lat, lon):
#     lat, lon = np.radians(lat), np.radians(lon)
#     x = np.cos(lat) * np.cos(lon)
#     y = np.cos(lat) * np.sin(lon)
#     z = np.sin(lat)
#     return np.array([x, y, z]).T

# def nearestPoint(lat,lng):
#     data =  pd.read_csv('points.csv')
#     target = np.array([lat,lng])
#     tree = cKDTree(latlon_to_cartesian(data["lat"].to_numpy(), data["lng"].to_numpy()))
#     _, idx = tree.query(latlon_to_cartesian(*target))
#     return data.iloc[idx]['id']


# bfs to find shortest path
def bfs(start,end):
    # maintain a queue of paths
    queue = []
    # visited set to prevent cycles
    visited = set()
    # push the first path into the queue
    queue.append([start])

    while queue:
        # get the first path from the queue
        path = queue.pop(0)
        # get the last node from the path
        node = path[-1]
        # path found
        if node == end:
            return path
        # enumerate all adjacent nodes, construct a 
        # new path and push it into the queue
        edges = []
        if node in adjacencyList:
            edges = adjacencyList.get(node)["edges"]

        for nextN  in edges:
            if nextN not in visited:
                new_path = list(path)
                new_path.append(nextN)
                queue.append(new_path)
                visited.add(nextN)



# use path to create assemble geojson features to render on map
def pathToMapFeatures(path):


    res = {
    "type": "FeatureCollection",
    "features": []
    }


    for i in range(len(path)-1):

        # add nodes
        # node = featureLookup.get(path[i])
        # res["features"].append(node)

        # add edges
        edgeKey = path[i]+"__"+path[i+1]
        edgeKey_alt = path[i+1]+"__"+path[i]

        edge ={}
        if edgeKey in featureLookup:
            edge = featureLookup.get(edgeKey)
        else:
            edge = featureLookup.get(edgeKey_alt)

        res["features"].append(edge)
    
    # adding last node
    node = featureLookup.get(path[-1])
    res["features"].append(node)

    return res

        
