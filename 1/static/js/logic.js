<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="initial-scale=1.0, user-scalable=no" />
    <title>Mashups with google.maps.Data</title>
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; overflow: hidden; }
        .nicebox {
          position: absolute;
          text-align: center;
          font-family: "Roboto", "Arial", sans-serif;
          font-size: 13px;
          z-index: 5;
          box-shadow: 0 4px 6px -4px #333;
          padding: 5px 10px;
          background: rgb(255,255,255);
          background: linear-gradient(to bottom,rgba(255,255,255,1) 0%,rgba(245,245,245,1) 100%);
          border: rgb(229, 229, 229) 1px solid;
        }
        #controls {
          top: 10px;
          left: 110px;
          width: 360px;
          height: 45px;
        }
        #data-box {
          top: 10px;
          left: 500px;
          height: 45px;
          line-height: 45px;
          display: none;
        }
        #census-variable {
          width: 360px;
          height: 20px;
        }
        #legend { display: flex; display: -webkit-box; padding-top: 7px }
        .color-key {
          background: linear-gradient(to right,
            hsl(5, 69%, 54%) 0%,
            hsl(29, 71%, 51%) 17%,
            hsl(54, 74%, 47%) 33%,
            hsl(78, 76%, 44%) 50%,
            hsl(102, 78%, 41%) 67%,
            hsl(127, 81%, 37%) 83%,
            hsl(151, 83%, 34%) 100%);
          flex: 1;
          -webkit-box-flex: 1;
          margin: 0 5px;
          text-align: left;
          font-size: 1.0em;
          line-height: 1.0em;
        }
        #data-value { font-size: 2.0em; font-weight: bold }
        #data-label { font-size: 2.0em; font-weight: normal; padding-right: 10px; }
        #data-label:after { content: ':' }
        #data-caret { margin-left: -5px; display: none; font-size: 14px; width: 14px}
    </style>
  </head>
  <body>
    <div id="controls" class="nicebox">
      <div>
      <select id="census-variable">
        <option value="https://storage.googleapis.com/mapsdevsite/json/DP02_0066PE">Percent of population over 25 that completed high
        school</option>
        <option value="https://storage.googleapis.com/mapsdevsite/json/DP05_0017E">Median age</option>
        <option value="https://storage.googleapis.com/mapsdevsite/json/DP05_0001E">Total population</option>
        <option value="https://storage.googleapis.com/mapsdevsite/json/DP02_0016E">Average family size</option>
        <option value="https://storage.googleapis.com/mapsdevsite/json/DP03_0088E">Per-capita income</option>
      </select>
      </div>
      <div id="legend">
        <div id="census-min">min</div>
        <div class="color-key"><span id="data-caret">&#x25c6;</span></div>
        <div id="census-max">max</div>
      </div>
    </div>
    <div id="data-box" class="nicebox">
      <label id="data-label" for="data-value"></label>
      <span id="data-value"></span>
    </div>
    <div id="map"></div>
    <script>
      var mapStyle = [{
        'stylers': [{'visibility': 'off'}]
      }, {
        'featureType': 'landscape',
        'elementType': 'geometry',
        'stylers': [{'visibility': 'on'}, {'color': '#fcfcfc'}]
      }, {
        'featureType': 'water',
        'elementType': 'geometry',
        'stylers': [{'visibility': 'on'}, {'color': '#bfd4ff'}]
      }];
      var map;
      var censusMin = Number.MAX_VALUE, censusMax = -Number.MAX_VALUE;

      function initMap() {

        // load the map
        map = new google.maps.Map(document.getElementById('map'), {
          center: {lat: 40, lng: -100},
          zoom: 4,
          styles: mapStyle
        });


        // set up the style rules and events for google.maps.Data
        map.data.setStyle(styleFeature);
        map.data.addListener('mouseover', mouseInToRegion);
        map.data.addListener('mouseout', mouseOutOfRegion);

        // wire up the button
        var selectBox = document.getElementById('census-variable');
        google.maps.event.addDomListener(selectBox, 'change', function() {
          clearCensusData();
          loadCensusData(selectBox.options[selectBox.selectedIndex].value);
        });

        // state polygons only need to be loaded once, do them now
        loadMapShapes();

      }

      /** Loads the state boundary polygons from a GeoJSON source. */
      function loadMapShapes() {
        // load US state outline polygons from a GeoJson file
        map.data.loadGeoJson('https://storage.googleapis.com/mapsdevsite/json/states.js', { idPropertyName: 'STATE' });

        // wait for the request to complete by listening for the first feature to be
        // added
        google.maps.event.addListenerOnce(map.data, 'addfeature', function() {
          google.maps.event.trigger(document.getElementById('census-variable'),
              'change');
        });
      }

      /**
       * Loads the census data from a simulated API call to the US Census API.
       *
       * @param {string} variable
       */
      function loadCensusData(variable) {
        // load the requested variable from the census API (using local copies)
        var xhr = new XMLHttpRequest();
        xhr.open('GET', variable + '.json');
        xhr.onload = function() {
          var censusData = JSON.parse(xhr.responseText);
          censusData.shift(); // the first row contains column names
          censusData.forEach(function(row) {
            var censusVariable = parseFloat(row[0]);
            var stateId = row[1];

            // keep track of min and max values
            if (censusVariable < censusMin) {
              censusMin = censusVariable;
            }
            if (censusVariable > censusMax) {
              censusMax = censusVariable;
            }

            // update the existing row with the new data
            map.data
              .getFeatureById(stateId)
              .setProperty('census_variable', censusVariable);
          });

          // update and display the legend
          document.getElementById('census-min').textContent =
              censusMin.toLocaleString();
          document.getElementById('census-max').textContent =
              censusMax.toLocaleString();
        };
        xhr.send();
      }

      /** Removes census data from each shape on the map and resets the UI. */
      function clearCensusData() {
        censusMin = Number.MAX_VALUE;
        censusMax = -Number.MAX_VALUE;
        map.data.forEach(function(row) {
          row.setProperty('census_variable', undefined);
        });
        document.getElementById('data-box').style.display = 'none';
        document.getElementById('data-caret').style.display = 'none';
      }

      /**
       * Applies a gradient style based on the 'census_variable' column.
       * This is the callback passed to data.setStyle() and is called for each row in
       * the data set.  Check out the docs for Data.StylingFunction.
       *
       * @param {google.maps.Data.Feature} feature
       */
      function styleFeature(feature) {
        var low = [5, 69, 54];  // color of smallest datum
        var high = [151, 83, 34];   // color of largest datum

        // delta represents where the value sits between the min and max
        var delta = (feature.getProperty('census_variable') - censusMin) /
            (censusMax - censusMin);

        var color = [];
        for (var i = 0; i < 3; i++) {
          // calculate an integer color based on the delta
          color[i] = (high[i] - low[i]) * delta + low[i];
        }

        // determine whether to show this shape or not
        var showRow = true;
        if (feature.getProperty('census_variable') == null ||
            isNaN(feature.getProperty('census_variable'))) {
          showRow = false;
        }

        var outlineWeight = 0.5, zIndex = 1;
        if (feature.getProperty('state') === 'hover') {
          outlineWeight = zIndex = 2;
        }

        return {
          strokeWeight: outlineWeight,
          strokeColor: '#fff',
          zIndex: zIndex,
          fillColor: 'hsl(' + color[0] + ',' + color[1] + '%,' + color[2] + '%)',
          fillOpacity: 0.75,
          visible: showRow
        };
      }

      /**
       * Responds to the mouse-in event on a map shape (state).
       *
       * @param {?google.maps.MouseEvent} e
       */
      function mouseInToRegion(e) {
        // set the hover state so the setStyle function can change the border
        e.feature.setProperty('state', 'hover');

        var percent = (e.feature.getProperty('census_variable') - censusMin) /
            (censusMax - censusMin) * 100;

        // update the label
        document.getElementById('data-label').textContent =
            e.feature.getProperty('NAME');
        document.getElementById('data-value').textContent =
            e.feature.getProperty('census_variable').toLocaleString();
        document.getElementById('data-box').style.display = 'block';
        document.getElementById('data-caret').style.display = 'block';
        document.getElementById('data-caret').style.paddingLeft = percent + '%';
      }

      /**
       * Responds to the mouse-out event on a map shape (state).
       *
       * @param {?google.maps.MouseEvent} e
       */
      function mouseOutOfRegion(e) {
        // reset the hover state, returning the border to normal
        e.feature.setProperty('state', 'normal');
      }

    </script>
    <script async defer
        src="https://maps.googleapis.com/maps/api/js?key=API_KEY&callback=initMap">
    </script>
  </body>
