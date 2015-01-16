angular.module('angularShortestPath', [])
.factory('MapObjects',[function(){
	var _mapOptions = {
          center: new google.maps.LatLng(-23.545743, -46.651573),
          zoom: 13,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
		  streetViewControlOptions: {
			position: google.maps.ControlPosition.TOP_RIGHT
		  },
		  zoomControlOptions: {
			style: google.maps.ZoomControlStyle.LARGE,
			position: google.maps.ControlPosition.RIGHT_TOP
		  }
    };
	
	var _travelMode = google.maps.TravelMode.DRIVING;
	var _map = null;
	var _startLocationAutocomplete = null;
	var _endLocationAutocomplete = null;
	var _directionsService = new google.maps.DirectionsService();
	var _directionsDisplay = [];
	
	var _startPoint = null;
	var _points = null;
	var _endPoint = null;
	
	var _pointsDescribed = null;
	var _totalDistance = null;
	
	var _paintedPoints = [];
	
	return{
		setTotalDistance : function(distance){
			_totalDistance = distance;
		},
		getTotalDistance : function(){
			return _totalDistance;
		},
		setPaintedPoints : function(tempPoints,generation,best,number){
			var code = String.fromCharCode(65 + number);
			_paintedPoints.push(new google.maps.Marker({
							position : new google.maps.LatLng(tempPoints[generation[best][number]].k,tempPoints[generation[best][number]].D),
							map : _map,
							icon: 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=' + code + '|66CC66|000000'
							})
			);
		},
		clearPaintedPoints : function(){
			for(var i=0; i< _paintedPoints.length; i++){
				_paintedPoints[i].setMap(null);
			}
			_paintedPoints = [];
		},
		setTravelMode : function(mode){
			_travelMode = mode;
		},
		getTravelMode : function(){
			return _travelMode;
		},
		setMap : function(){
			_map = new google.maps.Map(document.getElementById("map_canvas"),_mapOptions);
		},
		getMap : function(){
			return _map;
		},
		setStartLocationAutocomplete : function(){
			_startLocationAutocomplete = new google.maps.places.Autocomplete(document.getElementById('startLocation'));
			_startLocationAutocomplete.bindTo('bounds', _map);
			return _startLocationAutocomplete;
		},
		setLocationsAutocomplete : function(){
			_locationsAutocomplete = new google.maps.places.Autocomplete(document.getElementById('locations'));
			_locationsAutocomplete.bindTo('bounds', _map);
			return _locationsAutocomplete;
		},
		setEndLocationAutocomplete : function(){
			_endLocationAutocomplete = new google.maps.places.Autocomplete(document.getElementById('endLocation'));
			_endLocationAutocomplete.bindTo('bounds', _map);
			return _endLocationAutocomplete;
		},
		setPoints : function(startPoint, points, endPoint){
			_startPoint = null;
			_points = [];
			_endPoint = null;
			_pointsDescribed = [];
			_startPoint = new google.maps.LatLng(startPoint.geometry.location.k,startPoint.geometry.location.D);
			_pointsDescribed.push(startPoint);
			for(var i=0; i < points.length; i++){
				_points.push(new google.maps.LatLng(points[i].geometry.location.k,points[i].geometry.location.D));
				_pointsDescribed.push(points[i]);
			}
			_endPoint = new google.maps.LatLng(endPoint.geometry.location.k,endPoint.geometry.location.D);
			_pointsDescribed.push(endPoint);
		},
		getPointsDescribed : function(){
			return _pointsDescribed;
		},
		getStartPoint : function(){
			return _startPoint;
		},
		getPoints : function(){
			return _points;
		},
		getEndPoint : function(){
			return _endPoint;
		},
		setDirectionsDisplay : function(result){
			_directionsDisplay.push(new google.maps.DirectionsRenderer({directions:result,markerOptions : {visible : false}}));
			_directionsDisplay[_directionsDisplay.length - 1].setMap(_map);
			console.log(_directionsDisplay);
		},
		clearDirectionsDisplay : function(){
			for(var i=0; i< _directionsDisplay.length; i++){
				_directionsDisplay[i].setMap(null);
				console.log(_directionsDisplay[i]);
			}
			_directionsDisplay = [];
		},
		clearMap : function(){
			this.clearDirectionsDisplay();
			this.clearPaintedPoints();
		},
		getDirectionsService : function(){
			return _directionsService;
		}
	};
}])
.controller('MapCtrl', ['$rootScope','$scope','MapObjects',function MapCtrl($rootScope,$scope,MapObjects){
	MapObjects.setMap();
	$rootScope.$broadcast('initiatedMap');
}])
.controller('MarkersCtrl', ['$rootScope','$scope','MapObjects',function MarkersCtrl($rootScope,$scope,MapObjects){	
}])
.controller('AutocompleteCtrl', ['$rootScope','$scope','MapObjects',function AutocompleteCtrl($rootScope,$scope,MapObjects){
	$rootScope.$on('initiatedMap', function (event) {
		var startLocationAutocomplete = MapObjects.setStartLocationAutocomplete();
		google.maps.event.addListener(startLocationAutocomplete, 'place_changed', function() {
			$scope.$apply(function(){
				$scope.startLocation = startLocationAutocomplete.getPlace();
				if(typeof $scope.startLocation.geometry !== 'undefined'){
				} else{
					$scope.startLocation = null;
					alert('Unable to find start location');
				}
			});
		});
		
		$scope.locations = [];
		
		var locationsAutocomplete = MapObjects.setLocationsAutocomplete();
		google.maps.event.addListener(locationsAutocomplete, 'place_changed', function() {
			$scope.$apply(function(){
				var temp = locationsAutocomplete.getPlace();
				if(typeof temp.geometry !== 'undefined'){
					$scope.locations.push(temp);
				} else{
					alert('Unable to find location');
				}
			});
		});
		
		var endLocationAutocomplete = MapObjects.setEndLocationAutocomplete();
		google.maps.event.addListener(endLocationAutocomplete, 'place_changed', function() {
			$scope.$apply(function(){
				$scope.endLocation = endLocationAutocomplete.getPlace();
				if(typeof $scope.endLocation.geometry !== 'undefined'){
				} else{
					$scope.endLocation = null;
					alert('Unable to find end location');
				}
			});
		});
	});
	
	$scope.remove = function(index){
		$scope.locations.splice(index,1);
	};
	
	$scope.calculate = function(){
		MapObjects.clearMap();
		MapObjects.setPoints($scope.startLocation,$scope.locations,$scope.endLocation);
		$rootScope.$broadcast('calculateDistances');
	};
}])
.controller('RoutesCtrl', ['$rootScope','$scope','MapObjects','$timeout',function RoutesCtrl($rootScope,$scope,MapObjects,$timeout){
	$rootScope.$on('calculateDistances', function (event) {
		$scope.startPoint = MapObjects.getStartPoint();
		$scope.points = MapObjects.getPoints();
		$scope.endPoint = MapObjects.getEndPoint();
		
		$scope.tempPoints = [];
		$scope.tempPoints.push(MapObjects.getStartPoint());
		for(var i=0; i < $scope.points.length; i++){
			$scope.tempPoints.push($scope.points[i]);
		}
		$scope.tempPoints.push(MapObjects.getEndPoint());
		
		console.log($scope.tempPoints);
		
		$scope.matrix = [];
		for(var i=0; i<$scope.tempPoints.length; i++){
			$scope.matrix[i] = new Array($scope.tempPoints.length);
		}
		
		$rootScope.$broadcast('startLoading',{
			points : $scope.points.length,
			current : 0
		});
		$scope.reqs = 0;
		$scope.distances(0,0);
	});
	
	$scope.distances = function(i,j){
		if(i == j){
			$scope.matrix[i][j] = 0;
			$scope.iterate(i,j);
		} else if(i == 0 && j == $scope.tempPoints.length-1){
			$scope.matrix[i][j] = 0;
			$scope.iterate(i,j);
		} else if(j == 0 && i == $scope.tempPoints.length-1){
			$scope.matrix[i][j] = 0;
			$scope.iterate(i,j);
		} else{
			var request = {
				origin: $scope.tempPoints[i],
				destination: $scope.tempPoints[j],
				travelMode: MapObjects.getTravelMode()
			};
			
			$scope.reqs++;
			
			var service = MapObjects.getDirectionsService();
			
			service.route(request, function(result, status) {
				if (status == google.maps.DirectionsStatus.OK) {
					console.log(result);
					$scope.matrix[i][j] = result.routes[0].legs[0].distance.value;
					$scope.iterate(i,j);
				} else{
					$rootScope.$broadcast('finishLoading');
					alert('Unable to trace route');
				}
			});
		}
	};
	
	$scope.iterate = function(i,j){
		j++;
		if(j == $scope.tempPoints.length){
			j = 0;
			i++;
		}
		if(i<$scope.tempPoints.length && j<$scope.tempPoints.length){
			$timeout(function() {
				$rootScope.$broadcast('keepLoading',{
					current : $scope.reqs
				});
				$scope.distances(i,j);
			}, 750);
		} else{
			$rootScope.$broadcast('finishLoading');
			$scope.startGenetics();
		}
	};
	
	$scope.startGenetics = function(){
		$scope.generation = new Array(20);
		for(var i=0; i < $scope.generation.length; i++){
			var arrayTemp = [];
			arrayTemp.push(0);
			var max = $scope.tempPoints.length - 2;
			var min = 1;
			for(var j = 0; j < max; j++){
				var randomNumber = Math.floor(Math.random() * (max - min + 1)) + 1;
				var index = arrayTemp.indexOf(randomNumber);
				if(index == -1){
					arrayTemp.push(randomNumber);
				} else{
					j--;
				}
			}
			arrayTemp.push($scope.tempPoints.length - 1);
			$scope.generation[i] = arrayTemp;
		}
		console.log($scope.generation);
		$scope.count = 0;
		$scope.findEvolved();
	};
	
	$scope.findEvolved = function(){
		var best = null;
		var amount = null;
		for(var i=0; i < $scope.generation.length; i++){
			var total = 0;
			for(var j=0; j< $scope.generation[i].length - 1; j++){
				total = total + $scope.matrix[$scope.generation[i][j]][$scope.generation[i][j+1]];
			}
			if(amount == null || amount > total){
				amount = total;
				best = i;
			}
		}
		$scope.count++;
		if($scope.count < 200){
			$scope.crossOver(best);
		} else{
			$scope.showResult(best);
		}
	};
	
	$scope.crossOver = function(best){
		$scope.newGeneration = [];
		$scope.newGeneration.push($scope.generation[best]);
		
		var init = $scope.generation[best].slice(0,1);
		var left = $scope.generation[best].slice(1,Math.floor(($scope.generation[best].length-2)/2) + 1);
		var right = $scope.generation[best].slice(Math.floor(($scope.generation[best].length-2)/2) + 1, $scope.generation[best].length - 1);
		var end = $scope.generation[best].slice($scope.generation[best].length - 1,$scope.generation[best].length);
		$scope.newGeneration.push(init.concat(right.concat(left.concat(end))));
		
		var max = 19;
		var min = 0;
		
		for(var i = 0; i < 8; i++){
			var randomNumber = Math.floor(Math.random() * (max));
			var leftTemp = $scope.generation[randomNumber].slice(1,Math.floor(($scope.generation[randomNumber].length-2)/2) + 1);
			var rightTemp = $scope.generation[randomNumber].slice(Math.floor(($scope.generation[randomNumber].length-2)/2) + 1, $scope.generation[randomNumber].length - 1);
			$scope.newGeneration.push(init.concat(rightTemp.concat(leftTemp.concat(end))));
		}
		
		for(var i = 0; i < 5; i++){
			var randomNumber = Math.floor(Math.random() * (max));
			$scope.newGeneration.push($scope.generation[randomNumber]);
		}
		
		for(var i=0; i < 5; i++){
			var arrayTemp = [];
			arrayTemp.push(0);
			max = $scope.tempPoints.length - 2;
			min = 1;
			for(var j = 0; j < max; j++){
				var randomNumber = Math.floor(Math.random() * (max - min + 1)) + 1;
				var index = arrayTemp.indexOf(randomNumber);
				if(index == -1){
					arrayTemp.push(randomNumber);
				} else{
					j--;
				}
			}
			arrayTemp.push($scope.tempPoints.length - 1);
			$scope.newGeneration.push(arrayTemp);
		}
		
		$scope.generation = $scope.newGeneration;
		$scope.findEvolved();
	};
	
	$scope.showResult = function(best){
		console.log($scope.generation);
		console.log(best);
		console.log($scope.generation[best]);
		console.log($scope.matrix);
		var total = 0;
		for(var j=0; j< $scope.generation[best].length - 1; j++){
			total = total + $scope.matrix[$scope.generation[best][j]][$scope.generation[best][j+1]];
		}
		MapObjects.setTotalDistance(total);
		console.log(total);
		$scope.drawRoute(best);
	};
	
	$scope.drawRoute = function(best){
		$scope.draw(best,0);
	};
	
	$scope.draw = function(best,number){
	console.log(number);
	
		var service = MapObjects.getDirectionsService();
		
		var request = {
			origin: $scope.tempPoints[$scope.generation[best][number]],
			destination: $scope.tempPoints[$scope.generation[best][number + 1]],
			travelMode: MapObjects.getTravelMode()
		};
		
		service.route(request, function(result, status) {
			var code = String.fromCharCode(65 + number);
			if (status == google.maps.DirectionsStatus.OK) {
				MapObjects.setDirectionsDisplay(result);
				MapObjects.setPaintedPoints($scope.tempPoints,$scope.generation,best,number);
				number++;
				if(number < $scope.generation[best].length - 1){
					$timeout(function() {
						$scope.draw(best,number);
					}, 750);
				} else{
					MapObjects.setPaintedPoints($scope.tempPoints,$scope.generation,best,number);
					$rootScope.$broadcast('resultReady',{
						generation : $scope.generation,
						points : $scope.tempPoints,
						best : best
					});
				}
			}
		});
	};
}])
.controller('LoadingCtrl', ['$rootScope','$scope','MapObjects',function MapCtrl($rootScope,$scope,MapObjects){
	$scope.loaded = 0;
	$scope.loading = false;
	
	$rootScope.$on('startLoading', function (event,data) {
		$scope.loading = true;
		console.log(data);
		$scope.points = data.points + 2;
		$scope.total = ($scope.points*$scope.points) - ($scope.points-2) - 4;
		console.log($scope.total);
		$scope.loaded = (data.current/$scope.total) * 100;
		$scope.loadingText = $scope.loaded + '% loaded';
	});
	
	$rootScope.$on('keepLoading', function (event,data) {
		$scope.loaded = (data.current/$scope.total) * 100;
		$scope.loadingText = $scope.loaded + '% loaded';
	});
	
	$rootScope.$on('finishLoading', function (event,data) {
		$scope.$apply(function(){
			$scope.loading = false;
		});
	});
}])
.controller('ResultCtrl', ['$rootScope','$scope','MapObjects',function ResultCtrl($rootScope,$scope,MapObjects){
	$scope.ready = false;
	
	$rootScope.$on('calculateDistances', function (event) {
		$scope.ready = false;
	});
	
	$rootScope.$on('resultReady', function (event,data) {
		$scope.$apply(function(){
			$scope.ready = true;
			$scope.totalDistance = MapObjects.getTotalDistance();
			$scope.points = MapObjects.getPointsDescribed();
			console.log($scope.points);
			
			$scope.pointsOrdered = [];
			for(var i=0; i<data.points.length; i++){
				$scope.pointsOrdered.push($scope.points[data.generation[data.best][i]]);
			}
			console.log($scope.pointsOrdered);
		});
	});
}]);