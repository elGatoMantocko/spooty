class Logger {
  _log(type = 'info', message) {
    if (typeof message === 'object') {
      message = JSON.stringify(message);
    }

    return $.post('/logger/' + type, {
      message: message || 'No message was provided.',
      page_url: window.location.href,
      page_title: document.title,
      user_agent: navigator.userAgent,
      referrer_url: document.referrer,
    });
  }

  info(message) {
    return this._log('log', message);
  }

  warn(message) {
    return this._log('warning', message);
  }

  error(message) {
    return this._log('error', message);
  }
}

SP.logger = new Logger();
