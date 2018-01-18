/* eslint no-console: 1 */
SP.Libs.setupAjax = function() {
  const {token_type, access_token} = SP.globalContext.get('spotify_auth');
  const opts = access_token && token_type ? {
    headers: {
      'Authorization': token_type + ' ' + access_token,
    },
  } : {};
  return $.ajaxSetup(opts);
};

(() => {
  const {headers = {}} = SP.Libs.setupAjax();
  if (headers.Authorization) {
    // change login button to log out
    $('#login-btn')
      .text('Logout')
      .attr('href', '/logout-spotify')
      .toggleClass('btn-outline-success btn-outline-info');

    window.setInterval(() => {
      // refresh the spotify auth token every <expires_in> interval
      const {refresh_token} = SP.globalContext.get('spotify_auth');
      $.getJSON('/refresh-spotify', {refresh_token}).then((data) => {
        SP.globalContext.set('spotify_auth', $.extend({}, SP.globalContext.get('spotify_auth'), data));
        document.cookie = 'spotify_auth' + '=' + encodeURIComponent(JSON.stringify(SP.globalContext.get('spotify_auth'))) + '; expires=' + moment().add(7, 'hours').toString() + '; path=/';
        SP.Libs.setupAjax();
      }, (e) => console.error(e));
    }, SP.globalContext.get('spotify_auth').expires_in * 1000);
  }
})();
