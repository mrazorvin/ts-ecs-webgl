import { default as test } from "ava";
import { Hash } from "./Hash";
import { InitComponent, IComponent } from "./Component";

const HEAD_HASH = new Hash(IComponent, undefined);

class Component1 extends InitComponent() {}
class Component2 extends InitComponent() {}
class Component3 extends InitComponent() {}

test("[World -> DeleteEntity]", (t) => {
  const hash = HEAD_HASH.add(Component1).add(Component3).add(Component2);

  t.is(hash.value, Component3);
  t.is(hash.prev?.value, Component2);
  t.is(hash.prev?.prev?.value, Component1);

  // console.log(
  //   DeleteEntity.generate_function(hash, HEAD_HASH.add(Component3)).toString()
  // );

  t.pass();
});
