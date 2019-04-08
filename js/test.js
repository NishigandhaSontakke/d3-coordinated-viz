//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
	//map frame dimensions
    var width = 960,
		height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
		.attr("height", height);
	
	  //create Albers equal area conic projection
	  var projection = d3.geoAlbers()
	  .parallels([20, 60])
	  .scale(900)
	  .translate([width / 2, height / 2]);

	  var path = d3.geoPath()
	  .projection(projection);
		
    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/tempdata.csv")); //load attributes from csv
    promises.push(d3.json("data/cb_2017_us_state_5m.topojson")); //load background spatial data(all US states)
    promises.push(d3.json("data/states.topojson")); //load choropleth spatial data (selected states)
	Promise.all(promises).then(callback);
	function callback(data){
		csvData = data[0];
		usa = data[1];
		statesus = data[2];
		var graticule = d3.geoGraticule()
		.step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

	//create graticule lines
	var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
		.data(graticule.lines()) //bind graticule lines to each element to be created
		.enter() //create an element for each datum
		.append("path") //append each element to the svg as a path element
		.attr("class", "gratLines") //assign class for styling
		.attr("d", path); //project graticule lines
		 //translate europe TopoJSON
		 var USA = topojson.feature(usa, usa.objects.cb_2017_us_state_5m),
		 usstates = topojson.feature(statesus, statesus.objects.states).features;

		 //variables for data join
		var attrArray = ["Average Annual Temperature", "Jan_Average Temperature", "Jan_Average High Temperature", "Jan_Average Low Temperature", "Jan_Average Precipitation"];
		
		 //loop through csv to assign each set of csv attribute values to geojson region
		 for (var i=0; i<csvData.length; i++){
			var csvRegion = csvData[i]; //the current region
			var csvKey = csvRegion.AFFGEOID; //the CSV primary key

			//loop through geojson regions to find correct region
			for (var a=0; a<statesus.length; a++){

					var geojsonProps = statesus[a].properties; //the current region geojson properties
					var geojsonKey = geojsonProps.AFFGEOID; //the geojson primary key

					//where primary keys match, transfer csv data to geojson properties object
					if (geojsonKey == csvKey){

							//assign all attributes and values
							attrArray.forEach(function(attr){
									var val = parseFloat(csvRegion[attr]); //get csv attribute value
									geojsonProps[attr] = val; //assign attribute and value to geojson properties
							});
					};
			};
	};

	//adding all states of US in the background of map
	var countries = map.append("path")
	.datum(USA)
	.attr("class", "countries")
	.attr("d", path);
	// adding selected states
	var regions = map.selectAll(".regions")
	.data(usstates)
	.enter()
	.append("path")
	.attr("class", function(d){
		return "regions " + d.properties.AFFGEOID;
	})
	.attr("d", path);

			//examine the results
			console.log(USA);
			console.log(usstates);
			console.log(csvData);
			console.log(usa);
			console.log(statesus);
		};
};