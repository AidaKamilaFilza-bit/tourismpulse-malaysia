// ========================================
// MAP DATA STORAGE
// ========================================

let tourismMapData = [];
let recoveryMapData = [];
let malaysiaGeoJSON = null;
let currentStateLayer = null;

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
            "Pulau Pinang": "Penang"
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

                const stateLayer = L.geoJSON(geojsonData, {

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
                    }

                }).addTo(map);


                map.fitBounds(
                    stateLayer.getBounds()
                );

                // --------------------------------
// MAP LEGEND
// --------------------------------

const legend = L.control({
    position: "bottomright"
});

legend.onAdd = function() {

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

legend.addTo(map);
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

        console.log("Tourism data loaded!");
        console.log(tourismData);


        // ========================================
        // 1. FILTER 2019 AND 2023 DATA
        // ========================================

        const data2019 = tourismData.filter(row => row.year === 2019);
        const data2023 = tourismData.filter(row => row.year === 2023);


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