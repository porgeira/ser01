# cambio en mi clon creado desde el fork etc etc
# pequeño cambio
# ahora un cambio en local

# Connect to the Vehicle (in this case a simulator running the same computer)
from dronekit import *
from time import sleep
import dronekit_sitl

vehicle = connect('127.0.0.1:14550', wait_ready=True)

def armado_y_despegue(aTargetAltitude):
    """
    Armado del vehículo y ascenso vertical a altitud especificada
    """

    print ("Chequeos previos")
    # Hasta que no se acaban no se prosigue
    while not vehicle.is_armable:
        print (" Esperando a que los chequeos terminen...")
        sleep(1)

    print ("Armado del vehículo")
    # Cambio del modo del autopiloto
    vehicle.mode    = VehicleMode("GUIDED")
    vehicle.armed   = True

    # Hasta que no acaba el armado no se prosigue 
    while not vehicle.armed:
        print (" Esperando a que se arme el vehículo...")
        sleep(1)

    print ("Inicio del despegue")
    vehicle.simple_takeoff(aTargetAltitude)

    # Espera a que se alcance la altitud deseada
    while True:
        print (" Altitud: ".format(vehicle.location.global_relative_frame.alt))
        # Fin de la función cuando se alcanza
        if vehicle.location.global_relative_frame.alt>=aTargetAltitude*0.95:
            print ("Se ha alcanzado la altitud")
            break
        sleep(1)

def aterrizaje():
    print ("Iniciando despegue")
    vehicle.mode = VehicleMode("LAND")

    while True:
        print (" Altitud: ".format(vehicle.location.global_relative_frame.alt))
        # Fin de la función cuando se alcanza
        if vehicle.location.global_relative_frame.alt<=0.2:
            break
        sleep(1)

def fin_programa():
    vehicle.close()

def goto(dNorth, dEast, gotoFunction=vehicle.simple_goto):
    """
    Obtenida de Dronekit:
    https://dronekit-python.readthedocs.io/en/latest/examples/guided-set-speed-yaw-demo.html

    Mueve el vehículo a una posición dNorth metros y dEast metros Este de la posición actual

    """
    
    currentLocation = vehicle.location.global_relative_frame
    targetLocation = get_location_metres(currentLocation, dNorth, dEast)
    targetDistance = get_distance_metres(currentLocation, targetLocation)
    gotoFunction(targetLocation)
    
    #print "DEBUG: targetLocation: %s" % targetLocation
    #print "DEBUG: targetLocation: %s" % targetDistance

    while vehicle.mode.name=="GUIDED": #Stop action if we are no longer in guided mode.
        #print "DEBUG: mode: %s" % vehicle.mode.name
        remainingDistance=get_distance_metres(vehicle.location.global_relative_frame, targetLocation)
        print("Distance to target: ", remainingDistance)
        if remainingDistance<=targetDistance*0.01: #Just below target, in case of undershoot.
            print("Reached target")
            break
        sleep(2)

def goto_position_target_global_int(aLocation):
    """
    Obtenida de Dronekit:
    https://dronekit-python.readthedocs.io/en/latest/examples/guided-set-speed-yaw-demo.html

    Mueve el vehículo a una localización especificada por el objeto aLocation. El método 
    vehicle.simple_goto hace lo mismo cuando el sistema es: MAV_FRAME_GLOBAL_RELATIVE_ALT_INT

    Otros sistemas:
    - MAV_FRAME_GLOBAL_INT La altura son metros por encima del mar
    - MAV_FRAME_GLOBAL_RELATIVE_ALT La altitud son metros por encima de home
    - MAV_FRAME_GLOBAL_RELATIVE_ALT_INT La altitud son metros por encima de home (posición escalada)
    - MAV_FRAME_GLOBAL_RELATIVE_TERRAIN_ALT La altitud son metros por encima de el terreno
    - MAV_FRAME_GLOBAL_RELATIVE_TERRAIN_ALT_INT La altitud son metros por encima de el terreno (posición escalada)

    Más info:
    https://ardupilot.org/dev/docs/copter-commands-in-guided-mode.html#copter-commands-in-guided-mode-set-position-target-global-int
    https://mavlink.io/en/messages/common.html


    """
    msg = vehicle.message_factory.set_position_target_global_int_encode(
        0,       # time_boot_ms (not used)
        0, 0,    # target system, target component
        mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT_INT, # frame
        0b0000111111111000, # type_mask (only speeds enabled)
        aLocation.lat*1e7, # lat_int - X Position in WGS84 frame in 1e7 * meters
        aLocation.lon*1e7, # lon_int - Y Position in WGS84 frame in 1e7 * meters
        aLocation.alt, # alt - Altitude in meters in AMSL altitude, not WGS84 if absolute or relative, above terrain if GLOBAL_TERRAIN_ALT_INT
        0, # X velocity in NED frame in m/s
        0, # Y velocity in NED frame in m/s
        0, # Z velocity in NED frame in m/s
        0, 0, 0, # afx, afy, afz acceleration (not supported yet, ignored in GCS_Mavlink)
        0, 0)    # yaw, yaw_rate (not supported yet, ignored in GCS_Mavlink) 
    # send command to vehicle
    vehicle.send_mavlink(msg)

