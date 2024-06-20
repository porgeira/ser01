/**
 ################################### Capas Meteogalicia ###################################
 */

// Tiempo ahora
function timeNow() {
  return new Date(Date.now());
}

// Fecha en formato aaaammdd, usada por MeteoGalicia
function dateaaaammdd(){
  dateMeteoGalicia = timeNow().getUTCFullYear().toString()
  if (timeNow().getUTCMonth()<=8){
    dateMeteoGalicia = dateMeteoGalicia + "0" + (timeNow().getUTCMonth()+1).toString()
  }
  else{
    dateMeteoGalicia = dateMeteoGalicia + (timeNow().getUTCMonth()+1).toString()
  }
  if (timeNow().getUTCDate()<=9){
    dateMeteoGalicia = dateMeteoGalicia + "0" + timeNow().getUTCDate().toString()
  }
  else{
    dateMeteoGalicia = dateMeteoGalicia + (timeNow().getUTCDate()).toString()
  }
  return dateMeteoGalicia;
};

let startDate = new Date(Date.UTC(timeNow().getUTCFullYear(), timeNow().getUTCMonth(), timeNow().getUTCDate(), 24));
startDate.setDate(startDate.getDate() - 1);
var RepresentationTime = new Date(startDate);
var FinalDate = new Date(startDate.setDate(startDate.getDate() + 3));
startDate.setDate(startDate.getDate() - 3); // Para que la start date sea la inicial
var dateMeteoGalicia = dateaaaammdd();

function transform(extent) {
  return ol.proj.transformExtent(extent, 'EPSG:4326', 'EPSG:3857');
}

// Url del WRF 2d de 1.3km de las Rías Bajas actualizado a tiempo real
var urlMeteoGaliciaWRF_baixas = "http://mandeo.meteogalicia.gal/thredds/wms/wrf_1km_baixas/fmrc/files/" + dateMeteoGalicia  + "/wrf_arw_det1km_history_d05_" + 
dateMeteoGalicia + "_0000.nc4";
var urlMeteoGaliciaWRF_4KM = "http://mandeo.meteogalicia.gal/thredds/wms/wrf_2d_04km/fmrc/files/" + dateMeteoGalicia  + "/wrf_arw_det_history_d03_" + 
dateMeteoGalicia + "_0000.nc4";

//var Poligon_extent_4km = new ol.geom.Polygon([[
//  [-11.135,45.055],[-5.2375,44.943056],[-5.777222,40.565],[-8.004444,40.698333],
//  [-8.220833,41.711667],[-8.104444,42.997222],[-9.866944,43.063611],[-11.131944,43.106667],
//  [-11.135,45.055]]]);

//Poligon_extent_4km.transform('EPSG:4326', 'EPSG:3857');

/**
 ################################### Opciones animación ###################################
 */

const frameRate = 0.5; // frames por segundo
let animationId = null;

/**
 ################################### Coordenadas al clickar ###################################
 */

 const container = document.getElementById('popup');
 const content = document.getElementById('popup-content');
 const closer = document.getElementById('popup-closer');
 
 /**
  * Create an overlay to anchor the popup to the map.
  */
 const overlay = new ol.Overlay({
   element: container,
   autoPan: true,
   autoPanAnimation: {
     duration: 250,
   },
 });
 
 closer.onclick = function () {
   overlay.setPosition(undefined);
   closer.blur();
   return false;
 };

/**
 ################################### Opciones Mapa ###################################
 */

// Parámetros generales de la proyección
const projection = ol.proj.get('EPSG:3857'); // Proyección usada (https://epsg.io/3857) (Pseudo-Mercator) Usada por Google Maps y similares
const projectionExtent = projection.getExtent();
const size = ol.extent.getWidth(projectionExtent) / 256;
const resolutions = new Array(14);
const matrixIds = new Array(14);

