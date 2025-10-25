from flask import Blueprint, request, jsonify
from maps.models.map import *
from maps import db

map_bp = Blueprint("map_bp", __name__)



"""
Map feature 
"""
@map_bp.route("/", methods=["POST"])
def MapFeatureAdd():
    if request.data == None:
        return jsonify({"message": "Feature data not provided"}), 400
    data = json.loads(request.data)["feature"]


    if data["geometry"]["type"] == "Point":
        node = Nodes(
            key = data["id"],
            lng = data["geometry"]["coordinates"][0],
            lat = data["geometry"]["coordinates"][1],
            featureGeojson = json.dumps(data)
            )
        db.session.add(node)

    elif data["geometry"]["type"] == "LineString":
        nodeFrom = Nodes.query.filter_by(key=data["properties"]["from"] ).first()
        nodeTo = Nodes.query.filter_by(key=data["properties"]["to"] ).first()

        nodeFrom.adjacencyList.append(nodeTo)
        nodeTo.adjacencyList.append(nodeFrom)


        edge = Edges(
                key = data["properties"]["key"],
                eFrom = data["properties"]["from"],
                eTo = data["properties"]["to"],
                featureGeojson = json.dumps(data)
                )
        db.session.add(edge)
    
    else:
        return jsonify({"message": "No valid feature type mentioned."}), 404
    
    db.session.commit()
    
    return jsonify({"message": "Feature added successfully. "}), 201






@map_bp.route("/", methods=["PUT"])
def MapFeatureEdit():
    if request.data == None:
        return jsonify({"message": "Feature data not provided"}), 400
    data = json.loads(request.data)["feature"]
    


    node = Nodes.query.filter_by(key = data["id"] ).first()
    node.lng = data["geometry"]["coordinates"][0]
    node.lat = data["geometry"]["coordinates"][1]
    node.featureGeojson = json.dumps(data)

    # get all edges where node is at from:
    edgesFrom = Edges.query.filter_by(eFrom = node.key)
    for edge in edgesFrom:
        edgeGeojson = json.loads(edge.featureGeojson)
        edgeGeojson["geometry"]["coordinates"][0] = [node.lng,node.lat]
        edge.featureGeojson = json.dumps(edgeGeojson)
    
    # get all edges where node is at to:
    edgesFrom = Edges.query.filter_by(eTo = node.key)
    for edge in edgesFrom:
        edgeGeojson = json.loads(edge.featureGeojson)
        edgeGeojson["geometry"]["coordinates"][1] = [node.lng,node.lat]
        edge.featureGeojson = json.dumps(edgeGeojson)
    
    db.session.commit()
    
    return jsonify({"message": "Nodes and edges updated successfully."}), 201

@map_bp.route("/adastatus", methods=["PATCH"])
def SetADAStatus():
    if request.data == None:
        return jsonify({"message": "Bad Request"}), 400
    
    data = json.loads(request.data)
    
    if data["featureType"] == None or data["value"] == None or data["key"] == None: 
        return jsonify({"message": "Bad Request"}), 400

    if data["featureType"] == "Node":
        curNode = Nodes.query.filter_by(key = data["key"]).first()
        curNode.ada = data["value"] 
   
    if data["featureType"] == "Edge":
        curEdge = Edges.query.filter_by(key = data["key"]).first()
        curEdge.ada = data["value"] 

    db.session.commit()
     
    return jsonify({"message": "Feature updated successfully."}), 200



@map_bp.route("/all", methods=["GET"])
def MapFeatureGetAll():

    edges=[]
    nodes=[]

    for node in Nodes.query.all():
        nodes.append({"id":node.key,"lng":node.lng,"lat":node.lat})

    for edge in Edges.query.all():
        edges.append({"key":edge.key,"from":edge.eFrom,"to":edge.eTo})

    return jsonify({"edges":edges,"nodes":nodes}), 200

@map_bp.route("/adaall", methods=["GET"])
def MapFeatureGetAllADA():
    editor = request.args.get("editor")

    if editor:
        nodes =[]
        for node in Nodes.query.with_entities(Nodes.key,Nodes.ada).all():
            if node.ada:
                nodes.append(node.key)
        edges = []
        for edge in Edges.query.with_entities(Edges.key,Edges.ada).all():
            if edge.ada:
                edges.append(edge.key)

        return jsonify({"edges": edges,"nodes":nodes}), 200

    else:
        res = {
        "type": "FeatureCollection",
        "features": []
        }

        for node in Nodes.query.with_entities(Nodes.featureGeojson,Nodes.ada).all():
            if node.ada:
                res["features"].append(json.loads(node[0]))

        for edge in Edges.query.with_entities(Edges.featureGeojson,Nodes.ada).all():
            if edge.ada:
                res["features"].append(json.loads(edge[0]))

        return json.dumps(res), 200



@map_bp.route("/", methods=["GET"])
def MapFeatureGetNode():
    featureKey = request.args.get("featureKey")
    featureType = request.args.get("featureType")

    feature = None
    if featureType == "Point":
        feature = Nodes.query.filter_by(key = featureKey ).first()

    elif featureType == "Edge":
        feature = Edges.query.filter_by(key = featureKey ).first()
    
    else:
        return jsonify({"message": "No valid feature type mentioned. Hint: Point or Edge."}), 400
    
    if feature:
        return feature.featureGeojson, 201
    else:
        return jsonify({"message": "Feature not found."}), 404





@map_bp.route("/", methods=["DELETE"])
def MapFeatureDelete():

    data = json.loads(request.data)

    featureKey = data["featureKey"]
    featureType = data["featureType"]

    found = False

    if featureType == "Point":
        found = True

        node = Nodes.query.filter_by(key = featureKey ).first()

        buildings = Buildings.query.all() 
        for building in buildings:
            if node in building.nodes:
                building.nodes.remove(node)

        edgeFrom = Edges.query.filter_by(eFrom = node.id ).all()
        edgeTo = Edges.query.filter_by(eTo = node.id ).all()
        
        for edge in edgeFrom:
            db.session.delete(edge)

        for edge in edgeTo:
            db.session.delete(edge)

        db.session.delete(node)

    elif featureType == "Edge":
        found = True
        edge = Edges.query.filter_by(key = featureKey ).first()
        db.session.delete(edge)

    else:
        return jsonify({"message": "No valid feature type mentioned. Hint: Point or Edge."}), 400

    if found:
        db.session.commit()
        return jsonify({"message": "Feature deleted."}), 200
    else:
        return jsonify({"message": "Feature not found."}), 404


