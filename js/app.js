/* keys API const variables  */
const GOOGLE_KEY = "AIzaSyBaF09Sdp-WqlsQgCzE-SCeVv0RLYvzB-Q";
const FOURSQUARE_CLIENT_ID = "DZLST0K0VKC4EAVMB3QOPM0DEDXBH0ILLAMKG0NRO5LPCPHR";
const FOURSQUARE_CLIENT_SECRET = "BLSHILQWH3FUSXRQRHXSHKT1ADLGOHBL2ADL50CSKHMIRV5T";

var locationInfowindow;
var map;

/* Map initialization */
function initMap() {
	
	// Constructor creates a new map
	map = new google.maps.Map(document.getElementById('map'), {
	  center: {
		  lat: -22.848944, 
		  lng: -47.043810
	  },
	  zoom: 13,
	  mapTypeControl: false
	});

	locationInfowindow = new google.maps.InfoWindow();
	
	ko.applyBindings(new ViewModel());
}

/* View Model */
function ViewModel() {
 
	this.searchBox = ko.observable("");
    this.locationMarkerList = [];
	
	// Populate an Array with Markers for location list menu
    for (var i = 0; i < locations.length; i++) {
		this.locationMarkerList.push(new Marker(locations[i]));
	}
	
	// Computed function that is responsible for return the remaining location items of the list that contains the (lowercase) String typed in the search box
	this.filterLocationList = ko.computed(function() {
		var search = this.searchBox();
		var locationFilter = [];
		 ko.utils.arrayForEach(this.locationMarkerList, function(item) {
			var isStrContained = item.title.toLowerCase().includes(search.toLowerCase());
			item.setVisible(isStrContained);
			if (isStrContained) {
                locationFilter.push(item);
			}
		});
		return locationFilter;
	}, this);
}

/* Marker Object */
function Marker(mark) {

	var self = this;
	this.visible = true;
	
	// Google maps Marker attributes
	this.location = mark.location;
	this.title = mark.title;
	this.animation = google.maps.Animation.DROP;
	
	// Attributes that will be loaded by 4square API
	this.address = "";
	this.category = "";
	this.phone = "";
	this.city = "";
	this.twitter = "";
	
	// Create bounds object
	var bounds = new google.maps.LatLngBounds();
	
	// Style the default marker color
	var defaultIcon = makeMarkerIcon('4267B2');
	// Style the marker color that will be changed when 'mouserover' event happens 
	var highlightedIcon = makeMarkerIcon('107C10');
		
	// Create a marker
	var marker = new google.maps.Marker({
		position: this.location,
		title: this.title,
		animation: this.animation,
		icon: defaultIcon
	});
	  
	// get JSON request of foursquare data and fill the missing fields
	$.getJSON(mount4SquareRequest(this.location.lat, this.location.lng, this.title)).done(function(data) {
		var response = data.response.venues[0];
		self.phone = response.contact.formattedPhone;
		self.twitter = response.contact.twitter;
		self.address = response.location.formattedAddress[0];
		self.city = response.location.formattedAddress[1];
		
		// Category is a list so it is necessary to check if it exists 
		self.category = response.categories[0] ? response.categories[0].name : "Not informed";
	}).fail(function() {
		self.category = "Not able to get data of forsquare API";
		alert('Not able to load foursquare API');
	});
	
	// Open locationInfowindow when a location is clicked from the locationList Menu
	// and also set a timeout to stop the bounce animation
	this.clickInfo = function() {
		map.setCenter(new google.maps.LatLng(self.location.lat, self.location.lng));
		map.setZoom(14);
		marker.setAnimation(google.maps.Animation.BOUNCE);		
		populateInfoWindow(marker, self, locationInfowindow);
		setTimeout(function() {
			marker.setAnimation(null);
		}, 2100);	
	};
	
	// Make the marker visible/invisible in the map
	this.setVisible = function(isVisible) {
		if(isVisible){
			marker.setMap(map);
			bounds.extend(self.location);
		}
		else {
			marker.setMap(null);
		}
	};
  
	// Create an onclick event to open an indowindow 
	marker.addListener('click', function() {
		self.clickInfo();
	});
	
	// Two event listeners - one for mouseover, one for mouseout,
	marker.addListener('mouseover', function() {
		this.setIcon(highlightedIcon);
	});
	marker.addListener('mouseout', function() {
		this.setIcon(defaultIcon);
	});
	
	// Initial marker status is always visible
	this.setVisible(true);
	
}
 
/* Show an alert in case of Google Maps API error */
function googleMapsError(){
	alert('Not able to load Google Maps API');
}
	  
	  
/* This function populates the infowindow when the marker is clicked. Only one infowindow per time will be shown */
function populateInfoWindow(marker, data, infowindow) {

	// Validate if infowindow is not already opened on this marker.
	if (infowindow.marker != marker) {
		infowindow.marker = marker;
		var infoWindowContent = '<div><h4>' + marker.title + '</h4></div><div>' +
		'<p class="category-info">('+ data.category + ')</p>';
		
		if (data.address) {
			infoWindowContent += '<p class="location-info">'+ data.address + '</p>';
		}
		if (data.city) {
			infoWindowContent += '<p class="location-info">'+ data.city + '</p>';
		}
		if (data.phone) {
			infoWindowContent += '<p class="location-info">'+ data.phone + '</p>';
		}
		if (data.twitter) {
			infoWindowContent += '<p class="location-info">Twitter: '+ data.twitter + '</p>';
		}
		infoWindowContent += '</div><div id="pano"><img src="' + mountImageLocation(marker.position.lat(), marker.position.lng()) + '"></div>';
		infowindow.setContent(infoWindowContent);
		infowindow.open(map, marker);

		// Clear marker property if the infowindow is closed.
		infowindow.addListener('closeclick', function() {
			infowindow.marker = null;
		});
	}
}
  
/* This function takes in a COLOR, and then creates a new marker icon of that color. */
function makeMarkerIcon(markerColor) {
	var markerImage = new google.maps.MarkerImage(
		'https://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
		'|40|_|%E2%80%A2',
		new google.maps.Size(21, 34),
		new google.maps.Point(0, 0),
		new google.maps.Point(10, 34),
		new google.maps.Size(21,34));
	return markerImage;
}
  
/* Mount image URL that will be used inside the locationInfoWindo */
function mountImageLocation(lat, lng){
	var imgURL = "https://maps.googleapis.com/maps/api/streetview?";
	imgURL += "size=200x200";
	imgURL += "&location=" + lat + "," + lng;
	imgURL += "&key=" + GOOGLE_KEY;
	return imgURL;
}

/* Mount foursquare API request that retrieve the missing Marker fields */
function mount4SquareRequest(lat, lng, locationName){
	var fourSquareURL = "https://api.foursquare.com/v2/venues/search?";
	fourSquareURL += "v=20172017";
	fourSquareURL += "&ll=" + lat + "," + lng;
	fourSquareURL += "&intent=checkin";
	fourSquareURL += "&search=" + locationName;
	fourSquareURL += "&client_id=" + FOURSQUARE_CLIENT_ID;
	fourSquareURL += "&client_secret=" + FOURSQUARE_CLIENT_SECRET;
	return fourSquareURL;
}