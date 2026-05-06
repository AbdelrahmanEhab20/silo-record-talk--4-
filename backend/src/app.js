import cors from "cors";
import express from "express";
import { config } from "./config/index.js";
import { attachUser } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";
import routes from "./routes/index.js";

const app = express();

app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(attachUser);
app.use("/api", routes);
app.use(errorHandler);

export default app;
