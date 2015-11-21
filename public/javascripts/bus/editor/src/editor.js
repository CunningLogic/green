/**
 * Created by panhongfei on 15/6/7.
 */
(function(){
    var form=$('#article');
    $.api={};
    $.api.article={
        create:function(){
            var api={method:'post',url:'/api/user/articles'};
            return MUI.API.Factory({api:api},form);
        },
        edit:function(id){
            var api={method:'put',url:'/api/user/articles/'+id};
            return MUI.API.Factory({api:api},form);
        },
        query:function(){
        },
        all:function(){
        }
    };

    var _id=form.find('#id').val();
    var value=$("#editor").data('value');
    $("#editor").val(value);
    $("#editor").qeditor({});


    $("#btn-submit").click(function(e){
        if(!_id)
            $.api.article.create().submit(function(){
              location.href="/articles";
            });
        else
            $.api.article.edit(_id).submit(function(){
              location.href="/articles";
            });
        return false;
    });
})();