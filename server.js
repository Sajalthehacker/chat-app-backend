const express = require("express");
const connectDB = require("./config/db");
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");
const cors = require('cors')

dotenv.config();
const app = express();

// since we takes value from frontend then tell the server to accept the json data fron frontend
app.use(express.json()); // to accept json data

// app.use(cors({
//   origin: ["http://localhost:3000"]
// }))

app.get("/", (req, res) => {
  res.send("Server Running!");
});
connectDB();

app.use("/api/user/", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// --------------------------deployment------------------------------

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// --------------------------deployment------------------------------

// Error Handling middlewares to handle all other api routes 
// these app.use() only executes when any of the above app.use() not runs 
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT;

const server = app.listen(
  PORT,
  console.log(`Server running on PORT ${PORT}...`)
);

const io = require("socket.io")(server, {
  // the amount of time io will wait while become inactive
  pingTimeout: 60000, // io will wait 60 seconds before it goes off means for 60 seconds if any user didi not send any message it closes the connection to save bandwidth 
  cors: {
    origin: "http://localhost:3000",
    credentials: true
  },
});

// whenever someone tries to connect to server from frontend connection event is fired 
io.on("connection", (socket) => {
  console.log("Connected to socket.io");
  socket.on("setup", (userData) => {
    // connec a user with his user id(user object given as argument to callback)
    socket.join(userData._id);
    socket.emit("connected");
  });

  socket.on("join chat", (room) => {
    // create a new room in socket with room(selected chat) id 
    socket.join(room);
    console.log("User Joined Room: " + room);
  });
  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
});

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});
