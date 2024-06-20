import pandas as pd
from dronekit import LocationGlobal, connect, VehicleMode
from time import sleep, time
import numpy as np 
from datetime import datetime

frecuencia_refresco = 1
stop = False 

vehicle = connect("127.0.0.1:14550", wait_ready=True)


GPS = []
loc_global_frame = [] # Latitud y longitud en el WGS84; altitud por encima del MSL
loc_local_frame = [] # En un sistema NED; origen en el EKF
loc_global_relative_frame = [] # Latitud y longitud en el WGS84; altitud por encima de home
tiempo = []

#np.zeros(shape=(1,4))
tiempo_guardado_previo = time()
tiempo_inicio = time()
while True:
    
    if time() - tiempo_guardado_previo > 1 / frecuencia_refresco:
        GPS.append(vehicle.gps_0)
        loc_global_frame.append(vehicle.location.global_frame)
        loc_local_frame.append(vehicle.location.local_frame)
        loc_global_relative_frame.append(vehicle.location.global_relative_frame)
        tiempo.append(datetime.now())
        tiempo_guardado_previo = time()

    if stop:
        break

    if time() - tiempo_inicio > 60:
        break

df = pd.DataFrame(list(zip(tiempo, GPS, loc_global_frame, loc_global_relative_frame, loc_local_frame)),
columns=['Tiempo', 'GPS', 'Localización Sistema Global', 'Localización Sistema Global Relativo a Home', 'Localización Sistema Local'])

print(df)