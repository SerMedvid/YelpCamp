var mongoose        = require("mongoose"),
    Campground      = require("./models/campground"),
    Comment         = require("./models/comment");
    
var data = [
    {
        name: "Cloud's rest",
        image: "https://farm8.staticflickr.com/7268/7121859753_e7f787dc42.jpg",
        description: " is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."
    },
    {
        name: "Rocky Hill",
        image: "https://farm3.staticflickr.com/2116/2164766085_0229ac3f08.jpg",
        description: " is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."
    },
    {
        name: "Canyon Floor",
        image: "https://farm4.staticflickr.com/3014/2347630681_c744bcfe28.jpg",
        description: " is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book. It has survived not only five centuries, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised in the 1960s with the release of Letraset sheets containing Lorem Ipsum passages, and more recently with desktop publishing software like Aldus PageMaker including versions of Lorem Ipsum."
    }
];

function seedDB(){
    Campground.remove({}, function(err){
        if(err){
            console.log(err);
        } else {
            console.log("removed");
            data.forEach(function(seed){
                Campground.create(seed, function(err, campground){
                    if(err){
                        console.log(err);
                    } else {
                        console.log("added a campground");
                        Comment.create(
                            {
                                text: "This place is awesome",
                                author: "Homer"
                            }, function(err, comment){
                                if(err){
                                    console.log(err)
                                } else {
                                    campground.comments.push(comment);
                                    campground.save();
                                    console.log("created comment");
                                }
                            }
                        );
                    }
                });
            });
        }
    });
}

module.exports = seedDB;

