from maps import db
import geojson
import json
import os 

class Nodes(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(80), unique=True, nullable=False)
    lng = db.Column(db.Integer, nullable=False)
    lat = db.Column(db.Integer, nullable=False)
    featureGeojson = db.Column(db.Text, unique=True, nullable=False)

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





class Buildings(db.Model):

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), unique=True, nullable=False)






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
#                         featureGeojson = json.dumps(geojson_data.features[i])
#                     )
#                     db.session.add(node)
        

            
#             if geojson_data.features[i].geometry.type == "LineString":
#                 # print(geojson_data.features[i])
#                 cur = geojson_data.features[i].properties
#                 if not db.session.query(db.exists().where(Edges.key == cur["key"])).scalar():
#                     edge = Edges(
#                         key = cur["key"],
#                         eFrom = cur["from"],
#                         eTo = cur["to"],
#                         featureGeojson = json.dumps(geojson_data.features[i])
#                     )
    
#                     db.session.add(edge)
#     db.session.commit()


