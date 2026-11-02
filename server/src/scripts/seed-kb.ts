import { migrate } from "../migrate.js";
import { seedKb } from "../services/kb.js";
import { closeDb } from "../db.js";

migrate();
seedKb();
console.log("[kb] done");
closeDb();
