from socketserver import BaseRequestHandler, TCPServer
from time import time
from TCP_coordenadas import TCP_coordenadas
from dronekit import connect
import pandas as pd
import json

tiempo_inicio = time()
frecuencia_refresco = 1

class RequestHandler (BaseRequestHandler):

    def handle(self):
        print("Se ha recibido una conexion desde {}".format(self.client_address))
        tiempo_guardado_previo = time()
        tiempo_inicio = time()
        vehicle = connect("127.0.0.1:14551", wait_ready=True)

        while True:
            pt,tiempo_guardado_previo = data(tiempo_guardado_previo, frecuencia_refresco, vehicle)

            if not pt.empty:
            	rec = pt.to_json(orient = 'records')
            	message = json.dumps(json.JSONDecoder().decode(rec))
            	print('Mesage:')
            	print(message)
   
            	self.request.sendall(bytes(message,encoding="utf-8"))
            
            if time() - tiempo_inicio > 120:
                print('Se ha completado la recepción de datos')
                break
        


        #return super().handle()



def data(tiempo_guardado_previo, frecuencia_refresco, vehicle):

    if time() - tiempo_guardado_previo > 1 / frecuencia_refresco:
        pt = pd.DataFrame(TCP_coordenadas(vehicle))
        tiempo_guardado_previo = time()
    else:
        pt = pd.DataFrame()

    return pt,tiempo_guardado_previo

    

if __name__ == '__main__':
    server = TCPServer(('',20064), RequestHandler)
    print('El servidor se ha iniciado')
    server.serve_forever()
