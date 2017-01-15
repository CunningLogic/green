module.exports = {
  web: {
    client_id: 'c8abfb3e58ed5ec5353ddcda36ae5037a760242e',
    project_id: 'dji-brandsite-showcase',
    auth_uri: 'https://api.vimeo.com/oauth/authorize',
    token_uri: 'https://api.vimeo.com/oauth/access_token',
    client_secret: 'hYNjYtgMPwx56r+5/QdhkDgIZoyXZ98lOH00eGrNssD/Xl/wDo9ScEInptXPGhIbJbdW7NUyiyi1wgfK1XQD2YdOR0+GBLwwlCKUzqbqpY2o1Sbaok+DJRlT+DcUGLsN',
    redirect_uris: [
      'http://localhost:1337/oauth2/callback',
      'http://www.dbeta.me/oauth2/callback',
      'http://www.dji.com/oauth2/callback'
    ],
    javascript_origins: [
      'http://localhost:1337',
      'http://www.dji.com',
      'http://www.dbeta.me'
    ],
    scope: 'public',
  }
}
