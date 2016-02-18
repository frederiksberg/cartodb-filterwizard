/* global cartodb */

cartodb.filterWizard.filterController = {

  init: function() {
    var self = cartodb.filterWizard.filterController;
    self.model = cartodb.filterWizard.filterModel;
    self.modalView = cartodb.filterWizard.filterModalView;

    self.model.init();
    self.modalView.init();
  },

  // Hides the layer from view. Does nothing if already hidden.
  hideLayer: function() {
    var self = cartodb.filterWizard.filterController;
    self.model.layer.hide();
  },

  // Shows the layer to the user. Does nothing if already hidden.
  showLayer: function() {
    var self = cartodb.filterWizard.filterController;
    self.model.layer.show();
  },

  // What to do if something is changed in the model (at the moment, re-render)
  valuesUpdated: function() {
    var self = cartodb.filterWizard.filterController;
    self.modalView.render();
  },

  // Return columns from the model
  getColumns: function() {
    var self = cartodb.filterWizard.filterController;
    return self.model.filterColumns;
  },

  // Returns what text should be shown to the user for null values.
  getNullText: function() {
    var self = cartodb.filterWizard.filterController;
    return self.model.nullText;
  },

  // Toggles a value. If it was checked, now it's unchecked and vice versa.
  toggleValue: function(value) {
    var self = cartodb.filterWizard.filterController;
    value.checked = !(value.checked);
    self.model.filteredSQL = self.model.makeQuery();
    console.log(self.model.filteredSQL);
    self.model.updateCount();
  },

  // Returns the count from the model. It DOES NOT re-count it in the data.
  getCount: function() {
    var self = cartodb.filterWizard.filterController;
    return self.model.filteredCount;
  },

  // If the filtered query is different from the already set query, update it.
  updateLayer: function() {
    var self = cartodb.filterWizard.filterController;
    if (self.filteredSQL !== self.model.sublayer.getSQL()) {
      self.model.sublayer.setSQL(self.model.filteredSQL);
    }
  },
  // Check all values in a column
  checkAll: function(column) {
    var self = cartodb.filterWizard.filterController;
    column.values.forEach(function(item) {
      item.checked = true;
    });

    // Make a new query to fit the changes
    self.model.filteredSQL = self.model.makeQuery();
    // Count the number of objects on the new query
    self.model.updateCount();
  },

  // Removes all checks from all columns.
  checkNothing: function() {
    var self = cartodb.filterWizard.filterController;
    self.model.filterColumns.forEach(function(column) {
      column.values.forEach(function(item) {
        item.checked = false;
      });
    });

    // Make a new query to fit the changes
    self.model.filteredSQL = self.model.makeQuery();
    // Count the number of objects on the new query
    self.model.updateCount();
  }
};
