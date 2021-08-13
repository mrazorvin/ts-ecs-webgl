import { IComponent } from "./Component";

export interface QueryOptions {
  world?: true;
}

export interface Query<T extends Array<typeof IComponent>> extends QueryOptions {
  components: [...T] | readonly [...T];
}
