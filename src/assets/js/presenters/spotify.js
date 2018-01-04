/* eslint no-console: 1 */
Global.Startup.Presenters = Global.Startup.Presenters || {};
Global.Startup.Presenters.Spotify = function() {
  // initialization
  const auth = JSON.parse(Global.globalContext.get('spotify_auth') || JSON.stringify({error: ''}));
  const token = auth.access_token;
  $.ajaxSetup({
    headers: {
      'Authorization': 'Bearer ' + token,
    },
  });

  // spotify player sdk
  window.onSpotifyWebPlaybackSDKReady = () => {
    if (token) {
      $('#login-btn').text('Refresh');
    } else {
      return;
    }

    // get user info to display
    $.getJSON('https://api.spotify.com/v1/me').then((response) => {
      $('.user-info').append(Handlebars.templates['startup/templates/user'](response));
    });

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
      if (!state) return;
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

      function initializeEvents() {
        $('#playlist-search').off('keydown').keydown(function(e) {
          if (!e) e = window.event;
          const keyCode = e.keyCode;
          // include keyboard shortcuts here
          switch (keyCode) {
            default:
              break;
          }
        });

        $('.results-item a')
          .off('mouseenter').mouseenter(function(e) {
            $('.results').find('.highlight').removeClass('highlight');
            $(e.currentTarget).addClass('highlight');
          })
          .off('click').click(/* @this HTMLElement */function(e) {
            const roomData = {
              context_uri: $(this).data('value'),
            };
            // begin playback
            $.ajax({
              url: 'https://api.spotify.com/v1/me/player/play?device_id=' + device_id,
              method: 'PUT',
              data: JSON.stringify(roomData),
            }).then(() => console.log('playing ' + $(this).data('value')), (e) => console.error(e));

            // submit the room object
            $.post(`/rooms/${$(this).data('id')}`, roomData);
          });
      }

      // niavely save all stuff we search (could get ugly)
      let cache = {};
      $('#playlist-search').on('input', /* @this HTMLElement - fucking eslint */(e) => {
        if ($(e.currentTarget).val() && !cache[$(e.currentTarget).val()]) {
          $.getJSON('https://api.spotify.com/v1/search', {
            q: $(e.currentTarget).val(),
            type: 'playlist',
            limit: 5,
            market: 'US',
          }).then((data) => {
            // map the data to autocomplete saavy format
            const results = data.playlists.items.map((item) => {
              return {
                id: item.id,
                value: item.uri,
                display_value: item.name,
                opt_display_value: item.owner.display_name || item.owner.id,
              };
            });

            // save the data (no need for dup requests)
            cache[$(e.currentTarget).val()] = results;

            // render the data
            $('.autocomplete-results').empty().append(
              Handlebars.templates['startup/templates/search-results']({
                autocompleteId: 'playlist-search',
                results: results,
              })
            );

            initializeEvents();
          }, (e) => console.error(e));
        } else if ($(e.currentTarget).val()) {
          $('.autocomplete-results').empty().append(Handlebars.templates['startup/templates/search-results']({
            autocompleteId: 'playlist-search',
            results: cache[$(e.currentTarget).val()],
          }));

          initializeEvents();
        }
      });

      $('#song-info').empty().append(Handlebars.templates['startup/templates/playback-state']());
    });

    // Connect to the player!
    player.connect();
  };
};
