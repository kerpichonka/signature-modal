const gulp = require("gulp");
const plumber = require("gulp-plumber");
const sourcemap = require("gulp-sourcemaps");
const sass = require("gulp-sass");
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const csso = require("postcss-csso");
const rename = require("gulp-rename");
const htmlmin = require("gulp-htmlmin");
const imagemin = require("gulp-imagemin");
const del = require("del");
const gulpif = require("gulp-if");
const stylelint = require("gulp-stylelint");
const deploy = require("gulp-gh-pages");
const svgstore = require("gulp-svgstore");

const sync = require("browser-sync").create();

const env = process.env.NODE_ENV;

// private helper functions

const clean = () => del("dist");

const reload = (done) => {
  sync.reload();
  done();
};

const copy = (done) => {
  gulp
    .src(
      ["src/fonts/*.{woff2,woff}", "src/*.ico", "src/img/**/*.{jpg,png,svg}"],
      {
        base: "src",
      }
    )
    .pipe(gulp.dest("dist"));
  done();
};

// HTML

const html = () => {
  return gulp
    .src("src/*.html")
    .pipe(htmlmin({ collapseWhitespace: true }))
    .pipe(gulp.dest("dist"));
};

// Styles

const styles = () => {
  return gulp
    .src("src/styles/main.scss")
    .pipe(plumber())
    .pipe(gulpif(env === "dev", sourcemap.init()))
    .pipe(sass()) // main.css
    .pipe(postcss([autoprefixer(), csso()]))
    .pipe(rename("main.min.css"))
    .pipe(gulpif(env === "dev", sourcemap.write(".")))
    .pipe(gulp.dest("dist/css"))
    .pipe(sync.stream());
};

// Images

const images = () => {
  return gulp
    .src("src/img/**/*.{png,jpg,svg}")
    .pipe(
      imagemin([
        imagemin.mozjpeg({ progressive: true }),
        imagemin.optipng({ optimizationLevel: 5 }),
        imagemin.svgo(),
      ])
    )
    .pipe(gulp.dest("src/img"));
};

// Sprite

const sprite = () => {
  return gulp
    .src("src/img/*.svg")
    .pipe(svgstore())
    .pipe(rename("sprite.svg"))
    .pipe(gulp.dest("dist/img"));
};

// Test

const lintScss = () => {
  return gulp.src("src/styles/**/*.scss").pipe(
    stylelint({
      reporters: [
        {
          failAfterError: true,
          formatter: "string",
          console: true,
        },
      ],
    })
  );
};

const test = gulp.parallel(lintScss);
exports.test = test;

// Build

const build = gulp.series(
  clean,
  gulp.parallel(styles, html, copy, images),
  sprite
);

exports.build = build;

// Deploy

const deployApp = () => {
  return gulp.src("./dist/**/*").pipe(deploy());
};

exports.deploy = gulp.series(build, deployApp);

// Server

const server = (done) => {
  sync.init({
    server: {
      baseDir: "dist",
    },
    cors: true,
    notify: false,
    ui: false,
  });
  done();
};

// Watcher

const watcher = () => {
  gulp.watch("src/styles/**/*.scss", gulp.series(styles));
  gulp.watch("src/*.html", gulp.series(html, reload));
};

// Default

exports.default = gulp.series(
  clean,
  gulp.parallel(styles, html, sprite, copy),
  gulp.series(server, watcher)
);
