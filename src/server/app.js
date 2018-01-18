/* eslint no-console: 1 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const https = require('https');

const Handlebars = require('handlebars');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const upload = require('multer')();

const {login, refresh} = require('spotifauth');
const app = express();

const SPOTIFY_SCOPES = [
  'streaming',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-read-birthdate',
  'user-read-email',
  'user-read-private',
];

const SPOTIFY_CLIENT_ID = process.argv[process.argv.indexOf('--spotifyclientid') + 1];
const SPOTIFY_CLIENT_SECRET = process.argv[process.argv.indexOf('--spotifyclientsecret') + 1];
const SPOTIFY_REDIRECT_URI = process.argv[process.argv.indexOf('--spotifyredirecturi') + 1];
let APP_PORT = parseInt(process.argv[process.argv.indexOf('--port') + 1]);

if (!SPOTIFY_CLIENT_ID) {
  console.error('APPLICATION SARTUP FAILURE - Spotify Client ID was not provided.\n... -k <CLIENT_ID>');
} else if (!SPOTIFY_CLIENT_SECRET) {
  console.error('APPLICATION SARTUP FAILURE - Spotify Client secret was not provided.\n... -s <CLIENT_SECRET>');
} else if (!SPOTIFY_REDIRECT_URI) {
  console.error('APPLICATION SARTUP FAILURE - Spotify redirect URI was not provided.\n... -u <REDIRECT_URI>');
} else if (!APP_PORT || isNaN(APP_PORT)) {
  APP_PORT = 3000;
  console.warn('WARNING - It is recommended that you provide a custom app port (must be a number > 0 and < 65536).\n... -p <PORT>');
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

// parse and add body object to request
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

// parse and add cookie object to request
app.use(cookieParser());

// application request logging
app.use(function(req, res, next) {
  const {originalUrl, body, method, ip, protocol} = req;
  // time of request - request method - full path - source ip address - protocol (should always be https)
  console.log(`INFO - ${(new Date()).toUTCString()} - ${method} - ${originalUrl} - ${ip} - ${protocol} - ${JSON.stringify(body)}`);
  next();
});

app.use('/resources', express.static('node_modules'));
app.use('/assets', express.static(bundleDir));

// client side logging endpoint
app.post('/logger/:loggerPath', upload.array(), function(req, res) {
  const {
    params: {loggerPath = 'log'},
    body: {
      message = 'No message provided',
      page_url = 'No URL provided',
      page_title = 'Spooty',
      user_agent = 'No user agent provided',
    },
  } = req;

  // end the response if sent something other than log, debug, warning, or error
  if (!console.hasOwnProperty(loggerPath)) {
    res.status(404).send('Bad request.');
    return;
  }

  console[loggerPath](`CLIENT ${loggerPath.toUpperCase()} - ${(new Date()).toUTCString()} - ${page_url} - ${page_title} - ${message} - ${user_agent}`);
  res.send('DONE');
});

// generate code for the authorize endpoint
app.get('/login-to-spotify', function(req, res) {
  res.redirect('https://accounts.spotify.com/authorize' +
    '?response_type=code' +
    '&client_id=' + app.get('spotify_client_id') +
    '&scope=' + encodeURIComponent(SPOTIFY_SCOPES.join(' ')) +
    '&redirect_uri=' + encodeURIComponent(app.get('spotify_redirect_uri')));
});

app.get('/authorize-spotify', function(req, res) {
  // acquire a spotify auth token
  login(
    req.query.code, // code required from the authorize endpoint
    app.get('spotify_redirect_uri'), // redirect uri has to match authorize endpoint
    app.get('spotify_client_id'), // spotify client id
    app.get('spotify_client_secret'), // spotify client secret
  ).then((authdata) => {
    res.cookie('spotify_auth', JSON.stringify(authdata), {
      // domain: '.spooty.com',
      maxAge: 3600000,
      secure: true,
    });
    res.redirect('/home');
  });
});

app.get('/logout-spotify', function(req, res) {
  res.clearCookie('spotify_auth');
  res.redirect('/home');
});

app.get('/refresh-spotify', function(req, res) {
  refresh(
    req.query.refresh_token,
    app.get('spotify_client_id'),
    app.get('spotify_client_secret'),
  ).then((authdata) => {
    res.jsonp(authdata);
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
    if (req.room.id) res.jsonp(app.get('rooms')[req.room.id]);
    else res.jsonp(app.get('rooms'));
  })

  // create a room
  .post(upload.array(), function(req, res, next) {
    if (req.room.id) {
      let rooms = app.get('rooms');
      if (rooms[req.room.id]) {
        res.jsonp({status: 'success', message: 'room already exists'});
      } else {
        rooms[req.room.id] = req.body;
        res.jsonp({status: 'success', message: 'new room created'});
      }
    } else {
      next(new Error('room id not passed'));
    }
  })

  // delete a room
  .delete(function(req, res, next) {
    if (req.room.id) {
      res.send(delete app.get('rooms')[req.room.id]);
    } else {
      next(new Error('room id not passed'));
    }
  });

// redirect all trafic over ssl
app.get('/', (req, res) => res.redirect('/home'));
app.get('/home', function(req, res) {
  // get the auth token from the cookie
  const {access_token, token_type} = JSON.parse(req.cookies.spotify_auth || '{}');
  const me_options = {
    hostname: 'api.spotify.com',
    path: '/v1/me',
    headers: {
      'Authorization': token_type + ' ' + access_token,
    },
  };

  // get (at minimum) the user id for the client to use
  https.get(me_options, (me_res) => {
    let data = '';
    me_res.on('data', (chunk) => data += chunk);
    me_res.on('end', () => {
      const {id} = JSON.parse(data);

      // build the app model
      let model = {
        user: {id: id},
        Libs: {},
        Models: {},
        Presenters: {},
      };

      res.render('spooty/templates/app', {title: 'Spooty', model: JSON.stringify(model)});
    });
  }).on('error', (e) => console.error('ERROR - ' + e.message));
});

app.listen(APP_PORT, () => console.debug(`DEBUG - server started on port ${APP_PORT} with CLIENT_ID:${SPOTIFY_CLIENT_ID} CLIENT_SECRET:${SPOTIFY_CLIENT_SECRET} and REDIRECT_URI:${SPOTIFY_REDIRECT_URI}`));
