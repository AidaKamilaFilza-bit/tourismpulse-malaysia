// ========================================
// MAP DATA STORAGE
// ========================================

let tourismMapData = [];
let recoveryMapData = [];
let malaysiaGeoJSON = null;
let currentStateLayer = null;
let mapLegend = null;
let forecastData = [];
let forecastChart = null;

// ========================================
// MALAYSIA INTERACTIVE MAP
// ========================================

const map = L.map("malaysia-map").setView(
    [4.2105, 108.9758],
    5
);

L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
        attribution: "&copy; OpenStreetMap contributors"
    }
).addTo(map);

// ========================================
// LOAD MALAYSIA STATE BOUNDARIES
// ========================================

// ========================================
// LOAD TOURISM RECOVERY + MALAYSIA MAP
// ========================================

Papa.parse("data/recovery_index_f.csv", {

    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,

    complete: function(results) {

        const recoveryData = results.data;
        recoveryMapData = recoveryData;

        console.log("Recovery data loaded!");
        console.log(recoveryData);

        // --------------------------------
        // Match GeoJSON names to CSV names
        // --------------------------------

        const stateNameMap = {
            "Kuala Lumpur": "WP Kuala Lumpur",
            "Putrajaya": "WP Putrajaya",
            "Labuan": "WP Labuan",
            "Penang": "Pulau Pinang"
        };

        // --------------------------------
        // Recovery colour function
        // --------------------------------

        function getRecoveryColor(recovery) {

            if (recovery >= 1.00) {
                return "#087f5b";
            }

            if (recovery >= 0.85) {
                return "#52b788";
            }

            if (recovery >= 0.70) {
                return "#f4a261";
            }

            return "#d95d39";
        }


        // --------------------------------
        // Load state boundaries
        // --------------------------------

        fetch("data/malaysia-states.geojson")
            .then(response => response.json())
            .then(geojsonData => {
                malaysiaGeoJSON = geojsonData;

                currentStateLayer = L.geoJSON(geojsonData, {

                    style: function(feature) {

                        const geoStateName =
                            feature.properties.shapeName;

                        const csvStateName =
                            stateNameMap[geoStateName] ||
                            geoStateName;

                        const stateData =
                            recoveryData.find(
                                row => row.state === csvStateName
                            );

                        const recovery =
                            stateData
                                ? stateData.recovery_ratio_2023_vs_2019
                                : null;

                        return {
                            color: "#ffffff",
                            weight: 1.5,
                            fillColor: recovery !== null
                                ? getRecoveryColor(recovery)
                                : "#cccccc",
                            fillOpacity: 0.75
                        };
                    },


                    onEachFeature: function(feature, layer) {

                        const geoStateName =
                            feature.properties.shapeName;

                        const csvStateName =
                            stateNameMap[geoStateName] ||
                            geoStateName;

                        const stateData =
                            recoveryData.find(
                                row => row.state === csvStateName
                            );

                        if (stateData) {

                            const recoveryPercent =
                                (
                                    stateData
                                        .recovery_ratio_2023_vs_2019
                                    * 100
                                ).toFixed(1);

                            layer.bindTooltip(
                                `<strong>${csvStateName}</strong><br>
                                 Recovery: ${recoveryPercent}%`,
                                {
                                    sticky: true
                                }
                            );

                        } else {

                            layer.bindTooltip(
                                `<strong>${geoStateName}</strong><br>
                                 No recovery data`,
                                {
                                    sticky: true
                                }
                            );
                        }
                        // Click state to update Destination Profile
layer.on("click", function() {
    console.log("State clicked:", csvStateName);
    updateDestinationProfile(csvStateName);
});
                    }

                }).addTo(map);


                map.fitBounds(
                    currentStateLayer.getBounds()
                );

                // --------------------------------
// MAP LEGEND
// --------------------------------

mapLegend = L.control({
    position: "bottomright"
});

mapLegend.onAdd = function() {

    const div = L.DomUtil.create(
        "div",
        "map-legend"
    );

    div.innerHTML = `
        <h4>Tourism Recovery</h4>

        <div>
            <span class="legend-color"
                  style="background:#087f5b"></span>
            <span><strong>100%+</strong> Above 2019 level</span>
        </div>

        <div>
            <span class="legend-color"
                  style="background:#52b788"></span>
            <span><strong>85–99.9%</strong> Near 2019 level</span>
        </div>

        <div>
            <span class="legend-color"
                  style="background:#f4a261"></span>
            <span><strong>70–84.9%</strong> Still recovering</span>
        </div>

        <div>
            <span class="legend-color"
                  style="background:#d95d39"></span>
            <span><strong>&lt;70%</strong> Further below 2019</span>
        </div>
    `;

    return div;
};

mapLegend.addTo(map);
                console.log(
                    "Tourism recovery map loaded!"
                );

            });

    }

});
// ========================================
// TOURISMPULSE MALAYSIA
// Load tourism data
// ========================================

