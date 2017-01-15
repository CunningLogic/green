module.exports = {
  web: {
    client_id: '639677918918-k12m8prddm5a4s0tdiqqcio7qkt7ada7.apps.googleusercontent.com',
    project_id: 'showcase-1379',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://accounts.google.com/o/oauth2/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_secret: 'qGJa_YjDduMyelswvGv9CHIA',
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
    scope: 'https://www.googleapis.com/auth/youtube',
  }
}
