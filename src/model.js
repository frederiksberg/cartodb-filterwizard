/* global cartodb $ */

cartodb.filterWizard.filterModel = {
  init: function() {
    var self = cartodb.filterWizard.filterModel;
    self.controller = cartodb.filterWizard.filterController;

    // Move layers from options to actual model
    self.layer = self.options.layer;
    self.sublayerNumber = self.options.sublayerNumber;
    self.filterColumns = self.options.filterColumns;
    // Create sub layer from sublayer Number
    self.sublayer = self.layer.getSubLayer(self.sublayerNumber);

    // Get the sublayer's standard query
    self.originalSQL = self.sublayer.getSQL().replace(/\n/g, '\n ');

    // Get the URL for the SQL API
    self.sqlURL = self.layer.options.sql_api_protocol + '://' +
          self.layer.options.user_name + '.' +
          self.layer.options.sql_api_domain + ':' +
          self.layer.options.sql_api_port +
          self.layer.options.sql_api_endpoint;

    // At init, filtered query is just the standard query
    self.filteredSQL = self.originalSQL;

    // @todo: change this to an option
    self.nullText = '(ukendt)';

    // Add empty list of unique values
    self.filterColumns.forEach(function(column) {
      column.values = [];
    });

    self.controller.hideLayer();

    // Update values for filter selection. (true indicates that it is first run)
    self._updateValues(true);

    // We have not counted the filtered results yet, so 0 is as good as any.
    self.filteredResultCount = 0;
  },

  // Update unique values from each column, and set their status as checked
  // or unchecked, according to options.
  _updateValues: function(isFirstRun) {
    var self = cartodb.filterWizard.filterModel;

    // Queue to hold all requests
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

      // If query type has been determined.
      if (query) {
        // Build request url
        var requestUrl = self.sqlURL + '?q=' + encodeURIComponent(query);
        queue.push($.getJSON(requestUrl, function(data) {
          var values = [];
          $.each(data.rows, function(key, value) {
            // By default, all boxes are unchecked
            var isChecked = false;

            // Check if column has a checked option, and handle the various
            // types. The default is to check none.
            if (column.options.hasOwnProperty('checked')) {
              // The checked option is an array of values
              if (column.options.checked.constructor === Array) {
                if ($.inArray(value.value, column.options.checked) >= 0) {
                  isChecked = true;
                }
              // The checked option is a string with 'all'
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

      // On the first run, layer is updated and should no longer hidden.
      if (isFirstRun) {
        self.controller.updateLayer();
        self.controller.showLayer();
      }
      self.updateCount();
    });
  },

  // Update the object count in the layer
  updateCount: function() {
    var self = cartodb.filterWizard.filterModel;
    var countQuery = 'SELECT COUNT(*) FROM (' + self.filteredSQL + ') f;';
    var requestUrl = self.sqlURL + '?q=' + encodeURIComponent(countQuery);
    $.getJSON(requestUrl, function(data) {
      // Result has only one line, with one field called 'count'
      self.filteredCount = data.rows[0].count;
      // Somehting has changed in the model, notify controller
      self.controller.valuesUpdated();
    });
  },

  // Runs through all selected values and builds fitting SELECT-query
  makeQuery: function() {
    var self = cartodb.filterWizard.filterModel;

    var whereClause;
    var whereParts = [];
    var returnNothing = false;
    var numNoSelection = 0;

    self.controller.getColumns().forEach(function(column) {
      // Initial values
      var part = '';
      var checkedItems = [];
      var checkedValues = [];
      var nullChecked = false;

      // Determine what gets compared with filter values
      if (column.type === 'unique') {
        part = column.name;
      } else if (column.type === 'year') {
        part = 'date_part(\'year\',' + column.name + '::date)';
      }

      // Iterate though values and get only checked values in a list
      column.values.forEach(function(item) {
        if ((item.checked) && (item.value)) {
          checkedItems.push(item);
          checkedValues.push(item.value);
        }

        // Null is not added to the list, but handled on its own.
        if ((item.value === null) && (item.checked)) {
          nullChecked = true;
        }
      });

      // Find out what kind of query

      // If all is checked, no filter is necessary for this column
      if (checkedItems.length ===
          column.values.length - (1 * Number(nullChecked))) {
        part = '';

      // If something is checked, build a IN (x,y,z)-style filter and if null is
      // also checked, add it with an OR.
      } else if (checkedItems.length > 0) {
        part += ' IN (\'' + checkedValues.join('\',\'') + '\')';
        if (nullChecked) {
          part += ' OR ' + column.name + ' IS NULL';
        }
        whereParts.push(part);

      // If only null is checked
      } else if (nullChecked) {
        part += ' IS NULL';
        whereParts.push(part);

      // Remaining possibility is where none is checked, and it has been decided
      // to get the same result as when all is checked. Exception is if none is
      // selected in all columns.
      } else {
        part = '';
        numNoSelection += 1;
      }
    });

    // If nothing is selected in all columns, return nothhing.
    if (numNoSelection === self.controller.getColumns().length) {
      returnNothing = true;
    };

    // If nothing is checked in one or more columns, return an empty result.
    if (returnNothing) {
      return 'SELECT * FROM (' + self.originalSQL + ') o LIMIT 0';

    // If there are one or more filters, then join them with an AND
    } else if (whereParts.length > 0) {
      whereClause = 'WHERE (' + whereParts.join(') AND (') + ')';
      return 'SELECT * FROM (' + self.originalSQL + ') o ' + whereClause;

    // If there are no filters, then just return the original SQL
    } else if (whereParts.length === 0) {
      return self.originalSQL;
    }
  }
};
