import config from "./config/config";
import dotenv from "dotenv";
import app from "./app";

dotenv.config({ path: "../.env" });

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
