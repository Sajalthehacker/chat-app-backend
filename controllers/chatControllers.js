const asyncHandler = require("express-async-handler");
const Chat = require("../models/chatModel");
const User = require("../models/userModel");

//@description     Create or fetch One to One Chat
//@route           POST /api/chat/
//@access          Protected
const accessChat = asyncHandler(async (req, res) => {
  // we take user id using which we are going to create a chat so current user who loggen in is going to send us his/her user id 
  const { userId } = req.body;
  // if a chat with this user id exists then we return that chat if a chat do not exists then we create a chat with this user id 

  if (!userId) {
    console.log("UserId param not sent with request please send it ");
    return res.sendStatus(400);
  }

  // checking whether a chat exists with this user id in chat model/ collection 
  var isChat = await Chat.find({
    // if this is one to one chat then isGroupChat is false
    isGroupChat: false,
    // inside and we check both user 1) the current user who logged in 2) user having id provided by req object  
    // users is the array containing at least 2 users involved in a chat se user collection schema 
    // req.user._id is the id of current logged in user 
    // user Id is provided by req
    // if and returns true then populate users array of chatModel collection 
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password") // populate array without password 
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name pic email",
  });

  // if chat exists bw two users one to one then return 0th chat 
  if (isChat.length > 0) {
    res.send(isChat[0]);
  } 
  //  otherwise create a new chat 
  else {
    var chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password"
      );
      res.status(200).json(FullChat);
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  }
});

//@description     Fetch all chats for a user
//@route           GET /api/chat/
//@access          Protected
const fetchChats = asyncHandler(async (req, res) => {
  try {
    //inside users array of Chat Model we go to all chats in our db and return all of the chats that a particular is a part of it 
    Chat.find({ users: { $elemMatch: { $eq: req.user._id } } })
      .populate("users", "-password")
      .populate("groupAdmin", "-password") // add groupAdmin if and without password 
      .populate("latestMessage")
      .sort({ updatedAt: -1 }) // sort chats according from new one to old one 
      .then(async (results) => {
        results = await User.populate(results, {
          path: "latestMessage.sender",
          select: "name pic email",
        });
        res.status(200).send(results);
      });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Group Chat
//@route           POST /api/chat/group
//@access          Protected
const createGroupChat = asyncHandler(async (req, res) => {
  // we are going to take bunch/array of users of req body and also name of group chat from body 
  if (!req.body.users) {
    return res.status(400).send({ message: "Please Select all the users whom you want to add in chat " });
  }
  if (!req.body.name) {
    return res.status(400).send({ message: "Please Provide Group Chat name " });
  }

  // get and parse in json format all users from req body 
  // we send array of users from frotend in stringify format and in backend we are going to parse it 
  // currently logged in user and all other user i am selecting is part of our group chat 
  var users = JSON.parse(req.body.users);

  // atleast 2 users are needed to make a group chat 

  if (users.length < 2) {
    return res
      .status(400)
      .send("More than 2 users are required to form a group chat");
  }

  // adding curent user also in users array bcz he is also in group chat 
  users.push(req.user);

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users: users,
      isGroupChat: true,
      // by default admin of group is current user who is creatng the group chat 
      groupAdmin: req.user,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

// @desc    Rename Group
// @route   PUT /api/chat/rename
// @access  Protected
const renameGroup = asyncHandler(async (req, res) => {
  // taking chat id which we want to rename and new name that we want to give
  const { chatId, chatName } = req.body;

  const updatedChat = await Chat.findByIdAndUpdate(
    chatId,
    {
      chatName: chatName,
    },
    {
      new: true, // using new: true return new name of chat 
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!updatedChat) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(updatedChat);
  }
});

// @desc    Remove user from Group
// @route   PUT /api/chat/groupremove
// @access  Protected
const removeFromGroup = asyncHandler(async (req, res) => {
// needs 2 things 1) chat id where we want to remove the user 2) user id whom we want to remove from the group
  const { chatId, userId } = req.body;

  // check if the requester is admin

  const removed = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },// just delete the user id from users array 
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!removed) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(removed);
  }
});

// @desc    Add user to Group / Leave
// @route   PUT /api/chat/groupadd
// @access  Protected
const addToGroup = asyncHandler(async (req, res) => {
  // we need 2 things 1) chat id where we want to add the user 2) user id of that user whom we want to add in group 
  const { chatId, userId } = req.body;

  // check if the requester is admin
  // 
  const added = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { users: userId },// update users array by pushing user id 
    },
    {
      new: true, // to return new one chat 
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!added) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(added);
  }
});

module.exports = {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
};
