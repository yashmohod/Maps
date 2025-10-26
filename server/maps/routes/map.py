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
    data = json.loads(request.data)


    if data["type"] == "node":
        node = Nodes(
            id = data["id"],
            lng = data["lng"],
            lat = data["lat"],
            )
        db.session.add(node)

    elif data["type"] == "edge":

        edge = Edges(
                id = data["key"],
                eFrom = data["from"],
                eTo = data["to"],
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
    data = json.loads(request.data)
    


    node = Nodes.query.get(data["id"] )
    node.lng = data["lng"]
    node.lat = data["lat"]       
    db.session.commit()
    
    return jsonify({"message": "Nodes and edges updated successfully."}), 201



@map_bp.route("/all", methods=["GET"])
def MapFeatureGetAll():

    edges=[]
    nodes=[]

    for node in Nodes.query.all():
        nodes.append({"id":node.id,"lng":node.lng,"lat":node.lat})

    for edge in Edges.query.all():
        edges.append({"key":edge.id,"from":edge.eFrom,"to":edge.eTo})

    return jsonify({"edges":edges,"nodes":nodes}), 200




@map_bp.route("/", methods=["GET"])
def MapFeatureGetNode():
    featureKey = request.args.get("featureKey")
    featureType = request.args.get("featureType")
    if featureKey == None or featureType == None: 
        return jsonify({"message": "Bad request check args."}), 400

    if featureType == "Point":
        node = Nodes.query.get(featureKey)
        if node:    
            jsonify({"id":node.id,"lng":node.lng,"lat":node.lat}), 200
        else:
            return jsonify({"message": "No feature found with the given Id."}), 400
    elif featureType == "Edge":
        edge = Edges.query.get(featureKey ) 
        if edge:  
            return jsonify({"key":edge.id,"from":edge.eFrom,"to":edge.eTo}), 200
        else:
            return jsonify({"message": "No feature found with the given Id."}), 400
    else:
        return jsonify({"message": "No valid feature type mentioned. Hint: Point or Edge."}), 400
   


@map_bp.route("/", methods=["DELETE"])
def MapFeatureDelete():

    data = json.loads(request.data)
    featureKey = data["featureKey"]
    featureType = data["featureType"]

    if featureKey == None or featureType == None: 
        return jsonify({"message": "Bad request check args."}), 400


    found = False

    if featureType == "Point":

        node = Nodes.query.get(featureKey )
        found = not(node == None)

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
        edge = Edges.query.get(featureKey )
        found = not(edge == None)
        db.session.delete(edge)

    else:
        return jsonify({"message": "No valid feature type mentioned. Hint: Point or Edge."}), 400

    if found:
        db.session.commit()
        return jsonify({"message": "Feature deleted."}), 200
    else:
        return jsonify({"message": "Feature not found."}), 404



