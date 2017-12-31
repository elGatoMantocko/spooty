Global = Global || {};
Global.globalContext = new Map(document.cookie.split(';').map((cookie) => cookie.trim().split('=').map((str) => decodeURIComponent(str))));
