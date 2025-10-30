import numpy as np 
from scipy.spatial import cKDTree
import pandas as pd  
from collections import deque 
import math



def latlon_to_cartesian(lat, lon):
    lat, lon = np.radians(lat), np.radians(lon)
    x = np.cos(lat) * np.cos(lon)
    y = np.cos(lat) * np.sin(lon)
    z = np.sin(lat)
    return np.array([x, y, z]).T

def nearestPoint(fromLng,fromLat,destLngs,destLats,destKeys):
    
    lats = np.array(destLats) 
    lngs = np.array(destLngs)
    target = np.array([fromLat,fromLng])
    tree = cKDTree(latlon_to_cartesian(lats, lngs))
    _, idx = tree.query(latlon_to_cartesian(*target))
    return destKeys[idx] 
    # return 0

# bfs to find shortest path
def bfs(startid,endid,navMode,Edges, NavModeAssosication):
    # maintain a queue of paths
    queue = []
    # visited set to prevent cycles
    visited = set()
    # push the first path into the queue
    queue.append([startid])

    while queue:
        # get the first path from the queue
        path = queue.pop(0)
        # get the last node from the path
        nodeid = path[-1]
        # path found
        if nodeid == endid:
            return path
        # enumerate all adjacent nodes, construct a 
        # new path and push it into the queue
        # edges = Nodes.query.get(nodeid).adjacencyList
        edgesFrom = Edges.query.filter_by(eFrom = nodeid).all()
        edgesTo = Edges.query.filter_by(eTo = nodeid).all()
        for nextN  in edgesFrom:
            curNodeNavMode = NavModeAssosication.query.filter_by(feature = nextN.eTo).filter_by(navMode = navMode).first()
            if curNodeNavMode and( nextN.eTo not in visited):
                new_path = list(path)
                new_path.append(nextN.eTo)
                queue.append(new_path)
                visited.add(nextN.eTo)
        
        for nextN  in edgesTo:
            curNodeNavMode = NavModeAssosication.query.filter_by(feature = nextN.eFrom).filter_by(navMode = navMode).first()
            if curNodeNavMode and ( nextN.eFrom not in visited):
                new_path = list(path)
                new_path.append(nextN.eFrom)
                queue.append(new_path)
                visited.add(nextN.eFrom)


def getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2):
  R = 6371 #// Radius of the earth in km
  dLat = deg2rad(lat2-lat1) #  // deg2rad below
  dLon = deg2rad(lon2-lon1) 
  a = np.sin(dLat/2) * np.sin(dLat/2) + np.cos(deg2rad(lat1)) * np.cos(deg2rad(lat2)) * np.sin(dLon/2) * np.sin(dLon/2)
  c = 2 * np.atan2(np.sqrt(a), np.sqrt(1-a))
  d = R * c *1000 #// Distance in km
  return d

def deg2rad(deg):
  return deg * (np.pi/180)



# # use path to create assemble geojson features to render on map
# def pathToMapFeatures(path):


#     res = {
#     "type": "FeatureCollection",
#     "features": []
#     }


#     for i in range(len(path)-1):

#         # add nodes
#         # node = featureLookup.get(path[i])
#         # res["features"].append(node)

#         # add edges
#         edgeKey = path[i]+"__"+path[i+1]
#         edgeKey_alt = path[i+1]+"__"+path[i]

#         edge ={}
#         if edgeKey in featureLookup:
#             edge = featureLookup.get(edgeKey)
#         else:
#             edge = featureLookup.get(edgeKey_alt)

#         res["features"].append(edge)
    
#     # adding last node
#     node = featureLookup.get(path[-1])
#     res["features"].append(node)

#     return res

        
def buildingPosCaluator(points):


    x = y = z = 0.0
    
    for lat, lon in points:
        lat_rad = math.radians(lat)
        lon_rad = math.radians(lon)

        x += math.cos(lat_rad) * math.cos(lon_rad)
        y += math.cos(lat_rad) * math.sin(lon_rad)
        z += math.sin(lat_rad)

    x /= len(points)
    y /= len(points)
    z /= len(points)

    hyp = math.sqrt(x * x + y * y)
    lat = math.degrees(math.atan2(z, hyp))
    lon = math.degrees(math.atan2(y, x))
    return (lat, lon)
