/* global cartodb document L $*/
// class FilterBox {

cartodb.filterWizard = {

  filterModel: {

    init: function() {
      var self = cartodb.filterWizard.filterModel;
      self.controller = cartodb.filterWizard.filterController;
      self.layer = self.options.layer;
      self.sublayerNumber = self.options.sublayerNumber;
      self.sublayer = self.layer.getSubLayer(self.sublayerNumber);
      self.filterColumns = self.options.filterColumns;

      self.originalSQL = self.sublayer.getSQL().replace(/\n/g, '\n ');
      self.filteredSQL = self.originalSQL;
      self.sqlURL = self.layer.options.sql_api_protocol + '://' +
            self.layer.options.user_name + '.' +
            self.layer.options.sql_api_domain + ':' +
            self.layer.options.sql_api_port +
            self.layer.options.sql_api_endpoint;
      // @todo: change this to an option
      self.nullText = '(ukendt)';
      // Add empty list of unique values
      self.filterColumns.forEach(function(column) {
        column.values = [];
      });
      self._updateValues();
      self.filteredResultCount = 0;
    },

    // Update unique values from each column
    _updateValues: function() {
      var self = cartodb.filterWizard.filterModel;
      var queue = [];
      self.filterColumns.forEach(function(column) {
        var query;

        // Dertimine query from column type
        if (column.type === 'unique') {
          query = 'SELECT DISTINCT ' + column.name + ' as value' +
                  ' FROM (' + self.originalSQL + ') a ' +
                  'ORDER BY ' + column.name + ' ' +
                  'ASC;';
        } else if (column.type === 'year') {
          query = 'SELECT DISTINCT date_part(\'year\',' + column.name +
                  '::date) as value ' +
                  'FROM (' + self.originalSQL + ') a ' +
                  'ORDER BY ' + column.name + ' ' +
                  'ASC;';
        }

        if (query) {
          // Build request url
          var requestUrl = self.sqlURL + '?q=' + encodeURIComponent(query);
          queue.push($.getJSON(requestUrl, function(data) {
            var values = [];
            $.each(data.rows, function(key, value) {
              // By default, all boxes are unchecked
              var isChecked = false;

              // Check if column has a checked option, and handle the various
              // types.
              if (column.options.hasOwnProperty('checked')) {
                // If column is an array of values to be checked
                if (column.options.checked.constructor === Array) {
                  if ($.inArray(value.value, column.options.checked) >= 0) {
                    isChecked = true;
                  }
                } else if (column.options.checked === 'all') {
                  isChecked = true;
                }
              }
              values.push({checked: isChecked, value: value.value});
            });

            // Set column field
            column.values = values;
          }));
        }
      });

      // When all requests are done, tell controller that values are updated.
      $.when.apply(null, queue).done(function() {
        self.filteredSQL = self.makeQuery();
        self.updateCount();
      });
    },
    updateCount: function() {
      var self = cartodb.filterWizard.filterModel;
      var countQuery = 'SELECT COUNT(*) FROM (' + self.filteredSQL + ') f;';
      var requestUrl = self.sqlURL + '?q=' + encodeURIComponent(countQuery);
      $.getJSON(requestUrl, function(data) {
        self.filteredCount = data.rows[0].count;
        self.controller.valuesUpdated();
      });
    },
    makeQuery: function() {
      var self = cartodb.filterWizard.filterModel;

      // Løb igennem de forskellige kolonner og lav et filter for hver. De kobles sammen med et AND.
      // Hvis der ikke er sat krydser i en bestemt kolonne filtreres der ikke. Det samme er gældende for kryds i 'Alle'.
      var whereClause;
      var whereParts = [];
      var returnNothing = false;

      self.controller.getColumns().forEach(function(column) {
        var part = '';
        var checkedItems = [];
        var checkedValues = [];
        var nullChecked = false;

        if (column.type === 'unique') {
          part = column.name;
        } else if (column.type === 'year') {
          part = 'date_part(\'year\',' + column.name + '::date)';
        }
        column.values.forEach(function(item) {
          if (item.checked) {
            checkedItems.push(item);
            checkedValues.push(item.value);
          }
          if ((item.value === null) && (item.checked)) {
            nullChecked = true;
          }
        });

        if (checkedItems.length === column.values.length) {
          part = '';
        } else if (checkedItems.length > 0) {
          part += ' IN (\'' + checkedValues.join('\',\'') + '\')';
          if (nullChecked) {
            part += ' OR ' + column.name + ' IS NULL';
          }
          whereParts.push(part);
        } else {
          returnNothing = true;
        }
      });

      if (returnNothing) {
        return 'SELECT * FROM (' + self.originalSQL + ') LIMIT 0';
      } else if (whereParts.length > 0) {
        whereClause = 'WHERE (' + whereParts.join(') AND (') + ')';
        return 'SELECT * FROM (' + self.originalSQL + ') o ' + whereClause;
      } else if (whereParts.length === 0) {
        return self.originalSQL;
      }
    }
  },

  filterModalView: {

    init: function() {
      var self = cartodb.filterWizard.filterModalView;
      self.controller = cartodb.filterWizard.filterController;
      self.header = document.getElementById('filterheader');
      self.body = document.getElementById('filterbody');
      self.count = document.getElementById('filtercount').children[0];
      self.button = document.getElementById('filtersubmit');

      self.button.onclick = function() {
        self.controller.updateLayer();
        $('#filterModal').modal('toggle');
      };

      // Do not render as part of init, wait for valuesUpdated
    },

    render: function() {
      var self = cartodb.filterWizard.filterModalView;

      // Set header text @todo: Make this an option
      self.header.textContent = 'Vælg filter:';

      // Set count
      self.count.textContent = String(self.controller.getCount());

      // Clear out body
      self.body.innerHTML = '';
      var row = L.DomUtil.create('div', 'row', self.body);

      var columns = self.controller.getColumns();

      // Calculate basic column width for bootstrap grid.
      var defaultColumnWidth = Math.floor(12 / columns.length);

      // If the default column width does not add up to 12, how many columns
      // should be wider?
      var extraWidth = 12 % columns;
      columns.forEach(function(column, idx) {
        // Find out of it should be a wide column
        var columnWidth = defaultColumnWidth;
        if (idx < extraWidth) {
          columnWidth += 1;
        }

        // Convert width to a bootstrap compatible string
        var columnClass = 'col-md-' + String(columnWidth);

        // Create column element and header
        var columnElement = L.DomUtil.create('div', columnClass, row);
        L.DomUtil.create('h4', '', columnElement).textContent = column.title;

        // Add checkboxes
        column.values.forEach(function(value, idx) {
          var checkBoxDiv = L.DomUtil.create('div',
                                             'filter-choice',
                                             columnElement);
          // Create checkbox. @todo: Fix names and ids
          // var checkBox = L.DomUtil.create('input', '', checkBoxDiv);
          var checkBox = L.DomUtil.create('input', '', checkBoxDiv);
          checkBox.setAttribute('type', 'checkbox');
          checkBox.setAttribute('name', column.name + String(idx));
          if (value.checked) {
            checkBox.setAttribute('checked', 'true');
          }
          checkBox.onclick = (function(value) {
            return function() {
              self.controller.toggleValue(value);
            };
          })(value);
          // Create label for checkbox
          var checkBoxLabel = L.DomUtil.create('label', '', checkBoxDiv);
          checkBoxLabel.setAttribute('for', column.name + String(idx));
          checkBoxLabel.textContent =
            (value.value === null) ?
              self.controller.getNullText() :
              value.value;
        });
      });
    }
  },

  filterController: {

    init: function() {
      var self = cartodb.filterWizard.filterController;
      self.model = cartodb.filterWizard.filterModel;
      self.modalView = cartodb.filterWizard.filterModalView;
      self.model.init();
      self.modalView.init();
    },

    valuesUpdated: function() {
      var self = cartodb.filterWizard.filterController;
      self.modalView.render();
    },

    getColumns: function() {
      var self = cartodb.filterWizard.filterController;
      return self.model.filterColumns;
    },

    getNullText: function() {
      var self = cartodb.filterWizard.filterController;
      return self.model.nullText;
    },
    toggleValue: function(value) {
      var self = cartodb.filterWizard.filterController;
      value.checked = !(value.checked);
      self.model.filteredSQL = self.model.makeQuery();
      self.model.updateCount();
    },
    getCount: function() {
      var self = cartodb.filterWizard.filterController;
      return self.model.filteredCount;
    },
    updateLayer: function() {
      var self = cartodb.filterWizard.filterController;
      if (self.filteredSQL !== self.model.sublayer.getSQL()) {
        self.model.sublayer.setSQL(self.model.filteredSQL);
      }
    }
  }
};

