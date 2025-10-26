from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from config import Config
from sqlalchemy import event
import math



app = Flask(__name__)
with app.app_context():

    db = SQLAlchemy()
    migrate = Migrate()
    CORS(app)

    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)

    @event.listens_for(db.engine, "connect")
    def register_sqlite_math(dbapi_conn, _):
        # SQLite UDFs so we can use them in SQL
        dbapi_conn.create_function("radians", 1, math.radians)
        dbapi_conn.create_function("sin", 1, math.sin)
        dbapi_conn.create_function("cos", 1, math.cos)
        dbapi_conn.create_function("atan2", 2, math.atan2)
        dbapi_conn.create_function("sqrt", 1, math.sqrt)
        dbapi_conn.create_function("min", 2, min)   # handy sometimes
        dbapi_conn.create_function("max", 2, max)


    from maps.routes.navigation import root_bp
    app.register_blueprint(root_bp, url_prefix="/")

    from maps.routes.map import map_bp
    app.register_blueprint(map_bp, url_prefix="/map")
    
    from maps.routes.buildingGroup import building_bp
    app.register_blueprint(building_bp, url_prefix="/building")

    from maps.routes.navigation import navigation_bp
    app.register_blueprint(navigation_bp, url_prefix="/navigation")
    
    from maps.routes.navMode import navMode_bp
    app.register_blueprint(navMode_bp, url_prefix="/navmode")
