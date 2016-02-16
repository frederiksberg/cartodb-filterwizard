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

      self.controller.hideLayer();

      self._updateValues(true);
      self.filteredResultCount = 0;
    },

    // Update unique values from each column
    _updateValues: function(isFirstRun) {
      var self = cartodb.filterWizard.filterModel;
      var queue = [];
      self.filterColumns.forEach(function(column) {
        var query;

        // Dertimine query from column type
        if (column.type === 'unique') {
          query = 'SELECT DISTINCT ' + column.name + ' as value' +
                  ' FROM (' + self.originalSQL + ') a ' +
                  'ORDER BY value ' +
                  'ASC;';
        } else if (column.type === 'year') {
          query = 'SELECT DISTINCT date_part(\'year\',' + column.name +
                  '::date) as value ' +
                  'FROM (' + self.originalSQL + ') a ' +
                  'ORDER BY value ' +
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
        if (isFirstRun) {
          self.controller.updateLayer();
          self.controller.showLayer();
        }
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
          if ((item.checked) && (item.value)) {
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

    hideLayer: function() {
      var self = cartodb.filterWizard.filterController;
      self.model.layer.hide();
    },

    showLayer: function() {
      var self = cartodb.filterWizard.filterController;
      self.model.layer.show();
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
