/* eslint no-console: 1 */
Global.Startup.Presenters = Global.Startup.Presenters || {};
Global.Startup.Presenters.Spotify = function() {
  // initialization
  const auth = JSON.parse(Global.globalContext.get('spotify_auth') || JSON.stringify({error: ''}));
  const token = auth.access_token;

  // get user info to display
  $.ajax({
    url: 'https://api.spotify.com/v1/me',
    headers: {
      'Authorization': 'Bearer ' + token,
    },
  }).then((response) => {
    $('.user-info').append(Handlebars.templates['startup/templates/user'](response));
  });

  window.onSpotifyWebPlaybackSDKReady = () => {
    const player = new Spotify.Player({
      name: 'Spooty',
      getOAuthToken: (cb) => cb(token),
    });

    // Error handling
    player.on('initialization_error', (e) => console.error(e));
    player.on('authentication_error', (e) => console.error(e));
    player.on('account_error', (e) => console.error(e));
    player.on('playback_error', (e) => console.error(e));

    let timer;
    // Playback status updates
    player.on('player_state_changed', (state) => {
      $('.song-info').empty().append(Handlebars.templates['startup/templates/playback-state'](state));
      $('.playback-status').empty().append(state.paused ? 'Paused' : 'Playing');
      $('.song-progress').empty().append(Handlebars.templates['startup/templates/song-progress']({
        size: (state.position / state.duration) * 100,
        position: state.position,
        duration: state.duration,
      }));

      let savedPosition = state.position;
      clearInterval(timer);
      if (!state.paused) {
        timer = setInterval(() => {
          savedPosition += 1000;
          $('.song-progress .progress-bar')
            .width(`${(savedPosition / state.duration) * 100}%`)
            .attr('aria-valuenow', savedPosition);
        }, 1000);
      }
    });

    // set up volume slider
    player.getVolume().then((volume) => $('#volume').slider({value: volume * 100}));
    $('#volume').on('slide', (e) => player.setVolume(e.value / 100));

    // Ready
    player.on('ready', (data) => {
      let {device_id} = data;
      console.log('Ready with Device ID', device_id);
      $('#song-info').empty().append(Handlebars.templates['startup/templates/playback-state']());
    });

    // Connect to the player!
    player.connect();
  };
};
