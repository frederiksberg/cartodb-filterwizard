const gulp = require('gulp');
const sass = require('gulp-sass');
const uglify = require('gulp-uglify');
const concat = require('gulp-concat');
const rename = require('gulp-rename');
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync').create();

gulp.task('default', ['compress', 'styles'], function() {
});

gulp.task('serve', ['serve-concat', 'serve-styles'], function() {
  gulp.watch('sass/**/*.scss', ['serve-styles']);
  gulp.watch('src/**/*.js', ['serve-concat']);
  browserSync.init({
    server: {
      baseDir: './',
      index: 'demo/index.html'
    }
  });
});

gulp.task('serve-concat', function() {
  gulp.src(['src/main.js',
            'src/model.js',
            'src/modal-view.js',
            'src/controller.js',
            'src/leaflet-control.js'])
      .pipe(concat('cartodb-filterwizard.js'))
      .pipe(gulp.dest('./dist'))
      .pipe(browserSync.stream());
});

gulp.task('serve-styles', function() {
  gulp.src('sass/**/*.scss')
		.pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions']
    }))
		.pipe(gulp.dest('./dist'))
		.pipe(browserSync.stream());
});

gulp.task('compress', function() {
  gulp.src(['src/filterwizard.js', 'src/filterwizard-control.js'])
    .pipe(concat('cartodb-filterwizard.js'))
    .pipe(gulp.dest('./dist'))
    .pipe(rename('cartodb-filterwizard.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist'));
});

gulp.task('styles', function() {
  gulp.src('sass/**/*.scss')
		.pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions']
    }))
		.pipe(gulp.dest('./dist'));
});
