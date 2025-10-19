from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from config import Config




app = Flask(__name__)
with app.app_context():

    db = SQLAlchemy()
    migrate = Migrate()
    CORS(app)

    app.config.from_object(Config)

    db.init_app(app)
    migrate.init_app(app, db)


    from maps.routes.navigation import root_bp
    app.register_blueprint(root_bp, url_prefix="/")

    from maps.routes.map import map_bp
    app.register_blueprint(map_bp, url_prefix="/map")

    from maps.routes.navigation import navigation_bp
    app.register_blueprint(navigation_bp, url_prefix="/navigation")

