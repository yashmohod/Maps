from flask import Blueprint, request, jsonify
from maps.models.map import *
from maps import db

building_bp = Blueprint("building_bp", __name__)



"""
Building Group
"""
@building_bp.route("/", methods=["POST"])
def BuildingAdd():
    if request.data == None:
        return jsonify({"message": "Feature data not provided"}), 400
    data = request.data

    exists = db.session.query(db.exists().where(Buildings.name == data["name"])).scalar()

    if exists:
        return jsonify({"message": "Building with name '"+data["name"]+"' exists already!"}), 400
    else:
        building = Buildings(name = data["Name"])
        db.session.add(building)
        db.session.commit()

        return jsonify({"message": "Building added!"}), 201


@building_bp.route("/", methods=["PUT"])
def BuildingEdit():
    if request.data == None:
        return jsonify({"message": "Feature data not provided"}), 400
    data = request.data

    curBuildings = Buildings.query.get(data["id"]).first()
    curBuildings.name = data["name"]
    db.session.commit()

    return jsonify({"message": "Building added!"}), 201



@building_bp.route("/all", methods=["GET"])
def BuildingGetAll():

    res = Buildings.query.all() 
    buildings = []
    for i in res:
        buildings.append({
            "id": i.id,
            "name": i.name
        })
    return jsonify({"buildings": buildings}), 201



@building_bp.route("/", methods=["GET"])
def BuildingGetAllNodes():
    id = request.args.get("id") 
    curBuilding = Buildings.query.get(id).first()
    nodes = [] 
    for node in curBuilding.nodes:
        nodes.append({
            node.id:{
                "id":node.id,
                "lng":node.lng,
                'lat':node.lat
            }
        })
    
    return jsonify({"nodes":nodes}), 201

@building_bp.route("/", methods=["DELETE"])
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


