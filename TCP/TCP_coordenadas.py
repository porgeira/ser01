def TCP_coordenadas(vehicle):

    import pandas as pd
    from dronekit import LocationGlobal, connect, VehicleMode
    from time import sleep, time
    import numpy as np 
    from datetime import datetime
    from GetElevation import get_elevation


    # Definición de listas
    GPS = [] # Numero de GPS activos
    loc_global_frame = [] # Latitud y longitud en el WGS84; altitud por encima del MSL
    loc_local_frame = [] # En un sistema NED; origen en el EKF
    loc_global_relative_frame = [] # Latitud y longitud en el WGS84; altitud por encima de home
    tiempo = [] # Fecha y hora
    actitud = [] # Actitud en pith, yaw, roll (cabeceo, guiñada, alabeo)
    elevacion = [] # Metros sobre el terreno
    
    # Valores
    GPS.append(vehicle.gps_0)
    loc_global_frame.append(vehicle.location.global_frame)
    loc_local_frame.append(vehicle.location.local_frame)
    loc_global_relative_frame.append(vehicle.location.global_relative_frame)
    tiempo.append(datetime.now())
    actitud.append(vehicle.attitude)
    elevacion_terreno = get_elevation(vehicle.location.global_frame.lat, vehicle.location.global_frame.lon)
    elevacion.append(vehicle.location.global_frame.alt - elevacion_terreno)
    
    # Empaquetamiento como un Dataframe de pandas
    df = pd.DataFrame(list(zip(tiempo, GPS, loc_global_frame, loc_global_relative_frame, loc_local_frame,actitud, elevacion)),
    columns=["Tiempo", "GPS", "Localización Sistema Global", "Localización Sistema Global Relativo a Home", "Localización Sistema Local","Actitud","Elevacion"],dtype="string")

    return df
