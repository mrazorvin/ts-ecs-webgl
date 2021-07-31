import { default as test } from "ava";
import { Hash } from "./Hash";
import { IComponent } from "./Component";
import {
  TestComponent1,
  TestComponent2,
  TestComponent3,
} from "./world_spec/world_spec_fixtures";

const HEAD_HASH = new Hash(IComponent, undefined);

test("[World -> Hash]", (t) => {
  const hash1 = HEAD_HASH.add(TestComponent1);
  const hash2 = HEAD_HASH.add(TestComponent2);
  t.is(hash1, HEAD_HASH.add(TestComponent1));
  t.is(hash2, HEAD_HASH.add(TestComponent2));

  t.not(hash1, HEAD_HASH);
  t.not(hash2, HEAD_HASH);

  const hash12 = hash1.add(TestComponent2);
  const hash21 = hash2.add(TestComponent1);
  t.is(hash12, hash21);

  t.not(hash12, hash1);
  t.not(hash12, hash2);

  const hash123 = hash12.add(TestComponent3);
  const hash213 = hash12.add(TestComponent3);
  const hash312 = HEAD_HASH.add(TestComponent3)
    .add(TestComponent1)
    .add(TestComponent2);
  t.is(hash123, hash213);
  t.is(hash213, hash312);

  t.not(hash123, hash1);
  t.not(hash123, hash2);
  t.not(hash123, hash12);

  t.is(hash123.value, TestComponent3);
  t.is(hash312.prev?.value, TestComponent2);
  t.is(hash312.prev?.prev?.value, TestComponent1);
});
