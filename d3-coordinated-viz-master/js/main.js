(function() {

    //pseudo-global variables
    var attrArray = ["Average Annual Temperature", "Jan_Average Temperature", "Jan_Average High Temperature", "Jan_Average Low Temperature", "Jan_Average Precipitation"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.4,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame
    // get min, max
    //var min = d3.min(csvData, function(d){return d[expressed];});
    //var max = d3.max(csvData, function(d){return d[expressed];});
    //console.log(min,max);
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([-4, 90]);

    //begin script when window loads
    window.onload = setMap();
    //window.onload = setChart();

    //set up choropleth map
    function setMap() {
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

        function callback(data) {
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
            setEnumerationUnits(usstates, map, path, map, path, colorScale);

            //add coordinated visualization to the map
            setChart(csvData, colorScale);

            createDropdown();

        };



    }; //end of setmap function



    function setGraticule(map, path) {

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

    function joinData(statesus, csvData) {

        //variables for data join
        var attrArray = ["Average Annual Temperature", "Jan_Average Temperature", "Jan_Average High Temperature", "Jan_Average Low Temperature", "Jan_Average Precipitation"];

        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i = 0; i < csvData.length; i++) {
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.adm_code; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a = 0; a < statesus.length; a++) {

                var geojsonProps = statesus[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.adm_code; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {

                    //assign all attributes and values
                    attrArray.forEach(function(attr) {
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };

        console.log(statesus);
        return statesus;
    };

    function makeColorScale(data) {
        var colorClasses = [
            "#edf8fb",
            "#b3cde3",
            "#8c96c6",
            "#8856a7",
            "#810f7c"
        ];

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build two-value array of minimum and maximum expressed attribute values
        var minmax = [
            d3.min(data, function(d) {
                return parseFloat(d[expressed]);
            }),
            d3.max(data, function(d) {
                return parseFloat(d[expressed]);
            })
        ];
        //assign two-value array as scale domain
        colorScale.domain(minmax);

        return colorScale;
    };


    function setEnumerationUnits(usstates, map, path, map, path, colorScale) {

        // adding selected states
        var regions = map.selectAll(".regions")
            .data(usstates)
            .enter()
            .append("path")
            .attr("class", function(d) {
                return "regions " + d.properties.adm_code;
            })
            .attr("d", path)
            .style("fill", function(d) {
                return choropleth(d.properties, colorScale);
            })
            .on("mouseover", function(d) {
                highlight(d.properties);
            })
            .on("mouseout", function(d) {
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);

        var desc = regions.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.5px"}');

    };

    function choropleth(props, colorScale) {
        //make sure attribute value is a number
        var val = parseFloat(props[expressed]);
        //if attribute value exists, assign a color; otherwise assign gray
        if (typeof val == 'number' && !isNaN(val)) {
            return colorScale(val);
        } else {
            return "#CCC";
        };
    };

    //function to create coordinated bar chart

    function setChart(csvData, colorScale) {



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


        var bars = chart.selectAll(".bars")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b) {
                return b[expressed] - a[expressed]
            })
            .attr("class", function(d) {
                return "bar " + d.adm_code;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveLabel);

        var desc = bars.append("desc")
            .text('{"stroke": "none", "stroke-width": "0px"}');

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
        /*.append("text")
        .sort(function(a, b){
        	return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
        	return "numbers " + d.adm_code;
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
        });	 */
        updateChart(bars, csvData.length, colorScale);
    }; //setchart end

    function createDropdown() {
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function() {
                changeAttribute(this.value, csvData)
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d) {
                return d
            })
            .text(function(d) {
                return d
            });
    };

    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var regions = d3.selectAll(".regions")
            .transition()
            .duration(1000)
            .style("fill", function(d) {
                return choropleth(d.properties, colorScale)
            });

        //re-sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
            //re-sort bars
            .sort(function(a, b) {
                return b[expressed] - a[expressed];
            }).transition() //add animation
            .delay(function(d, i) {
                return i * 20
            })
            .duration(500);
        updateChart(bars, csvData.length, colorScale);
    }; //end of changeAttribute()

    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale) {
        //position bars
        bars.attr("x", function(d, i) {
                return i * (chartInnerWidth / n) + leftPadding;
            })
            //size/resize bars
            .attr("height", function(d, i) {
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i) {
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function(d) {
                return choropleth(d, colorScale);
            });

        var chartTitle = d3.select(".chartTitle")
            .text("The " + expressed + " in each region");
    };

    function highlight(props) {
        //change stroke
        var selected = d3.selectAll("." + props.adm_code)
            .style("stroke", "#d01c8b")
            .style("stroke-width", "2");

        setLabel(props);
    };


    function dehighlight(props) {
        var selected = d3.selectAll("." + props.adm_code)
            .style("stroke", function() {
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function() {
                return getStyle(this, "stroke-width")
            });

        function getStyle(element, styleName) {
            var styleText = d3.select(element)
                .select("desc")
                .text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        };

        //...remove info label
        d3.select(".infolabel")
            .remove();
    };

    //function to create dynamic label
    function setLabel(props) {
        //label content
        var labelAttribute = "<h5>" + props[expressed] +
            "</h5><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3.select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.adm_code + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div")
            .attr("class", "labelname")
            .html(props.name);
    };
    //function to move info label with mouse
    function moveLabel() {
        //use coordinates of mousemove event to set label coordinates
        var x = d3.event.clientX + 2,
            y = d3.event.clientY - 75;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    };
})(); //last line of main.js