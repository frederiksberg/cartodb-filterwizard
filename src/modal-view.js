/* global cartodb $ document L */
cartodb.filterWizard.filterModalView = {

  init: function() {
    var self = cartodb.filterWizard.filterModalView;
    self.controller = cartodb.filterWizard.filterController;

    // Get HTML elements from DOM
    self.header = document.getElementById('filterheader');
    self.body = document.getElementById('filterbody');
    self.count = document.getElementById('filtercount').children[0];
    self.objectName = document.getElementById('filtercount').children[1];
    self.submitButton = document.getElementById('filtersubmit');
    self.clearButton = document.getElementById('filterclear');

    // Connect submit button
    self.submitButton.onclick = function() {
      self.controller.updateLayer();
      $('#filterModal').modal('toggle');
    };
    // Conect clear button
    self.clearButton.onclick = function() {
      self.controller.checkNothing();
    };

    // Set object name for the object counter
    self.objectName.textContent = self.controller.getObjectName();

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

      // Make button to select all and connect it. Uses trick to send column to
      // the handler.
      var buttonAll = L.DomUtil.create('button',
                            'btn btn-default btn-all btn-xs',
                            columnElement);
      buttonAll.setAttribute('type', 'button');
      buttonAll.textContent = 'Vælg alle';
      buttonAll.onclick = (function(column) {
        return function() {
          console.log(column);
          self.controller.checkAll(column);
        };
      })(column);
      // Add checkboxes
      column.values.forEach(function(value, idx) {
        var checkBoxDiv = L.DomUtil.create('div',
                                           'filter-choice',
                                           columnElement);
        // Create checkbox and connect to function (trick to send the value)
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
};
