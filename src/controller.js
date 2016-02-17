/* global cartodb */

cartodb.filterWizard.filterController = {

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
    console.log(self.model.filteredSQL);
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
  },
  checkAll: function(column) {
    var self = cartodb.filterWizard.filterController;
    column.values.forEach(function(item) {
      item.checked = true;
    });
    self.model.filteredSQL = self.model.makeQuery();
    self.model.updateCount();
  },
  checkNothing: function() {
    var self = cartodb.filterWizard.filterController;
    self.model.filterColumns.forEach(function(column) {
      column.values.forEach(function(item) {
        item.checked = false;
      });
    });
    self.model.filteredSQL = self.model.makeQuery();
    self.model.updateCount();
  }
};
