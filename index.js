var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var mpd = require('mpd');
var cmd = mpd.cmd;
var mpdclient = mpd.connect({ port: 6600, host: 'localhost' });

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

var population = 0;
var song = null;
var votes = 0;

var parsesong = function(string) {
  var splitdata = string.split("\n");
  var artist = splitdata[3].substr(8);
  var title = splitdata[5].substr(7);
  var album = splitdata[6].substr(7);

  return [ title, artist, album ]
}

app.get('/', function(req, res) {
  console.log("get \"/\"");
  res.render('index', {
    song: song,
    vote_tally: votes,
    username: "Elliott"
  });
});

app.get('/browse', function(req, res) {
  console.log("get \"/browse\"");
  mpdclient.sendCommand(cmd('list',['artist']), function(err, data) {
    var artists = data.split("\n");
    for (var i = 0; i < artists.length; i++) {
      artists[i] = artists[i].substr(8);
    }
    res.render('list_artists', {artists: artists});
  });
});

app.get('/browse/:artist/:album', function(req, res) {
  var artist = req.params.artist,
      album = req.params.album;
  console.log("get \"/browse/" + artist + "/" + album + "\""); 
  //console.log("artist: " + artist + "\nalbum: " + album);
});

app.get('/playlist', function(req, res) {
  mpdclient.sendCommand(cmd('playlistinfo', []), function(err, data) {
    if (err) throw err;
    var rawdata = data.split("\n");
    for (var i = 0; i < rawdata.length; i++) {
    }
    console.log(playlist);
    res.render('playlist', {playlist: playlist});
  });
});

app.get('/upvote', function(req, res) {
  console.log("get \"/upvote\"");
  votes += 1;
  io.emit('vote_tally', votes, false);
});

app.get('/downvote', function(req, res) {
  console.log("get \"/downvote\"");
  votes -= 1;
  if (votes <= -1) {
    mpdclient.sendCommand(cmd('next', []), function(err, data) {
      if (err) throw err;
    });
  }
  io.emit('vote_tally', votes, false);
});

mpdclient.on('system-player', function() {
  mpdclient.sendCommand(cmd('currentsong', []), function(err, data) {
    if (err) throw err;
    var songdata = parsesong(data);
    song = { title: songdata[0], artist: songdata[1], album: songdata[2] };
    votes = 0;
    io.emit('now_playing', song);
    io.emit('vote_tally', votes, true);
  });
});

io.on('connection', function(socket) {
  console.log('a user connected');
  population += 1;
  socket.on('disconnect', function() {
    population -= 1;
    console.log('user disconnected');
  });
});

http.listen(3001, function() {
  console.log('listening on *:3001');
});
