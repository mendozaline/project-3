function jsonHelper(url, callback) {
    "use strict";
    var requestJSON = new XMLHttpRequest();
    requestJSON.open("GET", url);
    requestJSON.addEventListener("load", function () {
        if (requestJSON.status < 300) {
            callback(requestJSON);
        } else if (requestJSON.status >= 400) {
            var strongError = document.createElement("strong");
            strongError.textContent = "Error: " + requestJSON.status;
            document.getElementById("error").appendChild(strongError);
        }
    });

    requestJSON.send(null);
}

function getSeasonsInfo(jsonReq) {
    "use strict";
    var parsedJSON = JSON.parse(jsonReq.response);

    //remove previous description or error content
    var previousDesc = document.getElementById("desc");
    if (previousDesc) {
        previousDesc.parentNode.removeChild(previousDesc);
    }
    var previousError = document.getElementById("strongError");
    if (previousError) {
        previousError.parentNode.removeChild(previousError);
    }

    //create new description or error content
    if (parsedJSON.Response === "True") {
        var descDiv = document.createElement("div");
        descDiv.id = "desc";
        document.getElementById("info").appendChild(descDiv);

        var seasonTitle = document.createElement("p");
        seasonTitle.id = "title";
        seasonTitle.textContent = "Title: " + parsedJSON.Title;
        descDiv.appendChild(seasonTitle);

        var year = document.createElement("p");
        year.id = "year";
        year.textContent = "Years: " + parsedJSON.Year;
        descDiv.appendChild(year);

        var plot = document.createElement("p");
        plot.id = "plot";
        plot.textContent = "Plot: " + parsedJSON.Plot;
        descDiv.appendChild(plot);

        var seasons = document.createElement("p");
        seasons.id = "seasons";
        seasons.textContent = "Please select a season: ";
        descDiv.appendChild(seasons);

        var buttonDiv = document.createElement("div");
        buttonDiv.id = "buttonDiv";
        descDiv.appendChild(buttonDiv);
    } else {
        var strongError = document.createElement("strong");
        strongError.id = "strongError";
        strongError.textContent = 'Error: "' +
            document.getElementById("title").value +
            '" not found. Please try again. ';
        document.getElementById("info").appendChild(strongError);
    }

    //add event listener: closure
    var addEvntLstnr = function (j) {
        document.getElementById("seasonDiv" + j).addEventListener("click", function () {
            var URL = "http://www.omdbapi.com/?t=";
            var tvTitle = document.getElementById("title").value;
            var season = "&season=" + j + "&type=series&r=json";
            var key = "&apikey=845e868c";
            var searchURL = URL + tvTitle + season + key;
            jsonHelper(searchURL, createChart);
        });
    };

    //create button for each season
    for (var i = 1; i <= parseInt(parsedJSON.totalSeasons); i++) {
        var button = document.createElement("button");
        button.className = "button";
        button.id = "seasonDiv" + i;
        button.textContent = i;
        document.getElementById("buttonDiv").appendChild(button);
        document.getElementById("seasonDiv" + i).addEventListener("click", addEvntLstnr(i));
    }
}

function createChart(chartData) {
    var parsedJSON = JSON.parse(chartData.responseText);
    var episodeData = parsedJSON.Episodes;

    var pad = {top: 50, bottom: 50, left: 75, right: 0};
    var w = parseInt(d3.select("#chartContainer").style("width"));
    var ratio = 0.5;
    var h = w * ratio;

    var xScale = d3.time.scale()
        .range([pad.left, w - pad.right - pad.left]);
    var yScale = d3.scale.linear()
        .range([pad.top, h - pad.bottom]);
    var xAxis = d3.svg.axis()
        .scale(xScale)
        .tickFormat(d3.format("d"))
        .orient("bottom");
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .ticks(5)
        .orient("left");

    var xMinMax = d3.extent(episodeData, function (d) {
        return parseInt(d.Episode);
    });
    var yMinMax = d3.extent(episodeData, function (d) {
        return parseInt(d.imdbRating);
    });

    xScale.domain([xMinMax[0], xMinMax[1]]);
    yScale.domain([10, yMinMax[0] - 1]);

    var svg = d3.select("#chartContainer")
        .insert("svg", ":first-child")
        .attr("width", w)
        .attr("height", h);

    svg.append("text")
        .attr("class", "title")
        .attr("x", w/2)
        .attr("y", 27.5)
        .attr("text-anchor", "middle")
        .attr("font-size", "20px")
        .attr("font-weight", "bold")
        .text(function (d) {
            return parsedJSON.Title + ": Season " +
                   parsedJSON.Season + ", " +
                   parsedJSON.Episodes.length + " episodes";
        });

    var chart = svg.selectAll("g")
        .data(episodeData)
        .enter()
        .append("g")
        .attr("class", "dots")
        .append("a")
        .attr("xlink:href", function (d) {
            return "http://www.imdb.com/title/" + d.imdbID;
        });

    chart.append("circle")
        .attr("cx", function (d) {
            return xScale(parseInt(d.Episode));
        })
        .attr("cy", function (d) {
            if (d.imdbRating === "N/A") {
                return yScale(yMinMax[0]-1);
            } else {
                return yScale(d.imdbRating);
            }
        })
        .attr("r", 7)
        .attr("fill", "crimson")
        .append("title")
        .text("Click circle to go to IMDb page");

    chart.append("text")
        .attr("x", w/2)
        .attr("y", yScale(10))
        .attr("text-anchor", "middle")
        .attr("font-size", "18px")
        .attr("opacity", 0)
        .text(function (d) {
            return d.Episode + " - " + d.Title + ": " + d.imdbRating;
        });

    chart.style("cursor", "crosshair");

    chart.on("mouseover", function (d) {
        d3.select(this)
            .transition()
            .duration(200)
            .select("circle")
            .attr("r", 21);

        d3.select(this)
            .transition()
            .duration(200)
            .select("text")
            .attr("opacity", 1);
    });

    chart.on("mouseout", function (d) {
        d3.select(this)
            .transition()
            .duration(500)
            .select("circle")
            .attr("r", 7);

        d3.select(this)
            .transition()
            .duration(500)
            .select("text")
            .attr("opacity", 0);
    });

    svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(" + (pad.left - 10) + ",0)")
        .call(yAxis)
        .append("text")
        .attr("font-size", 20)
        .attr("transform", "rotate(-90)")
        .attr("x", -h/1.35)
        .attr("y", -40)
        .text("IMDb rating");

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + (h - pad.bottom) + ")")
        .attr("font-size", 15)
        .attr("shape-rendering", "crispEdges")
        .call(xAxis)
        .append("text")
        .attr("font-size", 20)
        .attr("x", w / 2.15)
        .attr("y", 42.5)
        .attr("text-anchor", "middle")
        .text("episodes");
}

document.getElementById("getdata").addEventListener("click", function () {
    var baseURL = "http://www.omdbapi.com/?t=";
    var title = document.getElementById("title").value;
    var end = "&type=series&r=json";
    var key = "&apikey=845e868c";
    var titleURL = baseURL + title + end + key;
    jsonHelper(titleURL, getSeasonsInfo);
});
