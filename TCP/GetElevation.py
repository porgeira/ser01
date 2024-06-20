# Script para devolver la elevación de un punto. Uso de la API gratuita Open Elevation

import requests
import pandas as pd

def get_elevation(lat, long):
    query = ('https://api.open-elevation.com/api/v1/lookup'
             f'?locations={lat},{long}')
    r = requests.get(query).json() 

    elevation = pd.json_normalize(r, 'results')['elevation'].values[0]
    return elevation

