import { Component } from "@mr/ecs/World";

export class Modification extends Component.Extends() {
  constructor(public movement_target = [0, 0]) {
    super();
  }
}
