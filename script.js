// ========================================
// TOURISM DATA CONFIGURATION
// ========================================

const LATEST_TOURISM_YEAR = 2025;

// Standardise state names across datasets
function normaliseStateName(name) {
    const names = {
        "W.P. Kuala Lumpur": "WP Kuala Lumpur",
        "W.P. Putrajaya": "WP Putrajaya",
        "W.P. Labuan": "WP Labuan",
        "Penang": "Pulau Pinang"
    };

    return names[name] || name;
}

// Combine original 2017–2018 data with updated 2019–2025 data
async function loadCombinedTourismData() {
    const loadCSV = path => new Promise((resolve, reject) => {
        Papa.parse(path, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: results => resolve(results.data),
            error: reject
        });
    });

    const [original, updated] = await Promise.all([
        loadCSV("data/tourism_state_panel_clean.csv"),
        loadCSV("data/tourism_state_panel_2025.csv")
    ]);

    return [
        ...original.filter(row => Number(row.year) < 2019),
        ...updated
    ].map(row => ({
        ...row,
        state: normaliseStateName(row.state),
        year: Number(row.year)
    }));
}

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

Papa.parse("data/recovery_index_2025.csv", {

    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,

    complete: function(results) {

        const recoveryData = results.data.map(row => ({
    ...row,
    state: normaliseStateName(row.state)
}));

recoveryMapData = recoveryData;

console.log(
    "Recovery CSV first row:",
    JSON.stringify(recoveryMapData[0])
);
        console.log("Recovery data loaded!");
        console.log(recoveryData);
        console.log("Recovery CSV first row:", recoveryMapData[0]);

        // --------------------------------
        // Match GeoJSON names to CSV names
        // --------------------------------

        const stateNameMap = {
            "Kuala Lumpur": "WP Kuala Lumpur",
            "Putrajaya": "WP Putrajaya",
            "Labuan": "WP Labuan",
            "Penang": "Pulau Pinang",
            "Malacca": "Melaka"
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
                                ? stateData.recovery_ratio_2025_vs_2019
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
                                        .recovery_ratio_2025_vs_2019
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

    <div style="
        width: 100%;
        height: 16px;
        border-radius: 5px;
        background: linear-gradient(
            to right,
            #d95d39,
            #f4a261,
            #52b788,
            #087f5b
        );
        margin: 12px 0 6px 0;
    "></div>

    <div style="
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        font-weight: 600;
    ">
        <span>Lowest</span>
        <span>Highest</span>
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

loadCombinedTourismData().then(function(tourismData) {

    tourismMapData = tourismData;

    updateTourismStoryChart();

        console.log("Tourism data loaded!");
        console.log(tourismData);


        // ========================================
// 1. FILTER 2019 AND 2025 DATA
// ========================================

const data2019 = tourismData.filter(
    row => Number(row.year) === 2019
);

const data2025 = tourismData.filter(
    row => Number(row.year) === LATEST_TOURISM_YEAR
);

// ========================================
// 2. TOTAL TOURISM RECEIPTS 2025
// ========================================

const receipts2025 = data2025.reduce(
    (total, row) =>
        total + (Number(row.receipts_rm_million) || 0),
    0
);

const receipts2025Billion = receipts2025 / 1000;

// ========================================
// 3. TOTAL TOURISM RECEIPTS 2019
// ========================================

const receipts2019 = data2019.reduce(
    (total, row) =>
        total + (Number(row.receipts_rm_million) || 0),
    0
);

// ========================================
// 4. NATIONAL RECOVERY
// ========================================

const recovery = receipts2019 > 0
    ? (receipts2025 / receipts2019) * 100
    : 0;

// ========================================
// 5. NUMBER OF AREAS
// ========================================

const states = new Set(
    tourismData.map(row => row.state).filter(Boolean)
);

const numberOfAreas = states.size;

// ========================================
// 6. DISPLAY ON WEBSITE
// ========================================

document.getElementById("total-receipts").textContent =
    "RM" + receipts2025Billion.toFixed(1) + "B";

document.getElementById("national-recovery").textContent =
    recovery.toFixed(1) + "%";

document.getElementById("areas-analysed").textContent =
    numberOfAreas;

    }).catch(function(error) {
    console.error("Error loading tourism data:", error);
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

    // Get only 2025 tourism data
    const data2025 = tourismMapData.filter(
    row => Number(row.year) === LATEST_TOURISM_YEAR
);

    console.log("2025 map data:", data2025);


    // Remove current state layer
    if (currentStateLayer) {
        map.removeLayer(currentStateLayer);
    }


    // Match GeoJSON names with CSV names
    const stateNameMap = {
        "Kuala Lumpur": "WP Kuala Lumpur",
        "Putrajaya": "WP Putrajaya",
        "Labuan": "WP Labuan",
        "Penang": "Pulau Pinang",
        "Malacca": "Melaka"
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
                    data2025.find(
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
                    data2025.find(
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
                         2025 Tourism Receipts:
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
        "Pulau Pinang": "Penang",
         "Malacca": "Melaka"
    };

  function getRecoveryColor(recovery) {

    const values = recoveryMapData
        .map(row => Number(row.recovery_ratio_2025_vs_2019))
        .filter(value => Number.isFinite(value));

    if (!Number.isFinite(recovery) || values.length === 0) {
        return "#cccccc";
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    if (min === max) {
        return "#f4a261";
    }

    // Position between lowest (0) and highest (1)
    const t = Math.max(
        0,
        Math.min(1, (recovery - min) / (max - min))
    );

    const colors = [
        [217, 93, 57],   // Red
        [244, 162, 97],  // Orange
        [82, 183, 136],  // Light green
        [8, 127, 91]     // Dark green
    ];

    const position = t * (colors.length - 1);
    const index = Math.min(
        Math.floor(position),
        colors.length - 2
    );

    const fraction = position - index;

    const rgb = colors[index].map((start, channel) =>
        Math.round(
            start + (colors[index + 1][channel] - start) * fraction
        )
    );

    return `rgb(${rgb.join(",")})`;
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

                const rawRecovery =
    stateData?.recovery_ratio_2025_vs_2019;

const recovery =
    rawRecovery !== null &&
    rawRecovery !== undefined &&
    rawRecovery !== "" &&
    Number.isFinite(Number(rawRecovery))
        ? Number(rawRecovery)
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
                            stateData.recovery_ratio_2025_vs_2019
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

    <div style="
        width: 100%;
        height: 16px;
        border-radius: 5px;
        background: linear-gradient(
            to right,
            #d95d39,
            #f4a261,
            #52b788,
            #087f5b
        );
        margin: 12px 0 6px 0;
    "></div>

    <div style="
        display: flex;
        justify-content: space-between;
        font-size: 11px;
        font-weight: 600;
    ">
        <span>Lowest</span>
        <span>Highest</span>
    </div>
`;
        }


        // ========================================
        // RECEIPTS LEGEND
        // ========================================

        if (type === "receipts") {

            div.innerHTML = `
                <h4>2025 Tourism Receipts</h4>

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
        <h4>2025 Domestic Visitors</h4>

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
        <h4>2025 Domestic Trips</h4>

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

    const data2025 =
    tourismMapData.filter(
        row => Number(row.year) === LATEST_TOURISM_YEAR
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
        "Penang": "Pulau Pinang",
        "Malacca" : "Melaka"
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
                    data2025.find(
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
                    data2025.find(
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
                        2025 Visitors:
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

    const data2025 =
    tourismMapData.filter(
        row => Number(row.year) === LATEST_TOURISM_YEAR
    );

    // Remove current state layer
    if (currentStateLayer) {
        map.removeLayer(currentStateLayer);
    }

    const stateNameMap = {
        "Kuala Lumpur": "WP Kuala Lumpur",
        "Putrajaya": "WP Putrajaya",
        "Labuan": "WP Labuan",
        "Pulau Pinang": "Pulau Pinang",
        "Malacca":"Melaka"
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
                    data2025.find(
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
                    data2025.find(
                        row => row.state === csvStateName
                    );

                if (stateData) {

                    const tripsMillion =
                        (
                            stateData.trips_000 / 1000
                        ).toFixed(1);

                    layer.bindTooltip(
                        `<strong>${csvStateName}</strong><br>
                        2025 Trips:
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
        stateName === "Penang" ? "Pulau Pinang" :
        stateName === "Malacca" ? "Melaka" :
        stateName;

    const recoveryStateName = tourismStateName;

    // Get 2025 tourism data for selected state
    const state2025 = tourismMapData.find(
        row =>
            row.state === tourismStateName &&
            Number(row.year) === LATEST_TOURISM_YEAR
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

    if (!state2025) {
        console.log("No profile data found for:", stateName);
        return;
    }


    // ========================================
    // FORMAT VALUES
    // ========================================

    const receipts =
        (state2025.receipts_rm_million / 1000)
            .toFixed(2);

    const visitors =
        (state2025.visitors_000 / 1000)
            .toFixed(1);

    const trips =
        (state2025.trips_000 / 1000)
            .toFixed(1);

    const recoveryRatio = Number(
    recoveryData?.recovery_ratio_2025_vs_2019
);

const recovery =
    recoveryData &&
    Number.isFinite(recoveryRatio) &&
    recoveryData.recovery_ratio_2025_vs_2019 !== ""
        ? (recoveryRatio * 100).toFixed(1)
        : null;

    const stay =
        state2025.avg_length_of_stay;


    // ========================================
    // UPDATE HTML
    // ========================================

    document.getElementById("profile-state")
        .textContent = stateName;

    document.getElementById("profile-description")
    .textContent =
    `${LATEST_TOURISM_YEAR} tourism performance for ${stateName}, including recovery compared with 2019.`;

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

        document.getElementById("tourist-price").textContent =
    "4 Staple Groups";

document.getElementById("control-price").textContent =
    "4 Staple Groups";
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

    // Find 2025 tourism data
    const tourismData = tourismMapData.find(
        row =>
            row.state === stateName &&
            Number(row.year) === LATEST_TOURISM_YEAR
    );

    // Find 2025 recovery data
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

    // Recovery in 2025 compared with 2019
    const recoveryRatio = Number(
        recoveryData?.recovery_ratio_2025_vs_2019
    );

    const recovery =
        recoveryData &&
        recoveryData.recovery_ratio_2025_vs_2019 !== "" &&
        recoveryData.recovery_ratio_2025_vs_2019 != null &&
        Number.isFinite(recoveryRatio)
            ? (recoveryRatio * 100).toFixed(1)
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
    // Use latest tourism data only (2025)
const data2025 = tourismMapData.filter(
    row => Number(row.year) === LATEST_TOURISM_YEAR
);


    // Find minimum and maximum values
    const visitors = data2025.map(row =>
        Number(row.visitors_000)
    );

    const stays = data2025.map(row =>
        Number(row.avg_length_of_stay)
    );


    const minVisitors = Math.min(...visitors);
    const maxVisitors = Math.max(...visitors);

    const minStay = Math.min(...stays);
    const maxStay = Math.max(...stays);


    // Calculate score for every destination
    const recommendations = data2025.map(destination => {

        let score = 0;
        let reasons = [];

        const state = destination.state;


    // Find recovery data for this destination
const recoveryData = recoveryMapData.find(row =>
    row.state === state
);

const rawRecovery =
    recoveryData?.recovery_ratio_2025_vs_2019;

const recoveryValue =
    rawRecovery !== null &&
    rawRecovery !== undefined &&
    rawRecovery !== "" &&
    Number.isFinite(Number(rawRecovery))
        ? Number(rawRecovery)
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

Papa.parse("data/receipt_forecasts_2030.csv", {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,

    complete: function(results) {

        forecastData = results.data.map(row => ({
    ...row,
    state: normaliseStateName(row.state),
    year: Number(row.year)
}));

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

    // Historical data: 2017–2025
    const historicalData = tourismMapData
        .filter(row =>
            row.state === state &&
            Number(row.year) >= 2017 &&
            Number(row.year) <= 2025
        )
        .sort((a, b) => Number(a.year) - Number(b.year));

    // Forecast data: 2026–2030
    const stateForecast = forecastData
        .filter(row =>
            row.state === state &&
            Number(row.year) >= 2026 &&
            Number(row.year) <= 2030
        )
        .sort((a, b) => Number(a.year) - Number(b.year));

    const years = Array.from(
        { length: 14 },
        (_, i) => 2017 + i
    );

    const actualValues = years.map(year => {
        const row = historicalData.find(
            item => Number(item.year) === year
        );

        return row
            ? Number(row.receipts_rm_million)
            : null;
    });

    const forecastValues = years.map(year => {

        // Connect forecast line to last historical point
        if (year === 2025) {
            const row2025 = historicalData.find(
                item => Number(item.year) === 2025
            );

            return row2025
                ? Number(row2025.receipts_rm_million)
                : null;
        }

        if (year < 2026) return null;

        const row = stateForecast.find(
            item => Number(item.year) === year
        );

        return row
            ? Number(row.forecast_receipts_rm_million)
            : null;
    });

    // Forecast KPI cards
    const formatForecast = year => {
        const row = stateForecast.find(
            item => Number(item.year) === year
        );

        return row
            ? "RM " +
              (Number(row.forecast_receipts_rm_million) / 1000)
                  .toFixed(2) + "B"
            : "—";
    };

    // Reuse existing KPI cards for new years
    document.getElementById("forecast-2024").textContent =
        formatForecast(2026);

    document.getElementById("forecast-2025").textContent =
        formatForecast(2028);

    document.getElementById("forecast-2026").textContent =
        formatForecast(2030);

    // Projected growth from 2026 to 2030
    const first = stateForecast.find(
        row => Number(row.year) === 2026
    );

    const last = stateForecast.find(
        row => Number(row.year) === 2030
    );

    let growthText = "—";

    if (first && last) {
        const start = Number(first.forecast_receipts_rm_million);
        const end = Number(last.forecast_receipts_rm_million);

        if (start !== 0) {
            const growth = ((end - start) / start) * 100;

            growthText =
                (growth >= 0 ? "+" : "") +
                growth.toFixed(1) + "%";
        }
    }

    document.getElementById("forecast-growth").textContent =
        growthText;

    document.getElementById("forecast-title").textContent =
        `${state} Tourism Receipts: Historical vs Forecast`;

    if (forecastChart) {
        forecastChart.destroy();
    }

    const ctx = document.getElementById("forecast-chart");

    forecastChart = new Chart(ctx, {
        type: "line",

        data: {
            labels: years,

            datasets: [
                {
                    label: "Historical 2017–2025",
                    data: actualValues,
                    borderColor: "#087f5b",
                    backgroundColor: "rgba(8, 127, 91, 0.10)",
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: "#087f5b",
                    tension: 0.3,
                    spanGaps: false
                },
                {
                    label: "Forecast 2026–2030",
                    data: forecastValues,
                    borderColor: "#d99b2b",
                    backgroundColor: "rgba(217, 155, 43, 0.10)",
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
                            if (context.raw === null) return "";

                            return context.dataset.label +
                                ": RM " +
                                Number(context.raw).toLocaleString(
                                    "en-MY",
                                    { maximumFractionDigits: 1 }
                                ) +
                                " million";
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
                                Number(value).toLocaleString("en-MY");
                        }
                    }
                }
            }
        }
    });
}



/* ========================================
   TOURISM RECOVERY CLUSTERS
======================================== */

let clusterRecoveryChart = null;

const clusterDescriptions = {
    0: {
        title: "Cluster 0 — Strongest Recovery, Broad Rebound",
        description:
            "This cluster recorded the strongest average recovery by 2025, reaching approximately 126% of its 2019 tourism receipts. Perlis led all states at 209.3%, followed by Melaka at 137.1% and Pahang at 129.6%. All seven states exceeded their pre-pandemic tourism levels.",
        color: "#087f5b"
    },

    1: {
        title: "Cluster 1 — Steady Recovery, Mixed Performance",
        description:
            "This cluster achieved an average recovery index of approximately 116% in 2025. Kuala Lumpur led the group at 139.2%, followed by Negeri Sembilan at 128.8% and Pulau Pinang at 127.6%. However, Terengganu remained slightly below its 2019 baseline at 96.7%, highlighting uneven recovery across destinations.",
        color: "#2563eb"
    },

    2: {
        title: "Cluster 2 — Deepest Decline, Strong Rebound",
        description:
            "Putrajaya and Labuan experienced the sharpest pandemic-related declines, followed by a substantial recovery. By 2025, Putrajaya reached 145.6% of its 2019 tourism receipts, while Labuan recovered to 96.7%. Together, they achieved an average recovery index of approximately 121.2%.",
        color: "#d97706"
    }
};

let clusterData = [];
let clusterTourismData = [];

function loadRecoveryClusters() {

    Papa.parse("data/recovery_index_2025.csv", {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,

        complete: function(results) {

            clusterData = results.data;

            Papa.parse("data/tourism_state_panel_2025.csv", {
                download: true,
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,

                complete: function(tourismResults) {

                    clusterTourismData = tourismResults.data;

                    setupClusterCards();
                    displayCluster(0);
                    updateClusterComparisonChart();

                    console.log("Recovery clusters loaded!");
                },

                error: function(error) {
                    console.error("Cluster tourism data error:", error);
                }
            });
        },

        error: function(error) {
            console.error("Cluster data error:", error);
        }
    });
}

function setupClusterCards() {

    document.querySelectorAll(".cluster-card").forEach(card => {

        card.addEventListener("click", function() {

            const selectedCluster = Number(this.dataset.cluster);

            document.querySelectorAll(".cluster-card").forEach(item => {
                item.classList.remove("active");
            });

            this.classList.add("active");

            displayCluster(selectedCluster);
        });
    });
}

function displayCluster(clusterNumber) {

    const cluster = clusterDescriptions[clusterNumber];

    if (!cluster) return;

    document.getElementById("cluster-selected-title").textContent =
        cluster.title;

    document.getElementById("cluster-description").textContent =
        cluster.description;

    // Filter states belonging to selected cluster
    const states = clusterData.filter(row =>
        Number(row.cluster) === clusterNumber
    );

    const statesContainer = document.getElementById("cluster-states");

    statesContainer.innerHTML = "";

    states.forEach(row => {

        const stateBadge = document.createElement("span");
        stateBadge.className = "cluster-state";

        const recovery = Number(row.recovery_ratio_2023_vs_2019);

        const recoveryText = Number.isFinite(recovery)
            ? ` — ${(recovery * 100).toFixed(1)}%`
            : "";

        stateBadge.textContent = row.state + recoveryText;

        statesContainer.appendChild(stateBadge);
    });

    updateClusterRecoveryChart(states, cluster);
}

function updateClusterRecoveryChart(states, cluster) {

    const canvas = document.getElementById("cluster-recovery-chart");

    if (!canvas || typeof Chart === "undefined") return;

    const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

    const stateNames = new Set(
    states.map(row => normaliseStateName(row.state))
    );

    // Build a 2019 baseline for each state
    const baselineByState = {};

    clusterTourismData.forEach(row => {
        const state = normaliseStateName(row.state);

        if (
            Number(row.year) === 2019 &&
            stateNames.has(state)
        ) {
            baselineByState[state] =
                Number(row.receipts_rm_million);
        }
    });

    // Calculate each state's receipts as an index
    // relative to its own 2019 receipts.
    // Then take the average across states in the cluster.
    const values = years.map(year => {

        const indexedValues = clusterTourismData
            .filter(row =>
                 Number(row.year) === year &&
                stateNames.has(normaliseStateName(row.state))
            )
            .map(row => {

                const baseline = baselineByState[
                    normaliseStateName(row.state)
                ];
                const receipts = Number(row.receipts_rm_million);

                if (
                    !Number.isFinite(baseline) ||
                    baseline <= 0 ||
                    !Number.isFinite(receipts)
                ) {
                    return null;
                }

                return (receipts / baseline) * 100;
            })
            .filter(value => value !== null);

        if (!indexedValues.length) return null;

        return indexedValues.reduce((a, b) => a + b, 0)
            / indexedValues.length;
    });

    if (clusterRecoveryChart) {
        clusterRecoveryChart.destroy();
    }

    clusterRecoveryChart = new Chart(canvas, {
        type: "line",

        data: {
            labels: years,

            datasets: [{
                label: "Average Recovery Index",
                data: values,
                borderColor: cluster.color,
                backgroundColor: cluster.color,
                borderWidth: 3,
                tension: 0.3,
                pointRadius: 5,
                fill: false,
                spanGaps: false
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
                            return "Recovery Index: " +
                                context.parsed.y.toFixed(1);
                        }
                    }
                }
            },

            scales: {
                y: {
                    title: {
                        display: true,
                        text: "2019 = 100"
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

// Start the cluster section once the page is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadRecoveryClusters);
} else {
    loadRecoveryClusters();
}




/* ========================================
   COMPARE ALL THREE RECOVERY CLUSTERS
======================================== */

let clusterComparisonChart = null;

function updateClusterComparisonChart() {

    const canvas = document.getElementById("cluster-comparison-chart");

    if (!canvas || typeof Chart === "undefined") return;

    const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

    const datasets = [0, 1, 2].map(clusterNumber => {

        const cluster = clusterDescriptions[clusterNumber];

        const stateNames = new Set(
            clusterData
                .filter(row => Number(row.cluster) === clusterNumber)
                .map(row => normaliseStateName(row.state))
        );

        // Get each state's 2019 tourism receipts
        const baselineByState = {};

        clusterTourismData.forEach(row => {
            const state = normaliseStateName(row.state);

            if (
                Number(row.year) === 2019 &&
                stateNames.has(state)
            ) {
                baselineByState[state] =
                    Number(row.receipts_rm_million);
            }
        });

        const values = years.map(year => {

            const indexedValues = clusterTourismData
                .filter(row =>
                    Number(row.year) === year &&
                    stateNames.has(normaliseStateName(row.state))
                )
                .map(row => {

                    const baseline = baselineByState[
                        normaliseStateName(row.state)
                    ];
                    const receipts = Number(row.receipts_rm_million);

                    if (
                        !Number.isFinite(baseline) ||
                        baseline <= 0 ||
                        !Number.isFinite(receipts)
                    ) {
                        return null;
                    }

                    return (receipts / baseline) * 100;
                })
                .filter(value => value !== null);

            if (!indexedValues.length) return null;

            return indexedValues.reduce((a, b) => a + b, 0)
                / indexedValues.length;
        });

        return {
            label: cluster.title,
            data: values,
            borderColor: cluster.color,
            backgroundColor: cluster.color,
            borderWidth: 3,
            pointRadius: 4,
            tension: 0.3,
            fill: false,
            spanGaps: false
        };
    });

    if (clusterComparisonChart) {
        clusterComparisonChart.destroy();
    }

    clusterComparisonChart = new Chart(canvas, {
        type: "line",

        data: {
            labels: years,
            datasets: datasets
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    position: "bottom"
                },

                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ": " +
                                context.parsed.y.toFixed(1);
                        }
                    }
                }
            },

            scales: {
                y: {
                    title: {
                        display: true,
                        text: "Recovery Index (2019 = 100)"
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
