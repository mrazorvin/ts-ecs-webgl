// @ts-expect-error
import { sscd as SSCD_OLD } from "sscd";
import { default as test } from "ava";
import { SSCDCircle, SSCDVector, SSCDWorld } from ".";

test("[SSCDWorld vs SSCD]", (t) => {
  const new_world = new SSCDWorld({ grid_size: 16, size: 3 });

  const new_circle1 = new SSCDCircle(new SSCDVector(30, 30), 10);
  const new_circle2 = new SSCDCircle(new SSCDVector(30, 30), 10);

  const C1 = 0;
  const C2 = 1;
  const C3 = 2;

  const R1 = 0;
  const R2 = 1;
  const R3 = 2;

  const E0 = 0;
  const E1 = 1;

  // column-based grid
  //
  // |[0]| |[0]| |[0]|
  // |[0]| |[1]| |[1]|
  // |[0]| |[1]| |[1]|

  new_world.add(new_circle1);
  t.is(new_circle1.__grid_chunks.size, 4);

  t.is(new_world.__grid[C1][R1].elements[E0], undefined);
  t.is(new_world.__grid[C1][R2].elements[E0], undefined);
  t.is(new_world.__grid[C1][R3].elements[E0], undefined);

  t.is(new_world.__grid[C2][R1].elements[E0], undefined);
  t.is(new_world.__grid[C2][R2].elements[E0], new_circle1);
  t.is(new_world.__grid[C2][R3].elements[E0], new_circle1);

  t.is(new_world.__grid[C3][R1].elements[E0], undefined);
  t.is(new_world.__grid[C3][R2].elements[E0], new_circle1);
  t.is(new_world.__grid[C3][R3].elements[E0], new_circle1);

  t.is(new_circle1.__grid_chunks.chunks[0], new_world.__grid[C2][R2]);
  t.is(new_circle1.__grid_chunks.chunks[1], new_world.__grid[C2][R3]);
  t.is(new_circle1.__grid_chunks.chunks[2], new_world.__grid[C3][R2]);
  t.is(new_circle1.__grid_chunks.chunks[3], new_world.__grid[C3][R3]);

  new_world.remove(new_circle1);
  new_world.test_collision(new_circle1, undefined, () => undefined);

  t.is(new_world.__grid[C1][R1].size, 0);
  t.is(new_world.__grid[C1][R2].size, 0);
  t.is(new_world.__grid[C1][R3].size, 0);

  t.is(new_world.__grid[C2][R1].size, 0);
  t.is(new_world.__grid[C2][R2].size, 0);
  t.is(new_world.__grid[C2][R3].size, 0);

  t.is(new_world.__grid[C3][R1].size, 0);
  t.is(new_world.__grid[C3][R2].size, 0);
  t.is(new_world.__grid[C3][R3].size, 0);

  new_world.add(new_circle2);

  t.is(new_world.__grid[C2][R2].size, 1);
  t.is(new_world.__grid[C2][R3].size, 1);
  t.is(new_world.__grid[C3][R2].size, 1);
  t.is(new_world.__grid[C3][R3].size, 1);

  t.is(new_world.__grid[C2][R2].elements.length, 1);
  t.is(new_world.__grid[C2][R3].elements.length, 1);
  t.is(new_world.__grid[C3][R2].elements.length, 1);
  t.is(new_world.__grid[C3][R3].elements.length, 1);

  new_world.add(new_circle1);

  t.is(new_world.__grid[C2][R2].elements[E0], new_circle2);
  t.is(new_world.__grid[C2][R3].elements[E0], new_circle2);
  t.is(new_world.__grid[C3][R2].elements[E0], new_circle2);
  t.is(new_world.__grid[C3][R3].elements[E0], new_circle2);

  t.is(new_world.__grid[C2][R2].size, 2);
  t.is(new_world.__grid[C2][R3].size, 2);
  t.is(new_world.__grid[C3][R2].size, 2);
  t.is(new_world.__grid[C3][R3].size, 2);

  t.is(new_world.__grid[C2][R2].elements[E1], new_circle1);
  t.is(new_world.__grid[C2][R3].elements[E1], new_circle1);
  t.is(new_world.__grid[C3][R2].elements[E1], new_circle1);
  t.is(new_world.__grid[C3][R3].elements[E1], new_circle1);

  new_world.remove(new_circle2);
  new_world.test_collision(new_circle1, undefined, () => undefined);

  const old_circle = new SSCD_OLD.Circle(new SSCD_OLD.Vector(10, 10), 10);
  const old_world = new SSCD_OLD.World({ grid_size: 16 });
  old_world.add(old_circle);

  // new_circle.set_position(new SSCDVector(10, 10));

  console.log(new_world.__grid);
  console.log(old_world.__grid);
});
