//Setting up new collection of links
Links = new Meteor.Collection("links");

if (Meteor.isClient) {

/*PART I: SESSION ID GENERATION ----------------------------------------------------------------------------------------------------------*/
 /*Check if you can put this anywhere else, it looks shit over here.*/
 /*Template.list.sessID_Gen = function(){
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;	
 } */

Template.list.sessID_Gen = function(){
	//need to get id from server
	var count;
	//Meteor.call('get_count', function(err,message){
//alert(err);
	//count = message;
	//alert("message: "+message);
	//alert("error: "+err);
//});
	//alert("this is count: "+count);
	var id = (30).toString(30);
	var filler = "00000";
	var output = [filler.slice(0,5-id.length),id].join('');
	//alert(output);
	return output;
}

//The Router after event callback overrides the following line, such that each link is now a mixtape.
Template.list.my_playlist_id = Template.list.sessID_Gen();

/*PART II: YOUTUBE API AND CONTROL FUNCTIONS -----------------------------------------------------------------------------------------------*/

//Second parameter is to keep track of result to play if user doesn't like the first result.
Template.list.search_get= function(str,val){
    var request = gapi.client.youtube.search.list({part:'snippet',q:str});

    request.execute(function(response) {
	    str = JSON.stringify(response.result);
	    str = JSON.parse(str);

	   //Ensuring that we found a video and not a channel.
	    if ( (str.items[val].id.kind == "youtube#channel") || (str.items[val].id.kind == "youtube#playlist") ){
		while (str.items[val].id.kind != "youtube#video"){
			//Error checking, you could have an inf loop.
			val = val+1;
		}
	    }
           //Links.insert({sess:Template.list.my_playlist_id,song_title:str.items[val].snippet.title,videoId:str.items[val].id.videoId,thumbnail:str.items[val].snippet.thumbnails.medium.url,index:val});

	/*Links.insert({sess: Template.list.my_playlist_id}, {
	$push: {
			Track:{
				song_title:str.items[val].snippet.title,
				video_id:str.items[val].id.videoId,
				thumbnail:str.items[val].snippet.thumbnails,
				index:val
			}
		}
	});*/
	//Links.insert({sess: Template.list.my_playlist_id, $push: {shit:"slit"}});
	if(!Links.findOne({sess: Template.list.my_playlist_id})){
		Links.insert({sess: Template.list.my_playlist_id});
	}

	var song = new Object();	
	song["title"] = str.items[val].snippet.title;
	song["video_id"] = str.items[val].id.videoId;
	song["thumbnail"] = str.items[val].snippet.thumbnails;
	song["index"] = val;
	console.log("title: "+song["title"]);
	console.log("about to update");
	//Links.update({_id: Links.findOne({sess: Template.list.my_playlist_id})._id, $push: {shit: "real_shit"}});
	Meteor.call('update_record',Template.list.my_playlist_id, song, function(err,message){
//alert(err);
});
	//Meteor.call('upd',Template.list.my_playlist_id,"hate",function (error,result){alert(error);alert(result);});
	//alert("balls");
	/*session = Links.findOne({sess:Template.list.my_playlist_id});
	if(session){
		session.sublist = session.sublist || [];
		session.sublist.push("tits");
		//alert(session.sublist);
		Links.update(session,sublist);
		//alert("yay");
	}*/
	
	//console.log(Links);
   });
}

/*Update List on generate button*/
Template.list.updateList = function(){
	var ret = [];
        $( "#playlist .list_element" ).each(function() {
	if($(this).is(':visible')){
		ret.push(   Links.findOne({_id:$(this).attr('id')})   );
         }
	});

	var urls = [];
	for (var i = 0; i < ret.length; i++){
		urls[i] = ret[i].videoId;
	}

	Session.set("current_list",ret);
	Session.set("current_urls",urls);
}


Template.fucking_list.navlist = function(){
	return Session.get("current_list");
}

/*PART III - ROUTING AND SUBSCRIPTIONS---------------------------------------------------------------------------------------------------------*/
Router.map(function () {
  //Implies I have a template named tape? That I'm not using... Calling it lists fucks things up.
  this.route('tape', {
    path: '/tape/:_sess',
    before: function(){
	this.subscribe('links',this.params._sess);
    },
    after: function(){
	Template.list.my_playlist_id = this.params._sess;
    }
  });
});

 //Renew subscription on state change.
 Meteor.subscribe( "links", Template.list.my_playlist_id);

/*PART III - EVENT HANDLERS AND REACTIONS BELOW-----------------------------------------------------------------------------------------------*/

//Updates Session vars on new addition.
Template.list.rendered = function(){
	Template.list.updateList();
}

//Loads API after #player is created for synchronicity(sp?)
Template.player.created = function(){
	  var tag = document.createElement('script');
	  tag.src = "https://apis.google.com/js/client.js?onload=onClientLoad";
	  var firstScriptTag = document.getElementsByTagName('script')[0];
	  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);			
	
}


 Template.search_bar.events({
    'keypress #query' : function (evt,template) {
      // template data, if any, is available in 'this'
      if (evt.which === 13){
                var url = template.find('#query').value;
                $("#query").val('');
		$('#playlist_container').animate({scrollTop: $('#playlist_container')[0].scrollHeight});
		Template.list.search_get(url,0);
                }
       }
  });

  Template.list.events({
	'click .destroy' : function (){
		Session.set("to_delete",this._id);	
		$("#"+Session.get("to_delete")).fadeOut('slow',function(){
			Links.remove(Session.get("to_delete"));
			//Links.update({
		});
	}
  });

  Template.unremovable_track.events({
	'click .unremovable' : function (){
		var videoId_local = this.videoId;
		var index = $.inArray(videoId_local,Session.get("current_urls"));
		player.loadPlaylist(Session.get("current_urls"),index);
	}
  });
  
  Template.list.my_playlist = function(){
	//After the deep copy in the routing part of the code, the JQuery will not be relevant.
	//return Links.find();
	//return Links.find();
	return Links.findOne({sess: Template.list.my_playlist_id}).songs;
	//return Links.find();
	//return Links.find().songs;
  }
  
  Template.player.nav_playlist = function(){
	return Session.get("current_list");
  }


  Template.header.events({
	'click #generate_button': function (evt, template){
		//bad code below:

	if (Template.list.my_playlist().fetch().length == 0){

		alert('Your tape is empty!');
	}
	else{
		$("#player").fadeIn(1000);
		generatePlaylist(  Session.get("current_urls")  );
		$("#playlist").css('display','none');


		$(".absolute_center").hide();

		/*Things to hide*/
		$(".absolute_center2").fadeIn();
		$("#navigation").fadeIn(1000);

		$("#query").hide();
		$("#share").fadeOut(1000);
		$("#playlist_container").fadeOut(1000);

		$('body').animate({backgroundColor: 'rgb(53,53,53)'}, 'slow');
		$('#title').animate({color: '#fff'}, 'slow');
	}
	},

	'click #close_player': function (evt, template){		
		player.stopVideo();
		$(".absolute_center2").hide();
		$("#player").hide();
		$("#navigation").hide();
		$("#playlist").css('display','block');

		/*Things that must reappear*/
		$("#query").show();
		$("#share").fadeIn(1000);
		$(".absolute_center").fadeIn(1000);
		$("#playlist_container").fadeIn(1000);

		$('body').animate({backgroundColor: '#fff'}, 'slow');
		$('#title').animate({color: '#000'}, 'slow');

	}
	
  });


}//End of Client

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
    Meteor.publish("links", function(sess_var) {
      //return Links.findOne({sess:sess_var});  //each client will only have links with that _lastSessionId
	return Links.find();
    });
  });


(function () {
Meteor.methods({
	update_record: function(sessID, songObj){
		Links.update({sess: sessID}, {$push: {songs: {song_title: songObj["title"], videoId: songObj["video_id"], thumbnail: songObj["thumbnail"]}}});
	},
	get_count: function(){
		return Links.find().count();
	}
});
}());
  
}//End of Server
