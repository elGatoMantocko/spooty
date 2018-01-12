/* eslint no-console: 1 */
SP.Presenters = SP.Presenters || {};
SP.Presenters.Spotify = function() {
  // initialization
  let auth = JSON.parse(SP.globalContext.get('spotify_auth') || '{}');

  // spotify player sdk
  window.onSpotifyWebPlaybackSDKReady = () => {
    function setupAjax() {
      $.ajaxSetup({
        headers: {
          'Authorization': auth.token_type + ' ' + auth.access_token,
        },
      });
    }

    if (auth.access_token) {
      setupAjax(auth);

      window.setInterval(() => {
        // refresh the spotify auth token every <expires_in> interval
        $.getJSON('/refresh-spotify', {
          // the second time this runs there will be an error
          //  the refresh grant_type doesn't return a refresh token
          refresh_token: auth.refresh_token,
        }).then((data) => {
          setupAjax(auth = data);
        }, (e) => console.error(e));
      }, auth.expires_in * 1000);

      $('#login-btn').text('Refresh');
    } else {
      // stop execution if the users token is mia or invalid
      return;
    }

    // get user info to display
    $.getJSON('https://api.spotify.com/v1/me').then((response) => {
      $.extend(SP.user, {
        name: response.display_name,
        email: response.email,
        product: response.product,
        profilePage: response.external_urls.spotify,
        profilePicture: response.images[0].url,
      });

      $('.user-info').append(Handlebars.templates['spooty/templates/user'](SP.user));
    });

    const player = new Spotify.Player({
      name: 'Spooty',
      getOAuthToken: (cb) => cb(auth.access_token),
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
      $('.song-info').empty().append(Handlebars.templates['spooty/templates/playback-state'](state));
      $('.song-progress').empty().append(Handlebars.templates['spooty/templates/song-progress']({
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
            $.post(`/rooms/${$(this).data('id')}`, roomData).then((response) => {
              if (response.success) {
                $('.room-info').empty().append();
              }
            });
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
