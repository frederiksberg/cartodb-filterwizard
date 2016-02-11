const gulp = require('gulp');
const sass = require('gulp-sass');
const uglify = require('gulp-uglify');
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync').create();

gulp.task('default', function() {
  gulp.watch('sass/**/*.scss', ['styles']);
  gulp.watch('src/**/*.js', ['compress']);
  browserSync.init({
    server: {
      baseDir: './',
      index: 'demo/index.html'
    }
  });
});

gulp.task('compress', function() {
  gulp.src('src/**/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('./dist'))
    .pipe(browserSync.stream());
});

gulp.task('styles', () => {
  gulp.src('sass/**/*.scss')
		.pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions']
    }))
		.pipe(gulp.dest('./css'))
		.pipe(browserSync.stream());
});
