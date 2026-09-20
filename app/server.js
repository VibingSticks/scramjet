import http from "node:http";
import express from "express";
import { bootstrap } from "@mercuryworkshop/proxy-bootstrap";

const { routeRequest, routeUpgrade } = await bootstrap();

const app = express();

app.use((req, res, next) => {
  if (routeRequest(req, res)) return;
  next();
});
app.use(express.static("public"));

const server = http.createServer(app);
server.on("upgrade", routeUpgrade);

// Render injects PORT; fall back to 3030 for local runs.
const port = process.env.PORT || 3030;
server.listen(port, () => console.log("Scramjet proxy listening on port " + port));
