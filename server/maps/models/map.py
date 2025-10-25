from maps import db
import geojson
import json
import os 
from sqlalchemy.orm import relationship, Mapped, mapped_column
from typing import List
from sqlalchemy import ForeignKey

# act as auxiliary table for user and group table
# adjacency = db.Table(
#     "adjacencyList",
#     db.Column("Nodes_id", db.Integer, db.ForeignKey("nodes.id")),
#     db.Column("Adjacent_id", db.Integer, db.ForeignKey("nodes.id")),
# )

adjacency = db.Table(
        'adjacency',
        db.metadata,
        db.Column('from_id', db.Integer, ForeignKey('nodes.id'), primary_key=True),
        db.Column('to_id', db.Integer, ForeignKey('nodes.id'), primary_key=True)
    )

class Nodes(db.Model):
    __tablename__ = 'nodes' 
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(80), unique=True, nullable=False)
    lng = db.Column(db.Integer, nullable=False)
    lat = db.Column(db.Integer, nullable=False)
    featureGeojson = db.Column(db.Text, unique=True, nullable=False)
    ada = db.Column(db.Boolean, default =False)
    building_id: Mapped[int|None] = mapped_column(ForeignKey('buildings.id'),nullable=True)
    building: Mapped["Buildings"] = relationship(back_populates="nodes")
    # adjecency_id:Mapped[int|None] = mapped_column(ForeignKey('nodes.id'),nullable=True)
    # adjacencyList: Mapped["Nodes"] = relationship(back_populates="adjacencyList")
    
    adjacencyList = db.relationship(
            'Nodes', secondary=adjacency,
            primaryjoin=(adjacency.c.from_id == id),
            secondaryjoin=(adjacency.c.to_id == id),
            backref=db.backref('adjacency', lazy='dynamic'),
            lazy='dynamic'
        ) 

"""
    - The edges are bidirectional so the "efrom" and "eto" is just convention to keep it aligned with the client code. 
    - When the adjacency queries will be made a node will be checked if it is on either end of an edge and the respective      other side would be the node to be included in the adjacency list of the form node making the query. This might change if we add many to many relation to the nodes to form the adjacency list.
"""
class Edges(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(80), unique=True, nullable=False)
    eFrom = db.Column(db.String(80), nullable=False)
    eTo = db.Column(db.String(80), nullable=False)
    featureGeojson = db.Column(db.Text(), unique=True, nullable=False)
    ada = db.Column(db.Boolean, default =False)


class Buildings(db.Model):

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)

    nodes: Mapped[List["Nodes"]] = relationship(back_populates="building")





# db.create_all()
# dir_path = os.path.dirname(os.path.realpath(__file__))
# with open(dir_path+'/../../Dev/phaseOne.geojson', 'r') as file:
#     geojson_data = geojson.load(file)

#     for i in range(len(geojson_data.features)):
#             if geojson_data.features[i].geometry.type == "Point":
#                 # print(geojson_data.features[i])
#                 if not db.session.query(db.exists().where(Nodes.key == geojson_data.features[i].id)).scalar():
#                     node = Nodes(
#                         key = geojson_data.features[i].id,
#                         lng = geojson_data.features[i].geometry.coordinates[0],
#                         lat = geojson_data.features[i].geometry.coordinates[1],
#                         featureGeojson = json.dumps(geojson_data.features[i]),
#                         building_id=None,
#                         ada = False, 
#                     )
#                     db.session.add(node)
#     # db.session.commit()   
#     # for i in range(len(geojson_data.features)):
            
#             if geojson_data.features[i].geometry.type == "LineString":
#                 # print(geojson_data.features[i])
#                 cur = geojson_data.features[i].properties
#                 if not db.session.query(db.exists().where(Edges.key == cur["key"])).scalar():
#                     nodeFrom = Nodes.query.filter_by(key=cur["from"] ).first()
#                     nodeTo = Nodes.query.filter_by(key=cur["to"] ).first()
#                     nodeFrom.adjacencyList.append(nodeTo)
#                     nodeTo.adjacencyList.append(nodeFrom)



#                     edge = Edges(
#                         key = cur["key"],
#                         eFrom = cur["from"],
#                         eTo = cur["to"],
#                         featureGeojson = json.dumps(geojson_data.features[i])
#                     )
    
#                     db.session.add(edge)
#     db.session.commit()


