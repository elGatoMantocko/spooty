var express = require('express');
var app = express();
var http = require('http').Server(app);
var path = require('path');
var favicon = require('serve-favicon');
var bodyparser = require('body-parser');
var io = require('socket.io')(http);
var mpd = require('mpd');
var cmd = mpd.cmd;
var mpdclient = mpd.connect({ port: 6600, host: 'localhost' });

// set middleware used here
app.set('view engine', 'ejs');
app.use(bodyparser.urlencoded({ extended: false }));
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));
app.use(express.static(__dirname + '/public'));

var population = 0;
var song = null;
var votes = 0;

// Return song data. 
// This function can be altared to return more or less information about the song
var parsesong = function(string) {
  //console.log(string);
  if (string === "") {
    return null;
  } else {
    var title = string.match(/Title:.*/g) || ["Title: TITLE_NOT_FOUND"];
    var artist = string.match(/\bArtist:.*/g) || ["Artist: "];
    var album = string.match(/Album:.*/g) || ["Album: "];
    var pos = string.match(/Pos:.*/g) || ["Pos: "];
    var file = string.match(/file:.*/g) || ["file: "];

    return { 
      title: title[0].substr(7), 
      artist: artist[0].substr(8), 
      album: album[0].substr(7), 
      pos: pos[0].substr(5), 
      file: file[0].substr(6).replace("\'", "\\\'")  // handle songs with special characters in file
    }
  }
}

// Return information about each song in the playlist
// This function can be altared to return more or less information about each song
var parsesongs = function(string) {
  // match all content between file: and ^file: in songs string
  var songs = string.match(/file:.*\n(([^file].*\n)*)/g) || [];
  for (var i = 0; i < songs.length; i++) {
    songs[i] = parsesong(songs[i]);
  }
  //console.log(songs);

  return songs
}

// render index page
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
    if (err) throw err;
    var artists = data.split("\n");
    for (var i = 0; i < artists.length; i++) {
      artists[i] = artists[i].substr(8).replace("\'", "\\\'");
    }
    res.render('list_artists', {artists: artists});
  });
});

// Show a list of albums (and songs outside album directories) by :artist
app.get('/browse/:artist', function(req, res) {
  var artist = req.params.artist;
  console.log("get \"/browse/" + artist + "\"");
  // TODO: show songs outside of album directories
  mpdclient.sendCommand(cmd('list',['album', artist]), function(err, data) {
    if (err) throw err;
    var albums = data.split("\n");
    for (var i = 0; i < albums.length; i++) {
      albums[i] = albums[i].substr(7).replace("\'", "\\\'");
    }
    res.render('list_albums', {artist: artist, albums: albums, other: []});
  });
});

// Show songs by :artist on :album
app.get('/browse/:artist/:album', function(req, res) {
  var artist = req.params.artist,
      album = req.params.album;
  console.log("get \"/browse/" + artist + "/" + album + "\""); 
  mpdclient.sendCommand(cmd('find',['album', album]), function(err, data) {
    if (err) throw err;
    //console.log(data);
    var albumsongs = parsesongs(data);

    res.render('list_songs', {songs: albumsongs, artist: artist, album: album});
  });
});

app.post('/add/*', function(req, res) {
  var filepath = req.params[0];
  console.log("post \"/add/" + filepath); 
  mpdclient.sendCommand(cmd('add',[filepath]), function(err, data) {
    if (err) throw err;
    console.log(data);
  });
  res.end("yes");
});

app.get('/add/*', function(req, res) {
  var filepath = req.params[0];
  console.log("get \"/add/" + filepath); 
  res.end("yes");
});

app.get('/delete/:pos', function(req, res) {
  var pos = req.params.pos;
  console.log("get \"/delete/" + pos); 
  mpdclient.sendCommand(cmd('delete',[pos]), function(err, data) {
    if (err) throw err;
  });
});

// Get and parse the playlist info
app.get('/playlist', function(req, res) {
  console.log("get \"/playlist\"");
  mpdclient.sendCommand(cmd('playlistinfo', []), function(err, data) {
    if (err) throw err;
    //console.log(data);
    var playlist = parsesongs(data);
    res.render('playlist', {song: song, playlist: playlist});
  });
});

// TODO: when vote tally reaches a majority, add the current song to "best_of" playlist
app.get('/upvote', function(req, res) {
  console.log("get \"/upvote\"");
  votes += 1;
  io.emit('vote_tally', votes);
});

// TODO: when the majority of the population downvotes, skip the song
app.get('/downvote', function(req, res) {
  console.log("get \"/downvote\"");
  votes -= 1;
  if (votes <= -1) {
    mpdclient.sendCommand(cmd('next', []), function(err, data) {
      if (err) throw err;
    });
  }
});

// Send the position to the client every second
var timerId = setInterval(function() {
  mpdclient.sendCommand(cmd('status', []), function(err, statusdata) {
    mpdclient.sendCommand(cmd('currentsong', []), function(err, songdata) {
      if (err) throw err;
      // handle current song
      song = parsesong(songdata);
      if (!song) {
        return;
      }

      // parse statusdata
      var pos = Math.round(statusdata.match(/time: [0-9]*/g)[0].substr(6));
      var songlength = parseInt(songdata.match(/Time: [0-9]*/g)[0].substr(6));

      // determine padding for seconds less than 10 (ex. time "1:01")
      var songsecs = songlength % 60;
      var possecs = pos % 60;
      if (songlength%60 < 10) { songsecs = "0" + songsecs };
      if (pos%60 < 10) { possecs = "0" + possecs };

      // handle current position
      var time = Math.floor(pos/60) + ":" + possecs + " - " + Math.floor(songlength/60) + ":" + songsecs;
      var pct = Math.round(pos/songlength*100).toString() + '%';

      var position = {time: time, percentage: pct};
      io.emit('position', position)
    });
  });
}, 1000);

// Update the song title, playlist, and vote tally whenever the song changes
mpdclient.on('system', function(name) {
  if (name === "player") {
    mpdclient.sendCommand(cmd('currentsong', []), function(err, data) {
      if (err) throw err;
      song = parsesong(data);
      if (song) {
        console.log("\tplaying: " + song.title + " - " + song.artist);
      }
      votes = 0;
      io.emit('now_playing', song);
    });

  // if the playlist changes, tell the client to render /playlist
  } else if (name === "playlist") {   
    io.emit('playlist');
    mpdclient.sendCommand(cmd('playlistinfo', []), function(err, data) {
      if (err) throw err;
      if (parsesongs(data).length > 0) {
        mpdclient.sendCommand(cmd('play', []), function(err, data) {
          if (err) throw err;
        });
      }
    });
  }
});

// maintain the population listening in here
io.on('connection', function(socket) {
  console.log('a user connected');
  population += 1;
  if (population == 1) {
    console.log("There is " + population + " person listening.");
  } else { 
    console.log("There are " + population + " people listening.");
  }
  socket.on('disconnect', function() {
    population -= 1;
    console.log('user disconnected');
    if (population == 1) {
      console.log("There is " + population + " person listening.");
    } else { 
      console.log("There are " + population + " people listening.");
    }
  });
});

http.listen(3001, function() {
  console.log('listening on 0.0.0.0:3001');
});
