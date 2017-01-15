/*!
 *  countdown - jQuery
 *
 *  使用dom格式为：
 *  .countdown-thumb(data-countdown-launch-time="2016/08/23 5:00:00 GMT",data-reload="false")
 *    .countdown-days
 *    .countdown-hours
 *    .countdown-mins
 *    .countdown-sec
 *
 *
 *  data-countdown-launch-time 设置终点时间  需要转化为零时区时间
 *  例一：发布时间是北京时间  2030/08/08 16:45:00  且北京时区为 utc +0800
 *       则这里设置的时间＝  2030/08/08 08:45:00 GMT
 *
 *  例一：发布时间是纽约时间  2030/08/08 08:45:00  且北京时区为 utc -0500
 *       则这里设置的时间＝  2030/08/08 13:45:00 GMT
 *
 *
 *  data-reload(非必填) ture -> 到终点后自动刷新页面，默认为flase不刷新
 *  (请注意，如果设置为true到点后没有发布新品，页面将不停的刷新，此时需要设置为false。)
 *
 *
 */



;
(function(W, $){

  var CountDown = {
    launchTime: '',
    launchTimestamp: 0,
    currentTimestamp: 0,
    CountDownTimer: null,
    CountDownData: {},
    reload: false,

    init: function (launchTime) {
      var self = this;
      this.launchTime = launchTime;
      this.launchTimestamp = (new Date(launchTime)).getTime();

      var reload = $('.countdown-thumb').data('countdown-reload');
      if(reload) self.reload = true;

      clearTimeout(self.CountDownTimer);

      self.currentTime(function (data) {
        if (data) {
          self.currentTimestamp = data;
          // if (self.launchTimestamp > self.currentTimestamp) {
            self.update();
          // }
        }
      })
    },

    update: function () {
      var self = this;
      self.CountDownData = this.getTimeGap(this.currentTimestamp, this.launchTimestamp);
      $('.countdown-days').text(this.numToStr(self.CountDownData.days));
      $('.countdown-hours').text(this.numToStr(self.CountDownData.hours));
      $('.countdown-mins').text(this.numToStr(self.CountDownData.mins));
      $('.countdown-sec').text(this.numToStr(self.CountDownData.sec));

      if (self.CountDownData.days + self.CountDownData.hours + self.CountDownData.mins + self.CountDownData.sec == 0) {
        clearTimeout(self.CountDownTimer);
        if(self.reload) window.location.reload();
      } else {
        self.CountDownTimer = setTimeout(function () {
          self.currentTimestamp += 1000;
          self.update();
        }, 1000);
      }
    },

    numToStr: function (num) {
      return (num < 10 ? '0' : '') + num;
    },

    getTimeGap: function (before, after) {
      var gap = (after - before) / 1000;
      var result = {
        days: Math.floor(gap / 60 / 60 / 24),
        hours: Math.floor(gap / 60 / 60) % 24,
        mins: Math.floor(gap / 60) % 60,
        sec: Math.floor(gap) % 60
      };
      result.days = result.days > 0 ? result.days : 0
      result.hours = result.hours > 0 ? result.hours : 0
      result.mins = result.mins > 0 ? result.mins : 0
      result.sec = result.sec > 0 ? result.sec : 0
      return result;
    },

    currentTime: function(done){
      $.ajax({
        url: 'company',
        type: 'get'
      }).done(function (data, status, xhr) {
        var str = xhr.getResponseHeader('Date');  //获取Response Header里面的Date
        var date = str; //把Date转换成时间对象
        // console.log('Server Time:', date);
        done(new Date(date).getTime());
      }).fail(function () {
        var date = new Date();
        console.log('Computer Time:', date);
        done(date.getTime());
      });
    }

  };

  var launchTime = $('.countdown-thumb').data('countdown-launch-time');

  if(launchTime){
    CountDown.init(launchTime);
  }

}(Window, jQuery))








  // .swiper-slide.slide-countdown.slide-2col
  //   .container
  //     .caption
  //       h2.title
  //         span.light!= wt('v2.homepage.p4_countdown_banner.t1')
  //         span!= wt('v2.homepage.p4_countdown_banner.t2')
  //       .countdown-container.countdown-thumb(data-countdown-launch-time="2016/08/23 15:00:00 GMT",data-countdown-reload='false')
  //         h4.time-item
  //           span.num.days.countdown-days &nbsp;
  //           span.unit!= wt('v2.homepage.banner.flagship.days')
  //         h4.time-item
  //           span.num.hours.countdown-hours &nbsp;
  //           span.unit!= wt('v2.homepage.banner.flagship.hours')
  //         h4.time-item
  //           span.num.mins.countdown-mins &nbsp;
  //           span.unit!= wt('v2.homepage.banner.flagship.mins')
  //         h4.time-item.last
  //           span.num.sec.countdown-sec &nbsp;
  //           span.unit!= wt('v2.homepage.banner.flagship.sec')
  //       if (!req.use_mobile)
  //         .drone-container
  //           .drone-fg
  //           .drone-bg





