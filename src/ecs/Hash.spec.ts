import { default as test } from "ava";
import { Hash } from "./Hash";
import { InitComponent } from "./Component";

const HEAD_HASH = new Hash({ id: -Infinity }, undefined);

class Component1 extends InitComponent() {}
class Component2 extends InitComponent() {}
class Component3 extends InitComponent() {}

test("[World -> Hash]", (t) => {
  const hash1 = HEAD_HASH.add(Component1);
  const hash2 = HEAD_HASH.add(Component2);
  t.is(hash1, HEAD_HASH.add(Component1));
  t.is(hash2, HEAD_HASH.add(Component2));

  t.not(hash1, HEAD_HASH);
  t.not(hash2, HEAD_HASH);

  const hash12 = hash1.add(Component2);
  const hash21 = hash2.add(Component1);
  t.is(hash12, hash21);

  t.not(hash12, hash1);
  t.not(hash12, hash2);

  const hash123 = hash12.add(Component3);
  const hash213 = hash12.add(Component3);
  const hash312 = HEAD_HASH.add(Component3).add(Component1).add(Component2);
  t.is(hash123, hash213);
  t.is(hash213, hash312);

  t.not(hash123, hash1);
  t.not(hash123, hash2);
  t.not(hash123, hash12);

  t.is(hash123.value, Component3);
  t.is(hash312.prev?.value, Component2);
  t.is(hash312.prev?.prev?.value, Component1);
});
