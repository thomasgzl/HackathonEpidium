'use strict';

/* Controllers */

angular.module('raw.controllers', [])

  .controller('RawCtrl', function ($scope, dataService, $http, $timeout, $sce) {

    $scope.loading = false;

    // Clipboard
    $scope.$watch('clipboardText', text =>  {
      if (!text) return;

      $scope.loading = true;

      if (is.url(text)) {
        $scope.importMode = 'url';
        $timeout(function() { $scope.url = text; });
        return;
      }

      try {
        var json = JSON.parse(text);
        selectArray(json);
        $scope.loading = false;
      }
      catch(error) {
        parseText(text);
      }

    });

    $scope.antani = d => {
      $scope.loading = true;
      var json = dataService.flatJSON(d);
      parseText(d3.tsvFormat(json))
    }

    // select Array in JSON
    function selectArray(json){
      $scope.json = json;
      $scope.structure = [];
      expand(json);
    }

    // parse Text
    function parseText(text){
    //  $scope.loading = false;
      $scope.json = null;
      $scope.text = text;
      $scope.parse(text);
    }

    // load File
    $scope.uploadFile = file =>  {

      if (file.size) {

        $scope.loading = true;

        // excel
        if (file.name.search(/\.xls|\.xlsx/) != -1 || file.type.search('sheet') != -1) {
          dataService.loadExcel(file)
          .then(worksheets => {
            $scope.fileName = file.name;
            $scope.loading = false;
            // multiple sheets
            if (worksheets.length > 1) {
              $scope.worksheets = worksheets;
            // single > parse
            } else {
              $scope.parse(worksheets[0].text);
            }
          })
        }

        // json
        if (file.type.search('json') != -1) {
          dataService.loadJson(file)
          .then(json => {
            $scope.fileName = file.name;
            selectArray(json);
          })
        }

        // txt
        if (file.type.search('text') != -1) {
          dataService.loadText(file)
          .then(text => {
            $scope.fileName = file.name;
            parseText(text);
          })
        }
      }
    };


    function parseData(json){

      $scope.loading = false;
    //  $scope.parsed = true;

      if (!json) return;
      try {
        selectArray(json);
      }
      catch(error) {
        console.log(error)
        parseText(json);
      }

    }

    // load URl
    $scope.$watch('url', url => {

      if(!url || !url.length) {
        return;
      }

      if (is.not.url(url)) {
        $scope.error = "Please insert a valid URL";
        return;
      }

      $scope.loading = true;
      var error = null;
      // first trying jsonp
      $http.jsonp($sce.trustAsResourceUrl(url), {jsonpCallbackParam: 'callback'})
          .then(response => {
            $scope.fileName = url;
            parseData(response.data);
      }, response => {

          $http.get($sce.trustAsResourceUrl(url), {responseType:'arraybuffer'})
          .then(response => {

            var data = new Uint8Array(response.data);
            var arr = new Array();
            for(var i = 0; i != data.length; ++i) arr[i] = String.fromCharCode(data[i]);
            var bstr = arr.join("");

            try {
              var workbook = XLS.read(bstr, {type:"binary"});
              var worksheets = [];
        			var sheet_name_list = workbook.SheetNames;

        			sheet_name_list.forEach(function(y) {
        			  var worksheet = workbook.Sheets[y];
        				worksheets.push({
        					name: y,
        					text : XLSX.utils.sheet_to_csv(worksheet),
                  rows: worksheet['!range'].e.r
        				})
        			});

              $scope.fileName = url;
              $scope.loading = false;

              // multiple sheets
              if (worksheets.length > 1) {
                $scope.worksheets = worksheets;
              // single > parse
              } else {
                parseText(worksheets[0].text);
              }
            }
            catch(error) {
              $scope.fileName = url;
              try {
                var json = JSON.parse(bstr);
                selectArray(json);
              }
              catch(error) {
                parseText(bstr);
              }
            }

          },
          response => {
            $scope.loading = false;
            $scope.error = "Il y a une erreur avec l'URL fourni. Veuillez vérifier que l'URL soit correct.";
          }
        )

      });

    });


    $scope.samples = [
      { title : 'Types d\'indicateurs FAO', type : 'Autre', url : 'data/Faostat_Indicators.csv'},
      { title : 'Plus grandes villes par continent', type : 'Distributions', url : 'data/cities.csv'},
      { title : 'Pays par PIB', type : 'Autre', url : 'data/countriesGDP.csv'},
      { title : 'Voitures', type : 'Multivarié', url : 'data/multivariate.csv' },
      { title : 'Films', type : 'Dispersions', url : 'data/dispersions.csv' },
      { title : 'Indutrie Musicale', type: 'Séries Temporelles', url : 'data/music.csv' },
      { title : 'Alignement', type : 'Graphique temporel', url : 'data/lineup.tsv' },
      { title : 'Orchestres', type : 'Hiérarchies (coefficient)', url : 'data/orchestra.csv' },
      { title : 'Royaume Animal', type: 'Hiérarchies', url : 'data/animals.tsv' },
      { title : 'Passengers du Titanic', type : 'Multi catégories', url : 'data/titanic.tsv' },
      { title : 'Lettres les plus fréquentes', type: 'Matrice', url:'data/letters.tsv'}
    ]

    $scope.selectSample = sample => {
//    $scope.$watch('sample', function (sample){
      if (!sample) return;
      $scope.text = "";
      $scope.loading = true;
      dataService.loadSample(sample.url).then(
        data => {
          $scope.text = data.replace(/\r/g, '');
          $scope.loading = false;
        },
        error => {
          $scope.error = error;
          $scope.loading = false;
        }
      );
    }//);

    $(document.getElementById("load-data")).on('dragenter', function(e){
      $scope.importMode = 'file';
      $scope.parsed = false;
      $scope.$digest();
    });

    $scope.$watch('dataView', function (n,o){
      if (!$('.parsed .CodeMirror')[0]) return;
      var cm = $('.parsed .CodeMirror')[0].CodeMirror;
      $timeout(function() { cm.refresh() });
    });

    // init
    $scope.raw = raw;
    $scope.data = [];
    $scope.metadata = [];
    $scope.error = false;
  //  $scope.loading = true;

    $scope.importMode = 'clipboard';

    $scope.categories = ['Hiérarchies', 'Séries Temporelles', 'Distributions', 'Corrélations', 'Autres'];

    $scope.bgColors = {
      'Hiérarchies': '#0f0',
      'Séries Temporelles': 'rgb(255, 185, 5)',
      'Distributions': 'rgb(5, 205, 255)',
      'Corrélations': '#df0',
      'Autres': '#0f0'
    }


    $scope.$watch('files', function () {
      $scope.uploadFile($scope.files);
    });

    $scope.log = '';

    $scope.files=[];


    $scope.$watch('importMode', function(){
      // reset
      $scope.parsed = false;
      $scope.loading = false;
      $scope.clipboardText = "";
      $scope.unstacked = false;
      $scope.text = "";
      $scope.data = [];
      $scope.json = null;
      $scope.worksheets = [];
      $scope.fileName = null;
      $scope.url = "";
      //$scope.$apply();
    })



    var arrays = [];

    $scope.unstack = function(){
      if (!$scope.stackDimension) return;
      var data = $scope.data;
      var base = $scope.stackDimension.key;

      var unstacked = [];

      data.forEach(row => {
        for (var column in row) {
            if (column == base) continue;
            var obj = {};
            obj[base] = row[base];
            obj.column = column;
            obj.value = row[column];
            unstacked.push(obj);
          }
      })
      $scope.oldData = data;
      parseText(d3.tsvFormat(unstacked));

      $scope.unstacked = true;

    }

    $scope.stack = function(){
      parseText(d3.tsvFormat($scope.oldData));
      $scope.unstacked = false;
    }


    function jsonTree(json){
      // mettere try
      var tree = JSON.parse(json);
      $scope.json = tree;
      $scope.structure = [];
      //console.log(JSON.parse(json));
      expand(tree);
    }


    function expand(parent){
      for (var child in parent) {
        if (is.object(parent[child]) || is.array(parent[child])) {
          expand(parent[child]);
          if (is.array(parent[child])) arrays.push(child);
        }
      }
      //console.log(child,parent[child])
    }


    // very improbable function to determine if pivot table or not.
    // pivotable index
    // calculate if values repeat themselves
    // calculate if values usually appear in more columns

    function pivotable(array) {

      var n = array.length;
      var rows = {};

      array.forEach(o => {
        for (var p in o) {
          if (!rows.hasOwnProperty(p)) rows[p] = {};
          if (!rows[p].hasOwnProperty(o[p])) rows[p][o[p]] = -1;
          rows[p][o[p]]+=1;
        }
      })

      for (var r in rows) {
        for (var p in rows[r]) {
          for (var ra in rows) {
            if (r == ra) break;
        //    if (p == "") break;
            if (rows[ra].hasOwnProperty(p)) rows[r][p]-=2.5;

          }
        }
      }

      var m = d3.values(rows).map(d3.values).map(d => { return d3.sum(d)/n; });
      //console.log(d3.mean(m),m)
      $scope.pivot = d3.mean(m);

    }




    $scope.parse = text => {

      if ($scope.model) $scope.model.clear();

      $scope.text = text;
      $scope.data = [];
      $scope.metadata = [];
      $scope.error = false;
      //$scope.importMode = null;
      //$scope.$apply();

      if (!text) return;

      try {
        var parser = raw.parser();
        $scope.data = parser(text);
        $scope.metadata = parser.metadata(text);
        $scope.error = false;
        pivotable($scope.data);
        $scope.parsed = true;

        $timeout(function() {
          $scope.charts = raw.charts.values().sort(function (a,b){ return d3.ascending(a.category(),b.category()) || d3.ascending(a.title(),b.title()) })
          $scope.chart = $scope.charts.filter(d => {return d.title() == 'Diagramme de dispersion'})[0];
          $scope.model = $scope.chart ? $scope.chart.model() : null;
        });
      } catch(e){
        $scope.data = [];
        $scope.metadata = [];
        $scope.error = e.name == "ParseError" ? +e.message : false;
      }
      if (!$scope.data.length && $scope.model) $scope.model.clear();
      $scope.loading = false;
      var cm = $('.parsed .CodeMirror')[0].CodeMirror;
      $timeout(function() { cm.refresh(); cm.refresh(); } );
    }

    $scope.delayParse = dataService.debounce($scope.parse, 500, false);

    $scope.$watch("text", text => {
      if (!text) return;
      $scope.loading = true;
      $scope.delayParse(text);
    });

    $scope.$watch('error', error => {
      if (!$('.parsed .CodeMirror')[0]) return;
      var cm = $('.parsed .CodeMirror')[0].CodeMirror;
      if (!error) {
        cm.removeLineClass($scope.lastError,'wrap','line-error');
        return;
      }
      cm.addLineClass(error, 'wrap', 'line-error');
      cm.scrollIntoView(error);
      $scope.lastError = error;
    })

    $('body').mousedown(function (e,ui){
      if ($(e.target).hasClass("dimension-info-toggle")) return;
      $('.dimensions-wrapper').each(e => {
        angular.element(this).scope().open = false;
        angular.element(this).scope().$apply();
      })
    })

    $scope.codeMirrorOptions = {
      dragDrop : false,
      lineNumbers : true,
      lineWrapping : true
    }

    $scope.selectChart = chart => {
      if (chart == $scope.chart) return;
      $scope.model.clear();
      $scope.chart = chart;
      $scope.model = $scope.chart.model();
    }

    function refreshScroll(){
      $('[data-spy="scroll"]').each(function () {
        $(this).scrollspy('refresh');
      });
    }

    $(window).scroll(function(){

      // check for mobile
      if ($(window).width() < 760 || $('#mapping').height() < 300) return;

      var scrollTop = $(window).scrollTop() + 0,
          mappingTop = $('#mapping').offset().top + 10,
          mappingHeight = $('#mapping').height(),
          isBetween = scrollTop > mappingTop + 50 && scrollTop <= mappingTop + mappingHeight - $(".sticky").height() - 20,
          isOver = scrollTop > mappingTop + mappingHeight - $(".sticky").height() - 20,
          mappingWidth = mappingWidth ? mappingWidth : $('.mapping').width();

      if (mappingHeight-$('.dimensions-list').height() > 90) return;
      //console.log(mappingHeight-$('.dimensions-list').height())
      if (isBetween) {
        $(".sticky")
          .css("position","fixed")
          .css("width", mappingWidth+"px")
          .css("top","20px")
      }

     if(isOver) {
        $(".sticky")
          .css("position","fixed")
          .css("width", mappingWidth+"px")
          .css("top", (mappingHeight - $(".sticky").height() + 0 - scrollTop+mappingTop) + "px");
          return;
      }

      if (isBetween) return;

      $(".sticky")
        .css("position","relative")
        .css("top","")
        .css("width", "");

    })

      $scope.sortCategory = chart => {
        // sort first by category, then by title
        return [chart.category(),chart.title()];
      };

    $(document).ready(refreshScroll);


  })
