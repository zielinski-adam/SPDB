/**
 * Created by Adam Zieliński on 2017-05-13.
 */

var BusStopController = function ($scope, $http, $q, userData, userGravatar, gitHubUserLookup, googlePlacesService, busStopsService) {
    $scope.ManyHellos = ['Hello', 'Hola', 'Bonjour', 'Guten Tag', 'Ciao', 'Namaste', 'Yiasou'];

    $scope.data = userData.user;

    $scope.getGravatar = function (email) {
        return userGravatar.getGravatar(email);
    };

    $scope.getGitHubUser = function (username) {
        console.log("username: " + username);
        gitHubUserLookup.lookupUser(username).then(onLookupComplete, onError);
    };

    var onLookupComplete = function (response) {
        $scope.user = response.data;
        $scope.status = response.status;

    };

    var onError = function (reason) {
        $scope.error = "Ooops, something went wrong..";
    };

    $scope.showBusStopsModel = {
        goodBusStopsCheck: false,
        badBusStopsCheck: false,
        busStopToDirection: false,
        busStopFromDirection: false
    };

    $scope.idAvailableGoogle = "AGP";
    $scope.idTakenGoogle = "TGP";
    $scope.idAvailableBusStops = "ABS";
    $scope.idTakenBusStops = "TBS";

    $scope.busStopsForModel = [];
    $scope.googlePlacesTypesForModel = [];

    $scope.takenBS = [];
    $scope.goodBusStops = [];
    $scope.badBusStops = [];
    $scope.goodMarkersBS = [];
    $scope.badMarkersBS = [];

    $scope.googleTakenPT = [];
    $scope.markersGooglePT = [];

    $scope.availableBusLines = [];

    $scope.initialized = false;

    $scope.markerIconNegative = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8.5,
        fillColor: "#F00",
        fillOpacity: 0.4,
        strokeWeight: 0.4
    };
    $scope.markerIconPositive = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8.5,
        fillColor: "#0F0",
        fillOpacity: 0.4,
        strokeWeight: 0.4
    };

    $scope.apiUrl = 'http://localhost:5000/api/';
    $scope.startPoint = {lat: 53.139, lng: 23.159}; // Białystok

    $scope.searchGooglePlacesRadius = 1500;


    // TODO Część Dorsza do ogarnięcia
    $scope.hoursFrom = [];
    $scope.hoursTo = [];
    for (var i = 0; i < 24; i++) {
        $scope.hoursFrom.push(i);
        $scope.hoursTo.push(i);
    }
    $scope.days = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota", "Niedziela"];
    $scope.daysCodes = new Map();
    $scope.daysCodes.set("Poniedziałek", "MON");
    $scope.daysCodes.set("Wtorek", "TUE");
    $scope.daysCodes.set("Środa", "WED");
    $scope.daysCodes.set("Czwartek", "THU");
    $scope.daysCodes.set("Piątek", "FRI");
    $scope.daysCodes.set("Sobota", "SAT");
    $scope.daysCodes.set("Niedziela", "SUN");
    $scope.locations = [
        ['Bondi Beach', 53.1390, 23.1593, 1],
        ['Coogee Beach', 53.1391, 23.1589, 2],
        ['Cronulla Beach', 53.1392, 23.1588, 3]
    ];

    $scope.histogram = '';
    $scope.directionService = new google.maps.DirectionsService();
    $scope.directionsDisplay = new google.maps.DirectionsRenderer();

    $scope.lat = $scope.startPoint.lat;
    $scope.lng = $scope.startPoint.lng;
    $scope.minSupport = 0.7;
    $scope.minDiffDelay = 100;
    $scope.lines = [];




    // nasze

    var promiseGooglePlaces = googlePlacesService.getGoogleAvailablePlaces();
    promiseGooglePlaces.then(function (data) {
            angular.forEach(data.data.placeTypes, function (place, index) {
                angular.forEach(place, function (description, index) {
                    $scope.googlePlacesTypesForModel.push({label: description});
                });
            });
        }
    );

    console.log(["Available Google places:\n ", $scope.googlePlacesTypesForModel]);
    $scope.googlePlacesModels = [
        {listName: "of taken places", items: [], dragging: false, id: $scope.idTakenGoogle},
        {listName: "of available places", items: $scope.googlePlacesTypesForModel, dragging: false, id: $scope.idAvailableGoogle }
    ];

    // Model to JSON for demo purpose
    $scope.$watch('googlePlacesModels', function (model) {
        $scope.modelAsJsonGoogleAvailablePlaces = angular.toJson(model, true);
    }, true);

    var promiseBusStopPlaces = busStopsService.getBusStopPlaces();
    promiseBusStopPlaces.then(function (data) {
            angular.forEach(data.data, function (busStop, index) {
                $scope.busStopsForModel.push({
                    id: busStop.id,
                    name: busStop.name,
                    oLA : busStop.original_latitude,
                    oLO : busStop.original_longitude,
                    cLA : busStop.calculated_latitude,
                    cLO : busStop.calculated_longitude,
                    lines: busStop.lines
                });
            });
        }
    );

    console.log(["Available bus stops:\n ", $scope.busStopsForModel]);
    $scope.busStopsModels = [
        {listName: "of taken bus stops", items: [], dragging: false, id: $scope.idTakenBusStops},
        {listName: "of available bus stops", items: $scope.busStopsForModel, dragging: false, id: $scope.idAvailableBusStops}
    ];


    // Model to JSON for demo purpose
    $scope.$watch('busStopsModels', function (model) {
        $scope.modelAsJsonAvailableBusStops = angular.toJson(model, true);
    }, true);

    /**
     * dnd-dragging determines what data gets serialized and send to the receiver
     * of the drop. While we usually just send a single object, we send the array
     * of all selected items here.
     */
    $scope.getSelectedItemsIncluding = function (list, item) {
        item.selected = true;
        return list.items.filter(function (item) {
            return item.selected;
        });
    };

    /**
     * We set the list into dragging state, meaning the items that are being
     * dragged are hidden. We also use the HTML5 API directly to set a custom
     * image, since otherwise only the one item that the user actually dragged
     * would be shown as drag image.
     */
    $scope.onDragStart = function (list, event) {
        list.dragging = true;
        if (event.dataTransfer.setDragImage) {
            var img = new Image();
            img.src = 'framework/vendor/ic_content_copy_black_24dp_2x.png';
            event.dataTransfer.setDragImage(img, 0, 0);
        }
    };

    /**
     * In the dnd-drop callback, we now have to handle the data array that we
     * sent above. We handle the insertion into the list ourselves. By returning
     * true, the dnd-list directive won't do the insertion itself.
     */
    $scope.onDrop = function (list, items, index) {
        angular.forEach(items, function (item) {
            item.selected = false;
        });
        list.items = list.items.slice(0, index).concat(items).concat(list.items.slice(index));

        switch (list.id) {
            case $scope.idTakenGoogle:
                $scope.addGooglePlacesTypes(list.items);
                break;
            case $scope.idAvailableGoogle:
                $scope.removeGooglePlacesTypes(list.items);
                break;
            case $scope.idTakenBusStops:
                $scope.addBusStops(list.items);
                break;
            case $scope.idAvailableBusStops:
                $scope.removeBusStops(list.items);
                break;
        }
        return true;

    };

    $scope.onMoved = function (list) {
        list.items = list.items.filter(function (item) {
            return !item.selected;
        });
    };

    $scope.clearGooglePlaces = function () {
        $scope.googleTakenPT = [];
    };

    $scope.clearBusStopsPlaces = function () {
        $scope.takenBS = [];
    };

    $scope.addGooglePlacesTypes = function (placesList) {
        $scope.clearGooglePlaces();
        placesList.forEach(function (item, index) {
            if (typeof item.label !== 'undefined') {
                $scope.googleTakenPT.push(item.label);
            }
        });
        console.log($scope.googleTakenPT);
    };

    $scope.removeGooglePlacesTypes = function (placesList) {
        placesList.forEach(function (item, index) {
            if (typeof item.label !== 'undefined') {
                var itemName = item.label;
                var rmIndex = $scope.googleTakenPT.indexOf(itemName);
                if (rmIndex > -1) {
                    console.log("Removing: " + $scope.googleTakenPT[rmIndex] + " index: " + rmIndex);
                    $scope.googleTakenPT.splice(rmIndex, 1);
                }
            }
        });
        console.log($scope.googleTakenPT);
    };

    $scope.addBusStops = function (placesList) {
        $scope.clearBusStopsPlaces();
        placesList.forEach(function (item, index) {
            if (typeof item.id !== 'undefined') {
                $scope.takenBS.push(item);
            }
        });
        console.log($scope.takenBS);
    };

    $scope.removeBusStops = function (placesList) {
        placesList.forEach(function (item, index) {
            if (typeof item.id !== 'undefined') {
                $scope.removeByAttr($scope.takenBS, 'id', item.id);
            }
        });
        console.log($scope.takenBS);
    };

    $scope.removeByAttr = function(arr, attr, value){
        var i = arr.length;
        while(i--){
            if( arr[i]
                && arr[i].hasOwnProperty(attr)
                && (arguments.length > 2 && arr[i][attr] === value ) ){

                arr.splice(i,1);

            }
        }
        return arr;
    };

    $scope.showInterestingGooglePlaces = function () {
        $scope.clearMarkers($scope.markersGooglePT);
        console.log("Taken google places types");
        console.log($scope.googleTakenPT);
        for (var i = 0; i < $scope.takenBS.length; i++) {
            $scope.showInterestingGooglePlace($scope.takenBS[i]);
        }

    };

    // TODO dodać możliwość znalezienia najbliższej atrakcji każdego typu
    $scope.showInterestingGooglePlace = function (takenB) {
        var service = new google.maps.places.PlacesService($scope.map);
        var location = {lat: takenB.cLA, lng: takenB.cLO};
        var request = {
            location: location,
            radius: $scope.searchGooglePlacesRadius,
            animation: google.maps.Animation.DROP,
            types: $scope.googleTakenPT
        };
        service.textSearch(request, $scope.processResults);
        google.maps.event.trigger($scope.map, 'resize');
    };

    $scope.prepareBusStops = function () {
        for (var i = 0; i < $scope.takenBS.length; i++) {
            // TODO if na zaznaczonych checkboxach
            $scope.goodBusStops.push([]);
            $scope.goodBusStops[i].push($scope.takenBS[i].id);
            $scope.goodBusStops[i].push($scope.takenBS[i].name);
            $scope.goodBusStops[i].push($scope.takenBS[i].cLA);
            $scope.goodBusStops[i].push($scope.takenBS[i].cLO);

            $scope.badBusStops.push([]);
            $scope.badBusStops[i].push($scope.takenBS[i].id);
            $scope.badBusStops[i].push($scope.takenBS[i].name);
            $scope.badBusStops[i].push($scope.takenBS[i].oLA);
            $scope.badBusStops[i].push($scope.takenBS[i].oLO);
        }

    };

    $scope.showBusStops = function () {
        $scope.clearMarkers($scope.goodMarkersBS);
        $scope.clearMarkers($scope.badMarkersBS);

        $scope.prepareBusStops();

        console.log("Good bus stops");
        console.log($scope.goodBusStops);
        $scope.createBusStopMarkers($scope.goodBusStops, $scope.markerIconPositive);

        console.log("Bad bus stops");
        console.log($scope.badBusStops);
        $scope.createBusStopMarkers($scope.badBusStops, $scope.markerIconNegative);

    };

    $scope.clearMarkers = function (markers) {
        // Loop through markers and set map to null for each
        for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(null);
        }
        // Reset the markers array
        markers = [];
    };

    $scope.initMap = function () {
        if ($scope.initialized === false) {

            // legend under the map
            $scope.drawCircle('goodBusStopCircle', 'green');
            $scope.drawCircle('badBusStopCircle', 'red');

            $scope.map = new google.maps.Map(document.getElementById('map'), {
                center: $scope.startPoint,
                zoom: 13,
                mapTypeId: "roadmap"
            });
            $scope.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(document.getElementById('legend'));
            $scope.info_window = new google.maps.InfoWindow();
            $scope.initialized = true;
        }
    };

    $scope.drawCircle = function (id, color) {
        var canvas = document.getElementById(id);
        var context = canvas.getContext("2d");
        context.arc(20, 20, 20, 0, Math.PI * 2, false);
        context.fillStyle = color;
        context.fill()
    };

    google.maps.event.addDomListener(window, 'load', $scope.initMap);

    // TODO dorsz?
    $scope.clearLines = function () {
        $scope.lines.forEach(function (line) {
            line.line.setMap(null);
        });
        $scope.lines = [];
    };

    $scope.processResults = function (results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            for (var i = 0; i < results.length; i++) {
                $scope.createPlacesMarkers(results[i]);
            }
        }
    };

    $scope.createPlacesMarkers = function (place) {
        var placeLoc = place.geometry.location;
        var image = {
            url: place.icon,
            size: new google.maps.Size(71, 71),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(17, 34),
            scaledSize: new google.maps.Size(25, 25)
        };

        var marker = new google.maps.Marker({
            map: $scope.map,
            icon: image,
            title: place.name,
            position: placeLoc
        });

        $scope.markersGooglePT.push(marker);

        google.maps.event.addListener(marker, 'click', function () {
            $scope.info_window.setContent(place.name);
            $scope.info_window.open($scope.map, this);
        });
    };

    $scope.createBusStopMarkers = function (locations, icon) {
        var marker, i;
        for (i = 0; i < locations.length; i++) {
            marker = new google.maps.Marker({
                position: new google.maps.LatLng(locations[i][2], locations[i][3]),
                map: $scope.map,
                icon: icon
            });

            if (locations === $scope.goodBusStops)
                $scope.goodMarkersBS.push(marker);
            if (locations === $scope.badBusStops)
                $scope.badMarkersBS.push(marker);

            google.maps.event.addListener(marker, 'click', (function (marker, i) {
                return function () {
                    $scope.info_window.setContent(locations[i][1]);
                    $scope.info_window.open($scope.map, marker);
                }
            })(marker, i));
        }
        google.maps.event.trigger($scope.map, 'resize');
    };

    // TODO dorsz?
    $scope.drawLines = function (pointRoutes) {
        pointRoutes.forEach(function (route) {
            var line = new google.maps.Polyline({
                path: route.points,
                geodesic: true,
                strokeColor: route.color,
                strokeOpacity: 1.0,
                strokeWeight: 3
            });
            var content = route.content;
            var lineWithContent = {
                'line': line,
                'content': content
            };
            $scope.lines.push(lineWithContent);
            line.addListener('click', function () {
                if (content !== undefined) {
                    $scope.info_window.setPosition($scope.findCenterOfPath(line.getPath().getArray()));
                    $scope.info_window.setContent(content);
                    $scope.info_window.open($scope.map, this);
                }
            });
            line.setMap($scope.map);
        })
    };

    // TODO dorsz?
    $scope.getDataFromApi = function () {
        $scope.clearLines();
        $scope.histogram = $scope.apiUrl + "getHistogram/" + $scope.daysCodes.get($scope.selectedDay) + "/" + $scope.hourFrom + "/" + $scope.hourTo;
        var url = $scope.apiUrl;
        url += "getRoutes/";
        url += $scope.daysCodes.get($scope.selectedDay);
        url += "/";
        url += $scope.hourFrom;
        url += "/";
        url += $scope.hourTo;
        $http({
            method: 'GET',
            url: url,
            responseType: 'json'
        }).then(function (response) {
            $scope.drawLines(response.data);
        })
    };

    $scope.changeHoursTo = function () {
        $scope.hoursTo = [];
        for (var i = $scope.hourFrom; i < 24; i++) {
            $scope.hoursTo.push(i);
        }
        if ($scope.hourTo <= $scope.hourFrom) {
            $scope.hourTo = $scope.hourFrom;
        }
    };
    $scope.changeHoursFrom = function () {
        $scope.hoursFrom = [];
        for (i = 0; i <= $scope.hourTo; i++) {
            $scope.hoursFrom.push(i);
        }
        if ($scope.hourFrom > $scope.hourTo) {
            $scope.hourFrom = $scope.hourTo;
        }
    };
    $scope.loadLines = function () {
        var url = $scope.apiUrl;
        url += "getLines";
        $http({
            method: 'GET',
            url: url,
            responseType: 'json'
        }).then(function (response) {
            $scope.linesNumbers = response.data;
            $scope.selectedLineNumber = $scope.linesNumbers[0];
        })
    };
    $scope.getLineTrafficData = function () {
        $scope.clearLines();
        $scope.histogram = $scope.apiUrl + "getHistogramLine/" + $scope.daysCodes.get($scope.selectedDay) + "/" + $scope.hourFrom + "/" + $scope.hourTo + "/" + $scope.selectedLineNumber;
        var url = $scope.apiUrl;
        url += "getLinesTraffic/";
        url += $scope.daysCodes.get($scope.selectedDay);
        url += "/";
        url += $scope.hourFrom;
        url += "/";
        url += $scope.hourTo;
        url += "/";
        url += $scope.selectedLineNumber;
        $http({
            method: 'GET',
            url: url,
            responseType: 'json'
        }).then(function (response) {
            $scope.drawLines(response.data);
        })
    };
    $scope.distance = function (line_by_two_points, point) {
        var x1 = line_by_two_points[0].lng;
        var x2 = line_by_two_points[1].lng;
        var y1 = line_by_two_points[0].lat;
        var y2 = line_by_two_points[1].lat;
        var x0 = point.lng;
        var y0 = point.lat;
        return Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / Math.sqrt((y2 - y1) * (y2 - y1) + (x2 - x1) * (x2 - x1));
    };
    $scope.findMinDistFromPathToPoint = function (path_points, point) {
        var dist_ret = 99999999;
        for (i = 0; i < path_points.length - 1; i++) {
            var points_pair = [path_points[i], path_points[i + 1]];
            var distance = $scope.distance(points_pair, point);
            if (distance < dist_ret) {
                dist_ret = distance;
            }
        }
        return dist_ret;
    };
    $scope.findClosestPath = function (point) {
        var minDist = 99999999;
        var actLine = $scope.lines[0];
        $scope.lines.forEach(function (line) {
            var dist = $scope.findMinDistFromPathToPoint(line.line.getPath().getArray(), point);
            if (dist < minDist) {
                minDist = dist;
                actLine = line;
            }
        });
        return actLine;
    };
    $scope.findCenterOfPath = function (path) {
        var pathLength = google.maps.geometry.spherical.computeLength(path);
        var middleDist = pathLength / 2;
        var dist = 0;
        var lineWithCenter = path[0];
        var beginOfFragmentWithCenter = 0;
        var lastLength = 0;
        for (i = 0; i < path.length - 1; i++) {
            if (dist < middleDist) {
                lastLength = google.maps.geometry.spherical.computeDistanceBetween(path[i], path[i + 1]);
                lineWithCenter = path[i];
                beginOfFragmentWithCenter = i;
                dist += lastLength;
            } else {
                break;
            }
        }
        var distOnBeginOfCenterLine = dist - lastLength;
        var distOnEndOfCenterLine = dist;
        var percentageOfWholeDistanceOnBeginOfCenterLine = distOnBeginOfCenterLine / pathLength;
        var percentageOfWholeDistanceOnEndOfCenterLine = dist / pathLength;
        var a = percentageOfWholeDistanceOnEndOfCenterLine - percentageOfWholeDistanceOnBeginOfCenterLine;
        var b = 1 / a;
        var c = 0.5 - percentageOfWholeDistanceOnBeginOfCenterLine;
        var d = c * b;
        var inBetween = google.maps.geometry.spherical.interpolate(path[beginOfFragmentWithCenter], path[beginOfFragmentWithCenter + 1], d);
        return inBetween;
    };
    $scope.getStretches = function () {
        $scope.clearLines();
        $scope.histogram = "";
        var url = $scope.apiUrl;
        url += "getStretches/";
        url += $scope.minSupport;
        url += "/";
        url += $scope.minDiffDelay;
        $http({
            method: 'GET',
            url: url,
            responseType: 'json'
        }).then(function (response) {
            $scope.drawLines(response.data);
        })
    };

    $scope.test = function () {
        var routes = [{
            'points': [
                {'lat': 52.999226, 'lng': 23.151409},
                {'lat': 52.9945, 'lng': 23.150332},
                {'lat': 52.992036, 'lng': 23.149696},
                {'lat': 52.991524, 'lng': 23.149564},
                {'lat': 52.987058, 'lng': 23.148453},
                {'lat': 52.986564, 'lng': 23.148329},
                {'lat': 52.986311, 'lng': 23.148276},
                {'lat': 52.986072, 'lng': 23.14822},
                {'lat': 52.984915, 'lng': 23.14818},
                {'lat': 52.982368, 'lng': 23.147693},
                {'lat': 52.981921, 'lng': 23.147602}],
            'color': '#00FF00',
            'content': '<b>Testowy teskt</b>'
        }
        ];
        $scope.drawLines(routes);
    }

};

app.controller("BusStopController", BusStopController);