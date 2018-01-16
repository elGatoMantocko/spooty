SP.globalContext = new Map(
  document.cookie.split(';')
    .filter((cookie) => cookie.indexOf('spotify_auth') > -1)
    .map((cookie) => {
      let obj = cookie.trim().split('=');
      obj[1] = JSON.parse(decodeURIComponent(obj[1]));
      return obj;
    })
);
