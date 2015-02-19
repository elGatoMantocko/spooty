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
  return { 
    title: string.match(/Title: \w.*/g)[0].substr(7), 
    artist: string.match(/Artist: \w.*/g)[0].substr(8), 
    album: string.match(/Album: \w.*/g)[0].substr(7)
  }
}

var parseplaylist = function(string) {
  var titles = string.match(/Title: \w.*/g);
  var artists = string.match(/Artist: \w.*/g);
  var albums = string.match(/Album: \w.*/g);

  var playlist = [];
  for (var i = 0; i < titles.length; i++) {
    playlist.push({ 
      title: titles[i].substr(7),
      artist: artists[i].substr(8), 
      album: albums[i].substr(7)
    });
  }
  console.log(playlist);
  return playlist
}

app.get('/', function(req, res) {
  console.log("get \"/\"");

  res.render('index', {
    song: song,
    vote_tally: votes,
    username: "Elliott"
  });
});

// Show a list of the artists
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

// Show a list of albums (and songs outside album directories) by :artist
app.get('/browse/:artist', function(req, res) {
  var artist = req.params.artist;
  console.log("get \"/browse/" + artist + "\"");
  mpdclient.sendCommand(cmd('list',['album', artist]), function(err, data) {
    var albums = data.split("\n");
    for (var i = 0; i < albums.length; i++) {
      albums[i] = albums[i].substr(7);
    }
    // TODO: show songs outside of album directories
    res.render('list_albums', {artist: artist, albums: albums, other: []});
  });
});

// Show songs by :artist on :album
app.get('/browse/:artist/:album', function(req, res) {
  var artist = req.params.artist,
      album = req.params.album;
  console.log("get \"/browse/" + artist + "/" + album + "\""); 
  mpdclient.sendCommand(cmd('find',['album', album]), function(err, data) {
    //console.log(data);
    var files = data.match(/file: \w.*/g);
    var titles = data.match(/Title: \w.*/g);

    var songs = [];
    for (var i = 0; i < titles.length; i++) {
      songs.push({
        file: files[i].substr(6),
        title: titles[i].substr(7)
      });
    }

    res.render('list_songs', {songs: songs, artist: artist, album: album});
  });
});

app.post('/add/:filepath', function(req, res) {
  var filepath = req.params.filepath;
  console.log("post \"/add/" + filepath); 
  mpdclient.sendCommand(cmd('add',[filepath]), function(err, data) {
    console.log(data);
  });
});

// Get and parse the playlist info
app.get('/playlist', function(req, res) {
  console.log("get \"/playlist\"");
  mpdclient.sendCommand(cmd('playlistinfo', []), function(err, data) {
    if (err) throw err;
    var playlist = parseplaylist(data);
    res.render('playlist', {song: song, playlist: playlist});
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

// Send the position to the client every second
var timerId = setInterval(function() {
  mpdclient.sendCommand(cmd('status', []), function(err, statusdata) {
    mpdclient.sendCommand(cmd('currentsong', []), function(err, songdata) {
      // handle current song
      song = parsesong(songdata);

      // handle current position
      var pos = Math.round(statusdata.match(/elapsed: [0-9]*\.[0-9]*/g)[0].substr(9));
      var songlength = parseInt(songdata.match(/Time: [0-9]*/g)[0].substr(6));
      var time = Math.floor(pos/60) + ":" + pos%60 + "-" + Math.floor(songlength/60) + ":" + songlength%60;
      var pct = Math.round(pos/songlength*100).toString() + '%';

      //console.log(time);

      var position = {time: time, percentage: pct};
      io.emit('position', position)
    });
  });
}, 1000);

// Update the song title, playlist, and vote tally whenever the song changes
mpdclient.on('system-player', function() {
  mpdclient.sendCommand(cmd('currentsong', []), function(err, data) {
    if (err) throw err;
    song = parsesong(data);

    console.log("\tplaying: " + song.title + " - " + song.artist);
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
