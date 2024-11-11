//codigo principal
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

let energyLookup = {}; // aca vamos almacenar los datos por año y pais

function playCountryAudio(countryName) {
    const audio = new Audio(`sounds/${countryName}.mp3`); // aca esta el archivo de audio 
    audio.play();
}

// reproduccion de sonido al cambiar año
function playYearChangeClick() {
    const audio = new Audio("sounds/click_sound.mp3");
    audio.volume = 0.2; // aca esta el volumen la podemos editar si queremos mas fuerte o mas bajo 
    audio.play();
}

function calculateAverageProduction(year) {
    const energyDataForYear = Object.values(energyLookup[year] || {});
    const sum = energyDataForYear.reduce((acc, value) => acc + value, 0);
    const avg = energyDataForYear.length ? (sum / energyDataForYear.length).toFixed(2) : 0;
    return avg;
}

function updateAverageProduction(year) {
    const avgProduction = calculateAverageProduction(year);
    d3.select("#average-production-value").text(`${avgProduction}%`);
}


// carga de datos
Promise.all([
    d3.json("custom.geo.json"),
    d3.csv("country_data_years.csv")
]).then(([geoData, countryData]) => {
    
    // datos a diccionarios
    countryData.forEach(d => {
        const year = +d.Year;
        const country = d.Entity;
        const energyUse = +d.Energy_Use;

        if (!energyLookup[year]) energyLookup[year] = {};
        energyLookup[year][country] = energyUse;
    });

    // esta parte es para que al seleccionar el país nos de una idea de la cantidad de energia renovable que usamos
    const energyValues = countryData.map(d => +d.Energy_Use);
    const minEnergy = d3.min(energyValues);
    const maxEnergy = d3.max(energyValues);
    const colorScale = d3.scaleSequential(d3.interpolateBlues)
                     .domain([minEnergy, maxEnergy]);

    // funcion de actualizar año
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

                // aca quiero que solo se muestre el nombre del pais al pasar el mouse por encima, para hacer un buen uso del archivo de sonidos de paises 
                d3.select("#tooltip")
                  .style("opacity", 1)
                  .style("left", `${event.pageX + 10}px`)
                  .style("top", `${event.pageY - 28}px`)
                  .html(`<strong>${countryName}</strong>`);

                // borde mas gruedo de los paises
                d3.select(this)
                  .attr("stroke", "#222")
                  .attr("stroke-width", 5);
            })
            .on("mouseout", function() {
                // esta parte es para sacar el tooltip si se saca el mouse
                d3.select("#tooltip").style("opacity", 0);

                // volvemos al mapa igual que antes de poner el mouse
                d3.select(this)
                  .attr("stroke", "#333")
                  .attr("stroke-width", 1);
            })
            .on("click", function(event, d) {
                const countryName = d.properties.name;
                const energyUse = energyLookup[year][countryName];

                // aca queria que diera un mensaje y diera un color si el uso de energia era bajo medio o alto estos parametros lo saque de https://www.irena.org/publications/2022/Apr/Renewable-Capacity-Statistics-2022-ES que describe la cantidad de uso dependiendo de su porcentaje por pais 
                let message = "";
                let barColor = "";
                if (energyUse >= 50) {
                    message = "Alto uso de energía renovable";
                    barColor = "green";
                } else if (energyUse < 50 && energyUse >= 20) {
                    message = "Moderado uso de energía renovable";
                    barColor = "yellow";
                } else {
                    message = "Bajo uso de energía renovable";
                    barColor = "red";
                }

                // detalles del tooltip
                d3.select("#tooltip")
                  .style("opacity", 1)
                  .style("left", `${event.pageX + 10}px`)
                  .style("top", `${event.pageY - 28}px`)
                  .html(`
                      <strong>${countryName}</strong><br>
                      <strong>Uso de energía renovable:</strong> ${energyUse ? energyUse + "%" : "N/A"}<br>
                      <span style="color: ${barColor};">${message}</span><br>
                      <div style="background: #ddd; width: 100px; height: 8px; border-radius: 4px;">
                          <div style="width: ${energyUse}%; height: 100%; background: ${barColor}; border-radius: 4px;"></div>
                      </div>
                  `);

                playCountryAudio(countryName); // sonidos de los paises 😊
            });
    }

    // cuando abran el link esto sera iniciado en el 2023
    updateMap(2023);

    // Agregar un evento para actualizar el mapa cuando se cambie el año en el slider
    const yearSlider = d3.select("#year-slider");
    const selectedYear = d3.select("#selected-year");
    yearSlider.on("input", function() {
        const year = +this.value;
        selectedYear.text(year);
        updateMap(year);
        updateAverageProduction(year);
        playYearChangeClick(); // aca va ek sonido de cambio de año
    });

    // aca es el codigo de la leyenda 
    const legendWidth = 250;
    const legendHeight = 20;

    const legend = svg.append("g")
        .attr("transform", `translate(${width - legendWidth - 20}, ${height - 40})`); // pos esquina derecha abajo

    // creamos el gradiente con los colores
    const legendGradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "legend-gradient");

    legendGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorScale(minEnergy)); // color mas claro

    legendGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorScale(maxEnergy)); // mas oscuro

    // dibujo de la leyenda
    legend.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", legendWidth)
        .attr("height", legendHeight)
        .style("fill", "url(#legend-gradient)");

    // etiqueta del minimo y maximo 
    legend.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .text(`${0}%`)
        .style("font-size", "24px");

    legend.append("text")
        .attr("x", legendWidth)
        .attr("y", -5)
        .attr("text-anchor", "end")
        .text(`${maxEnergy}%`)
        .style("font-size", "24px");

    legend.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", -35)
        .attr("text-anchor", "middle")
        .style("font-size", "21px")
        .style("font-weight", "bold")
        .text("Porcentaje de Energía Renovable");
    
    const averageContainer = svg.append("g")
        .attr("class", "average-container")
        .attr("transform", `translate(${width - legendWidth - 20}, ${height + 50})`); // Posición debajo de la leyenda
    
    averageContainer.append("text")
        .attr("id", "average-production-value")
        .attr("text-anchor", "middle")
        .attr("x", legendWidth / 2)
        .attr("y", 20)
        .style("font-size", "40px")
        .style("fill", "RGB(0, 122, 255)")
        .style("font-weight", "bold")
        .text("61.30%");
    
    averageContainer.append("text")
        .attr("class", "average-label")
        .attr("text-anchor", "middle")
        .attr("x", legendWidth / 2)
        .attr("y", 50)
        .style("font-size", "20px")
        .style("fill", "black")
        .text("Promedio producción del año");
});
