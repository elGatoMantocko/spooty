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

var parseplaylist = function(string) {
  var rawdata = string.split("\n");
  //console.log(rawdata)
  var playlist = [];
  var tmp_hash = {};
  for (var i = 0; i < rawdata.length; i++) {
    if (rawdata[i].search("Artist") != -1 && !rawdata[i].search("AlbumArtist")) {
      tmp_hash.artist = rawdata[i].substr(13);
    } else if (rawdata[i].search("Title") != -1) {
      tmp_hash.title = rawdata[i].substr(7);
    } else if (rawdata[i].search("Album") != -1) {
      tmp_hash.album = rawdata[i].substr(7);
      playlist.push(tmp_hash);
      tmp_hash = {};
    }
  }
  //console.log(playlist);
  return playlist
}

app.get('/', function(req, res) {
  console.log("get \"/\"");

  mpdclient.sendCommand(cmd('currentsong', []), function(err, data) {
    if (err) throw err;
    var songdata = parsesong(data);
    song = { title: songdata[0], artist: songdata[1], album: songdata[2] };
    res.render('index', {
      song: song,
      vote_tally: votes,
      username: "Elliott"
    });
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

app.get('/browse/:artist', function(req, res) {
  var artist = req.params.artist;
  console.log("get \"/browse/" + artist + "\"");
  mpdclient.sendCommand(cmd('list',['album', artist]), function(err, data) {
    var albums = data.split("\n");
    for (var i = 0; i < albums.length; i++) {
      albums[i] = albums[i].substr(7);
    }
    //console.log(albums);
    res.render('list_albums', {artist: artist, albums: albums, other: []});
  });
});

app.get('/browse/:artist/:album', function(req, res) {
  var artist = req.params.artist,
      album = req.params.album;
  console.log("get \"/browse/" + artist + "/" + album + "\""); 
  mpdclient.sendCommand(cmd('find',['album', album]), function(err, data) {
    var rawdata = data.split("\n");
    //console.log(rawdata);

    var songs = [];
    var tmp_hash = {};
    for (var i = 0; i < rawdata.length; i++) {
      if (rawdata[i].search("file") != -1) {
        tmp_hash.file = rawdata[i].substr(6);
      } else if (rawdata[i].search("Title") != -1) {
        tmp_hash.title = rawdata[i].substr(7);
        songs.push(tmp_hash);
        tmp_hash = {};
      }
    }
    //console.log(songs);
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

setTimeout(function() {
  mpdclient.sendCommand('status', []),
  var position
  //console.log(position);
  io.emit('position', position)
}, 1000);

mpdclient.on('system-player', function() {
  mpdclient.sendCommand(cmd('currentsong', []), function(err, data) {
    if (err) throw err;
    var songdata = parsesong(data);
    song = { title: songdata[0], artist: songdata[1], album: songdata[2] };
    console.log("\tplaying: " + song.title + " - " + song.artist);
    votes = 0;
    io.emit('reload_playlist');
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
