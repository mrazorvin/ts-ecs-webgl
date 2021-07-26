import { default as test } from "ava";
import { DeleteEntity } from "./DeleteEntity";
import { Hash } from "./Hash";
import { Component } from "./World";

Component.id = -Infinity;
const HEAD_HASH = new Hash(Component, undefined);

class Component1 extends Component {}
class Component2 extends Component {}
class Component3 extends Component {}

test("[World -> DeleteEntity]", (t) => {
  Component1.init();
  Component2.init();
  Component3.init();

  console.log(
    DeleteEntity.generate_function(
      HEAD_HASH.add(Component1).add(Component2).add(Component3)
    ).toString()
  );

  t.pass();
});
