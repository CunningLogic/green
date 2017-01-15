/**
 * best me controller
 * */

module.exports = {
  index: async function () {
    let req = this.request,
        API = req.API;
    req.set_page('bestme');

    await this.render_view('bestme/index', {});
  },
  pages: async function (pageId) {
    let req = this.request,
        res = this.response,
        util = req.helper,
        key = settings.keys['app_key'],
        userId = '';

    try{
      userId = util.RC4.unlock(key, pageId);
    }catch(ex){
      return res.redirect_404();
    }

    if(pageId && JsonDB.hasCollection(`Bestme:${userId}`)){
      userId = util.RC4.unlock(key, pageId);
      let userData = await JsonDB.find(`Bestme:${userId}`).data[0] || {},
          data = Object.assign(userData, {userPageId: pageId});

      await this.render_view('bestme/index', data);
    }else{
      return res.redirect_404();
    }
  },
  admin: async function (page) {
    let req = this.request,
        res = this.response,
        util = req.helper,
        data = {};
    req.set_page('bestme:' + page);

    if(page === 'users'){
      data = await JsonDB.find('Bestme:Users');
    }if(page === 'editor'){
      let userId = this.cookies.get('sign_code'),
          key = settings.keys['app_key'];
      if(!userId){
        return res.redirect('/bestme/login');
      }

      let userData = await JsonDB.find(`Bestme:${userId}`).data[0] || {};

      data = Object.assign(userData, {userPageId: util.RC4.lock(key, userId)});
    }

    await this.render_view('bestme/' + page, data);
  },
  login: async function () {
    let req = this.request,
        res = this.response,
        params = req.body,
        invite_code = params.invite_code,
        users = await JsonDB.find('Bestme:Users').data[0] || {};
    let is_valid_user = !!users[invite_code];

    if(!is_valid_user){
      await this.render_view('bestme/login', {
        invite_code: invite_code,
        is_invalid_user: !is_valid_user
      });
    }else{
      let domain = req.cookie_domain,
          cookie_options = { maxAge: '2592000000' , path: '/' , domain: domain, httpOnly: true};
      this.cookies.set('sign_code', invite_code, cookie_options);

      res.redirect('/bestme/editor');
    }
  },
  save: async function () {
    let req = this.request,
        params = req.body,
        userId = req.cookies.get('sign_code');
    if(!userId){
      return res.redirect('/bestme/login');
    }

    this.status = 200;
    this.body = await JsonDB.save(`Bestme:${userId}`, params);
  },
  createUser: async function () {
    let req = this.request,
        res = this.response,
        params = req.body,
        date = new Date(),
        seed = req.ip_from + date,
        userId = req.helper.md5(seed),
        collection = 'Bestme:Users';

    let users = await JsonDB.find(collection).data[0];

    if(!users){
      users = { count: 0 };
    }
    users.count += 1;
    users[userId] = {
      user_ip: req.ip_from,
      create_by: params.from || req.query.from ||  'user',
      create_at: date,
      update_at: date,
      number: users.count,
      user_id: userId
    };

    await JsonDB.save(collection, users);

    if(params.respType === 'json'){
      res.success(200, {userId}, {msg: 'generate user id success.'});
    }else{
      res.redirect('/bestme/users');
    }
  },
  updateUser: async function () {
    let req = this.request,
        params = req.body || {}, //user list
        collection = 'Bestme:Users';

    this.status = 200;
    this.body = await JsonDB.save(collection, params);
  }
};