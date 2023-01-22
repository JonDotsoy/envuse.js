import "dotenv/config";
import { parse } from "./envuse.mjs";

export const config = parse(".envuse");

export default config;
