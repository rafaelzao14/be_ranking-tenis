import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { router } from "./routes";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use(router);

const port = Number(process.env.PORT ?? 3333);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
