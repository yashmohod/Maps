from maps import db
import geojson
import json
import os 
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import List
from sqlalchemy import ForeignKey

# act as auxiliary table for user and group table

class Nodes(db.Model):
    __tablename__ = 'nodes' 
    
    id = db.Column(db.String(255),primary_key=True, unique=True, nullable=False)
    lng = db.Column(db.Integer, nullable=False)
    lat = db.Column(db.Integer, nullable=False)
   
    building_id: Mapped[int|None] = mapped_column(ForeignKey('buildings.id'),nullable=True)
    building: Mapped["Buildings"] = relationship(back_populates="nodes")

class Edges(db.Model):
    __tablename__ = 'edges'

    id = db.Column(db.String(255),primary_key=True, unique=True, nullable=False)
    eFrom = db.Column(db.String(80), nullable=False)
    eTo = db.Column(db.String(80), nullable=False)

class NavMode(db.Model):
    __tablename__ = 'navmode' 
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)

class NavModeAssosication(db.Model):

    id = db.Column(db.Integer, primary_key=True)

    navMode = db.Column(db.Integer,nullable=False )
    feature = db.Column(db.String(225),nullable=False)
    typeOf = db.Column(db.String(80), nullable=False)
    __table_args__ = (
        db.UniqueConstraint('navMode', 'feature', 'typeOf',
                            name='uq_navmode_feature_type'),
    )
class Buildings(db.Model):

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)
    nodes: Mapped[List["Nodes"]] = relationship(back_populates="building")





db.create_all()

modes = ["Pedestrian","Accessible","Vehicular"]
for i in modes: 
    if not db.session.query(db.exists().where(NavMode.name == i)).scalar():
        mode = NavMode(name=i)
        db.session.add(mode)

print("got here")

dir_path = os.path.dirname(os.path.realpath(__file__))
with open(dir_path+'/../../Dev/phaseOne.geojson', 'r') as file:
    geojson_data = geojson.load(file)
    curNavMode = NavMode.query.filter_by(name ="Pedestrian" ).first()
    for i in range(len(geojson_data.features)):
            if geojson_data.features[i].geometry.type == "Point":
                # print(geojson_data.features[i])
                if not db.session.query(db.exists().where(Nodes.id == geojson_data.features[i].id)).scalar():
                    node = Nodes(
                        id = geojson_data.features[i].id,
                        lng = geojson_data.features[i].geometry.coordinates[0],
                        lat = geojson_data.features[i].geometry.coordinates[1],
                    )
                    db.session.add(node) 
                    # curNavMode.nodes.add(node)

            if geojson_data.features[i].geometry.type == "LineString":
                # print(geojson_data.features[i])
                cur = geojson_data.features[i].properties
                if not db.session.query(db.exists().where(Edges.id == cur["key"])).scalar():

                    edge = Edges(
                        id = cur["key"],
                        eFrom = cur["from"],
                        eTo = cur["to"], 
                    )
    
                    db.session.add(edge)

                    # curNavMode.edges.add(edge)
db.session.commit()


