const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let players = {}; // {socketId: {lat, lon, role}}

io.on("connection", (socket) => {
  console.log("New player connected:", socket.id);

  socket.on("join", (data) => {
    players[socket.id] = { lat: data.lat, lon: data.lon, role: data.role };
    io.emit("updatePlayers", players);
  });

  socket.on("updatePosition", (data) => {
    if (players[socket.id]) {
      players[socket.id].lat = data.lat;
      players[socket.id].lon = data.lon;

      // Check for captures
      for (let id in players) {
        if (id === socket.id) continue;
        const player = players[id];
        if (players[socket.id].role === "Hunter" && player.role === "Runner") {
          let distance = getDistance(
            players[socket.id].lat,
            players[socket.id].lon,
            player.lat,
            player.lon
          );
          if (distance <= 5) {
            io.to(socket.id).emit("captured", { targetId: id });
            io.to(id).emit("capturedBy", { hunterId: socket.id });
          }
        }
      }

      io.emit("updatePlayers", players);
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("updatePlayers", players);
  });
});

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
