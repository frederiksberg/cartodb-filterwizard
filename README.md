# FilterWizard for cartoDB

A tool for filtering a layer in a CartoDB visualization on predefined columns.
It is currently implemented as a Leaflet control, so adding it will be as
simple as `map.addControl(new L.Control.FilterWizard(configuration));`

It only works for public or hidden layers, ie. layers where the SQL interface
is public.

## Demo
http://lab.kjlr.dk/static/cartodb-filterwizard/demo/

## Warning
This is still a project under development and has several known issues:
* A lot of hard coded strings in Danish
* A lot of fixed element ids spread around the HTML
* It possibly kills small furry animals

## How to get it
If you do not need to modify code, the easiest is to get a pre-built package
from here:
http://lab.kjlr.dk/static/cartodb-filterwizard/cartodb-filterwizard-0.2.0.zip

## How to use
```javascript
var visualizationURL = '...'

cartodb.createVis('map'), visualizationURL)
  .done(function(vis, layers) {
    var map = vis.getNativeMap();
    var filterConfiguration = {
      position: 'topright'
      layer: layers[1],
      sublayerNumber: 0,
      filterColumns:  [
        {
          title: 'First column',
          name: 'first_column',
          type: 'unique',
          options: {'checked' : 'all'}
        },
        {
          title: 'Creation date',
          name: 'date_creation',
          type: 'year',
          options: {'checked' : 2014, 2015}
        }
      ]
    }
  });
```

## How to build it
You need to have a working [nodeJS](http://nodejs.org) environment.

If you do not have `gulp-cli` installed, please do so:

```sh
npm install --global gulp-cli
```

The just clone the repository, download the dependencies with npm and build it
with gulp:

```sh
git clone ^GET URL ABOVE^
cd cartodb-filterwizard
npm install
gulp
```
