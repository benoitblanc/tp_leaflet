const map = L.map('map').setView([45.73, 4.83], 11);
var osmLayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        });

map.addLayer(osmLayer);

function getColorMetro(ligne) {
	switch(ligne) {
		case 'A': 
			return '#D64488';
		case 'B':
			return '#3075B9';
		case 'C':
			return '#E99F38';
		case 'D':
			return '#469B49';
		default:
			return '#823E88';
	}
}

function setStyleMetros(feature) {
	ligne = feature.properties.ligne;
	return {
		weight: 4,
    	opacity: 1,
    	color: getColorMetro(ligne)
	};
}

function getColorStation(type) {
	switch(type) {
		case 'Bluely': 
			return '#4CACEC';
		case 'Citiz LPA':
			return '#5CB2B4';
		default:
			return '#d2d8d5';
	}
}

function setStyleStations(feature) {
	return {
		fillColor: getColorStation(feature.properties.typeautopa),
		radius: feature.properties.nbemplacem,
    	weight: 1,
    	fillOpacity: 1,
    	color: 'white'
	};
}

function highlightFeature(e) {
	var layer = e.target;
	layer.setStyle({
        weight: 5,
        color: '#666',
        fillOpacity: 0.7
    });
	var elem = document.getElementById('info');
	elem.innerHTML = "<h4>Taux de chômage</h4>" + "<b>Commune : " + layer.feature.properties.libcom + "</b><br >IRIS : " + layer.feature.properties.libiris + "<br >" + layer.feature.properties.tchom.toFixed(2) + " %";
}

function resetHighlight(e) {
    chomage_choropleth_layer.resetStyle(e.target);
}

function interactions(feature, layer) {
    layer.on({
        mouseover: highlightFeature,
        mouseout: resetHighlight,
        click: function() {
        	map.flyToBounds(layer.getBounds());
        }
    });
}

var chomage_choropleth_layer = L.choropleth(iris, {
	valueProperty: function (feature) {
      return feature.properties.tchom
    }, // which property in the features to use
	scale: ['white', 'red'], // chroma.js scale - include as many as you like
	steps: 5, // number of breaks or steps in range
	mode: 'q', // q for quantile, e for equidistant, k for k-means
	style: {
		color: '#fff', // border color
		weight: 2,
		fillOpacity: 0.8
	},
	onEachFeature: interactions
}).bindPopup(function(layer) {
	return ("<b>Commune : " + layer.feature.properties.libcom + "</b><br >" + "<i>IRIS : " + layer.feature.properties.libiris + "</i><br >" + "Taux de chômage : " + layer.feature.properties.tchom.toFixed(2) + " %")
}).addTo(map);

var animated_metros = new L.FeatureGroup;
var metros_layer = L.geoJSON(metros, {
	style: setStyleMetros,
	onEachFeature: addMarker
}).bindTooltip(function(layer) {
	return ("<b>Ligne " + layer.feature.properties.ligne + "</b><br >" + layer.feature.properties.libelle)
}).addTo(map);

var stations_layer = L.geoJSON(stations, {
    pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng, setStyleStations(feature));
    },
	onEachFeature: overStation
}).bindTooltip(function(layer) {
	type = layer.feature.properties.typeautopa;
	img_url = '';
	switch(type) {
		case 'Bluely':
			img_url = 'img/bluely.png';
			break;
		case 'Citiz LPA':
			img_url = 'img/citizlpa.png';
			break;
		default:
			img_url = '';
	};
	return ("<b>Station " + layer.feature.properties.typeautopa + "</b><br >" + layer.feature.properties.nom + "<br >Nombre d'emplacements : " + layer.feature.properties.nbemplacem + "<br ><img src='" + img_url + "' width='100%' />")
}).addTo(map);
//------------------------------------------------------------------

// Option 1 : Ajouter un marqueur animé le long des lignes de métro.
function addMarker(feature, layer) {
	var coordinates = [];
	for (var i=0; i < feature.geometry.coordinates[0].length; i++) {
		coordinates.push(feature.geometry.coordinates[0][i].reverse())
	}
	var ligne = L.polyline(coordinates);

	var metroIcon = L.icon({
		iconUrl: 'img/metro.png',
		iconSize: [20,20],
		iconAnchor: [10, 10]
	});

	// Plugin MovingMarker
	var animatedMarker = L.Marker.movingMarker(ligne.getLatLngs(), 5000, {
		autostart: true,
		loop: true,
		icon: metroIcon
	}).addTo(animated_metros);

	// Plugin AnimatedMarker
	// var animatedMarker = L.animatedMarker(ligne.getLatLngs(), {
	// 	icon: metroIcon,
	// 	autoStart: true
	// }).addTo(map);

    //map.addLayer(animatedMarker);
}

animated_metros.addTo(map);

//------------------------------------------------------------------

// Option 2 : Ajouter des zones tampons de 300m au survol des stations auto-partage + mise en valeur de la station (par un changement de taille, de couleur ou de représentation)
var buffer;
function highlightStation(e) {
	var layer = e.target;
	layer.setStyle({
        radius: layer.feature.properties.nbemplacem*2,
        weight: 2,
        color: '#666',
        fillOpacity: 0.7
    });
    buffer = L.circle(layer.getLatLng(), {radius: 300}).addTo(map);
}

function resetStation(e) {
	var layer = e.target;
    layer.setStyle(setStyleStations(layer.feature));
    map.removeLayer(buffer);
}

function overStation(feature, layer) {
    layer.on({
        mouseover: highlightStation,
        mouseout: resetStation
    });
}
//------------------------------------------------------------------

// Option 3 : Proposer une fonction de dessin de ligne.
var line_layer = new L.FeatureGroup();
map.addLayer(line_layer);

var drawControl = new L.Control.Draw({
	position: 'bottomleft',
	draw: {
		polyline: {
			color: '#f357a1',
			weight: 10
		},
		polygon: false,
		circle: false,
		circlemarker: false,
		rectangle: false,
		marker: false
	},
	edit: {
		featureGroup: line_layer
	}
});
map.addControl(drawControl);

map.on(L.Draw.Event.CREATED, function (e) {
	var type = e.layerType,
	    layer = e.layer;

	line_layer.addLayer(layer);
});

//------------------------------------------------------------------

var baseLayers = {
	"OpenStreetMap": osmLayer
};

var overlays = {
	"Taux de chômage IRIS Choropleth": chomage_choropleth_layer,
	"Lignes de métro": metros_layer,
	"Métros": animated_metros,
	"Stations d'auto-partage": stations_layer
};
L.control.layers(baseLayers, overlays).addTo(map);

map.fitBounds(chomage_choropleth_layer.getBounds());