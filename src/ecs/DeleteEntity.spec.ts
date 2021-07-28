import { default as test } from "ava";
import { DeleteEntity } from "./DeleteEntity";
import { Hash } from "./Hash";
import { Component } from "./Component";

Component.id = -Infinity;
const HEAD_HASH = new Hash(Component, undefined);

class Component1 extends Component.Init() {}
class Component2 extends Component.Init() {}
class Component3 extends Component.Init() {}

test("[World -> DeleteEntity]", (t) => {
  Component1.init();
  Component2.init();
  Component3.init();

  const hash = HEAD_HASH.add(Component1).add(Component3).add(Component2);

  t.is(hash.value, Component3);
  t.is(hash.prev?.value, Component2);
  t.is(hash.prev?.prev?.value, Component1);

  // console.log(
  //   DeleteEntity.generate_function(hash, HEAD_HASH.add(Component3)).toString()
  // );

  t.pass();
});
