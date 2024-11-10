const width = 800, height = 600;

const svg = d3.select("#map")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", "0 0 800 800")
    .attr("preserveAspectRatio", "xMidYMid meet");

const projection = d3.geoMercator()
    .scale(500)
    .center([-58, -15])
    .translate([width / 2, height / 2]);



const path = d3.geoPath().projection(projection);

let energyLookup = {}; // Diccionario para los datos de energía por año y país

function playCountryAudio(countryName) {
    const audio = new Audio(`sounds/${countryName}.mp3`); // Ruta al archivo de audio
    audio.play();
}

// Cargar datos GeoJSON y CSV
Promise.all([
    d3.json("custom.geo.json"),
    d3.csv("country_data_years.csv")
]).then(([geoData, countryData]) => {
    
    // Transformar los datos CSV en un diccionario de años y países
    countryData.forEach(d => {
        const year = +d.Year;
        const country = d.Entity;
        const energyUse = +d.Energy_Use;

        if (!energyLookup[year]) energyLookup[year] = {};
        energyLookup[year][country] = energyUse;
    });

    // Crear un escalador de color basado en los valores de energía
    const energyValues = countryData.map(d => +d.Energy_Use);
    const minEnergy = d3.min(energyValues);
    const maxEnergy = d3.max(energyValues);
    const colorScale = d3.scaleSequential(d3.interpolateYlGn)
                         .domain([minEnergy, maxEnergy]);

    // Función para actualizar el mapa según el año
    function updateMap(year) {
        svg.selectAll("path")
            .data(geoData.features)
            .join("path")
            .attr("d", path)
            .attr("fill", d => {
                const countryName = d.properties.name;
                const energyUse = energyLookup[year][countryName];
                return energyUse ? colorScale(energyUse) : "#ccc";
            })
            .attr("stroke", "#333")
            .on("mouseover", function(event, d) {
                const countryName = d.properties.name;
                const energyUse = energyLookup[year][countryName];
                
                // Mostrar el tooltip
                d3.select("#tooltip")
                  .style("opacity", 1)
                  .style("left", `${event.pageX + 10}px`)
                  .style("top", `${event.pageY - 28}px`)
                  .html(`
                      <strong>${countryName}</strong><br>
                      <strong>Uso de energía Renovable:</strong> ${energyUse ? energyUse + "%" : "N/A"}
                  `);
            })
            .on("mouseout", function() {
                d3.select("#tooltip").style("opacity", 0);
            })
            .on("click", function(event, d) {
                const countryName = d.properties.name;
                playCountryAudio(countryName); // Reproducir sonido solo al hacer clic
            });
    }
    // Inicializar el mapa con el año 2023
    updateMap(2023);

    // Agregar un evento para actualizar el mapa cuando se cambie el año en el slider
    const yearSlider = d3.select("#year-slider");
    const selectedYear = d3.select("#selected-year");
    yearSlider.on("input", function() {
        const year = +this.value;
        selectedYear.text(year);
        updateMap(year); 
    });
});
