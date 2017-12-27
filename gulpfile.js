let gulp = require('gulp');
let autoprefixer = require('autoprefixer');
let exec = require('child_process').exec;
let plugins = require('gulp-load-plugins')();

gulp.task('bundleJs', function() {
  return gulp.src('src/assets/js/**/*.js')
    .pipe(plugins.sourcemaps.init())
    .pipe(plugins.babel({presets: ['env']}))
    .pipe(plugins.concat('app.js'))
    .pipe(plugins.uglify())
    .pipe(plugins.sourcemaps.write())
    .pipe(gulp.dest('src/assets/bundle'));
});

gulp.task('bundleLess', function() {
  return gulp.src('src/assets/less/*.less')
    .pipe(plugins.less())
    .pipe(plugins.postcss([
      autoprefixer({browsers: ['last 1 versions', 'ie 11']}),
    ]))
    .pipe(plugins.concat('styles.css'))
    .pipe(gulp.dest('src/assets/bundle'));
});

gulp.task('bundleHbs', function(done) {
  // eslint-disable-next-line max-len
  let command = 'node node_modules/handlebars/bin/handlebars --extension hbs ./src/assets/views -f ./src/assets/bundle/templates.js';
  exec(command, (err) => done(err));
});

gulp.task('build', ['bundleJs', 'bundleLess', 'bundleHbs']);
