import { IComponent } from "./Component";

export interface Query<T extends Array<typeof IComponent>> {
  components: [...T] | readonly [...T];
}
