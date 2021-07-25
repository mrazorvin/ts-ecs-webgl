import { default as test } from "ava";
import { Hash } from "./Hash";
import { Component } from "./World";

const HEAD_HASH = new Hash({ id: -Infinity }, undefined);

class Component1 extends Component {}
class Component2 extends Component {}
class Component3 extends Component {}

test("[World -> Hash]", (t) => {
  Component1.init();
  Component2.init();
  Component3.init();

  const hash1 = HEAD_HASH.add(Component1);
  t.is(hash1, HEAD_HASH.add(Component1));
});
