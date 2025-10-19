from flask import Blueprint, request, jsonify
from maps.models.map import *
from maps import db

root_bp = Blueprint("root_bp", __name__)
navigation_bp = Blueprint("navigation_bp", __name__)


"""
Heatlth check to test connection.
"""
@root_bp.route("/", methods=["GET"])
def ping():
    return jsonify({"message": "Connection Healthy!"}), 200



