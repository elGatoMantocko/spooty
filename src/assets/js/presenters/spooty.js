/* eslint no-console: 1 */
SP.Presenters.Spooty = function() {
  // spotify player sdk
  window.onSpotifyWebPlaybackSDKReady = () => {
    let player = new Spotify.Player({
      name: 'Spooty',
      getOAuthToken: (cb) => cb(SP.globalContext.get('spotify_auth').access_token),
    });

    // need to handle logout here to disconnect the player
    $('#login-btn').off('click').click(function(e) {
      player.disconnect();
    });

    // Error handling
    player.on('initialization_error', (e) => SP.logger.error(e));
    player.on('authentication_error', (e) => SP.logger.error(e));
    player.on('account_error', (e) => SP.logger.error(e));
    player.on('playback_error', (e) => SP.logger.error(e));

    let timer;
    // Playback status updates
    player.on('player_state_changed', (state) => {
      if (!state) return;
      const {
        position,
        duration,
        track_window: {current_track},
        paused,
      } = state;
      $('.song-info').empty().append(Handlebars.templates['spooty/templates/playback-state']({current_track}));
      $('.song-progress').empty().append(Handlebars.templates['spooty/templates/song-progress']({
        size: (position / duration) * 100,
        position,
        duration,
      }));

      let savedPosition = position;
      clearInterval(timer);
      if (!paused) {
        timer = setInterval(() => {
          savedPosition += 1000;
          $('.song-progress .progress-bar')
            .width(`${(savedPosition / duration) * 100}%`)
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
      SP.device_id = device_id;
      SP.logger.info(`device_id ${device_id} registered`);

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
            const {
              id: playlist_id,
              owner: owner_id,
              value: context_uri,
            } = $(this).data();
            const start_time = (new Date()).toISOString();

            // begin playback
            $.ajax({
              url: 'https://api.spotify.com/v1/me/player/play?device_id=' + device_id,
              method: 'PUT',
              data: JSON.stringify({context_uri}),
            }).then(() => console.log('playing ' + $(this).data('value')), (xhr, e) => SP.logger.error(e));

            // submit the room object
            $.post(`/rooms/${playlist_id}`, {start_time, owner_id});
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
            market: 'from_token',
          }).then((data) => {
            // map the data to autocomplete saavy format
            const results = data.playlists.items.map((item) => {
              return {
                id: item.id,
                value: item.uri,
                display_value: item.name,
                opt_display_value: item.owner.display_name || item.owner.id,
                minor_details: item.tracks.total,
                owner: item.owner.id,
              };
            });

            // save the data (no need for dup requests)
            cache[$(e.currentTarget).val()] = results;

            // render the data
            $('.autocomplete-results').empty().append(
              Handlebars.templates['spooty/templates/search-results']({
                autocompleteId: 'playlist-search',
                results: results,
              })
            );

            initializeEvents();
          }, (e) => console.error(e));
        } else if ($(e.currentTarget).val()) {
          $('.autocomplete-results').empty().append(Handlebars.templates['spooty/templates/search-results']({
            autocompleteId: 'playlist-search',
            results: cache[$(e.currentTarget).val()],
          }));

          initializeEvents();
        }
      });

      $('#song-info').empty().append(Handlebars.templates['spooty/templates/playback-state']());
    });

    // Connect to the player!
    player.connect();
  };
};
