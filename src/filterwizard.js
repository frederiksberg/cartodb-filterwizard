/* global cartodb*/
// class FilterBox {

cartodb.filterWizard = {
  model: {
    init: function() {
      console.log('Initilize!');
    }
  },
  view: {
    init: function() {
      console.log('Initilize!');
    },
    render: function() {
      console.log('Render!');
    }
  },
  controller: {
    init: function() {
      console.log('Initilize!');
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
