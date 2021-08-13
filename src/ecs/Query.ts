import { IComponent } from "./Component";

export interface QueryOptions {
  world?: true;
}

export interface Query<T extends Array<typeof IComponent>> extends QueryOptions {
  init?: true;
  components: [...T] | readonly [...T];
}