def goto_position_target_local_ned(north, east, down):
    """	
    Obtenida de Dronekit:
    https://dronekit-python.readthedocs.io/en/latest/examples/guided-set-speed-yaw-demo.html

    Mueve el vehículo a una posición especificada en el sistema de coordenadas NED. El origen 
    del sistema es:
    - el momento en el cual el dron recibió una buena estimación en la posición y con las 
      velocidades en NED MAV_FRAME_LOCAL_NED  
    - La posición actual MAV_FRAME_LOCAL_OFFSET_NED
    - La posición actual, teniendo en cuenta el heading MAV_FRAME_BODY_OFFSET_NED 
    - El momento en el cual el dron recibió una buena estimación en la posición y con las 
      velocidades relativas al heading MAV_FRAME_BODY_NED

    Hay que tener en cuenta que el eje z es hacia abajo positivo y hacia arriba negativo
    
    Más info:
    http://dev.ardupilot.com/wiki/copter-commands-in-guided-mode/#set_position_target_local_ned
    https://ardupilot.org/dev/docs/copter-commands-in-guided-mode.html#copter-commands-in-guided-mode-set-position-target-global-int
    """
    msg = vehicle.message_factory.set_position_target_local_ned_encode(
        0,       # time_boot_ms (not used)
        0, 0,    # target system, target component
        mavutil.mavlink.MAV_FRAME_LOCAL_NED, # frame
        0b0000111111111000, # type_mask (only positions enabled)
        north, east, down, # x, y, z positions (or North, East, Down in the MAV_FRAME_BODY_NED frame
        0, 0, 0, # x, y, z velocity in m/s  (not used)
        0, 0, 0, # x, y, z acceleration (not supported yet, ignored in GCS_Mavlink)
        0, 0)    # yaw, yaw_rate (not supported yet, ignored in GCS_Mavlink) 
    # send command to vehicle
    vehicle.send_mavlink(msg)

def send_ned_velocity(velocity_x, velocity_y, velocity_z, duration):
    """
    Obtenida de Dronekit:
    https://dronekit-python.readthedocs.io/en/latest/examples/guided-set-speed-yaw-demo.html

    Mueve el vehículo en la dirección especificada en base a el vector velocidad.
    El sistema es: 
    - El momento en el cual el dron recibió una buena estimación en la posición y con las 
      velocidades en NED MAV_FRAME_LOCAL_NED  
    - La posición actual MAV_FRAME_LOCAL_OFFSET_NED
    - La posición actual, teniendo en cuenta el heading MAV_FRAME_BODY_OFFSET_NED 
    - El momento en el cual el dron recibió una buena estimación en la posición y con las 
      velocidades relativas al heading MAV_FRAME_BODY_NED
    """
    msg = vehicle.message_factory.set_position_target_local_ned_encode(
        0,       # time_boot_ms (not used)
        0, 0,    # target system, target component
        mavutil.mavlink.MAV_FRAME_LOCAL_NED, # frame
        0b0000111111000111, # type_mask (only speeds enabled)
        0, 0, 0, # x, y, z positions (not used)
        velocity_x, velocity_y, velocity_z, # x, y, z velocity in m/s
        0, 0, 0, # x, y, z acceleration (not supported yet, ignored in GCS_Mavlink)
        0, 0)    # yaw, yaw_rate (not supported yet, ignored in GCS_Mavlink) 

    # send command to vehicle on 1 Hz cycle
    for x in range(0,duration):
        vehicle.send_mavlink(msg)
        time.sleep(1)    

