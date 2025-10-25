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

    userLat = float(request.args.get("lat"))
    userLng = float(request.args.get("lng")) 
    curBuilding = Buildings.query.get(buildingID)
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

    path = bfs(startid,destid)

    
    edges=[]
    nodes=[]

    for i in range(len(path)-1):
        n1 = Nodes.query.get(path[i])
        n2 = Nodes.query.get(path[i+1])
        nodes.append({"id":n1.key,"lng":n1.lng,"lat":n1.lat})
        if i == len(path)-2:
            nodes.append({"id":n2.key,"lng":n2.lng,"lat":n2.lat})
        edgeKey = n1.key+"__"+n2.key
        edgeKey_alt = n2.key+"__"+n1.key

        edge = Edges.query.filter_by(key=edgeKey).first()
        edge_alt = Edges.query.filter_by(key=edgeKey_alt).first()
        if edge: 
            edges.append({"key":edge.key,"from":edge.eFrom,"to":edge.eTo})
        else: 
            edges.append({"key":edge_alt.key,"from":edge_alt.eFrom,"to":edge_alt.eTo})

    return jsonify({"edges":edges,"nodes":nodes}), 200

