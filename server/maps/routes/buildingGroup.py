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
    data = json.loads(request.data)

    exists = db.session.query(db.exists().where(Buildings.name == data["name"])).scalar()

    if exists:
        return jsonify({"message": "Building with name '"+data["name"]+"' exists already!"}), 400
    else:
        building = Buildings(
            name = data["name"]
            
            )
        db.session.add(building)
        db.session.commit()

        return jsonify({"message": "Building added!"}), 201


@building_bp.route("/", methods=["PUT"])
def BuildingEdit():
    if request.data == None:
        return jsonify({"message": "Feature data not provided"}), 400
    data = json.loads(request.data)

    curBuildings = Buildings.query.get(data["id"])
    curBuildings.name = data["name"]
    db.session.commit()

    return jsonify({"message": "Building added!"}), 200



@building_bp.route("/", methods=["GET"])
def BuildingGetAll():

    res = Buildings.query.all() 
    buildings = []
    for i in res:
        buildings.append({
            "id": i.id,
            "name": i.name
        })
    return jsonify({"buildings": buildings}), 200


@building_bp.route("/", methods=["DELETE"])
def MapFeatureDelete():

    data = json.loads(request.data)

    curBuilding = Buildings.query.get(data["id"])

    for i in curBuilding.nodes:
        curBuilding.nodes.remove(i)
    
    db.session.delete(curBuilding)

    db.session.commit()

    return jsonify({"message":"Building deleted!"}),200





# Building Nodes (entrances)
@building_bp.route("/nodesget", methods=["GET"])
def BuildingGetAllNodes():
    id = request.args.get("id") 
    curBuilding = Buildings.query.get(id)
    nodes = []
    for node in curBuilding.nodes:
        nodes.append({
                "id":node.id,
                "lng":node.lng,
                'lat':node.lat
            })
        # nodes.append(node.id)
    
    
    return jsonify({"nodes":nodes}), 201


@building_bp.route("/nodeadd", methods=["POST"])
def BuildingNodeAdd():

    if request.data == None:
        return jsonify({"message": "Feature data not provided"}), 400
    data = json.loads(request.data)

    curBuilding = Buildings.query.get(data["buildingId"])
    curNode = Nodes.query.get(data["nodeId"])

    if curNode not in curBuilding.nodes:
        curBuilding.nodes.append(curNode)
        db.session.commit()
        return jsonify({"message": "Node added!"}), 200

    else:
        return jsonify({"message": "Node already attached to the building"}), 400 
    

    

@building_bp.route("/noderemove", methods=["POST"])
def BuildingNodeRemove():

    if request.data == None:
        return jsonify({"message": "Feature data not provided"}), 400
    data = json.loads(request.data)

    curBuilding = Buildings.query.get(data["buildingId"])
    curNode = Nodes.query.get(data["nodeId"])

    if curNode in curBuilding.nodes:
        curBuilding.nodes.remove(curNode)
        db.session.commit()
        return jsonify({"message": "Node added!"}), 200

    else:
        return jsonify({"message": "Node not attached to the building"}), 400 