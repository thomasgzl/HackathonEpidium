! function() {

    var model = raw.model();

    // Group dimension. It will mainly provide a label for each
    // chart. If multiple lines share the same value in the
    // group dimension, they will be grouped.
    var group = model.dimension()
        .title('Etiquette');

    // 'Dimensions' dimension. accept multiple values.
    // Each value represent a slice of the pie.
    var dimensions = model.dimension()
        .title('Cercles')
        .types(Number)
        .required(true)
        .multiple(true);

    // Mapping function.
    // For each record in the dataset a pie chart abstraction is created.
    // Records are grouped according the 'group' variable.

    model.map(function(data) {

        // Check if dimensions are set.
        // In theory should be not necessary, to be fixed.
        if (dimensions() != null) {

            var index = 0;
            var nest = d3.nest()
                // If groups are not defined, assign a number to each record.
                .key(function(d) {
                    return group() ? group(d) : ++index;
                })
                .rollup(function(d) {
                    return dimensions().map(function(dimension) {
                        return {
                            key: dimension,
                            size: d3.sum(d, function(a) {
                                return +a[dimension];
                            })
                        }
                    })
                })
                .entries(data);

            return nest;
        }

    })

    // The chart object

    var chart = raw.chart()
        .title("Diagramme circulaire")
        .description("Un diagramme circulaire est divisé en tranches afin d'illustrer des proportions numériques. Il permet de représenter un petit nombre de valeur ar des angles proportionnels à ces valeurs. Diagrammes très utilisés en statistique.")
        .thumbnail("imgs/pieChart.png")
        .category('Autre')
        .model(model);

    var width = chart.number()
        .title('Largeur')
        .defaultValue(800)

    var columns = chart.number()
        .title('Colonnes')
        .defaultValue(4)

    var padding = chart.number()
        .title('Espacement')
        .defaultValue(10)

    var donut = chart.checkbox()
        .title('Graphique en anneaux')
        .defaultValue(false)

    var thickness = chart.number()
        .title('Epaisseur')
        .defaultValue(10)

    var showValues = chart.checkbox()
        .title('Montrer les valeurs')
        .defaultValue(false)

    var sortChartsBy = chart.list()
        .title("Ordonner les graphiques par")
        .values(['taille', 'nom'])
        .defaultValue('taille')

    var sortArcsBy = chart.list()
        .title("Ordonner les cercles par")
        .values(['taille', 'nom'])
        .defaultValue('taille')

    // Chart colors
    

    // Drawing function.

    chart.draw(function(selection, data) {

        var radius = +width() / +columns() / 2 - +padding() / 2;

        // Define color scale domain
        // Get the list of all possible values from first element
        // Use it to define the colors domain
        var allColors = data[0].value.map(function(item) {
            return item.key
        });
        colors.domain(allColors);

        var h = Math.ceil(data.length / +columns()) * (radius * 2 + padding());

        selection
            .attr("width", +width())
            .attr("height", h)

        var area = d3.scaleLinear()
            .domain([0, d3.max(data, function(layer) {
                return d3.sum(layer.value, function(d) {
                    return d.size;
                });
            })])
            .range([0, radius * radius * Math.PI])

        // Sort pie slices according to the 'sortArcsBy' function
        var pie = d3.pie()
            .sort(sortArcsByComparator)
            .value(function(d) {
                return d.size;
            });

        // Sort data according to the 'sortChartsBy' function
        data.sort(sortChartsByComparator);

        data.forEach(function(l, li) {

            var outerRadius = Math.sqrt(area(d3.sum(l.value, function(d) {
                return d.size;
            })) / Math.PI);

            var arc = d3.arc()
                .outerRadius(outerRadius)
                .innerRadius(donut() && thickness() < outerRadius ? outerRadius - +thickness() : 0)

            var g = selection
                .append("g")
                .attr("transform", function() {
                    return "translate(" + (li % +columns() * (+radius * 2 + +padding()) + +radius + padding() / 2) + "," + (Math.floor(li / +columns()) * (radius * 2 + +padding()) + radius + padding() / 2) + ")";
                })

            var p = g.selectAll(".arc")
                .data(pie(l.value))
                .enter().append("g")
                .attr("class", "arc");

            p.append("path")
                .attr("d", arc)
                .style("fill", function(d) {
                    return colors()(d.data.key);
                });

            if (showValues() == true) {

                var labels = g.selectAll(".numbers")
                    .data(pie(l.value))
                    .enter().append("text")
                    .attr("transform", function(d) {
                        return "translate(" + arc.centroid(d) + ")";
                    })
                    .attr("dy", ".35em")
                    .style("text-anchor", "middle")
                    .style("font-size", "10px")
                    .style("font-family", "Arial, Helvetica")
                    .style("fill", "#424242")
                    .text(function(d) {
                        return d.data.size.toLocaleString()
                    });
            }

            var label = g.append("text")
                .attr("y", outerRadius + 10)
                .text(l.key)
                .style("text-anchor", "middle")
                .style("font-size", "11px")
                .style("font-family", "Arial, Helvetica")

        })


        function sortChartsByComparator(a, b) {
            if (sortChartsBy() == 'taille') {
                return d3.descending(d3.sum(a.value, function(d) {
                        return d.size;
                    }),
                    d3.sum(b.value, function(d) {
                        return d.size;
                    }));
            }
            if (sortChartsBy() == 'nom') return d3.ascending(a.key, b.key);

        }

        function sortArcsByComparator(a, b) {
            if (sortArcsBy() == 'taille') return d3.descending(a.size, b.size);
            if (sortArcsBy() == 'nom') return d3.ascending(a.key, b.key);
        }


    })



}()