Papa.parse("data/tourism_state_panel_clean.csv", {

    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,

    complete: function(results) {

        const tourismData = results.data;
        tourismMapData = tourismData;

        updateTourismStoryChart();

        console.log("Tourism data loaded!");
        console.log(tourismData);


        // ========================================
        // 1. FILTER 2019 AND 2023 DATA
        // ========================================

        const data2019 = tourismData.filter(row => row.year === 2019);
        const data2023 = tourismData.filter(row => row.year === 2023);

console.log(
    "2023 Visitors:",
    data2023.map(row => ({
        state: row.state,
        visitors: row.visitors_000
    }))
);

console.log(
    "2023 Trips:",
    data2023.map(row => ({
        state: row.state,
        trips: row.trips_000
    }))
);

        // ========================================
        // 2. TOTAL TOURISM RECEIPTS 2023
        // ========================================

        const receipts2023 = data2023.reduce(
            (total, row) => total + (row.receipts_rm_million || 0),
            0
        );

        const receipts2023Billion = receipts2023 / 1000;


        // ========================================
        // 3. TOTAL TOURISM RECEIPTS 2019
        // ========================================

        const receipts2019 = data2019.reduce(
            (total, row) => total + (row.receipts_rm_million || 0),
            0
        );


        // ========================================
        // 4. NATIONAL RECOVERY
        // ========================================

        const recovery =
            (receipts2023 / receipts2019) * 100;


        // ========================================
        // 5. NUMBER OF AREAS
        // ========================================

        const states = new Set(
            tourismData
                .map(row => row.state)
                .filter(Boolean)
        );

        const numberOfAreas = states.size;


        // ========================================
        // 6. DISPLAY ON WEBSITE
        // ========================================

        document.getElementById("total-receipts").textContent =
            "RM" + receipts2023Billion.toFixed(1) + "B";

        document.getElementById("national-recovery").textContent =
            recovery.toFixed(1) + "%";

        document.getElementById("areas-analysed").textContent =
            numberOfAreas;

    },

    error: function(error) {

        console.error("Error loading tourism data:", error);

    }

});

// ========================================
// MAP DROPDOWN
// Switch between map indicators
// ========================================

document
    .getElementById("map-indicator")
    .addEventListener("change", function () {

        const selectedIndicator = this.value;

        console.log(
            "Map indicator selected:",
            selectedIndicator
        );

        if (selectedIndicator === "receipts") {
            showReceiptsMap();
        }

        if (selectedIndicator === "recovery") {
            showRecoveryMap();
        }

        if (selectedIndicator === "visitors") {
            showVisitorsMap();
        }

        if (selectedIndicator === "trips") {
            showTripsMap();
        }

    });

// ========================================
// SHOW 2023 TOURISM RECEIPTS
// ========================================

function showReceiptsMap() {

    // Get only 2023 tourism data
    const data2023 = tourismMapData.filter(
        row => row.year === 2023
    );

    console.log("2023 map data:", data2023);


    // Remove current state layer
    if (currentStateLayer) {
        map.removeLayer(currentStateLayer);
    }


    // Match GeoJSON names with CSV names
    const stateNameMap = {
        "Kuala Lumpur": "WP Kuala Lumpur",
        "Putrajaya": "WP Putrajaya",
        "Labuan": "WP Labuan",
        "Penang": "Pulau Pinang"
    };


    // Colour states based on receipts
    function getReceiptsColor(receipts) {

        if (receipts >= 10000) {
            return "#087f5b";
        }

        if (receipts >= 5000) {
            return "#52b788";
        }

        if (receipts >= 2500) {
            return "#f4a261";
        }

        return "#d95d39";
    }


    currentStateLayer = L.geoJSON(
        malaysiaGeoJSON,
        {

            style: function(feature) {

                const geoStateName =
                    feature.properties.shapeName;

                const csvStateName =
                    stateNameMap[geoStateName] ||
                    geoStateName;

                const stateData =
                    data2023.find(
                        row => row.state === csvStateName
                    );

                const receipts =
                    stateData
                        ? stateData.receipts_rm_million
                        : null;


                return {

                    color: "#ffffff",

                    weight: 1.5,

                    fillColor:
                        receipts !== null
                            ? getReceiptsColor(receipts)
                            : "#cccccc",

                    fillOpacity: 0.75

                };

            },


            onEachFeature: function(feature, layer) {

                const geoStateName =
                    feature.properties.shapeName;

                const csvStateName =
                    stateNameMap[geoStateName] ||
                    geoStateName;

                const stateData =
                    data2023.find(
                        row => row.state === csvStateName
                    );


                if (stateData) {

                    const receiptsBillion =
                        (
                            stateData.receipts_rm_million
                            / 1000
                        ).toFixed(2);


                    layer.bindTooltip(

                        `<strong>${csvStateName}</strong><br>
                         2023 Tourism Receipts:
                         <strong>RM${receiptsBillion}B</strong>`,

                        {
                            sticky: true
                        }

                    );

                }

                else {

                    layer.bindTooltip(
                        `<strong>${geoStateName}</strong><br>
                         No data`
                    );

                }
// Click state to update Destination Profile
layer.on("click", function() {
    updateDestinationProfile(csvStateName);
});
            }

        }

    ).addTo(map);

    updateMapLegend("receipts");

}


// ========================================
// SHOW TOURISM RECOVERY
// ========================================

