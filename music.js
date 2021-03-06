//Setting up new collection of links
Links = new Meteor.Collection("links");

if (Meteor.isClient) {

/*PART I: SESSION ID GENERATION ----------------------------------------------------------------------------------------------------------*/
 /*Check if you can put this anywhere else, it looks shit over here.*/

Template.list.sessID_Gen = function(){
	//need to get id from server

	Meteor.call('get_count', function(err,message){
	//alert(err);
		console.log("this is count: "+message);
		var id = (message).toString(30);
		var filler = "00000";
		Template.list.my_playlist_id = [filler.slice(0,5-id.length),id].join('');
		console.log("sessID: "+Template.list.my_playlist_id);
		Meteor.subscribe("links", Template.list.my_playlist_id);
	});
}

//The Router after event callback overrides the following line, such that each link is now a mixtape.


Meteor.startup(function (){
	Template.list.sessID_Gen();	//generate sessionID on pageload
});


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

	//make a call to the db right now

	if(!Links.findOne({sess: Template.list.my_playlist_id})){
		console.log("im inserting a new record with sess id: "+Template.list.my_playlist_id);
		Links.insert({sess: Template.list.my_playlist_id});
	}

	var song = new Object();	
	song["title"] = str.items[val].snippet.title;
	song["video_id"] = str.items[val].id.videoId;
	song["thumbnail"] = str.items[val].snippet.thumbnails;
	//song["index"] = val;
	song["index"] = new Meteor.Collection.ObjectID().toHexString();	//this is unique every time
	console.log("title: "+song["title"]);
	console.log("index: "+song["index"]);
	console.log("about to update");
	Meteor.call('update_record',Template.list.my_playlist_id, song, function(err,message){
		//alert(err);
	});
	
	//console.log(Links);
   });
}

/*Update List on generate button*/
Template.list.updateList = function(){
	console.log("update list being called");
	var ret = [];
        $( "#playlist .list_element" ).each(function() {
	if($(this).is(':visible')){
		//ret.push(Links.findOne({_id:$(this).attr('id')}));
		var songs= Links.find({sess: Template.list.my_playlist_id},{songs: {$elemMatch: {index: $(this).attr('id')}}}).fetch()[0].songs;
		//console.log("songs "+songs);
		for (var song in songs){
			console.log("hello this is: "+songs[song].index);
			if(songs[song].index == $(this).attr('id')){
				console.log("pushing this song "+songs[song].song_title);
				ret.push(songs[song]);
				break;
			}
		}
		//var songname = Links.find({sess: Template.list.my_playlist_id},{songs: {$elemMatch: {index: $(this).attr('id')}}}).fetch()[0].songs[0].song_title;
		//console.log("pushing song name: "+songname);
		//ret.push(songname);
         }
	});

	var urls = [];
	console.log("length of ret " + ret.length);
	for (var i = 0; i < ret.length; i++){
		console.log("current video url: "+ret[i].videoId);
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
	 console.log("subscribing to sess inside route: " + this.params._sess);
	this.subscribe('links',this.params._sess);
    },
    after: function(){
	Template.list.my_playlist_id = this.params._sess;
	console.log("after my sessid is " + Template.list.my_playlist_id);
    }
  });
});

 //Renew subscription on state change.

/* console.log("subscribing to sess: " + Template.list.my_playlist_id);
if(Template.list.my_playlist_id){
 Meteor.subscribe("links", Template.list.my_playlist_id);
}*/

/*PART III - EVENT HANDLERS AND REACTIONS BELOW-----------------------------------------------------------------------------------------------*/

//Updates Session vars on new addition.
Template.list.rendered = function(){
	console.log("im calling updatelist from rendered");
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
		Template.list.search_get(url,0);	//insert records into the database
                }
       }
  });

  /*Template.list.events({
	'click .destroy' : function (){
		console.log("about to set this id for deletion: "+this._id);
		Session.set("to_delete",this._id);	
		$("#"+Session.get("to_delete")).fadeOut('slow',function(){
			Links.remove(Session.get("to_delete"));
			//Links.update({
		});
	}
  });*/

Template.list.events({
	'click .destroy' : function (){
		console.log("this: "+this.index);
		Session.set("to_delete",this.index);	
		$("#"+Session.get("to_delete")).fadeOut('slow',function(){
			//Links.remove(Session.get("to_delete"));
			//Links.update({
			Meteor.call('delete_record',Template.list.my_playlist_id, Session.get("to_delete"), function(err,message){
			//alert(err);
				console.log("err from delete: "+err);
			});
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
	console.log("myplaylist is called");
	/*if(Links.findOne({sess: Template.list.my_playlist_id})){
		return Links.findOne({sess: Template.list.my_playlist_id}).songs;
	}
	else{
		return [];
	}*/
	//return Links.find({sess: Template.list.my_playlist_id}, {limit: 1});
	//return Links.findOne({sess: Template.list.my_playlist_id});
	return Links.find();
	
  }
  
  Template.player.nav_playlist = function(){
	return Session.get("current_list");
  }

  //when user hits the generate playlist button
  Template.header.events({
	'click #generate_button': function (evt, template){
		//bad code below:

	/*if (Template.list.my_playlist().fetch().length == 0){

		alert('Your tape is empty!');
	}*/
	if(Template.list.my_playlist().length == 0){
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
    //console.log("hello");
    Meteor.publish("links", function(sess_var) {
     //console.log("publishing");
	console.log("sess_var is: "+sess_var);
     // return Links.findOne({sess:sess_var});  //each client will only have links with that _lastSessionId
	console.log("the count is: "+Links.find({sess: sess_var}).count());
	//console.log(Links.find({sess: sess_var}));
	return Links.find({sess: sess_var});
	//return Links.find();
	
    });
  
});


(function () {
Meteor.methods({
	update_record: function(sessID, songObj){
		Links.update({sess: sessID}, {$push: {songs: {song_title: songObj["title"], videoId: songObj["video_id"], thumbnail: songObj["thumbnail"], index: songObj["index"]}}});
		console.log("songs: "+Links.findOne({sess: sessID}).songs.length);
	},
	get_count: function(){
		return Links.find().count();
	},
	delete_record: function(sessID, ObjID){
		console.log("trying to pull object "+ObjID +" from session: "+sessID);
		Links.update({sess: sessID}, {$pull: {songs: {index: ObjID}}});
		console.log("remaining songs: "+Links.findOne({sess: sessID}).songs.length);
		if(Links.findOne({sess: sessID}).songs.length == 0){
			console.log("list empty, destroying record with id "+sessID);
			Links.remove({sess: sessID});
		}
	}
});
}());
  
}//End of Server
