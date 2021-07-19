import { default as test } from "ava";
import { SSCDCircle, SSCDShape, SSCDVector, SSCDWorld } from "./index";

test("[SCDWorld]", (t) => {
  const world = new SSCDWorld({ grid_size: 32 * 5 });

  for (let i = 0; i < 10000; i++) {
    const circle = new SSCDCircle(new SSCDVector(i, 0), 10);
    world.add(circle);
    circle.set_collision_tags(["wall", "glass"]);
  }

  for (let i = 0; i < 10000; i++) {
    const circle = new SSCDCircle(new SSCDVector(i, 0), 10);
    world.add(circle);
    circle.set_collision_tags([]);
  }

  const result: SSCDShape[] = [];
  const circle = new SSCDCircle(new SSCDVector(0, 0), 10);
  world.test_collision(circle, ["wall"], (x) => {
    result.push(x);
  });

  t.is(result.length, 21);
});
