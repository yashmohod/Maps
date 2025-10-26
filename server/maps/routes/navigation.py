from flask import Blueprint, request, jsonify
from maps.models.map import *
from maps import db
from ..utils.navigation import *

root_bp = Blueprint("root_bp", __name__)
navigation_bp = Blueprint("navigation_bp", __name__)


"""
Heatlth check to test connection.
"""
@root_bp.route("/", methods=["GET"])
def ping():
    return jsonify({"message": "Connection Healthy!"}), 200




@navigation_bp.route("/buildingpos", methods=["GET"])
def buildingPos():

    buildingID = request.args.get("buildingid") 

    curBuilding = Buildings.query.get(buildingID)
    points = []
    for node in curBuilding.nodes:
        points.append([node.lat,node.lng])

    lat,lng = buildingPosCaluator(points)    


    return jsonify({"lat":lat,"lng":lng}), 200

@navigation_bp.route("/routeto", methods=["GET"])
def routeTo():

    buildingID = request.args.get("buildingid") 
    navMode = request.args.get("navMode")
    userLat = float(request.args.get("lat"))
    userLng = float(request.args.get("lng")) 
    curBuilding = Buildings.query.get(buildingID)
    print(buildingID,navMode,userLat,userLng)
    lngs=[]
    lats=[]
    ids=[]
    for node in curBuilding.nodes:
        lngs.append(node.lng)
        lats.append(node.lat)
        ids.append(node.id)
    
    destid = nearestPoint(userLng,userLat,lngs,lats,ids)
    allNodes = Nodes.query.all()
    lngs=[]
    lats=[]
    ids=[]
    for node in allNodes:
        lngs.append(node.lng)
        lats.append(node.lat)
        ids.append(node.id)
    
    startid = nearestPoint(userLng,userLat,lngs,lats,ids)
    print(startid,destid)

    path = bfs(startid,destid,navMode,Edges,NavModeAssosication)
    print(path)
    
    edges=[]
    nodes=[]

    for i in range(len(path)-1):
        n1 = Nodes.query.get(path[i])
        n2 = Nodes.query.get(path[i+1])
        nodes.append({"id":n1.id,"lng":n1.lng,"lat":n1.lat})
        if i == len(path)-2:
            nodes.append({"id":n2.id,"lng":n2.lng,"lat":n2.lat})
        edgeKey = n1.id+"__"+n2.id
        edgeKey_alt = n2.id+"__"+n1.id

        edge = Edges.query.filter_by(id=edgeKey).first()
        edge_alt = Edges.query.filter_by(id=edgeKey_alt).first()
        if edge: 
            # edges.append({"key":edge.id,"from":edge.eFrom,"to":edge.eTo})
            edges.append(edge.id)
        else: 
            # edges.append({"key":edge_alt.id,"from":edge_alt.eFrom,"to":edge_alt.eTo})
            edges.append(edge_alt.id)
    # return jsonify({"edges":edges,"nodes":nodes}), 200
    return jsonify({"path":edges}), 200

