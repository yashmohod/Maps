from flask import Blueprint, request, jsonify
from maps.models.map import *
from maps import db
from sqlalchemy import  and_

# from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.exc import IntegrityError


navMode_bp = Blueprint("navMode_bp", __name__)



"""
Navigation Mode
"""
@navMode_bp.route("/", methods=["POST"])
def NavModeAdd():
    if request.data == None:
        return jsonify({"message": "Feature data not provided"}), 400
    data = json.loads(request.data)

    exists = db.session.query(db.exists().where(NavMode.name == data["name"])).scalar()

    if exists:
        return jsonify({"message": "Navigation Mode with name '"+data["name"]+"' exists already!"}), 400
    else:
        navMode = NavMode(
            name = data["name"]
            
            )
        db.session.add(navMode)
        db.session.commit()

        return jsonify({"message": "Navigation Mode added!"}), 201


@navMode_bp.route("/", methods=["PUT"])
def NavModeEdit():
    if request.data == None:
        return jsonify({"message": "Feature data not provided"}), 400
    data = json.loads(request.data)

    curNavMode = NavMode.query.get(data["id"])
    curNavMode.name = data["name"]
    db.session.commit()

    return jsonify({"message": "Navigation Mode updated!"}), 200



@navMode_bp.route("/", methods=["GET"])
def NavModeGetAll():

    res = NavMode.query.all() 
    navModes = []
    for i in res:
        navModes.append({
            "id": i.id,
            "name": i.name
        })
    return jsonify({"NavModes": navModes}), 200


@navMode_bp.route("/", methods=["DELETE"])
def NavModeDelete():

    data = json.loads(request.data)

    curNavMode = NavMode.query.get(data["id"])

    for i in curNavMode.nodes:
        curNavMode.nodes.remove(i)
    
    for i in curNavMode.edges:
        curNavMode.edges.remove(i)
    
    db.session.delete(curNavMode)

    db.session.commit()

    return jsonify({"message":"Navigation Mode deleted!"}),200




@navMode_bp.route("/setstatus", methods=["PATCH"])
def SetNavModeStatus():
    if request.data == None:
        return jsonify({"message": "Bad Request"}), 400
    
    data = json.loads(request.data)
    print(data)
        
    if data["featureType"] == None or data["value"] == None or data["navModeId"] == None or data["id"] == None: 
        return jsonify({"message": "Bad Request"}), 400
    print(data["featureType"],data["navModeId"])
        
    if data["value"]:
        if not db.session.query(db.exists().where(and_(NavModeAssosication.feature ==data["id"] ,NavModeAssosication.navMode ==data["navModeId"]))).scalar():
            if data["value"] is True:
                try:
                    db.session.add(NavModeAssosication(navMode=data["navModeId"], feature=data["id"], typeOf=data["featureType"]))
                    db.session.commit()
                except IntegrityError:
                    db.session.rollback()  # treat as no-op
    else:
        if db.session.query(db.exists().where(and_(NavModeAssosication.feature ==data["id"] ,NavModeAssosication.navMode ==data["navModeId"]))).scalar():
            existingAssosication = NavModeAssosication.query.filter(NavModeAssosication.feature ==data["id"],NavModeAssosication.navMode ==data["navModeId"]).first()
            db.session.delete(existingAssosication)

            db.session.commit()
     
    return jsonify({"message": "Feature updated successfully."}), 200



@navMode_bp.route("/all", methods=["GET"])
def MapFeatureGetAllNavMode():
    navModeId = request.args.get("navModeId")

    
    edges = []
    nodes =[]

    for assosication in NavModeAssosication.query.filter(NavModeAssosication.navMode ==navModeId).all():

        if assosication.typeOf == "Node":
            curNode = Nodes.query.get(assosication.feature)
            nodes.append({"id":curNode.id,"lng":curNode.lng,"lat":curNode.lat})
        if assosication.typeOf == "Edge":
            curEdge = Edges.query.get(assosication.feature)
            edges.append({"key":curEdge.id,"from":curEdge.eFrom,"to":curEdge.eTo})

    return jsonify({"edges": edges,"nodes":nodes}), 200


@navMode_bp.route("/allids", methods=["GET"])
def MapFeatureGetAllNavModeIds():
    navModeId = request.args.get("navModeId")

    
    edges = []
    nodes =[]

    for assosication in NavModeAssosication.query.filter(NavModeAssosication.navMode ==navModeId).all():

        if assosication.typeOf == "Node":
            nodes.append(assosication.feature)
        if assosication.typeOf == "Edge":
            edges.append(assosication.feature)

    return jsonify({"edges": edges,"nodes":nodes}), 200