// Especificación de la resolución y del id de la matriz para los WMTS
for (let z = 0; z < 17; ++z) {
  resolutions[z] = size / Math.pow(2, z); // Resoluciones posibles para un zoom
  matrixIds[z] = z; // Id de la matriz para un zoom concreto
}

/**
 ################################### Polígono ###################################
 */

const styles = [
  /* Hay dos estilos diferentes par:
   *  - El primer estilo es para los polígonos
   *  - El segundo es el vértices de los polígonos
   *    Los vértices se devuelven como ol.geom.MultiPoints
   */
  new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: 'blue',
      width: 3,
    }),
    fill: new ol.style.Fill({
      color: 'rgba(0, 0, 255, 0.1)',
    }),
  }),
  new ol.style.Style({
    image: new ol.style.Circle({
      radius: 5,
      fill: new ol.style.Fill({
        color: 'orange',
      }),
    }),
      geometry: function (feature) {
          // Devuelve las coordenadas del primer vértice del polígono
          const coordinates = feature.getGeometry().getCoordinates()[0];
          return new ol.geom.MultiPoint(coordinates);
      },
  }),
];

// Coordenadas de la representación en forma de polígono 
var coordinates_drone = new ol.geom.Polygon([[
  ol.proj.fromLonLat([-8.789191, 42.283433]), ol.proj.fromLonLat([-8.779664, 42.285466]),
  ol.proj.fromLonLat([-8.763184, 42.278160]), ol.proj.fromLonLat([-8.750396, 42.290866]), 
  ol.proj.fromLonLat([-8.789964, 42.293725]), ol.proj.fromLonLat([-8.789191, 42.283433])
]]);

// Objeto tipo feature que tiene el polígono con las coordenadas para que se pueda realizar el grabamiento
var feature_polygon = new ol.Feature({
    name: "Thing",    
  geometry: coordinates_drone
});

// Visión en el inicio. Datos en geográficas (aka EPSG:4326 https://epsg.io/4326)
const view = new ol.View({
  center: ol.proj.transform([-8.789191, 42.283433], 'EPSG:4326', 'EPSG:3857'),
  //projection: 'EPSG:3857',
    zoom: 12
    //SVGGeometryElement: coordinates_drone;
})
/**
 ################################### Mapa ###################################
 */

