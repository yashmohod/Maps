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





@map_bp.route("/all", methods=["GET"])
def MapFeatureGetAll():

    res = {
    "type": "FeatureCollection",
    "features": []
    }

    for node in Nodes.query.with_entities(Nodes.featureGeojson).all():
        res["features"].append(json.loads(node[0]))

    for edges in Edges.query.with_entities(Edges.featureGeojson).all():
        res["features"].append(json.loads(edges[0]))

    return json.dumps(res), 201



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


