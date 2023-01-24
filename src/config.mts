import "dotenv/config";
import { parse, F } from "./envuse.mjs";

const defaultConfig: F<".envuse"> = parse(".envuse");

export default defaultConfig;