function showRecoveryMap() {

    // Remove current state layer
    if (currentStateLayer) {
        map.removeLayer(currentStateLayer);
    }

    const stateNameMap = {
        "Kuala Lumpur": "WP Kuala Lumpur",
        "Putrajaya": "WP Putrajaya",
        "Labuan": "WP Labuan",
        "Pulau Pinang": "Penang"
    };

    function getRecoveryColor(recovery) {

        if (recovery >= 1.00) {
            return "#087f5b";
        }

        if (recovery >= 0.85) {
            return "#52b788";
        }

        if (recovery >= 0.70) {
            return "#f4a261";
        }

        return "#d95d39";
    }

    currentStateLayer = L.geoJSON(
        malaysiaGeoJSON,
        {

            style: function(feature) {

                const geoStateName =
                    feature.properties.shapeName;

                const csvStateName =
                    stateNameMap[geoStateName] ||
                    geoStateName;

                const stateData =
                    recoveryMapData.find(
                        row => row.state === csvStateName
                    );

                const recovery =
                    stateData
                        ? stateData.recovery_ratio_2023_vs_2019
                        : null;

                return {
                    color: "#ffffff",
                    weight: 1.5,

                    fillColor:
                        recovery !== null
                            ? getRecoveryColor(recovery)
                            : "#cccccc",

                    fillOpacity: 0.75
                };
            },

            onEachFeature: function(feature, layer) {

                const geoStateName =
                    feature.properties.shapeName;

                const csvStateName =
                    stateNameMap[geoStateName] ||
                    geoStateName;

                const stateData =
                    recoveryMapData.find(
                        row => row.state === csvStateName
                    );

                if (stateData) {

                    const recoveryPercent =
                        (
                            stateData.recovery_ratio_2023_vs_2019
                            * 100
                        ).toFixed(1);

                    layer.bindTooltip(
                        `<strong>${csvStateName}</strong><br>
                        Recovery: <strong>${recoveryPercent}%</strong>`,
                        {
                            sticky: true
                        }
                    );

                } else {

                    layer.bindTooltip(
                        `<strong>${geoStateName}</strong><br>
                        No recovery data`
                    );
                }
                // Click state to update Destination Profile
layer.on("click", function() {
    console.log("State clicked:", csvStateName);
    updateDestinationProfile(csvStateName);
});
            }

        }
    ).addTo(map);

    // Change legend to Recovery
    updateMapLegend("recovery");
}


// ========================================
// UPDATE MAP LEGEND
// ========================================

function updateMapLegend(type) {

    // Remove existing legend
    if (mapLegend) {
        map.removeControl(mapLegend);
    }

    // Create new legend
    mapLegend = L.control({
        position: "bottomright"
    });

    mapLegend.onAdd = function() {

        const div = L.DomUtil.create(
            "div",
            "map-legend"
        );


        // ========================================
        // RECOVERY LEGEND
        // ========================================

        if (type === "recovery") {

            div.innerHTML = `
                <h4>Tourism Recovery</h4>

                <div>
                    <span class="legend-color"
                          style="background:#087f5b"></span>
                    <span>
                        <strong>100%+</strong>
                        Above 2019 level
                    </span>
                </div>

                <div>
                    <span class="legend-color"
                          style="background:#52b788"></span>
                    <span>
                        <strong>85–99.9%</strong>
                        Near 2019 level
                    </span>
                </div>

                <div>
                    <span class="legend-color"
                          style="background:#f4a261"></span>
                    <span>
                        <strong>70–84.9%</strong>
                        Still recovering
                    </span>
                </div>

                <div>
                    <span class="legend-color"
                          style="background:#d95d39"></span>
                    <span>
                        <strong>&lt;70%</strong>
                        Further below 2019
                    </span>
                </div>
            `;
        }


        // ========================================
        // RECEIPTS LEGEND
        // ========================================

        if (type === "receipts") {

            div.innerHTML = `
                <h4>2023 Tourism Receipts</h4>

                <div>
                    <span class="legend-color"
                          style="background:#087f5b"></span>
                    <span>
                        <strong>RM10B+</strong>
                    </span>
                </div>

                <div>
                    <span class="legend-color"
                          style="background:#52b788"></span>
                    <span>
                        <strong>RM5B – RM10B</strong>
                    </span>
                </div>

                <div>
                    <span class="legend-color"
                          style="background:#f4a261"></span>
                    <span>
                        <strong>RM2.5B – RM5B</strong>
                    </span>
                </div>

                <div>
                    <span class="legend-color"
                          style="background:#d95d39"></span>
                    <span>
                        <strong>Below RM2.5B</strong>
                    </span>
                </div>
            `;
        }

    // ========================================
// VISITORS LEGEND
// ========================================

if (type === "visitors") {

    div.innerHTML = `
        <h4>2023 Domestic Visitors</h4>

        <div>
            <span class="legend-color"
                  style="background:#087f5b"></span>
            <span><strong>20M+</strong></span>
        </div>

        <div>
            <span class="legend-color"
                  style="background:#52b788"></span>
            <span><strong>15M – 20M</strong></span>
        </div>

        <div>
            <span class="legend-color"
                  style="background:#f4a261"></span>
            <span><strong>10M – 15M</strong></span>
        </div>

        <div>
            <span class="legend-color"
                  style="background:#d95d39"></span>
            <span><strong>Below 10M</strong></span>
        </div>
    `;
}

// ========================================
// TRIPS LEGEND
// ========================================

if (type === "trips") {

    div.innerHTML = `
        <h4>2023 Domestic Trips</h4>

        <div>
            <span class="legend-color"
                  style="background:#087f5b"></span>
            <span><strong>20M+</strong></span>
        </div>

        <div>
            <span class="legend-color"
                  style="background:#52b788"></span>
            <span><strong>15M – 20M</strong></span>
        </div>

        <div>
            <span class="legend-color"
                  style="background:#f4a261"></span>
            <span><strong>10M – 15M</strong></span>
        </div>

        <div>
            <span class="legend-color"
                  style="background:#d95d39"></span>
            <span><strong>Below 10M</strong></span>
        </div>
    `;
}

        return div;
    };

    mapLegend.addTo(map);
}

