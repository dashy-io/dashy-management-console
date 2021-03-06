/* jshint node:true */
'use strict';
var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var ghPages = require('gulp-gh-pages');
var runSequence = require('run-sequence');
var deploySettings = {
    "root": "dist",
    "username": process.env.deployUser,
    "hostname": process.env.deployHost,
    "destination": process.env.deployDest
}

gulp.task('styles', function() {
    return gulp.src('app/styles/main.css')
        .pipe($.autoprefixer({
            browsers: ['last 1 version']
        }))
        .pipe(gulp.dest('.tmp/styles'));
});

gulp.task('jshint', function() {
    return gulp.src('app/scripts/**/*.js')
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish'))
        .pipe($.jshint.reporter('fail'));
});

gulp.task('html', ['styles'], function() {
    var assets = $.useref.assets({
        searchPath: '{.tmp,app}'
    });

    return gulp.src('app/**/*.html')
        .pipe(assets)
        //.pipe($.if('*.js', $.uglify()))
        .pipe($.if('*.css', $.csso()))
        .pipe($.rev())
        .pipe(assets.restore())
        .pipe($.useref())
        .pipe($.if('**/*.html', $.minifyHtml({
            conditionals: true,
            loose: true,
            empty: true
        })))
        .pipe($.revReplace())
        .pipe(gulp.dest('dist'));
});

gulp.task('images', function() {
    return gulp.src('app/images/**/*')
        .pipe($.cache($.imagemin({
            progressive: true,
            interlaced: true
        })))
        .pipe(gulp.dest('dist/images'));
});

gulp.task('fonts', function() {
    return gulp.src(require('main-bower-files')().concat('app/fonts/**/*'))
        .pipe($.filter('**/*.{eot,svg,ttf,woff}'))
        .pipe($.flatten())
        .pipe(gulp.dest('dist/fonts'));
});

gulp.task('extras', function() {
    return gulp.src([
        'app/*.*',
        '!app/*.html',
        'app/CNAME'
    ], {
        dot: true
    }).pipe(gulp.dest('dist'));
});

gulp.task('clean', require('del').bind(null, ['.tmp', 'dist']));

gulp.task('connect', function() {
    var serveStatic = require('serve-static');
    var serveIndex = require('serve-index');
    var app = require('connect')()
        .use(require('connect-livereload')({
            port: 35729
        }))
        .use(serveStatic('.tmp'))
        .use(serveStatic('app'))
        // paths to bower_components should be relative to the current file
        // e.g. in app/index.html you should use ../bower_components
        .use('/bower_components', serveStatic('bower_components'))
        .use(serveIndex('app'));

    require('http').createServer(app)
        .listen(9000)
        .on('listening', function() {
            console.log('Started connect web server on http://localhost:9000');
        });
});

gulp.task('serve', ['connect', 'watch'], function() {
    require('opn')('http://localhost:9000');
});

// inject bower components
gulp.task('wiredep', function() {
    var wiredep = require('wiredep').stream;
    gulp.src('app/*.html')
        .pipe(wiredep({
            directory: 'bower_components'
        }))
        .pipe(gulp.dest('app'));
});

gulp.task('watch', ['connect'], function() {
    $.livereload.listen();

    // watch for changes
    gulp.watch([
        'app/*.html',
        'app/views/*.html',
        '.tmp/styles/**/*.css',
        'app/scripts/**/*.js',
        'app/images/**/*'
    ]).on('change', $.livereload.changed);

    gulp.watch('app/styles/**/*.css', ['styles']);
    gulp.watch('bower.json', ['wiredep']);
});

gulp.task('build', ['jshint', 'html', 'images', 'fonts', 'extras'], function() {
    return gulp.src('dist/**/*').pipe($.size({
        title: 'build',
        gzip: true
    }));
});

gulp.task('default', ['clean'], function() {
    gulp.start('build');
});

gulp.task('gh-pages', function() {
    return gulp.src(['dist/**/*.*', 'dist/CNAME'])
        .pipe(ghPages({
            cacheDir: '.tmp/dist/'
        }));
});

gulp.task('rsync', function() {
    return gulp.src('dist/**/*.*')
        .pipe($.rsync(deploySettings));
});

gulp.task('deploy:gh-pages', function() {
    runSequence('clean', 'build', 'gh-pages');
});

gulp.task('deploy', function() {
    runSequence('clean', 'build', 'rsync');
});
