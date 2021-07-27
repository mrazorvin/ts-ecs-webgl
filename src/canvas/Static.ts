import { Component } from "@mr/ecs/World";

export class Static extends Component.Extends() {
  constructor(public x = 0, public y = 0) {
    super();
  }
}