// ========================================
// SHOW VISITORS MAP
// ========================================

function showVisitorsMap() {

    const data2023 =
        tourismMapData.filter(
            row => row.year === 2023
        );

    // Remove current state layer
    if (currentStateLayer) {
        map.removeLayer(currentStateLayer);
    }

    const stateNameMap = {
        "Kuala Lumpur": "WP Kuala Lumpur",
        "Putrajaya": "WP Putrajaya",
        "Labuan": "WP Labuan",

        // IMPORTANT:
        // Your CSV uses "Pulau Pinang"
        "Penang": "Pulau Pinang"
    };


    // Choose colour based on visitors
    function getVisitorsColor(visitors) {

        if (visitors >= 20000) {
            return "#087f5b";
        }

        if (visitors >= 15000) {
            return "#52b788";
        }

        if (visitors >= 10000) {
            return "#f4a261";
        }

        return "#d95d39";
    }


    currentStateLayer = L.geoJSON(
        malaysiaGeoJSON,
        {

            style: function(feature) {

                const geoStateName =
                    feature.properties.shapeName;
                    console.log("GeoJSON state:", geoStateName);

                const csvStateName =
                    stateNameMap[geoStateName] ||
                    geoStateName;

                const stateData =
                    data2023.find(
                        row => row.state === csvStateName
                    );

                const visitors =
                    stateData
                        ? stateData.visitors_000
                        : null;

                return {
                    color: "#ffffff",
                    weight: 1.5,

                    fillColor:
                        visitors !== null
                            ? getVisitorsColor(visitors)
                            : "#cccccc",

                    fillOpacity: 0.75
                };
            },


            onEachFeature: function(feature, layer) {

                const geoStateName =
                    feature.properties.shapeName;

                const csvStateName =
                    stateNameMap[geoStateName] ||
                    geoStateName;

                const stateData =
                    data2023.find(
                        row => row.state === csvStateName
                    );

                if (stateData) {

                    // visitors_000 means values are in thousands
                    const visitorsMillion =
                        (
                            stateData.visitors_000 / 1000
                        ).toFixed(1);

                    layer.bindTooltip(
                        `<strong>${csvStateName}</strong><br>
                        2023 Visitors:
                        <strong>${visitorsMillion}M</strong>`,
                        {
                            sticky: true
                        }
                    );

                } else {

                    layer.bindTooltip(
                        `<strong>${geoStateName}</strong><br>
                        No visitor data`
                    );
                }
                // Click state to update Destination Profile
layer.on("click", function() {
    updateDestinationProfile(csvStateName);
});
            }


        }
    ).addTo(map);


    // Change legend
    updateMapLegend("visitors");
}

// ========================================
// SHOW TRIPS MAP
// ========================================

function showTripsMap() {

    const data2023 =
        tourismMapData.filter(
            row => row.year === 2023
        );

    // Remove current state layer
    if (currentStateLayer) {
        map.removeLayer(currentStateLayer);
    }

    const stateNameMap = {
        "Kuala Lumpur": "WP Kuala Lumpur",
        "Putrajaya": "WP Putrajaya",
        "Labuan": "WP Labuan",
        "Pulau Pinang": "Pulau Pinang"
    };


    // Choose colour based on trips
    function getTripsColor(trips) {

        if (trips >= 20000) {
            return "#087f5b";
        }

        if (trips >= 15000) {
            return "#52b788";
        }

        if (trips >= 10000) {
            return "#f4a261";
        }

        return "#d95d39";
    }


    currentStateLayer = L.geoJSON(
        malaysiaGeoJSON,
        {

            style: function(feature) {

                const geoStateName =
                    feature.properties.shapeName;

                const csvStateName =
                    stateNameMap[geoStateName] ||
                    geoStateName;

                const stateData =
                    data2023.find(
                        row => row.state === csvStateName
                    );

                const trips =
                    stateData
                        ? stateData.trips_000
                        : null;

                return {
                    color: "#ffffff",
                    weight: 1.5,

                    fillColor:
                        trips !== null
                            ? getTripsColor(trips)
                            : "#cccccc",

                    fillOpacity: 0.75
                };
            },


            onEachFeature: function(feature, layer) {

                const geoStateName =
                    feature.properties.shapeName;

                const csvStateName =
                    stateNameMap[geoStateName] ||
                    geoStateName;

                const stateData =
                    data2023.find(
                        row => row.state === csvStateName
                    );

                if (stateData) {

                    const tripsMillion =
                        (
                            stateData.trips_000 / 1000
                        ).toFixed(1);

                    layer.bindTooltip(
                        `<strong>${csvStateName}</strong><br>
                        2023 Trips:
                        <strong>${tripsMillion}M</strong>`,
                        {
                            sticky: true
                        }
                    );

                } else {

                    layer.bindTooltip(
                        `<strong>${geoStateName}</strong><br>
                        No trips data`
                    );
                }
                // Click state to update Destination Profile
layer.on("click", function() {
    updateDestinationProfile(csvStateName);
});
            }

        }
    ).addTo(map);


    // Change legend
    updateMapLegend("trips");
}

