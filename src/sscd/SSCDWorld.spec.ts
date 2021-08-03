// @ts-expect-error
import { sscd as SSCD_OLD } from "sscd";
import { default as test } from "ava";
import { SSCDCircle, SSCDVector, SSCDWorld } from ".";

test("[SSCDWorld vs SSCD]", (t) => {
  const new_circle = new SSCDCircle(new SSCDVector(10, 10), 10);
  const new_world = new SSCDWorld({ grid_size: 16 });
  new_world.add(new_circle);

  const old_circle = new SSCD_OLD.Circle(new SSCD_OLD.Vector(10, 10), 10);
  const old_world = new SSCD_OLD.World({ grid_size: 16 });
  old_world.add(old_circle);

  // new_circle.set_position(new SSCDVector(10, 10));

  // @ts-expect-error
  console.log(new_world.__grid);
  console.log(old_world.__grid);
});
