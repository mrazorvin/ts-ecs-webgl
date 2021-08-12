import { InitComponent } from "./Component";

export class SubWorld extends InitComponent({ use_pool: false }) {
  static instance = new SubWorld();
}
