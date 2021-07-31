import { default as test } from "ava";
import { World } from "../World";
import {
  TestResource0,
  TestResource1,
  TestResource2,
  TestResource3,
  TestResource4,
  TestResource5,
  TestResource6,
  TestResource7,
  TestResource8,
  TestResource9,
} from "./world_spec_fixtures";

test("[World.resource()] cache", (t) => {
  const world = new World();

  world.resource(new TestResource0());
  t.is(world.resources[0]!["_0"]!.constructor, TestResource0);

  world.resource(new TestResource1());
  t.is(world.resources[0]!!["_1"]!!.constructor, TestResource1);

  world.resource(new TestResource2());
  t.is(world.resources[0]!!["_2"]!!.constructor, TestResource2);

  world.resource(new TestResource3());
  t.is(world.resources[0]!["_3"]!.constructor, TestResource3);

  world.resource(new TestResource4());
  t.is(world.resources[0]!["_4"]!.constructor, TestResource4);

  world.resource(new TestResource5());
  t.is(world.resources[0]!["_5"]!.constructor, TestResource5);

  world.resource(new TestResource6());
  t.is(world.resources[0]!["_6"]!.constructor, TestResource6);

  world.resource(new TestResource7());
  t.is(world.resources[0]!["_7"]!.constructor, TestResource7);

  world.resource(new TestResource8());
  t.is(world.resources[0]!["_8"]!.constructor, TestResource8);

  world.resource(new TestResource9());
  t.is(world.resources[1]!["_0"]!.constructor, TestResource9);
});
