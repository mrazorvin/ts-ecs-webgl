// @ts-expect-error
import * as sheet from "./sheet.png";
import * as atlas from "./atlas.json";
import { monster_assets } from "../utils";

export const red_ogre = monster_assets(atlas, sheet);