</html>
Getting started
You can develop your own version of this choropleth map by using the code in this tutorial. To begin doing this, create a new file in a text editor and save it as index.html.

Read the sections that follow to understand the code that you can add to this file.

Creating a basic map
This section explains the code that sets up a basic map. This may be similar to how you've created maps when getting started with the Maps JavaScript API.

Copy the code below into your index.html file. This code loads the Maps JavaScript API, and makes the map fullscreen.

<!DOCTYPE html>
<html>
  <head>
  <meta charset="utf-8">
      <meta name="viewport" content="initial-scale=1.0, user-scalable=no" />
      <title>Mashups with google.maps.Data</title>
      <style>
        #map {
          height: 100%;
        }
        /* Optional: Makes the sample page fill the window. */
        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
        }
      </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      function initMap() {

        // load the map
        map = new google.maps.Map(document.getElementById('map'), {
          center: {lat: 40, lng: -100},
          zoom: 4,
          styles: mapStyle
        });

        var mapStyle = [{
          'featureType': 'all',
          'elementType': 'all',
          'stylers': [{'visibility': 'off'}]
        }, {
          'featureType': 'landscape',
          'elementType': 'geometry',
          'stylers': [{'visibility': 'on'}, {'color': '#fcfcfc'}]
        }, {
          'featureType': 'water',
          'elementType': 'labels',
          'stylers': [{'visibility': 'off'}]
        }, {
          'featureType': 'water',
          'elementType': 'geometry',
          'stylers': [{'visibility': 'on'}, {'hue': '#5f94ff'}, {'lightness': 60}]
        }];
      }

    </script>
    <script async defer
        src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap">
    </script>
  </body>
