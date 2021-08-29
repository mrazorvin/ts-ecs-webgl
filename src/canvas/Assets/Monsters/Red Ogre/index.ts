// @ts-expect-error
import * as sheet from "url:./sheet.png";
// @ts-expect-error
import * as sheet_n from "url:./sheet_n.png";
import * as atlas from "./atlas.json";
import { monster_assets } from "../utils";

export const red_ogre = monster_assets(atlas, sheet, sheet_n);
