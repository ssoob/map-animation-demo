$(document).ready(function () {



    /**
     * map script
     */
    mapboxgl.accessToken = 'pk.eyJ1Ijoic3Nzc3Nvb2IiLCJhIjoiY2txYWVodnJrMDQzYTJ2cWhtY3M5b3Z1cyJ9.uKGSe4xA1IMLmexsEf6VTQ';
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        // center: [-74.0066, 40.7135],
        center: [126.970726, 37.555227],
        zoom: 15.5,
        pitch: 45,
        bearing: -17.6,
        container: 'map',
        antialias: true
    });

    map.on('load', function () {
// Insert the layer beneath any symbol layer.
        var layers = map.getStyle().layers;
        var labelLayerId;
        for (var i = 0; i < layers.length; i++) {
            if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
                labelLayerId = layers[i].id;
                break;
            }
        }

        // The 'building' layer in the Mapbox Streets
        // vector tileset contains building height data
        // from OpenStreetMap.

        //빌딩 layer의 tile은 OpenstreetMap에서 제공하는 높이 데이터를 사용
        map.addLayer(
            {
                'id': 'add-3d-buildings',
                'source': 'composite',
                'source-layer': 'building',
                'filter': ['==', 'extrude', 'true'],
                'type': 'fill-extrusion',
                'minzoom': 15,
                'paint': {
                    'fill-extrusion-color': '#aaa',

                    // Use an 'interpolate' expression to
                    // add a smooth transition effect to
                    // the buildings as the user zooms in.
                    'fill-extrusion-height': [
                        'interpolate',          //zoom in 시, 빌딩이 부드럽게 움직이는 효과를 주기위해 추가
                        ['linear'],
                        ['zoom'],
                        15,
                        0,
                        15.05,
                        ['get', 'height']
                    ],
                    'fill-extrusion-base': [
                        'interpolate',
                        ['linear'],
                        ['zoom'],
                        15,
                        0,
                        15.05,
                        ['get', 'min_height']
                    ],
                    'fill-extrusion-opacity': 0.6
                }
            },

            labelLayerId
        );
    });


    var marker1 = new mapboxgl.Marker()
        .setLngLat([126.970720, 37.555220])
        .addTo(map);

    // Create a default Marker, colored black, rotated 45 degrees.
    // var marker2 = new mapboxgl.Marker({ color: 'black', rotation: 45 })
    //     .setLngLat([126.970726, 37.556226])
    //     .addTo(map);


    /**
     * animation
     **/

    //geojson으로 경로 지정
    var route = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {},
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [126.96970224380492, 37.5537894793787], [126.96989536285399, 37.55277730341982],
                        [126.9696056842804, 37.55278580915741], [126.96950912475586, 37.55321960048787],
                        [126.9690155982971, 37.55324511754632], [126.96910142898558, 37.55518438842468]
                    ]
                }
            }
        ]
    }

    var point = {
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'Point',
                    'coordinates': origin
                }
            }
        ]
    };

    /**
     * 여기서부터 수정할 부분
     */

        // Calculate the distance in kilometers between route start/end point.
    var lineDistance = turf.length(route.features[0]);
    var arc = [];

    // Number of steps to use in the arc and animation, more steps means
    // a smoother arc and animation, but too many steps will result in a
    // low frame rate
    var steps = 500;

    // Draw an arc between the `origin` & `destination` of the two points
    for (var i = 0; i < lineDistance; i += lineDistance / steps) {
        var segment = turf.along(route.features[0], i);
        arc.push(segment.geometry.coordinates);
    }

    // Update the route with calculated arc coordinates
    route.features[0].geometry.coordinates = arc;

    // Used to increment the value of the point measurement against the route.
    var counter = 0;

    map.on('load', function () {
        // Add a source and layer displaying a point which will be animated in a circle.
        map.addSource('route', {        //지도에 geojson추가 - linestring
            'type': 'geojson',
            'data': route
        });

        map.addSource('point', {        //지도에 geojsoncnrk - point
            'type': 'geojson',
            'data': point
        });

        map.addLayer({                 //위에서 추가한 linestring Source의 layer를 지도에 표출
            'id': 'route',
            'source': 'route',
            'type': 'line',
            'paint': {
                'line-width': 2,
                'line-color': '#007cbf'
            }
        });

        map.addLayer({               //위에서 추가한 point Source의 layer를 지도에 표출
            'id': 'point',
            'source': 'point',
            'type': 'symbol',
            'layout': {
                // This icon is a part of the Mapbox Streets style.
                // To view all images available in a Mapbox style, open
                // the style in Mapbox Studio and click the "Images" tab.
                // To add a new image to the style at runtime see
                // https://docs.mapbox.com/mapbox-gl-js/example/add-image/
                'icon-image': 'airport-15',
                // 'icon-image': 'image/ic-poi-foodcar-working.png',
                'icon-rotate': ['get', 'bearing'],
                'icon-rotation-alignment': 'map',
                'icon-allow-overlap': true,
                'icon-ignore-placement': true
            }
        });

        function animate() {
            var start =
                route.features[0].geometry.coordinates[
                    counter >= steps ? counter - 1 : counter
                    ];
            var end =
                route.features[0].geometry.coordinates[
                    counter >= steps ? counter : counter + 1
                    ];
            if (!start || !end) return;

            // Update point geometry to a new position based on counter denoting
            // the index to access the arc
            point.features[0].geometry.coordinates =
                route.features[0].geometry.coordinates[counter];

            // Calculate the bearing to ensure the icon is rotated to match the route arc
            // The bearing is calculated between the current point and the next point, except
            // at the end of the arc, which uses the previous point and the current point
            point.features[0].properties.bearing = turf.bearing(
                turf.point(start),
                turf.point(end)
            );

            // Update the source with this new data
            map.getSource('point').setData(point);

            // Request the next frame of animation as long as the end has not been reached
            if (counter < steps) {
                requestAnimationFrame(animate);
            }

            counter = counter + 1;
        }

        document
            .getElementById('play_animation')
            .addEventListener('click', function () {
                // Set the coordinates of the original point back to origin
                console.log("play Animation");
                point.features[0].geometry.coordinates = origin;

                // Update the source layer
                map.getSource('point').setData(point);

                // Reset the counter
                counter = 0;

                // Restart the animation
                animate(counter);
            });

        // Start the animation
        animate(counter);
    });


    /**
     * time slider
     */

    // (function () {
        var current_time = new Date('2021-01-01T00:00:00');
        // $('#version').text('Version: ' + $.fn.TimeSlider.VERSION);

        // $('#slider123').TimeSlider({
        //     start_timestamp: current_time - 3600 * 12 * 1000,
        //     init_cells: [
        //         {
        //             '_id': 'c1',
        //             'start': (current_time - (3600 * 5.4 * 1000) + 1234),
        //             'stop': current_time - 3600 * 3.2 * 1000,
        //             'style': {
        //                 'background-color': '#76C4FF'
        //             }
        //         },
        //         {
        //             '_id': 'c2',
        //             'start': (current_time - (3600 * 2.1 * 1000))
        //         }
        //     ]
        // });

        $('#slider456').TimeSlider({
            update_timestamp_interval: 10,
            update_interval: 10,
            // show_ms: true,
            hours_per_ruler: 9,                                   //timeslider에 한번에 나타낼 시간 -> 9시간
            // graduation_step: 0,                                   //한시간을 12등분(5분간격)하여 나눔(설정 안할시 20분 간격으로 지정)
            start_timestamp: current_time - 3600 * 7 * 1000,      //time slider의 끝부분 시간을 나타냄
            timecell_enable_move: true,                           //타임셀 움직일 수 있도록 함 (default = true)
            timecell_enable_resize: false,                        //타임셀 크기 설정 불가(default = true)
            ruler_enable_move: false,                             //시간표출부분(ruler) 움직일 수 없도록 함 (default = true)
            init_cells: [
                {'_id': 'c1', 'start': (current_time - (3600 * 6.2 * 1000) + 5678), 'stop': current_time - 3600 * 4.8 * 1000},
                // {'_id': 'c1', 'start': (current_time - (3600 * 6.2 * 1000) + 5678), 'stop': current_time + 5678},
                // {'_id': 'c2', 'start': (current_time - (3600 * 3.1 * 1000) + 864), 'stop': current_time}
            ]
        });

    // })();
});
