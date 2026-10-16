import { config } from "dotenv";
import path from "node:path";

config({ path: path.join(process.cwd(), ".env.local"), quiet: true });

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing ${name}. Add it to app/.env.local (see .env.example).`);
    process.exit(1);
  }
  return v;
}
