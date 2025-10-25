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




@navigation_bp.route("/routeto", methods=["GET"])
def routeTo():

    buildingID = request.args.get("buildingid") 

    userLat = request.args.get("lat") 
    userLng = request.args.get("lng") 
    print(buildingID,userLat,userLng)
    # node, d_m = nearest_node(db.session, userLat, userLng)

    # print(node,d_m)

    return jsonify({"message": "Connection Healthy!"}), 200