// ========================================
// UPDATE DESTINATION PROFILE
// ========================================

function updateDestinationProfile(stateName) {

     const tourismStateName =
        stateName === "Penang" ? "Pulau Pinang" : stateName;

    const recoveryStateName =
        stateName === "Penang" ? "Pulau Pinang" : stateName;
    // Get 2023 tourism data for selected state
  
    const state2023 = tourismMapData.find(
        row =>
            row.state === tourismStateName &&
            row.year === 2023
    );

    // Get recovery data for selected state
    const recoveryData = recoveryMapData.find(
        row => row.state === recoveryStateName
    );

    console.log("Clicked state:", stateName);
    console.log("Recovery state searched:", recoveryStateName);
    console.log(
    "Recovery CSV states:",
    recoveryMapData.map(row => row.state)
);

    if (!state2023) {
        console.log("No profile data found for:", stateName);
        return;
    }


    // ========================================
    // FORMAT VALUES
    // ========================================

    const receipts =
        (state2023.receipts_rm_million / 1000)
            .toFixed(2);

    const visitors =
        (state2023.visitors_000 / 1000)
            .toFixed(1);

    const trips =
        (state2023.trips_000 / 1000)
            .toFixed(1);

    const recovery =
        recoveryData
            ? (
                recoveryData.recovery_ratio_2023_vs_2019
                * 100
              ).toFixed(1)
            : null;

    const stay =
        state2023.avg_length_of_stay;


    // ========================================
    // UPDATE HTML
    // ========================================

    document.getElementById("profile-state")
        .textContent = stateName;

    document.getElementById("profile-description")
        .textContent =
        `2023 tourism performance for ${stateName}.`;

    document.getElementById("profile-receipts")
        .textContent =
        `RM${receipts}B`;

    document.getElementById("profile-visitors")
        .textContent =
        `${visitors}M`;

    document.getElementById("profile-trips")
        .textContent =
        `${trips}M`;

    document.getElementById("profile-recovery")
        .textContent =
        recovery !== null
            ? `${recovery}%`
            : "No data";

    document.getElementById("profile-stay")
        .textContent =
        stay
            ? `${Number(stay).toFixed(1)} days`
            : "No data";
}

// ========================================
// LOCAL PRICE EXPLORER
// ========================================

let fairPriceData = [];
let priceGapChart = null;

Papa.parse("data/fairprice_matched_pairs_f.csv", {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,

   complete: function(results) {
    fairPriceData = results.data;

    console.log("FairPrice data loaded!", fairPriceData);

    updatePriceExplorer();
}
});

function updatePriceExplorer() {

    const destination = document.getElementById("price-destination").value;
    const staple = document.getElementById("price-staple").value;

    // Filter by selected tourism area
    let filteredData = fairPriceData.filter(row =>
        row.tourist_town === destination
    );

    // Filter by staple if one is selected
    if (staple !== "all") {
        filteredData = filteredData.filter(row =>
            row.staple_group === staple
        );
    }

    if (filteredData.length === 0) {
        console.log("No price data found.");
        return;
    }

    // Find comparison town
    const controlTown = filteredData[0].control_town;

    // Average price gap
    const averageGap =
        filteredData.reduce((sum, row) => sum + row.gap_pct, 0)
        / filteredData.length;

    document.getElementById("tourist-town-name").textContent = destination;

    document.getElementById("control-town-name").textContent = controlTown;

    document.getElementById("price-gap").textContent =
        `${averageGap >= 0 ? "+" : ""}${averageGap.toFixed(1)}%`;

    // Absolute prices only make sense when comparing one staple
    if (staple !== "all") {

        const touristAverage =
            filteredData.reduce((sum, row) => sum + row.tourist_avg_price, 0)
            / filteredData.length;

        const controlAverage =
            filteredData.reduce((sum, row) => sum + row.control_avg_price, 0)
            / filteredData.length;

        document.getElementById("tourist-price").textContent =
            `RM${touristAverage.toFixed(2)}`;

        document.getElementById("control-price").textContent =
            `RM${controlAverage.toFixed(2)}`;

    } else {

        document.getElementById("tourist-price").textContent = "Multiple";
        document.getElementById("control-price").textContent = "Multiple";
    }
    updatePriceChart(filteredData);
}

