import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./modules/auth/auth.routes";
import discoverRoutes from "./modules/discover/routes";
import matchesRoutes from "./modules/matches/routes";
import swipeRoutes from "./modules/swipe/routes";
import usersRoutes from "./modules/users/routes";
import {
  errorHandler,
  notFoundHandler
} from "./shared/middleware/error.middleware";

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({ message: "Dating API Running" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/discover", discoverRoutes);
app.use("/api/v1/swipe", swipeRoutes);
app.use("/api/v1/matches", matchesRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