def send_global_velocity(velocity_x, velocity_y, velocity_z, duration):
    """
    Obtenida de Dronekit:
    https://dronekit-python.readthedocs.io/en/latest/examples/guided-set-speed-yaw-demo.html

    Mueve el vehículo en la dirección especificada en base a el vector velocidad.
    Hace lo mismo que la función send_ned_velocity
    """
    msg = vehicle.message_factory.set_position_target_global_int_encode(
        0,       # time_boot_ms (not used)
        0, 0,    # target system, target component
        mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT_INT, # frame
        0b0000111111000111, # type_mask (only speeds enabled)
        0, # lat_int - X Position in WGS84 frame in 1e7 * meters
        0, # lon_int - Y Position in WGS84 frame in 1e7 * meters
        0, # alt - Altitude in meters in AMSL altitude(not WGS84 if absolute or relative)
        # altitude above terrain if GLOBAL_TERRAIN_ALT_INT
        velocity_x, # X velocity in NED frame in m/s
        velocity_y, # Y velocity in NED frame in m/s
        velocity_z, # Z velocity in NED frame in m/s
        0, 0, 0, # afx, afy, afz acceleration (not supported yet, ignored in GCS_Mavlink)
        0, 0)    # yaw, yaw_rate (not supported yet, ignored in GCS_Mavlink)

    # send command to vehicle on 1 Hz cycle
    for x in range(0,duration):
        vehicle.send_mavlink(msg)
        time.sleep(1)

    
def condition_yaw(heading, relative=False):
    """
    Obtenida de Dronekit:
    https://dronekit-python.readthedocs.io/en/latest/examples/guided-set-speed-yaw-demo.html
    
    Envío del MAV_CMD_CONDITION_YAW para cambiar la actitud del vehículo

    Este método aplica una guiñada absoluta. Si se desea que esta sea relativa a la guiñada actual, entonces
    se tiene que cambiar elparámetro relative a True

    Aviso:
    By default the yaw of the vehicle will follow the direction of travel. After setting 
    the yaw using this function there is no way to return to the default yaw "follow direction 
    of travel" behaviour (https://github.com/diydrones/ardupilot/issues/2427)

    Más información:
    http://copter.ardupilot.com/wiki/common-mavlink-mission-command-messages-mav_cmd/#mav_cmd_condition_yaw
    """
    if relative:
        is_relative = 1 #yaw relative to direction of travel
    else:
        is_relative = 0 #yaw is an absolute angle
    # create the CONDITION_YAW command using command_long_encode()
    msg = vehicle.message_factory.command_long_encode(
        0, 0,    # target system, target component
        mavutil.mavlink.MAV_CMD_CONDITION_YAW, #command
        0, #confirmation
        heading,    # param 1, yaw in degrees
        0,          # param 2, yaw speed deg/s
        1,          # param 3, direction -1 ccw, 1 cw
        is_relative, # param 4, relative offset 1, absolute angle 0
        0, 0, 0)    # param 5 ~ 7 not used
    # send command to vehicle
    vehicle.send_mavlink(msg)


def get_location_metres(original_location, dNorth, dEast):
    """
    Obtenida de Dronekit:
    https://dronekit-python.readthedocs.io/en/latest/examples/guided-set-speed-yaw-demo.html
    Más info:
    http://gis.stackexchange.com/questions/2951/algorithm-for-offsetting-a-latitude-longitude-by-some-amount-of-meters

    original_location: objeto con latitud y longitud
    dNorth: distancia a mover la posición original hacia el norte (NED)
    dEast: distancia a mover la posición original hacia el este (NED)

    Solo tiene precisión en bajas distancias (<1km); no usa el WGS84
    Tampoco tiene en cuenta la altitud

    targetlocation: objeto con latitud y longitud
    
    """
    earth_radius = 6378137.0 #Radius of "spherical" earth
    #Coordinate offsets in radians
    dLat = dNorth/earth_radius
    dLon = dEast/(earth_radius*math.cos(math.pi*original_location.lat/180))

    #New position in decimal degrees
    newlat = original_location.lat + (dLat * 180/math.pi)
    newlon = original_location.lon + (dLon * 180/math.pi)
    if type(original_location) is LocationGlobal:
        targetlocation=LocationGlobal(newlat, newlon,original_location.alt)
    elif type(original_location) is LocationGlobalRelative:
        targetlocation=LocationGlobalRelative(newlat, newlon,original_location.alt)
    else:
        raise Exception("Invalid Location object passed")
        
    return targetlocation


def get_distance_metres(aLocation1, aLocation2):
    """
    Obtenida de ardupilot y modificada por dronekit:
    https://github.com/diydrones/ardupilot/blob/master/Tools/autotest/common.py

    Calcula la distancia sobre el terreno entre dos puntos especificados en geográficas

    aLocation1, aLocation2: objeto con latitud y longitud
    """
    dlat = aLocation2.lat - aLocation1.lat
    dlong = aLocation2.lon - aLocation1.lon
    return math.sqrt((dlat*dlat) + (dlong*dlong)) * 1.113195e5
