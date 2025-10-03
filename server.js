// signaling-server/server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new socketIo.Server(server, {
  cors: {
    origin: "http://localhost:3000", // Next.js 앱의 주소
    methods: ["GET", "POST"],
  },
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("join room", (roomID) => {
    if (rooms[roomID]) {
      const otherUsers = rooms[roomID];
      rooms[roomID].push(socket.id);
      socket.join(roomID);

      const userToSignal = otherUsers[0]; // 간단하게 첫 번째 사용자와 연결
      socket.emit("other user", userToSignal);
      socket.to(userToSignal).emit("user joined", { signal: null, callerID: socket.id });

    } else {
      rooms[roomID] = [socket.id];
      socket.join(roomID);
    }

    socket.on("sending signal", (payload) => {
      io.to(payload.userToSignal).emit("receiving signal", {
        signal: payload.signal,
        callerID: payload.callerID,
      });
    });

    socket.on("returning signal", (payload) => {
      io.to(payload.callerID).emit("receiving returned signal", {
        signal: payload.signal,
        id: socket.id,
      });
    });

    socket.on("disconnect", () => {
      const roomID = Object.keys(rooms).find((key) => rooms[key].includes(socket.id));
      if (roomID) {
        rooms[roomID] = rooms[roomID].filter((id) => id !== socket.id);
        if(rooms[roomID].length === 0) {
            delete rooms[roomID];
        }
      }
      socket.broadcast.emit("user left", socket.id);
      console.log("user disconnected");
    });
  });
});

const PORT = 8000;
server.listen(PORT, () => console.log(`Signaling server is running on port ${PORT}`));