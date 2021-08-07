// @ts-expect-error
import { sscd as SSCD_OLD } from "sscd";
import { default as test, ExecutionContext } from "ava";
import { SSCDCircle, SSCDRectangle, SSCDShape, SSCDVector, SSCDWorld } from ".";

function validate(
  props: { t: ExecutionContext; world: SSCDWorld; old_world?: { [key: string]: any } },
  ...rows: number[][]
) {
  const world = props.world;
  const old_world = props.old_world;
  const width = rows[0]?.length;
  let result: any[][] = [];
  let old_result: any[][] = [];
  let errors: string[] = [];
  let old_errors: string[] = [];
  if (width === undefined) {
    throw new Error("you must pass at least one row");
  }
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    if (row.length !== width) {
      throw new Error(`all rows must have same size ${width} != ${row.length}`);
    }
    for (let x = 0; x < width; x++) {
      const chunk = world.__grid[x][y];
      const old_chunk = old_world?.__grid[x]?.[y] as SSCDShape[];

      const expectation = row[x];
      const test_row = result[x] ?? (result[x] = []);
      test_row[y] = chunk?.elements;
      if (chunk) {
        chunk.elements.length = chunk.size;
      }

      if (old_world) {
        const old_test_row = old_result[x] ?? (old_result[x] = []);
        old_test_row[y] = old_chunk || [];
      }

      // compare state with old world
      if (old_world && !old_chunk && chunk && chunk.size !== 0) {
        old_errors.push(`empty chunk size difference [${x}][${y}].size !== 0, received ${chunk.size}`);
      }

      if (old_world && old_chunk) {
        if (old_chunk.length !== chunk.size) {
          old_errors.push(
            `filled chunk size difference [${x}][${y}].size !== old_size:${old_chunk.length}, received ${chunk.size}`
          );
        }

        if (expectation > 0) {
          var first_old = old_chunk[0];
          let _result: any[] = [];
          old_world.test_collision(first_old.__position, undefined, _result);
          var { __grid_chunks, __world, __id, __grid_bounderies, ...old_el } = _result[0] as any;

          var first_new = chunk.elements[0];
          var _custom: any;
          world.test_collision(new SSCDCircle(first_new.__position, 1), undefined, (collection) => {
            _custom = collection;
          });
          var { __world, __found, ...new_el } = _custom;

          props.t.deepEqual(JSON.parse(JSON.stringify(old_el)), JSON.parse(JSON.stringify(new_el)));
        }
      }

      if (expectation === 0 && chunk && chunk?.size !== 0) {
        errors.push(`expected [${x}][${y}].size === 0, but received ${chunk?.size}`);
      } else if (expectation === 1 && chunk.size !== 1) {
        errors.push(`expected [${x}][${y}].size ==== 1, but received ${chunk.size}`);
      }
    }
  }

  let z = -1;
  rows: for (let row of result) {
    z++;
    let last_value = row[row.length - 1];
    if (row.length === 1) {
      if (last_value === undefined) {
        row.length = 0;
        continue;
      }
    }
    for (let i = row.length - 2; i >= 0; i--) {
      let next_value = row[i];
      if (last_value === undefined) {
        row.length -= 1;
        last_value = next_value;
      }

      if (last_value !== undefined && next_value === undefined) {
        errors.push(`undefined values cannot be inside array [${z}][${i}]`);
        continue rows;
      }
    }
  }

  if (errors.length === 0 && old_errors.length === 0) {
    return "";
  } else {
    if (old_errors.length > 0) {
      console.log(old_result);
    }
    console.log(result);
    return errors.concat(old_errors);
  }
}

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

  t.is(new_world.__grid[C1][R1].elements[E0], undefined);
  t.is(new_world.__grid[C1][R2].elements[E0], undefined);
  t.is(new_world.__grid[C1][R3].elements[E0], undefined);

  t.is(new_world.__grid[C2][R1].elements[E0], undefined);
  t.is(new_world.__grid[C2][R2].elements[E0], new_circle1);
  t.is(new_world.__grid[C2][R3].elements[E0], new_circle1);

  t.is(new_world.__grid[C3][R1].elements[E0], undefined);
  t.is(new_world.__grid[C3][R2].elements[E0], new_circle1);
  t.is(new_world.__grid[C3][R3].elements[E0], new_circle1);

  new_world.remove(new_circle1);

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

  // DEBUG
  //
  // new_world.remove(new_circle2);
  // new_world.test_collision(new_circle1, undefined, () => undefined);
  //
  // const old_circle = new SSCD_OLD.Circle(new SSCD_OLD.Vector(10, 10), 10);
  // const old_world = new SSCD_OLD.World({ grid_size: 16 });
  // old_world.add(old_circle);
  //
  // new_circle.set_position(new SSCDVector(10, 10));
  //
  // console.log(new_world.__grid);
  // console.log(old_world.__grid);
});

