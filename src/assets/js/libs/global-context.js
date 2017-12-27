class GlobalContext {
  constructor() {
    // eventually use private variables when babel supports it
    this.cookies = {};
    for (let cookie of document.cookie.split(';')) {
      let data = cookie.trim().split('=');
      this.cookies[data[0]] = JSON.parse(decodeURIComponent(data[1]));
    }
  }

  get(property) {
    return this.cookies[property];
  }
}

Global = Global || {};
Global.globalContext = new GlobalContext();