function FilterBox (element,layer,sublayer_no,filter_columns,options) {
  if (this instanceof FilterBox) {
    var layer = layer;
    var subLayer = layer.getSubLayer(sublayer_no);
    var filter_columns = filter_columns;

    // private variabler
    var original_sql = layer.getSubLayer(sublayer_no).getSQL().replace(/\n/g, "\n ");
    var sql_url = layer.options.sql_api_protocol+'://'+layer.options.user_name+'.'+layer.options.sql_api_domain+':'+layer.options.sql_api_port+layer.options.sql_api_endpoint;
    var root_element = $('#'+element);
    var null_text = '(ukendt)';

    var _populateFilterOptions = function() {
      var count_populated = 0
      for (var i = 0; i < filter_columns.length; i++) {
        // Lav kolonne-overskrifter i headeren
        $('#filterheader').append('<th>'+filter_columns[i].title+'</th>');

        // Lav celler til at indeholde checkboxe
        $('#filterbody').append('<td id="filter_'+filter_columns[i].name+'"></td>');

        // Bestem hvorledes filter-værdierne skal trækkes
        if (filter_columns[i].type == 'unique') query = 'SELECT DISTINCT '+filter_columns[i].name+' FROM ('+original_sql+') a ORDER BY '+filter_columns[i].name+' ASC;';
        if (filter_columns[i].type == 'year') query = 'SELECT DISTINCT date_part(\'year\','+filter_columns[i].name+'::date) as '+filter_columns[i].name+' FROM ('+original_sql+') a ORDER BY '+filter_columns[i].name+' ASC;';

        // Hvis query ikke er tom, så hent værdier til filter.

        if (query) {

          $.getJSON(sql_url+'?q='+ encodeURIComponent(query), function(data) {
            $.each(data.fields, function(k,v) {
            fields = [];
            column = data.fields[0]
            console.log(data);
            $.each(data.rows, function(key, val) {
               if (val[k]) {
                 fields.push(val[k]);
               } else {
                 fields.push(null_text);
               };
            })
            var filter_options = '<fieldset id="fieldset_'+k+'">';
            for (j = 0; j < fields.length; j++) {
              filter_options += '<input type="checkbox" checked="true" name="'+k+'_'+j+'" />&nbsp;<label for="'+k+'_'+j+'">'+fields[j]+'</label><br />';
            }
            filter_options += '</fieldset>';
            $('#filter_'+k).append(filter_options);
            $('#filter_'+k).children('fieldset').children('input:checkbox').click(_updateCountFromForm);
            })

          }).done(function(data) {
            // Tæller hvor mange filtre der er er udfyldt
            count_populated += 1;
            // Tjekker om det er data trukket for det sidste filter. Hvis det er det, så opdater antal
            if (count_populated==filter_columns.length) _updateCountFromForm();
          });
        }
      }
    }

    var _getQueryFromForm = function() {
      // Where starter med WHERE :-)
      where_part = 'WHERE ';

      var has_null = false;
      var selected;
      // Løb igennem de forskellige kolonner og lav et filter for hver. De kobles sammen med et AND.
      // Hvis der ikke er sat krydser i en bestemt kolonne filtreres der ikke. Det samme er gældende for kryds i 'Alle'.

      for (i = 0; i < filter_columns.length; i++) {
        this_part = '';
        // Henter alle de checkboxe der er kryds i, inden for kolonnens fieldset.
        checked_inputs = $('#fieldset_'+filter_columns[i].name).children('input:checked')

       // Tjek efter kryds intet
        none_checked = checked_inputs.length == 0;

        // Hvis der ikke er valgt alt/intet, så styk et filter sammen.
        // if (!(none_checked)) {

          // Hvis det ikke er det første filter, så skal der et AND foran.
          if (where_part.length > 6) this_part += ' AND ';

          has_null = false;
          selected = [];

          // Tilføj tekst fra label til filteret
          for (j = 0; j < checked_inputs.length; j++) {

            // Tjek om der er valgt NULL-værdier til.
            if ($("label[for='"+checked_inputs[j].name+"']")[0].textContent == null_text) {
              has_null = true;
            } else {
              selected.push($("label[for='"+checked_inputs[j].name+"']")[0].textContent);
            }
          }

          // Hold styr på de forskellige typer
          if (filter_columns[i].type == 'unique') this_part += '(' + filter_columns[i].name + ' IN (';
          if (filter_columns[i].type == 'year') this_part += '(' + 'date_part(\'year\','+filter_columns[i].name + '::date) IN (';

          for (j = 0; j < selected.length; j++) {
            this_part += "'"+selected[j]+"'"

            // Hvis det ikke er den sidste, så sæt et komma
            if (j+1 < selected.length) this_part+=',';
          }
          if (selected.length == 0) this_part += "'foo'";

          // Afsluttende parentes
          this_part += ')';
          if (has_null) this_part += ' OR '+filter_columns[i].name+' IS NULL';
          this_part += ')';
        // }
        // Det enkelte filter kobles på WHERE (medmindre WHERE ikke har filtre).
        where_part += this_part;
      }

      // Hvis der er filtre, sættes den nye SQL sammen og påføres laget.
      if (where_part.length > 6) {
        console.log('SELECT * FROM ('+original_sql+') a ' + where_part);
        return ('SELECT * FROM ('+original_sql+') a ' + where_part);

      } else {
        return (original_sql);
      }
    }

    var _updateCountFromForm = function() {
      $('#filtersubmit').prop('disabled',true)
      query = 'SELECT COUNT(*) FROM ('+_getQueryFromForm()+') cnt';

	  $.getJSON(sql_url+'?q='+ encodeURIComponent(query),function(data) {
        console.log(data.rows[0].count);
        $('#filtercount').children('span.value').text(data.rows[0].count)
        if (data.rows[0].count > 0) {
          $('#filtersubmit').prop('disabled',false)
        }
      });
	};

    var _setupSubmit = function() {
      $('#filtersubmit').click(function() {
        _updateCountFromForm();
        var new_sql = _getQueryFromForm()
        if (new_sql != original_sql) {
          subLayer.setSQL(new_sql);
        $('#filterModal').modal('toggle');
        }
      });
    }

    // Lav HTML
    root_element.append('<div id="filtercontrol"><button type="button" class="btn btn-info btn-lg" data-toggle="modal" data-target="#filterModal">Filter!!</button></div>');
    root_element.append('<div class="modal fade" id="filterModal" role="dialog"><div class="modal-dialog"><div class="modal-content"><form name="filter_form" action=""><div class="modal-header"><button type="button" class="close" data-dismiss="modal">&times;</button><h3>V&aelig;lg filtre:</h3></div><div class="modal-body"><table><tr id="filterheader"></tr><tr id="filterbody"></tr></table></div><div class="modal-footer"><div id="filtercount">Du har valgt <span class="value">0</span> projekter.</div><button type="button" class="btn btn-default btn-close" data-dismiss="modal" id="filtersubmit">Udfør</button></div></form></div></div></div>');

    // Opbyg filtrerings-options
    _populateFilterOptions();

    // Sæt formbehandling
    _setupSubmit();

    this.rebuildFilters = function() {};

  } else
    return new FilterBox(element,layer,sublayer_no,filter_columns,options);
}

/*
columns = [
    {title : 'Kommunekode', name : 'komkode', type : 'unique', options: {}},
    {title : oprettet, name : 'created_at', type: 'year', options : {years: [2014,2015,2016]}}
]
*/
