from flask import Blueprint, request, jsonify
from app.models.navigation import *
from app import db

user_bp = Blueprint("user_bp", __name__)

@user_bp.route("/", methods=["GET"])
def ping():
    # users = User.query.all()
    # return jsonify([{"id": u.id, "username": u.username, "email": u.email} for u in users])
    pass

@user_bp.route("/", methods=["POST"])
def create_user():
    # data = request.get_json()
    # new_user = User(username=data["username"], email=data["email"])
    # db.session.add(new_user)
    # db.session.commit()
    return jsonify({"message": "User created successfully"}), 201
