/* eslint no-console: 1 */
const fs = require('fs');
const path = require('path');
const express = require('express');

const Handlebars = require('handlebars');
const bodyParser = require('body-parser');
const upload = require('multer')();

const {login} = require(path.join(__dirname, 'libs', 'spotifauth.js'));
const app = express();

const SPOTIFY_CLIENT_ID = process.argv[process.argv.indexOf('--spotifyclientid') + 1];
const SPOTIFY_CLIENT_SECRET = process.argv[process.argv.indexOf('--spotifyclientsecret') + 1];
const SPOTIFY_REDIRECT_URI = process.argv[process.argv.indexOf('--spotifyredirecturi') + 1];
let APP_PORT = parseInt(process.argv[process.argv.indexOf('--port') + 1]);

if (!SPOTIFY_CLIENT_ID) {
  console.error('Spotify Client ID was not provided.\n... -k <CLIENT_ID>');
} else if (!SPOTIFY_CLIENT_SECRET) {
  console.error('Spotify Client secret was not provided.\n... -s <CLIENT_SECRET>');
} else if (!SPOTIFY_REDIRECT_URI) {
  console.error('Spotify redirect URI was not provided.\n... -u <REDIRECT_URI>');
} else if (!APP_PORT || isNaN(APP_PORT)) {
  APP_PORT = 3000;
  console.warn('It is recommended that you provide a custom app port (must be a number > 0 and < 65536).\n... -p <PORT>');
}

const viewsDir = path.join('src', 'assets', 'views');
const layoutsDir = path.join(viewsDir, 'layouts');
const bundleDir = path.join('dist', 'bundle');

// register the main partials that app templates use
Handlebars.registerPartial('layouts/default', fs.readFileSync(path.join(layoutsDir, 'default.hbs')).toString());
Handlebars.registerPartial('header', fs.readFileSync(path.join(layoutsDir, 'header.hbs')).toString());
Handlebars.registerPartial('footer', fs.readFileSync(path.join(layoutsDir, 'footer.hbs')).toString());

app.engine('hbs', function(path, opts, cb) {
  fs.readFile(path, function(err, data) {
    if (err) return cb(err);
    const template = Handlebars.compile(data.toString());
    return cb(null, template(opts));
  });
});

app.set('views', viewsDir);
app.set('view engine', 'hbs');

app.set('spotify_client_id', SPOTIFY_CLIENT_ID);
app.set('spotify_client_secret', SPOTIFY_CLIENT_SECRET);
app.set('spotify_redirect_uri', SPOTIFY_REDIRECT_URI);

app.set('rooms', {});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.use('/resources', express.static('node_modules'));
app.use('/assets', express.static(bundleDir));

// generate code for the authorize endpoint
app.get('/login-to-spotify', function(req, res) {
  console.log(`inbound request to '/login-to-spotify'`);

  const scopes = [
    'streaming',
    'user-modify-playback-state',
    'playlist-read-private',
    'user-read-birthdate',
    'user-read-email',
    'user-read-private',
  ];

  res.redirect('https://accounts.spotify.com/authorize' +
    '?response_type=code' +
    '&client_id=' + app.get('spotify_client_id') +
    '&scope=' + encodeURIComponent(scopes.join(' ')) +
    '&redirect_uri=' + encodeURIComponent(app.get('spotify_redirect_uri')));
});

app.get('/authorize-spotify', function(req, res) {
  console.log(`inbound request to '/authorize-spotify'`);

  // acquire a spotify auth token
  login(
    req.query.code, // code required from the authorize endpoint
    app.get('spotify_redirect_uri'), // redirect uri has to match authorize endpoint
    app.get('spotify_client_id'), // spotify client id
    app.get('spotify_client_secret'), // spotify client secret
  ).then((token) => {
    res.cookie('spotify_auth', token);
    res.cookie('data', JSON.stringify({test: 'Hello world!'}));
    res.redirect('/home');
  }, (err) => {
    res.render('startup/templates/400', {error: err});
  });
});

app.param('room_id', function(req, res, next, id) {
  req.room = {id: id};
  next();
});

// rooms path
app.route('/rooms/:room_id?')
  // check if the room_id param exists
  .all(function(req, res, next) {
    const room = req.params.room_id;
    if (!room) {
      req.room = {};
    }
    next();
  })

  // get the room from room_id or all rooms
  .get(function(req, res) {
    if (req.room.id) res.json(app.get('rooms')[req.room.id]);
    else res.json(app.get('rooms'));
  })

  // create a room
  .post(upload.array(), function(req, res, next) {
    if (req.room.id) {
      app.set('rooms')[req.room.id] = req.body;
      console.log('created room ' + req.room.id);
      res.json(app.get('rooms')[req.room.id]);
    } else {
      next(new Error('room id not passed'));
    }
  })

  // delete a room
  .delete(function(req, res, next) {
    if (req.room.id) {
      res.write(delete app.get('rooms')[req.room.id]);
    } else {
      next(new Error('room id not passed'));
    }
  });

// redirect all trafic over ssl
app.get('/', (req, res) => res.redirect('/home'));
app.get('/home', function(req, res) {
  console.log(`inbound request to '/'`);

  // build the app model
  let model = {
    Startup: {
      Models: {},
      Presenters: {},
    },
  };

  res.render('startup/templates/app', {title: 'Spooty', model: JSON.stringify(model)});
});

app.listen(APP_PORT, () => console.log(`server started on port ${APP_PORT} with CLIENT_ID:${SPOTIFY_CLIENT_ID} CLIENT_SECRET:${SPOTIFY_CLIENT_SECRET} and REDIRECT_URI:${SPOTIFY_REDIRECT_URI}`));