/* global L */

L.Control.FilterWizard = L.Control.extend({
  options: {
    position: 'topright',
    layer: {},
    sublayerNumber: 0,
    filterColumns: {}
  },
  initialize: function(options) {
    console.log(options);
  },
  onAdd: function(map) {
    console.log(map);
  },
  onRemove: function() {
    console.log('Do something');
  }
});

L.map.addInitHook(function() {
  if (this.options.filterWizardControl) {
    this.filterWizardControl = new L.Control.FilterWizard();
    this.addControl(this.drawControl);
  }
});