test("[SSCDWorld -> SSCDCircle.move_to()]", (t) => {
  const world1 = new SSCDWorld({ grid_size: 16, size: 3 });
  const circle1 = new SSCDCircle(new SSCDVector(30, 30), 10);
  const old_world = new SSCD_OLD.World({ grid_size: 16 });
  const old_circle = new SSCD_OLD.Circle(new SSCD_OLD.Vector(30, 30), 10);

  old_world.add(old_circle);
  world1.add(circle1);

  // prettier-ignore
  t.is(validate(
    { world: world1, t, old_world  },
    [0, 0, 0],
    [0, 1, 1],
    [0, 1, 1]
  ), "");

  const world2 = new SSCDWorld({ grid_size: 16, size: 3 });
  const circle2 = new SSCDCircle(new SSCDVector(10, 10), 10);
  world2.add(circle2);
  old_circle.set_position(new SSCD_OLD.Vector(10, 10));

  // prettier-ignore
  t.is(validate(
    { world: world2, t, old_world },
    [1, 1, 0],
    [1, 1, 0],
    [0, 0, 0]
  ), "");

  const world3 = new SSCDWorld({ grid_size: 16, size: 3 });
  const circle3 = new SSCDCircle(new SSCDVector(10, 10), 10);
  world3.add(circle3);
  circle3.move_to(30, 30);
  old_circle.set_position(new SSCD_OLD.Vector(30, 30));

  // prettier-ignore
  t.is(validate(
    { world: world3, t, old_world },
    [0, 0, 0],
    [0, 1, 1],
    [0, 1, 1]
  ), "");

  circle3.move_to(10, 10);
  old_circle.set_position(new SSCD_OLD.Vector(10, 10));
  // prettier-ignore
  t.is(validate(
    { world: world3, t, old_world },
    [1, 1, 0],
    [1, 1, 0],
    [0, 0, 0]
  ), "");

  circle3.move_to(30, 10);
  old_circle.set_position(new SSCD_OLD.Vector(30, 10));
  // prettier-ignore
  t.is(validate(
    { world: world3, t, old_world },
    [0, 1, 1],
    [0, 1, 1],
    [0, 0, 0]
  ), "");

  circle3.move_to(30, 30);
  old_circle.set_position(new SSCD_OLD.Vector(30, 30));
  // prettier-ignore
  t.is(validate(
    { world: world3, t, old_world },
    [0, 0, 0],
    [0, 1, 1],
    [0, 1, 1]
  ), "");

  circle3.move_to(10, 30);
  old_circle.set_position(new SSCD_OLD.Vector(10, 30));
  // prettier-ignore
  t.is(validate(
    { world: world3, t, old_world },
    [0, 0, 0],
    [1, 1, 0],
    [1, 1, 0]
  ), "");

  t.throws(() => {
    circle3.move_to(0, 30);
    // prettier-ignore
    t.is(validate(
      { world: world3, t, old_world },
      [0, 0, 0],
      [1, 1, 0],
      [1, 1, 0]
    ), "");
  });
});

test("[SSCDWorld.add()]", (t) => {
  const world = new SSCDWorld({ grid_size: 16, size: 3 });
  const rectangle = new SSCDRectangle(new SSCDVector(32, 32), new SSCDVector(16, 16));
  const old_world = new SSCD_OLD.World({ grid_size: 16 });
  const old_rectangle = new SSCD_OLD.Rectangle(new SSCD_OLD.Vector(32, 32), new SSCD_OLD.Vector(16, 16));

  old_world.add(old_rectangle);
  world.add(rectangle);

  // prettier-ignore
  t.is(validate(
    { world, t, old_world },
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 1, 1],
    [0, 0, 1, 1]
  ), "");
});

test("[SSCDWorld -> SSCDRectangle.move_to()]", (t) => {
  const world = new SSCDWorld({ grid_size: 16, size: 3 });
  const rectangle = new SSCDRectangle(new SSCDVector(0, 0), new SSCDVector(16, 16));
  const old_world = new SSCD_OLD.World({ grid_size: 16 });
  const old_rectangle = new SSCD_OLD.Rectangle(new SSCD_OLD.Vector(0, 0), new SSCD_OLD.Vector(16, 16));

  old_world.add(old_rectangle);
  world.add(rectangle);

  // prettier-ignore
  t.is(validate(
    { world, t, old_world },
    [1, 1, 0],
    [1, 1, 0],
    [0, 0, 0]
  ), "");

  rectangle.move_to(16, 0);
  old_rectangle.set_position(new SSCD_OLD.Vector(16, 0));

  // prettier-ignore
  t.is(validate(
    { world, t, old_world },
    [0, 1, 1],
    [0, 1, 1],
    [0, 0, 0]
  ), "");

  rectangle.move_to(16, 16);
  old_rectangle.set_position(new SSCD_OLD.Vector(16, 16));

  // prettier-ignore
  t.is(validate(
    { world, t, old_world },
    [0, 0, 0],
    [0, 1, 1],
    [0, 1, 1]
  ), "");

  rectangle.move_to(0, 16);
  old_rectangle.set_position(new SSCD_OLD.Vector(0, 16));

  // prettier-ignore
  t.is(validate(
    { world, t, old_world },
    [0, 0, 0],
    [1, 1, 0],
    [1, 1, 0]
  ), "");

  rectangle.move_to(32, 32);
  old_rectangle.set_position(new SSCD_OLD.Vector(32, 32));

  // prettier-ignore
  t.is(validate(
    { world, t, old_world },
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 1, 1],
    [0, 0, 1, 1]
  ), "");
});

test("[SSCDWorld -> remove(), pool()]", (t) => {
  // if we delete __world, and grid_boundaries we could use same entity for both worlds
  // otherwise on move we need to copy one entity from world to another world
});
