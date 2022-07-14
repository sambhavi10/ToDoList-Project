//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require('mongoose');
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


//create new mongodb database
mongoose.connect("mongodb://localhost:27017/todoListDB", { useNewUrlParser: true });

const itemsSchema = {
  name: String
};

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your todoList!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<--Hit this to delete an item."
});


const defaultItems = [item1, item2, item3];

//custom lists
//every list that we create is going to have a name and an array of item documents associated with it as well.
const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);


//rendering default items list
app.get("/", function (req, res) {

  //find returns an array as a result
  Item.find({}, function (err, foundItems) {
    //console.log(foundItems);
    if (foundItems.length === 0) {
      Item.insertMany(defaultItems, function (err) {
        if (err)
          console.log(err);
        else
          console.log("Successfully added default items to DB.")
      });
    }
    res.render("list", { listTitle: "Today", newListItems: foundItems });
  });
});


//for custom lists
//dynamic route based on route parameters
app.get('/:customListName', function (req, res) {
  const customListName = _.capitalize(req.params.customListName);



  //to avoid repititions
  //findOne gives us an object 
  List.findOne({ name: customListName }, function (err, foundList) {
    if (!err) {
      if (!foundList) {
        //create list
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + customListName);

      } else {
        //show an existing list
        res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
      }
    }
  });
});

app.post("/", function (req, res) {

  //whatever the user entered as a new item to be added
  const itemName = req.body.newItem;
  const listName = req.body.list; //name of button

  //create a new document, based on my mongodb model
  const item = new Item({
    name: itemName
  });

  if (listName == "Today") {

    item.save();
    res.redirect('/');
  }
  //new item comes from custom list
  else {
    List.findOne({ name: listName }, function (err, foundList) {
      //adding the foundList to the array of foundList
      foundList.items.push(item); //the item(document) we just created
      foundList.save();
      res.redirect('/' + listName);
    })
  }

});

//checking off items in the homepage
app.post('/delete', function (req, res) {
  const checkedItemId = req.body.checkbox; // what is being sent
  const listName = req.body.listName;

  //default list
  if (listName == "Today") {

    Item.findByIdAndRemove(checkedItemId, function (err) {
      if (err)
        console.log(err);
      else
        console.log("Sucessfully deleted item from DB");

      res.redirect('/');
    });
  }

  //custom list
  //find the list document which has this listName, and update list to remove this checked item, with this particular id
  else {
    //gets one item back, 
    //params: condition, updates, callback
    //inside updates: $pull, array we want to pull from, which item out of the array items, specified by checkedItemId
    List.findOneAndUpdate({ name: listName }, { $pull: { items: { _id: checkedItemId } } }, function (err, foundList) {
      if(!err)
        res.redirect('/'+ listName);
    });
  }
});





app.listen(3000, function () {
  console.log("Server started on port 3000");
});