</html>
The code within the first script tag is the starting point that runs the program by creating a function called initMap that initializes the map object.

The stylers in the code above turn off the visibility of all featureTypes on the map like roads, points of interest, landscape, administrative areas, and all their elementTypes. For a list of all available values for featureType and elementType, see the JSON style reference.

Click YOUR_API_KEY in the code sample, or follow the instructions to get an API key. Replace YOUR_API_KEY with your application's API key. After the API is completely loaded, the callback parameter in the script tag below executes the initMap() function in the HTML file.

<script> async defer
    src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&callback=initMap"
</script>
Creating and styling the map control
The code below creates the following controls on the map:

A control with a dropdown menu that has 5 different data options.
A map legend.
A data box displaying state-specific data which appears when you hover over a polygon.
<div id="controls" class="nicebox">
  <div>
  <select id="census-variable">
    <option value="https://storage.googleapis.com/mapsdevsite/json/DP02_0066PE">Percent of population over 25 that completed high
    school</option>
    <option value="https://storage.googleapis.com/mapsdevsite/json/DP05_0017E">Median age</option>
    <option value="https://storage.googleapis.com/mapsdevsite/json/DP05_0001E">Total population</option>
    <option value="https://storage.googleapis.com/mapsdevsite/json/DP02_0016E">Average family size</option>
    <option value="https://storage.googleapis.com/mapsdevsite/json/DP03_0088E">Per-capita income</option>
  </select>
  </div>
  <div id="legend">
    <div id="census-min">min</div>
    <div class="color-key"><span id="data-caret">◆</span></div>
    <div id="census-max">max</div>
  </div>
</div>
<div id="data-box" class="nicebox">
  <label id="data-label" for="data-value"></label>
  <span id="data-value"></span>
</div>
Use the code below within the style tags to style the map controls.

<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; overflow: hidden; }
    .nicebox {
      position: absolute;
      text-align: center;
      font-family: "Roboto", "Arial", sans-serif;
      font-size: 13px;
      z-index: 5;
      box-shadow: 0 4px 6px -4px #333;
      padding: 5px 10px;
      background: rgb(255,255,255);
      background: linear-gradient(to bottom,rgba(255,255,255,1) 0%,rgba(245,245,245,1) 100%);
      border: rgb(229, 229, 229) 1px solid;
    }
    #controls {
      top: 10px;
      left: 110px;
      width: 360px;
      height: 45px;
    }
    #data-box {
      top: 10px;
      left: 500px;
      height: 45px;
      line-height: 45px;
      display: none;
    }
    #census-variable {
      width: 360px;
      height: 20px;
    }
    #legend { display: flex; display: -webkit-box; padding-top: 7px }
    .color-key {
      background: linear-gradient(to right,
        hsl(5, 69%, 54%) 0%,
        hsl(29, 71%, 51%) 17%,
        hsl(54, 74%, 47%) 33%,
        hsl(78, 76%, 44%) 50%,
        hsl(102, 78%, 41%) 67%,
        hsl(127, 81%, 37%) 83%,
        hsl(151, 83%, 34%) 100%);
      flex: 1;
      -webkit-box-flex: 1;
      margin: 0 5px;
      text-align: left;
      font-size: 1.0em;
      line-height: 1.0em;
    }
    #data-value { font-size: 2.0em; font-weight: bold }
    #data-label { font-size: 2.0em; font-weight: normal; padding-right: 10px; }
    #data-label:after { content: ':' }
    #data-caret { margin-left: -5px; display: none; font-size: 14px; width: 14px}
</style>