function updatePriceChart(data) {

    // Group rows by month
    const monthlyData = {};

    data.forEach(row => {
        if (!monthlyData[row.month]) {
            monthlyData[row.month] = [];
        }

        monthlyData[row.month].push(row.gap_pct);
    });

    // Sort months
    const months = Object.keys(monthlyData).sort();

    // Calculate average gap for each month
    const gaps = months.map(month => {
        const values = monthlyData[month];

        return values.reduce((sum, value) => sum + value, 0) / values.length;
    });

    const ctx = document
        .getElementById("price-gap-chart")
        .getContext("2d");

    // Remove old chart before drawing a new one
    if (priceGapChart) {
        priceGapChart.destroy();
    }

    priceGapChart = new Chart(ctx, {
        type: "line",

        data: {
            labels: months,

            datasets: [{
                label: "Price Gap (%)",
                data: gaps,
                borderColor: "#087f5b",
                backgroundColor: "rgba(8, 127, 91, 0.10)",
                borderWidth: 3,
                tension: 0.3,
                fill: true,
                pointRadius: 5
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Price gap: ${context.raw.toFixed(1)}%`;
                        }
                    }
                }
            },

            scales: {
                y: {
                    title: {
                        display: true,
                        text: "Price Gap (%)"
                    }
                },

                x: {
                    title: {
                        display: true,
                        text: "Month"
                    }
                }
            }
        }
    });
}


document
    .getElementById("price-destination")
    .addEventListener("change", updatePriceExplorer);

document
    .getElementById("price-staple")
    .addEventListener("change", updatePriceExplorer);


  // ========================================
// COMPARE DESTINATIONS
// ========================================

function updateComparison() {

    const stateA = document.getElementById("compare-state-a").value;
    const stateB = document.getElementById("compare-state-b").value;

    updateCompareCard(stateA, "a");
    updateCompareCard(stateB, "b");
}


function updateCompareCard(stateName, side) {

    // Find 2023 tourism data
    const tourismData = tourismMapData.find(
        row => row.state === stateName && row.year === 2023
    );

    // Find recovery data
    const recoveryData = recoveryMapData.find(
        row => row.state === stateName
    );

    if (!tourismData) {
        console.log("No comparison data found for:", stateName);
        return;
    }


    // Convert values for display
    const receipts =
        (tourismData.receipts_rm_million / 1000).toFixed(2);

    const visitors =
        (tourismData.visitors_000 / 1000).toFixed(1);

    const trips =
        (tourismData.trips_000 / 1000).toFixed(1);

    const recovery = recoveryData
        ? (recoveryData.recovery_ratio_2023_vs_2019 * 100).toFixed(1)
        : null;


    // Update the card
    document.getElementById(`compare-name-${side}`)
        .textContent = stateName;

    document.getElementById(`compare-receipts-${side}`)
        .textContent = `RM${receipts}B`;

    document.getElementById(`compare-visitors-${side}`)
        .textContent = `${visitors}M`;

    document.getElementById(`compare-trips-${side}`)
        .textContent = `${trips}M`;

    document.getElementById(`compare-recovery-${side}`)
        .textContent = recovery !== null
            ? `${recovery}%`
            : "No data";
}


// Update whenever Destination A changes
document
    .getElementById("compare-state-a")
    .addEventListener("change", updateComparison);


// Update whenever Destination B changes
document
    .getElementById("compare-state-b")
    .addEventListener("change", updateComparison);  

    // ========================================
// TOURISM STORY CHART
// ========================================

let tourismStoryChart = null;

function updateTourismStoryChart() {

    if (!tourismMapData || tourismMapData.length === 0) {
        console.log("Tourism data not ready for story chart.");
        return;
    }

    const yearlyTotals = {};

    tourismMapData.forEach(row => {

        const year = Number(row.year);
        const receipts = Number(row.receipts_rm_million);

        if (!yearlyTotals[year]) {
            yearlyTotals[year] = 0;
        }

        yearlyTotals[year] += receipts;
    });


    const years = Object.keys(yearlyTotals)
        .map(Number)
        .sort((a, b) => a - b);


    const receipts = years.map(year =>
        yearlyTotals[year] / 1000
    );


    const ctx = document
        .getElementById("tourism-story-chart")
        .getContext("2d");


    if (tourismStoryChart) {
        tourismStoryChart.destroy();
    }


    tourismStoryChart = new Chart(ctx, {

        type: "line",

        data: {
            labels: years,

            datasets: [{
                label: "Tourism Receipts (RM Billion)",
                data: receipts,

                borderColor: "#087f5b",
                backgroundColor: "rgba(8, 127, 91, 0.10)",

                borderWidth: 3,
                pointRadius: 5,
                pointHoverRadius: 7,

                tension: 0.3,
                fill: true
            }]
        },

        options: {

            responsive: true,
            maintainAspectRatio: false,

            plugins: {

                legend: {
                    display: false
                },

                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `RM${context.raw.toFixed(1)} billion`;
                        }
                    }
                }
            },

            scales: {

                y: {
                    beginAtZero: true,

                    title: {
                        display: true,
                        text: "Tourism Receipts (RM Billion)"
                    }
                },

                x: {
                    title: {
                        display: true,
                        text: "Year"
                    }
                }
            }
        }
    });
}

/* =================================
   SMART DESTINATION RECOMMENDER
================================= */

const recommendButton = document.getElementById("recommend-button");

recommendButton.addEventListener("click", function () {

    const recoveryPreference =
        document.getElementById("recovery-preference").value;

    const visitorPreference =
        document.getElementById("visitor-preference").value;

    const stayPreference =
        document.getElementById("stay-preference").value;


    // Use latest tourism data only
    const data2023 = tourismMapData.filter(
        row => Number(row.year) === 2023
    );


    // Find minimum and maximum values
    const visitors = data2023.map(row =>
        Number(row.visitors_000)
    );

    const stays = data2023.map(row =>
        Number(row.avg_length_of_stay)
    );


    const minVisitors = Math.min(...visitors);
    const maxVisitors = Math.max(...visitors);

    const minStay = Math.min(...stays);
    const maxStay = Math.max(...stays);


    // Calculate score for every destination
    const recommendations = data2023.map(destination => {

        let score = 0;
        let reasons = [];

        const state = destination.state;


    // Find recovery data for this destination
const recoveryData = recoveryMapData.find(row =>
    row.state === state
);

const recoveryValue = recoveryData
    ? Number(recoveryData.recovery_ratio_2023_vs_2019)
    : null;

        const visitorValue =
            Number(destination.visitors_000);

        const stayValue =
            Number(destination.avg_length_of_stay);


        // -------------------------
        // POPULARITY SCORE
        // -------------------------

        const visitorScore =
            (visitorValue - minVisitors) /
            (maxVisitors - minVisitors);

        if (visitorPreference === "high") {

            score += visitorScore * 35;

            if (visitorScore >= 0.65) {
                reasons.push("high visitor activity");
            }

        } else if (visitorPreference === "medium") {

            score +=
                (1 - Math.abs(visitorScore - 0.5) * 2) * 35;

            if (
                visitorScore >= 0.35 &&
                visitorScore <= 0.65
            ) {
                reasons.push("moderate visitor activity");
            }

        } else if (visitorPreference === "low") {

            score += (1 - visitorScore) * 35;

            if (visitorScore <= 0.35) {
                reasons.push("lower visitor activity");
            }
        }


        // -------------------------
        // LENGTH OF STAY SCORE
        // -------------------------

        const stayScore =
            (stayValue - minStay) /
            (maxStay - minStay);

        if (stayPreference === "long") {

            score += stayScore * 30;

            if (stayScore >= 0.6) {
                reasons.push("longer average stays");
            }

        } else if (stayPreference === "short") {

            score += (1 - stayScore) * 30;

            if (stayScore <= 0.4) {
                reasons.push("shorter average stays");
            }
        }
// -------------------------
// RECOVERY SCORE
// -------------------------

if (recoveryValue !== null) {

    if (recoveryPreference === "high") {

        // Higher recovery = better match
        score += Math.min(recoveryValue, 1.2) / 1.2 * 35;

        if (recoveryValue >= 0.9) {
            reasons.push("strong tourism recovery");
        }

    } else if (recoveryPreference === "medium") {

        // Best match around 75% recovery
        const recoveryScore =
            1 - Math.min(
                Math.abs(recoveryValue - 0.75) / 0.35,
                1
            );

        score += recoveryScore * 35;

        if (
            recoveryValue >= 0.65 &&
            recoveryValue < 0.9
        ) {
            reasons.push("moderate tourism recovery");
        }
    }
}

      const activeWeights =
    (visitorPreference !== "any" ? 35 : 0) +
    (stayPreference !== "any" ? 30 : 0) +
    (recoveryPreference !== "any" ? 35 : 0);

const matchPercentage =
    activeWeights > 0
        ? Math.min(100, (score / activeWeights) * 100)
        : 100;

return {
    state: state,
    score: score,
    match: matchPercentage,
    visitors: visitorValue,
    stay: stayValue,
    recovery: recoveryValue,
    reasons: reasons
};

    });


    // Rank destinations
    recommendations.sort(
        (a, b) => b.score - a.score
    );


    // Top 3
    const topThree = recommendations.slice(0, 3);


    displayRecommendations(topThree);

});

function displayRecommendations(destinations) {

    const container =
        document.getElementById("recommend-results");

    container.innerHTML = `
        <div class="recommend-list">

            <div class="recommend-result-heading">
                <p class="section-label">
                    YOUR TOP MATCHES
                </p>

                <h3>
                    Recommended destinations
                </h3>
            </div>

            ${destinations.map((destination, index) => `

                <div class="destination-match">

                    <div class="match-rank">
                        ${index + 1}
                    </div>

                    <div class="match-info">

                        <h4>${destination.state}</h4>

                        <p>
                            ${
                                destination.reasons.length > 0
                                ? "Matches your preference for " +
                                  destination.reasons.join(" and ") + "."
                                : "Matches your selected tourism preferences."
                            }
                        </p>

        <div class="match-stats">

    <span>
        Match
        <strong>
            ${destination.match.toFixed(0)}%
        </strong>
    </span>

    <span>
        Recovery
        <strong>
            ${
                destination.recovery !== null
                    ? (destination.recovery * 100).toFixed(1) + "%"
                    : "No data"
            }
        </strong>
    </span>

    <span>
        Visitors
        <strong>
            ${(destination.visitors / 1000).toFixed(1)}M
        </strong>
    </span>

    <span>
        Average Stay
        <strong>
            ${destination.stay.toFixed(1)} nights
        </strong>
    </span>

</div>

                    </div>

                </div>

            `).join("")}

        </div>
    `;
}

/* =================================
   TOURISM FORECAST
================================= */

Papa.parse("data/receipt_forecasts_f.csv", {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,

    complete: function(results) {

        forecastData = results.data;

        console.log("Forecast data loaded!", forecastData);

        populateForecastDropdown();
    },

    error: function(error) {
        console.error("Error loading forecast data:", error);
    }
});


function populateForecastDropdown() {

    const dropdown =
        document.getElementById("forecast-state");

    // Get unique states
    const states = [
        ...new Set(
            forecastData.map(row => row.state)
        )
    ].sort();

    states.forEach(state => {

        const option =
            document.createElement("option");

        option.value = state;
        option.textContent = state;

        dropdown.appendChild(option);

    });
}

document
    .getElementById("forecast-state")
    .addEventListener("change", function () {

        const selectedState = this.value;

        if (!selectedState) {
            return;
        }

        createForecastChart(selectedState);
    });

    function createForecastChart(state) {

    // =========================
    // HISTORICAL DATA 2017-2023
    // =========================

    const historicalData = tourismMapData
        .filter(row =>
            row.state === state &&
            Number(row.year) >= 2017 &&
            Number(row.year) <= 2023
        )
        .sort((a, b) =>
            Number(a.year) - Number(b.year)
        );


    // =========================
    // FORECAST DATA 2024-2026
    // =========================

    const stateForecast = forecastData
        .filter(row =>
            row.state === state
        )
        .sort((a, b) =>
            Number(a.year) - Number(b.year)
        );

// =========================
// UPDATE FORECAST KPI CARDS
// =========================

const forecast2024 = stateForecast.find(
    row => Number(row.year) === 2024
);

const forecast2025 = stateForecast.find(
    row => Number(row.year) === 2025
);

const forecast2026 = stateForecast.find(
    row => Number(row.year) === 2026
);


// Display forecast values
document.getElementById("forecast-2024").textContent =
    forecast2024
        ? "RM " +
          (Number(forecast2024.forecast_receipts_rm_million) / 1000)
              .toFixed(2) +
          "B"
        : "—";

document.getElementById("forecast-2025").textContent =
    forecast2025
        ? "RM " +
          (Number(forecast2025.forecast_receipts_rm_million) / 1000)
              .toFixed(2) +
          "B"
        : "—";

document.getElementById("forecast-2026").textContent =
    forecast2026
        ? "RM " +
          (Number(forecast2026.forecast_receipts_rm_million) / 1000)
              .toFixed(2) +
          "B"
        : "—";


// Calculate projected growth from 2024 to 2026
if (forecast2024 && forecast2026) {

    const value2024 =
        Number(forecast2024.forecast_receipts_rm_million);

    const value2026 =
        Number(forecast2026.forecast_receipts_rm_million);

    const growth =
        ((value2026 - value2024) / value2024) * 100;

    document.getElementById("forecast-growth").textContent =
        (growth >= 0 ? "+" : "") +
        growth.toFixed(1) +
        "%";

} else {

    document.getElementById("forecast-growth").textContent =
        "—";
}
    // =========================
    // YEARS
    // =========================

    const years = [
        2017,
        2018,
        2019,
        2020,
        2021,
        2022,
        2023,
        2024,
        2025,
        2026
    ];


    // =========================
    // ACTUAL VALUES
    // =========================

    const actualValues = years.map(year => {

        const row = historicalData.find(
            item => Number(item.year) === year
        );

        return row
            ? Number(row.receipts_rm_million)
            : null;
    });


    // =========================
    // FORECAST VALUES
    // =========================

    const forecastValues = years.map(year => {

        // Start forecast line from 2023
        if (year === 2023) {

            const row2023 = historicalData.find(
                item => Number(item.year) === 2023
            );

            return row2023
                ? Number(row2023.receipts_rm_million)
                : null;
        }

        const row = stateForecast.find(
            item => Number(item.year) === year
        );

        return row
            ? Number(row.forecast_receipts_rm_million)
            : null;
    });


    // =========================
    // UPDATE TITLE
    // =========================

    document.getElementById("forecast-title").textContent =
        `${state} Tourism Receipts: Actual vs Forecast`;


    // =========================
    // REMOVE OLD CHART
    // =========================

    if (forecastChart) {
        forecastChart.destroy();
    }


    // =========================
    // CREATE CHART
    // =========================

    const ctx =
        document.getElementById("forecast-chart");

    forecastChart = new Chart(ctx, {

        type: "line",

        data: {

            labels: years,

            datasets: [

                {
                    label: "Actual 2017–2023",

                    data: actualValues,

                    borderColor: "#087f5b",

                    backgroundColor:
                        "rgba(8, 127, 91, 0.10)",

                    borderWidth: 3,

                    pointRadius: 4,

                    pointBackgroundColor: "#087f5b",

                    tension: 0.3,

                    spanGaps: false
                },

                {
                    label: "Forecast 2024–2026",

                    data: forecastValues,

                    borderColor: "#d99b2b",

                    backgroundColor:
                        "rgba(217, 155, 43, 0.10)",

                    borderWidth: 3,

                    borderDash: [7, 5],

                    pointRadius: 4,

                    pointBackgroundColor: "#d99b2b",

                    tension: 0.3,

                    spanGaps: false
                }

            ]
        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            interaction: {
                mode: "index",
                intersect: false
            },

            plugins: {

                legend: {
                    position: "top",
                    align: "end"
                },

                tooltip: {

                    callbacks: {

                        label: function(context) {

                            if (context.raw === null) {
                                return "";
                            }

                            return (
                                context.dataset.label +
                                ": RM " +
                                Number(context.raw)
                                    .toLocaleString(
                                        "en-MY",
                                        {
                                            maximumFractionDigits: 1
                                        }
                                    ) +
                                " million"
                            );
                        }
                    }
                }
            },

            scales: {

                x: {

                    title: {
                        display: true,
                        text: "Year"
                    },

                    grid: {
                        display: false
                    }
                },

                y: {

                    title: {
                        display: true,
                        text: "Tourism Receipts (RM million)"
                    },

                    ticks: {

                        callback: function(value) {

                            return "RM " +
                                Number(value)
                                    .toLocaleString("en-MY");
                        }
                    }
                }
            }
        }
    });
}