# Spooty

Listen to music together with friends from a single point.

Spooty is a web application built on node. that communicates with MPD to control and analyze music output. Output that is piped into an Icecast stream which is listened to by the front end client.

### Version
0.0.1

### Tech

Spooty uses a number of open source projects to work properly:

* [node.js] - evented I/O for the backend
* [Express] - fast node.js network app framework
* [Twitter Bootstrap] - great UI boilerplate for modern web apps
* [mpd] - music management application
* [icecast2] - streaming application

### Installation

Make sure npm is > v2.6.0

```sh
$ sudo apt-get install mpd mpc icecast2
$ git clone [git-repo-url] spooty
$ cp spooty/mpd.conf /etc/mpd.conf
$ cp spooty/icecast.xml /etc/icecast/icecast.xml
$ sudo service icecast2 restart
$ sudo /etc/init.d/mpd restart
$ mpc enable 1
$ sudo usermod -a `whoami` -G audio
$ sudo chmod g+w /var/lib/mpd/music/ /var/lib/mpd/playlists/
$ sudo chgrp audio /var/lib/mpd/music/ /var/lib/mpd/playlists/
```

Music files and directories should be kept in `/var/lib/mpd/music`. If you chose to mount from another FS, be sure that uid is set to mpd and gid is set to audio, found in `/etc/passwd` and `/etc/group`. After you have your music in or mounted to `/var/lib/mpd/music`, run:

```sh
$ mpc update
```

Next we have to start the node application.

```sh
$ npm install
```

In `views/index.ejs` be sure to change the URL property in the MRP script from `'url': '192.168.2.30:8000/mpd'` to `'url': '[your-server's-ip]:8000/mpd'`

### Todo's

 - Write Tests
 - Containerize

License
----

Elliott Mantock [@elGatoMantocko]


**Free Software, Hell Yeah!**

[@elGatoMantocko]:https://twitter.com/elGatoMantocko
[node.js]:http://nodejs.org
[Twitter Bootstrap]:http://twitter.github.com/bootstrap/
[mpd]:https://www.npmjs.com/package/mpd
[icecast2]:http://icecast.org/
[express]:http://expressjs.com