// Objeto map 
var map = new ol.Map({
  target: 'map',
  layers: [
    // Grupo de los Mapas Base
    new ol.layer.Group({
      // El título es necesario
      title: 'Mapas Base',
      layers: [
        new ol.layer.Tile({
          title: 'LiDAR',
          visible: false,
            type: 'base',
          //source: new alert("Caption problema")
          source: new ol.source.WMTS({
            attributions:
              ' <a href="https://www.ign.es/web/ign/portal/inicio">©Instituto Geográfico Nacional (IGN)</a>',
            url:
              'https://wmts-mapa-lidar.idee.es/lidar',
            layer: 'EL.GridCoverageDSM', 
            matrixSet: 'GoogleMapsCompatible',
            format: 'image/png',
            style: 'normal',
            tileOptions: { crossOriginKeyword: 'anonymous' },
            projection: projection,
            tileGrid: new ol.tilegrid.WMTS({
              origin: ol.extent.getTopLeft(projectionExtent),
              resolutions: resolutions,
              matrixIds: matrixIds,
            }),

            wrapX: true,
          }),
        }),
        new ol.layer.Tile({
          title: 'RASTER',
          type: 'base',
          visible: false,
          source: new ol.source.WMTS({
            attributions:
              ' <a href="https://www.ign.es/web/ign/portal/inicio">©Instituto Geográfico Nacional (IGN)</a>',
            url:
              'http://www.ign.es/wmts/mapa-raster',
            layer: 'MTN',
            matrixSet: 'GoogleMapsCompatible',
            format: 'image/jpeg',
            style: 'normal',
            crossOrigin: 'anonymous',
            projection: projection,
            tileGrid: new ol.tilegrid.WMTS({
              origin: ol.extent.getTopLeft(projectionExtent),
              resolutions: resolutions,
              matrixIds: matrixIds,
            }),

            wrapX: true,
          }),
        }),
        new ol.layer.Tile({
          title: 'Elevaciones',
          type: 'base',
          visible: false,
          source: new ol.source.WMTS({
            attributions:
              ' <a href="https://www.ign.es/web/ign/portal/inicio">©Instituto Geográfico Nacional (IGN)</a>',
            url:
            ' 	https://servicios.idee.es/wmts/mdt',
            layer: 'Relieve',
            matrixSet: 'GoogleMapsCompatible',
            format: 'image/png',
            style: 'normal',
            crossOrigin: 'anonymous',
            projection: projection,
            tileGrid: new ol.tilegrid.WMTS({
              origin: ol.extent.getTopLeft(projectionExtent),
              resolutions: resolutions,
              matrixIds: matrixIds,
            }),

            wrapX: true,
          }),
        }),
        new ol.layer.Tile({
          title: 'Ocupación Suelo (IGN)',
          type: 'base',
            visible: false,            
          source: new ol.source.WMTS({
            attributions:
              ' <a href="https://www.ign.es/web/ign/portal/inicio">©Instituto Geográfico Nacional (IGN)</a>',
            url:
              'https://servicios.idee.es/wmts/ocupacion-suelo',
            layer: 'LC.LandCoverSurfaces',
            matrixSet: 'GoogleMapsCompatible',
            format: 'image/png',
            style: 'normal',
            crossOrigin: 'anonymous',
            projection: projection,
            tileGrid: new ol.tilegrid.WMTS({
              origin: ol.extent.getTopLeft(projectionExtent),
              resolutions: resolutions,
              matrixIds: matrixIds,
            }),
            wrapX: true,
          }),
        }),
          new ol.layer.Tile({            
          title: 'Ortofotos máxima actualidad del PNOA (IGN)',
          type: 'base',
          visible: false,
          source: new ol.source.WMTS({
            attributions:
              ' <a href="https://www.ign.es/web/ign/portal/inicio">©Instituto Geográfico Nacional (IGN)</a>',
            url:
             'https://www.ign.es/wmts/pnoa-ma',
              layer: 'OI.OrthoimageCoverage',                
            matrixSet: 'GoogleMapsCompatible',
              format: 'image/jpeg',           
            style: 'normal',
            tileOptions: { crossOriginKeyword: 'anonymous' },
            projection: projection,
            tileGrid: new ol.tilegrid.WMTS({
              origin: ol.extent.getTopLeft(projectionExtent),
              resolutions: resolutions,
              matrixIds: matrixIds,
            }),
            wrapX: true,
          }),
        }),
        new ol.layer.Tile({
          title: 'Mapa Base (IGN)',
          type: 'base',
          visible: false,
          source: new ol.source.WMTS({
            attributions:
              ' <a href="https://www.ign.es/web/ign/portal/inicio">©Instituto Geográfico Nacional (IGN)</a>',
            url:
            'https://www.ign.es/wmts/ign-base',
            layer: 'IGNBaseTodo',
            matrixSet: 'GoogleMapsCompatible',
            format: 'image/jpeg',
            style: 'normal',
            crossOrigin: 'anonymous',
            projection: projection,
            tileGrid: new ol.tilegrid.WMTS({
              origin: ol.extent.getTopLeft(projectionExtent),
              resolutions: resolutions,
              matrixIds: matrixIds,
            }),
            wrapX: true,
          }),
        }),

        new ol.layer.Tile({
          title: 'Mapa Base 2020 (Xunta)',
          type: 'base',
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/MapasBase/MapaBase_2020/MapServer/',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
              tileOptions: { crossOriginKeyword: 'anonymous' },
            cacheSize: 100,
            params: { 'FORMAT': 'PNG24', 'SIZE': '400,400' },
            reprojectionErrorThreshold: 2
          })
        }),
        new ol.layer.Tile({
          title: 'Mapa Base V2 (Xunta)',
          type: 'base',
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/MapasBase/MapaBase_V2/MapServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Tile({
          title: 'SIOSE 2014 Ocupación del Suelo',
          type: 'base',
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/CubertaTerrestre/Siose2014/MapServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Tile({
          title: 'Ortofoto PNOA 2020 (Xunta)',
          type: 'base',
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/Raster/PNOA_2020/ImageServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Tile({
          title: 'IFN 2010 Grupo Combustible',
          type: 'base',
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/UsosSolo/IFN_2010_GrupoCombustible/MapServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Tile({
          title: 'IFN 2010 Modelo Combustible',
          type: 'base',
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/UsosSolo/IFN_2010_ModeloCombustible/MapServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Tile({
          title: 'IFN 2010 Especies Arbóreas',
          type: 'base',
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/UsosSolo/IFN_2010_EspeciesArboreas/MapServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Tile({
          title: 'IFN 2010 Cantidad de Combustible',
          type: 'base',
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/UsosSolo/IFN_2010_CantidadeCombustible/MapServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Tile({
          title: 'Aridez Estival (Xunta)',
          type: 'base',
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/IGVS/aridez_estival/MapServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Tile({
          title: 'Radiación Solar (Xunta)',
          type: 'base',
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/IGVS/radiacion_solar/MapServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Image({
          title: 'Unidades Administrativas (Xunta)',
          type: 'base',
          visible: false,
          source: new ol.source.ImageWMS({
            url: 'https://www.ign.es/wms-inspire/unidades-administrativas',
            params: { 'LAYERS': 'AU.AdministrativeUnit' },
            crossOrigin: 'anonymous',
            ratio: 1,
          }),
        }),
        new ol.layer.Tile({
          title: 'ol.source.OSM',
          type: 'base',
          visible: true,
          source: new ol.source.OSM()
        })
      ]
    }),

    // Grupo de las superposiones
    new ol.layer.Group({
      // El título es necesario
      title: 'Superposiciones',
      // Permite colapsar el arbol de capas
      fold: 'open',
      layers: [
        new ol.layer.Image({
          title: 'Curvas de Nivel (IGN)',
          opacity: 1,
          visible: false,
          source: new ol.source.ImageWMS({
            url: ' 	https://servicios.idee.es/wms-inspire/mdt',
            params: { 'LAYERS': 'EL.ContourLine' },
            crossOrigin: 'anonymous',
            ratio: 1,
          }),
        }),
        new ol.layer.Image({
          title: 'Puntos Acotados (IGN)',
          opacity: 1,
          visible: false,
          source: new ol.source.ImageWMS({
            url: ' 	https://servicios.idee.es/wms-inspire/mdt',
            params: { 'LAYERS': 'EL.SpotElevation' },
            crossOrigin: 'anonymous',
            ratio: 1,
          }),
        }),
        new ol.layer.Tile({
          title: 'Ocupación Suelo (IGN)',
          opacity: 0.2,
          visible: false,
          source: new ol.source.WMTS({
            attributions:
              ' <a href="https://www.ign.es/web/ign/portal/inicio">©Instituto Geográfico Nacional (IGN)</a>',
            url:
              'https://servicios.idee.es/wmts/ocupacion-suelo',
            layer: 'LU.ExistingLandUse',
            matrixSet: 'GoogleMapsCompatible',
            format: 'image/png',
            style: 'normal',
            crossOrigin: 'anonymous',
            projection: projection,
            tileGrid: new ol.tilegrid.WMTS({
              origin: ol.extent.getTopLeft(projectionExtent),
              resolutions: resolutions,
              matrixIds: matrixIds,
            }),
            wrapX: true,
          }),
        }),
        new ol.layer.Tile({
          title: 'IFN 2010 Grupo Combustible',
          opacity: 0.2,
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/UsosSolo/IFN_2010_GrupoCombustible/MapServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Tile({
          title: 'IFN 2010 Modelo Combustible',
          opacity: 0.2,
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/UsosSolo/IFN_2010_ModeloCombustible/MapServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Tile({
          title: 'IFN 2010 Especies Arbóreas',
          opacity: 0.2,
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/UsosSolo/IFN_2010_EspeciesArboreas/MapServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Tile({
          title: 'IFN 2010 Cantidad de Combustible',
          opacity: 0.2,
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/UsosSolo/IFN_2010_CantidadeCombustible/MapServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Tile({
          title: 'Aridez Estival (Xunta)',
          opacity: 0.2,
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/IGVS/aridez_estival/MapServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Tile({
          title: 'Radiación Solar (Xunta)',
          opacity: 0.2,
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/IGVS/radiacion_solar/MapServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Image({
          title: 'Unidades Administrativas (Xunta)',
          opacity: 0.2,
          visible: false,
          source: new ol.source.ImageWMS({
            url: 'https://www.ign.es/wms-inspire/unidades-administrativas',
            params: { 'LAYERS': 'AU.AdministrativeUnit' },
            crossOrigin: 'anonymous',
            ratio: 1,
          }),
        }),
        new ol.layer.Tile({
          title: 'SIOSE 2014 Ocupación del Suelo',
          opacity: 0.3,
          visible: false,
          source: new ol.source.TileArcGISRest({
            url: 'https://ideg.xunta.gal/servizos/rest/services/CubertaTerrestre/Siose2014/MapServer',
            attributions:
              ' <a href="http://mapas.xunta.gal/portada">©Xunta de Galicia</a>',
            crossOrigin: 'anonymous',
          })
        }),
        new ol.layer.Vector({
          title: 'Ruta',
          source: new ol.source.Vector({
            features: [feature_polygon],
          }),
          style: styles
        }),
      ]
    }),

    // Grupo de las predicciones meteorológicas de Meteogalicia
    new ol.layer.Group({
      // El título es necesario
      title: 'Predicciones meteorológicas',
      // Permite colapsar el arbol de capas
      fold: 'open',
      
      layers: [
        new ol.layer.Group({
          // El título es necesario
          title: 'Viento (actualizado)',
          visible: false,
          layers: [
        new ol.layer.Tile({
          title: 'Viento 1km Rías Baixas',
          opacity: 1,
          visible: true,
          extent:transform([-9.86583333,41.7025,-8.1008333,42.9]),
          source: new ol.source.TileWMS({
            url: urlMeteoGaliciaWRF_baixas,
            params: { 'LAYERS': 'wind', 'STYLES': 'stumpvec/rainbow' },
            tileOptions: { crossOriginKeyword: 'anonymous' }
          }),
        }),
        new ol.layer.Tile({
          title: 'Viento 4km 1',
          opacity: 1,
          visible: true,
          extent: transform([-11.135,45.055,-5.2375,42.9]),
          source: new ol.source.TileWMS({
            url: urlMeteoGaliciaWRF_4KM,
            params: { 'LAYERS': 'wind', 'STYLES': 'stumpvec/rainbow' },
            tileOptions: { crossOriginKeyword: 'anonymous' }
          }),
        }),
        new ol.layer.Tile({
          title: 'Viento 4km 2',
          opacity: 1,
          visible: true,
          extent: transform([-8.1008333,42.9,-5.2375,41.5]),
          source: new ol.source.TileWMS({
            url: urlMeteoGaliciaWRF_4KM,
            params: { 'LAYERS': 'wind', 'STYLES': 'stumpvec/rainbow' },
            tileOptions: { crossOriginKeyword: 'anonymous' }
          }),
        }),
      ]
        }),
        new ol.layer.Tile({
          title: 'Humedad relativa (actualizado)',
          opacity: 0.2,
          visible: false,
          source: new ol.source.TileWMS({
            url: urlMeteoGaliciaWRF_baixas,
            params: { 'LAYERS': 'rh', 'STYLES': 'boxfill/rainbow' },
            tileOptions: { crossOriginKeyword: 'anonymous' }
          }),
        }),
        new ol.layer.Tile({
          title: 'Precipitaciones (actualizado)',
          opacity: 0.2,
          visible: false,
          source: new ol.source.TileWMS({
            url: urlMeteoGaliciaWRF_baixas,
            params: { 'LAYERS': 'prec', 'STYLES': 'boxfill/rainbow' },
            tileOptions: { crossOriginKeyword: 'anonymous' }
          }),
        }),
        new ol.layer.Group({
          // El título es necesario
          title: 'Temperatura del aire (actualizado)',
          visible: false,
          layers: [
        new ol.layer.Tile({
          title: 'Temperatura del aire 1km',
          opacity: 0.2,
          visible: true,
          source: new ol.source.TileWMS({
            url: urlMeteoGaliciaWRF_baixas,
            params: { 'LAYERS': 'temp', 'STYLES': 'boxfill/rainbow' },
            tileOptions: { crossOriginKeyword: 'anonymous' }
          }),
        }),
        new ol.layer.Tile({
          title: 'Temperatura del aire 4km 1',
          opacity: 1,
          visible: true,
          extent: transform([-11.135,45.055,-5.2375,42.9]),
          source: new ol.source.TileWMS({
            url: urlMeteoGaliciaWRF_4KM,
            params: { 'LAYERS': 'temp', 'STYLES': 'boxfill/rainbow' },
            tileOptions: { crossOriginKeyword: 'anonymous' }
          }),
        }),
        new ol.layer.Tile({
          title: 'Temperatura del aire 4km 2',
          opacity: 1,
          visible: true,
          extent: transform([-8.1008333,42.9,-5.2375,41.5]),
          source: new ol.source.TileWMS({
            url: urlMeteoGaliciaWRF_4KM,
            params: { 'LAYERS': 'temp', 'STYLES': 'boxfill/rainbow' },
            tileOptions: { crossOriginKeyword: 'anonymous' }
          }),
        }),
      ]
    }),
      ]
    })
  ],
  view: view,
  overlays: [overlay]
});


/**
 ################################### Capas Meteogalicia ###################################
 */


 var slider = document.getElementById("myrange");
 //var slider = document.getElementById(value);

var ValueSlider = slider.value;

 slider.oninput = function(){
  ValueSlider = slider.value;
  console.log(ValueSlider);
  setTime();
 }

// Actualización y control de las capas temporales de las predicciones meteorológicas
function updateInfo() {
  const el = document.getElementById('info');
  let str = RepresentationTime.toLocaleString('es-ES');
  str = str.substring(0, str.length - 1);
  el.innerHTML = str + " CEST";
}

function setTime() {
  
  RepresentationTime.setHours(RepresentationTime.getHours() + parseInt(ValueSlider,10));
  if (RepresentationTime > FinalDate) {
    RepresentationTime = startDate;
  }
  // Se escogen las capas concretas correspondientes a las predicciones y se actualiza el tiempo
  map.getLayers().getArray()[2].getLayers().getArray()[0].getLayers().getArray()[0].getSource().updateParams({ 'TIME': RepresentationTime.toISOString() }); // Cuidado numero
  map.getLayers().getArray()[2].getLayers().getArray()[0].getLayers().getArray()[1].getSource().updateParams({ 'TIME': RepresentationTime.toISOString() });
  map.getLayers().getArray()[2].getLayers().getArray()[0].getLayers().getArray()[2].getSource().updateParams({ 'TIME': RepresentationTime.toISOString() });
  map.getLayers().getArray()[2].getLayers().getArray()[1].getSource().updateParams({ 'TIME': RepresentationTime.toISOString() });
  map.getLayers().getArray()[2].getLayers().getArray()[2].getSource().updateParams({ 'TIME': RepresentationTime.toISOString() });
  map.getLayers().getArray()[2].getLayers().getArray()[3].getLayers().getArray()[0].getSource().updateParams({ 'TIME': RepresentationTime.toISOString() });
  map.getLayers().getArray()[2].getLayers().getArray()[3].getLayers().getArray()[1].getSource().updateParams({ 'TIME': RepresentationTime.toISOString() });
  map.getLayers().getArray()[2].getLayers().getArray()[3].getLayers().getArray()[2].getSource().updateParams({ 'TIME': RepresentationTime.toISOString() });
  updateInfo();
  console.log(RepresentationTime);
  RepresentationTime = new Date(startDate);
  
}
setTime();

// Parada del avance temporal
const stop = function () {
  if (animationId !== null) {
    window.clearInterval(animationId);
    animationId = null;
  }
};

// Reanudación avance temporal
const play = function () {
  stop();
  animationId = window.setInterval(setTime, 1000 / frameRate);
};

const startButton = document.getElementById('play');
startButton.addEventListener('click', play, false);

const stopButton = document.getElementById('pause');
stopButton.addEventListener('click', stop, false);

updateInfo();

/**
 ################################### Animación ###################################
 */

// Animación del recorrido del dron por el mapa

function onClick(id, callback) {
  document.getElementById(id).addEventListener('click', callback);
}

// Esquema de la animación
function flyTo(location, done) {
  const duration = 2000;
  const zoom = view.getZoom();
  let parts = 2;
  let called = false;
  function callback(complete) {
    --parts;
    if (called) {
      return;
    }
    if (parts === 0 || !complete) {
      called = true;
      done(complete);
    }
  }
  view.animate(
    {
      center: location,
      duration: duration,
    },
    callback
  );
  view.animate(
    {
      zoom: zoom,
      duration: duration / 2,
    },
    {
      zoom: zoom,
      duration: duration / 2,
    },
    callback
  );
}

// Proporciona las localizaciones a¡hacia las cuales debe moverse la animación. Fin y comienzo de la misma
function tour() {
  const locations = [ol.proj.fromLonLat([-8.789191, 42.283433]), ol.proj.fromLonLat([-8.779664, 42.285466]),
  ol.proj.fromLonLat([-8.763184, 42.278160]), ol.proj.fromLonLat([-8.750396, 42.290866]), ol.proj.fromLonLat([-8.789964, 42.293725]),
  ol.proj.fromLonLat([-8.789191, 42.283433])];
  let index = -1;
  function next(more) {
    if (more) {
      ++index;
      if (index < locations.length) {
        const delay = index === 0 ? 0 : 750;
        setTimeout(function () {
          flyTo(locations[index], next);
        }, delay);
      } else {
        alert('Tour complete');
      }
    } else {
      alert('Tour cancelled');
    }
  }
  next(true);
}

onClick('tour', tour);

/**
 ################################### Perfil de elevaciones ###################################
 */

// Perfil de elevaciones del recorrido del dron

// Nuevo profil en el maoa
var profil = new ol.control.Profil();
map.addControl(profil);
// New profil outside the map
var profil2 = new ol.control.Profil({
  target: document.querySelector(".options"),
  selectable: true,
  // zoomable: true,
  style: new ol.style.Style({
    fill: new ol.style.Fill({ color: '#ccc' })
  }),
  width: 400, height: 200
});
map.addControl(profil2);
ol.control.Map
// Vector style
var style = [
  new ol.style.Style({
    image: new ol.style.RegularShape({
      radius: 10,
      radius2: 5,
      points: 5,
      fill: new ol.style.Fill({ color: 'blue' })
    }),
    stroke: new ol.style.Stroke({
      color: [255, 0, 0],
      width: 2
    })
  })
];
var selStyle = [
  new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: [0, 0, 255],
      width: 2
    })
  })
];

// Vector layer
var source = new ol.source.Vector({
  url: '../ol-ext-master/examples/data/2009-09-04_rando.gpx', // Una de prueba de la librería ol-ext
  format: new ol.format.GPX()
});
var vector = new ol.layer.Vector({
  title: 'Traza',
  source: source,
  style: function (f) {
    return (f.get('select') ? selStyle : style);
  }
});
map.addLayer(vector);

// Muestra el feature profil cuando se carga
var pt, feature;
source.once('change', function (e) {
  if (source.getState() === 'ready') {
    feature = source.getFeatures()[0];
    profil.setGeometry(feature);
    profil2.setGeometry(feature, {
      graduation: 250,
      amplitude: 1000,
      zmin: 0
    });
    pt = new ol.Feature(new ol.geom.Point([0, 0]));
    pt.setStyle([]);
    source.addFeature(pt);
  }
});

// Muestra un punto en el mapa cuando el ratón pasa por encima
function drawPoint(e) {
  if (!pt) return;
  if (e.type == "over") {
    // Muestra punto en coordenada
    pt.setGeometry(new ol.geom.Point(e.coord));
    pt.setStyle(null);
  } else {
    // Oculta punto
    pt.setStyle([]);
  }
};
// Muestra una popup en over
profil.on(["over", "out"], function (e) {
  if (e.type == "over") profil.popup(e.coord[2] + " m");
  drawPoint(e);
});
// Dibuja el punto
profil2.on(["over", "out"], drawPoint);

// Muestra la selección
var start = 0;
var selection;
profil2.on('click', function (e) {
  if (selection) {
    source.removeFeature(selection);
    selection = false;
  }
});
profil2.on('dragstart', function (e) {
  start = e.index;
});
profil2.on(['dragend', 'dragging'], function (e) {
  var g = profil2.getSelection(start, e.index);
  if (selection) {
    selection.getGeometry().setCoordinates(g);
  } else {
    selection = new ol.Feature(new ol.geom.LineString(g));
    selection.set('select', true);
    source.addFeature(selection);
  }
});
profil2.on('zoom', function (e) {
  setTimeout(function () {
    if (selection) source.removeFeature(selection);
    if (e.geometry) {
      selection = new ol.Feature(e.geometry);
      selection.set('select', true);
      source.addFeature(selection);
    } else {
      selection = null;
    }
  })
});

// Muestra el mapa por encima
var hover = new ol.interaction.Hover({ cursor: "pointer", hitTolerance: 10 });
map.addInteraction(hover);
hover.on("hover", function (e) {
  // Punto en la línea de elevaciones
  var c = feature.getGeometry().getClosestPoint(e.coordinate)
  drawPoint({ type: "over", coord: c });
  // Display el profil
  var p = profil.showAt(e.coordinate);
  profil.popup(p[2] + " m");
  profil2.showAt(e.coordinate);
});
hover.on("leave", function (e) {
  profil.popup();
  profil.showAt();
  profil2.showAt();
  drawPoint({});
});

/**
 ################################### Coordenadas al Clickar ###################################
 */

map.on('singleclick', function (evt) {
  const coordinate = evt.coordinate;
  const hdms = ol.coordinate.toStringHDMS(ol.proj.toLonLat(coordinate));

  content.innerHTML = '<p>Coordenadas:</p><coor>' + hdms + '</coor>';
  overlay.setPosition(coordinate);
});
/**
 ################################### Leyenda ###################################
 */


const updateLegend = function (resolution) {
  var wmsSource = map.getLayers().getArray()[2].getLayers().getArray()[0].getLayers().getArray()[0].getSource();
  const graphicUrl = wmsSource.getLegendUrl(resolution);
  const img = document.getElementById('legend');
  img.src = graphicUrl;
};

const resolution = map.getView().getResolution();
updateLegend(resolution);
// Update the legend when the resolution changes
map.getView().on('change:resolution', function (event) {
  const resolution = event.target.getResolution();
  updateLegend(resolution);
});

/**
 ################################### Control de capas ###################################
 */

// Layerswitcher (control de capas)
var LayerSwitcher = new ol.control.LayerSwitcher({
  groupSelectStyle: 'children' 
});
map.addControl(LayerSwitcher);
