// @ts-expect-error
import * as sheet from "url:./sheet.png";
import * as atlas from "./atlas.json";
import { monster_assets } from "../utils";

export const wasp = monster_assets(atlas, sheet);
