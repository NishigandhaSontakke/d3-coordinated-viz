
(function(){

	//pseudo-global variables
	var attrArray = ["Average Annual Temperature", "Jan_Average Temperature", "Jan_Average High Temperature", "Jan_Average Low Temperature", "Jan_Average Precipitation"]; //list of attributes
	var expressed = attrArray[0]; //initial attribute
	

	//begin script when window loads
	window.onload = setMap();
	//window.onload = setChart();
	
	//set up choropleth map
	function setMap(){
		 //map frame dimensions
		 var width = window.innerWidth * 0.5,
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
					
					setGraticule(map, path);
		
					var USA = topojson.feature(usa, usa.objects.cb_2017_us_state_5m),
					usstates = topojson.feature(statesus, statesus.objects.states).features;
	
		//adding all states of US in the background of map
		var countries = map.append("path")
		.datum(USA)
		.attr("class", "countries")
		.attr("d", path);
			
			//join csv data to GeoJSON enumeration units
			usstates = joinData(usstates, csvData);
	
			colorScale = makeColorScale(csvData);
			//add enumeration units to the map
			setEnumerationUnits(usstates, map, path,map, path, colorScale);

			//add coordinated visualization to the map
			setChart(csvData, colorScale);
	
			};


	
	}; //end of setmap function


	
	function setGraticule(map, path){
			
			var graticule = d3.geoGraticule()
			.step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude
	
		//create graticule lines
		var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
			.data(graticule.lines()) //bind graticule lines to each element to be created
			.enter() //create an element for each datum
			.append("path") //append each element to the svg as a path element
			.attr("class", "gratLines") //assign class for styling
			.attr("d", path); //project graticule lines
	};
	
	function joinData(statesus, csvData){
			
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
	
		 console.log(statesus);
			return statesus;
	};

	function makeColorScale(data){
		var colorClasses = [
			"#D4B9DA",
			"#C994C7",
			"#DF65B0",
			"#DD1C77",
			"#980043"
	];

	//create color scale generator
	var colorScale = d3.scaleQuantile()
			.range(colorClasses);

	//build two-value array of minimum and maximum expressed attribute values
	var minmax = [
			d3.min(data, function(d) { return parseFloat(d[expressed]); }),
			d3.max(data, function(d) { return parseFloat(d[expressed]); })
	];
	//assign two-value array as scale domain
	colorScale.domain(minmax);

	return colorScale;
	};

	
	function setEnumerationUnits(usstates, map, path,map, path, colorScale){
	
			// adding selected states
	var regions = map.selectAll(".regions")
	.data(usstates)
	.enter()
	.append("path")
	.attr("class", function(d){
		return "regions " + d.properties.AFFGEOID;
	})
	.attr("d", path)
	.style("fill", function(d){
		return choropleth(d.properties, colorScale);
	});
};

function choropleth(props, colorScale){
    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val == 'number' && !isNaN(val)){
        return colorScale(val);
    } else {
        return "#CCC";
    };
};

//function to create coordinated bar chart

function setChart(csvData, colorScale){
	//chart frame dimensions
	var chartWidth = window.innerWidth * 0.4,
	chartHeight = 473,
	leftPadding = 25,
	rightPadding = 2,
	topBottomPadding = 5,
	chartInnerWidth = chartWidth - leftPadding - rightPadding,
	chartInnerHeight = chartHeight - topBottomPadding * 2,
	translate = "translate(" + leftPadding + "," + topBottomPadding + ")";


  //create a second svg element to hold the bar chart
  var chart = d3.select("body")
  .append("svg")
  .attr("width", chartWidth)
  .attr("height", chartHeight)
  .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //create a scale to size bars proportionally to frame
    var yScale = d3.scaleLinear()
	.range([463,0])
	.domain([0,100]);
  var bars = chart.selectAll(".bars")
  .data(csvData)
  .enter()
  .append("rect")
  .sort(function(a, b){
	return b[expressed]-a[expressed]
})
.attr("class", function(d){
	return "bar " + d.AFFGEOID;
})
.attr("width", chartInnerWidth / csvData.length - 1)
.attr("x", function(d, i){
	return i * (chartInnerWidth / csvData.length) + leftPadding;
})
.attr("height", function(d, i){
	return 463 - yScale(parseFloat(d[expressed]));
})
.attr("y", function(d, i){
	return yScale(parseFloat(d[expressed])) + topBottomPadding;
})
.style("fill", function(d){
	return choropleth(d, colorScale);
});

 //create a text element for the chart title
 var chartTitle = chart.append("text")
 .attr("x", 40)
 .attr("y", 40)
 .attr("class", "chartTitle")
 .text("The " + expressed + " in each region");

//create vertical axis generator
var yAxis = d3.axisLeft()
 .scale(yScale);

//place axis
var axis = chart.append("g")
 .attr("class", "axis")
 .attr("transform", translate)
 .call(yAxis);

//create frame for chart border
var chartFrame = chart.append("rect")
 .attr("class", "chartFrame")
 .attr("width", chartInnerWidth)
 .attr("height", chartInnerHeight)
 .attr("transform", translate);
//annotate bars with attribute value text
var numbers = chart.selectAll(".numbers")
.data(csvData)
.enter()
.append("text")
.sort(function(a, b){
	return b[expressed]-a[expressed]
})
.attr("class", function(d){
	return "numbers " + d.AFFGEOID;
})
.attr("text-anchor", "top")
.attr("x", function(d, i){
	var fraction = (chartInnerWidth / csvData.length) +1;
	return i * fraction + (fraction-1) / 2;
})
.attr("y", function(d){
	return yScale(parseFloat(d[expressed])) + 20;
})
.text(function(d){
	return d[expressed];
});	  
};
  
})(); //last line of main.js


