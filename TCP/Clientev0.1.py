#
# Ejemplo de cliente
#

import pandas as pd
import numpy as np
import json
from socket import socket,AF_INET, SOCK_STREAM # AF_INET==> IP v04

S = socket(AF_INET,SOCK_STREAM) # Objeto socket 

S.connect(('localhost',20064))

while True:
	data = S.recv(8192)
	if data:
		
		data = data.decode("utf-8")
		info = json.loads(data)

		df = pd.json_normalize(info)

		print(df)
