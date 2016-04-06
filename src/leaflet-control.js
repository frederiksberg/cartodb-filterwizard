/* global L document cartodb */

L.Control.FilterWizard = L.Control.extend({
  options: {
    position: 'topright',
    objectName: 'objekter',
    buttonText: 'Filter',
    layer: {},
    sublayerNumber: 0,
    filterColumns: {}
  },

  initialize: function(options) {
    L.setOptions(this, options);

    // Add options to filterModel
    cartodb.filterWizard.filterModel.options = options;
  },

  onAdd: function(map) {
    var container = L.DomUtil.create('div', 'filterwizard');

    var modal = L.DomUtil.create('div', 'modal fade', document.body);
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('id', 'filterModal');
    modal.innerHTML = '<div class="modal-dialog"><div class="modal-content">' +
      '<form name="filter_form" action=""><div class="modal-header">' +
      '<button type="button" class="close" data-dismiss="modal">&times;' +
      '</button><h3 id = "filterheader">V&aelig;lg filtre:</h3></div>' +
      '<div class="modal-body" id="filterbody">' +
      '</div><div class="modal-footer"><div id="filtercount">Du har valgt ' +
      '<span class="value">0</span> <span class="objectname">objekter</span>' +
      '.</div><button type="button" ' +
      'class="btn btn-warning" id="filterclear">Ryd valg</button><button ' +
      'type="button" class="btn btn-primary btn-close" data-dismiss="modal" ' +
      'id="filtersubmit">Udfør</button></div></form></div></div>';

    var button = L.DomUtil.create('button', 'btn btn-info btn-lg', container);
    button.setAttribute('data-toggle', 'modal');
    button.setAttribute('data-target', '#filterModal');
    button.textContent = this.options.buttonText;

    cartodb.filterWizard.filterController.init();

    return container;
  },

  onRemove: function() {
    var modal = document.getElementById('filterModal');
    modal.remove();
  }
});

L.Map.addInitHook(function() {
  if (this.options.filterWizardControl) {
    this.filterWizardControl = new L.Control.FilterWizard();
    this.addControl(this.drawControl);
  }
});
