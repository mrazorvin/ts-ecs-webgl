// @ts-expect-error
import * as sheet from "url:./sheet.png";
// @ts-expect-error
import * as sheet_s from "url:./sheet_s.png";
import * as atlas from "./atlas.json";
import { monster_assets } from "../utils";

export const ogre = monster_assets(atlas, sheet, sheet_s);
