var PageManager={
	 //====全局参数
	 Param:{
		body:null,
		page:null,
		pageHeight:"768px",
		timer:null
	 }, 
	 
	 //=====初始化
	 work:function(){
	   var self=this;
	  
	   self.doLayout(true);
	   self.bindEvent();
	   self.initComponent();
	 },
	 
	 //=====渲染页面，处理动画
	 doLayout:function(isInit){
		var animateList = [],
			groupList= $(".animate");
		//===获取动画队列
		groupList.sort(function(a,b){ 
		   return -($(a).attr("anim-order")-$(b).attr("anim-order"));
		}).each(function(index,animateEle){
			var container=$(animateEle),
				anim=container.attr("anim-group");
				if(!anim){
				  anim=container.attr("anim");
				  switchAnim(container,anim);
				}
				else{//is group
					var eleList=container.children(),
						animGroup=container.attr("anim-group");
						eleList.each(function(index,item){
						  var ele=$(item);
						  switchAnim(ele,animGroup); 
						  ele.css("z-index",eleList.length-index); 
						}); 
				}//end of else group
		});//end of each   
		//====添加到动画队列
		function switchAnim(ele,anim){ 
		   switch(anim){ 
			 case 'fade-move':
			   var left=parseInt(ele.css("left"));
			   ele.css({"opacity":0,filter:"alpha(opacity=0);"});
			   animateList.push(function () { 
				  ele.delay(100).animate({"left":left-20,"opacity":1},msgAnimate); 
			   });
			 break;
			 case 'bounce-move':
			   var top=ele.css("top");
			   ele.css({"opacity":0,"top":0});
			   animateList.push(function () {  
				  ele.delay(100).animate({"top":top,"opacity":1,filter:"alpha(opacity=100)"},1500,"easeOutBounce",msgAnimate); 
			   });
			 break;
			 case 'fade-in':
			   ele.css({"opacity":0,filter:"alpha(opacity=0);"});
			   animateList.push(function () {  
				  ele.delay(100).animate({"opacity":1,filter:"alpha(opacity=100)"},700,"easeOutBounce",msgAnimate); 
			   });
			 break;
		   }   
		}//end of switch anim
		   
		//===调用动画队列
		var body=$("body");		
		body.queue('animateQueue', animateList);
		var msgAnimate = function () {
			body.dequeue('animateQueue');
		};
		msgAnimate();
	 },//end of layout 
	 
	 //========绑定页面事件
	 bindEvent:function(){  
		var wallHeight=parseInt($(".info-wall").css("height")),
			opacityLayer=$(".opacity-layer"), 
			timer=null;    
		var info=$(".picture-info"), 
			navs=$(".text-info"),
			lastIndex=0, 
			lastTab=info.find("#J_tab-"+lastIndex),
			isHovering=false; 
		
		//===信息墙Tab切换
		navs.find("a").hover(function(e){
			var self=this;
			if(!isHovering){ 
				timer=setTimeout(function(){  
					var target=$(self),
					tabIndex=target.attr("tab-index"),
					tab=info.find("#J_tab-"+tabIndex);
					if(lastIndex!=tabIndex){
						//在动画完成前，避免再次hover 
						opacityLayer.css("display","block");
						
						navs.find(".selected").removeClass("selected");
						target.addClass("selected");
						lastTab.fadeOut("fast",function(){ 
						  tab.fadeIn("fast",function(){   
							opacityLayer.css("display","none");
						  }); 
						});  
						lastTab=tab;  
						lastIndex=tabIndex;
						isHovering=true;
					}    
				},200); 
			}
		},function(e){    
			clearTimeout(timer); 
			isHovering=false;
		}); 
		
		
		//===导航条切换
		var navUL=$(".nav-ul"),
			lastNav=navUL.find(".selected"),
			isScrolling=false,
			screenHigh=$("body").height(),
			targetList=navUL.find("a").map(function(){
			   var nav=$(this),
				   target=$(nav.attr("href"));
			   var top=target.offset().top;					   
			   return {"nav":nav,"top":top,"high":target.height()/2};
			});
		navUL.delegate("a","click",function(){
		   isScrolling=true;//阻止滚动事件
		   
		   var nav=$(this),
			   href=nav.attr("href"),
			   targetEle=$(href);
		   if(lastNav)//切换导航的选中状态
			 lastNav.removeClass("selected");
		   nav.addClass("selected");
		   lastNav=nav;
		   //===滚动到指定位置
		   if(targetEle){
			 var top=parseInt(targetEle.offset().top);
			 $('html, body').animate({ scrollTop:top-40}, 1000, 'easeOutExpo',function(){isScrolling=false;}); 
			 return false;
		   } 
		});  
		//===滚动条事件，处理当前的导航位置
		$(window).scroll(function(){
			if(!isScrolling){
				var top=$(window).scrollTop();
				targetList.each(function(){
				  var ele=this; 
				  //===如果元素的一半进入视口
				  if((ele.top+ele.high)-screenHigh<top&&top<ele.top+ele.high){
					if(lastNav)//切换导航的选中状态
					  lastNav.removeClass("selected");
					ele.nav.addClass("selected");
					lastNav=ele.nav; 
					return false; 
				  }
				});
			}
		});
		
		//====阻止link的默认行为
		$("body").delegate("a","click",function(){ 
		  if($(this).attr("href")=="#")
			return false;
		});
		
	 },//end of bindEvent 
	 
	 //======初始化组件
	 initComponent:function(){ 
		//===lightBox组件
		$.fn.lightBox({
          imageLoading: '/images/img/f2e/lightbox-ico-loading.gif',
          imageBtnPrev: '/images/img/f2e/prev.png',
          imageBtnNext: '/images/img/f2e/next.png',
          imageBtnClose: '/images/img/f2e/lightbox-btn-close.gif',
		  trigger:$(".project-picture-wrap"),
		  getGallery:function(trigger){
			return $(trigger).parents(".project-section").find(".project-gallery a");		    
		  }			  
		});  
	 }
 };