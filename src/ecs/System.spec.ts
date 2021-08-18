import { default as test } from "ava";
import { Scheduler, sys, World } from "./World";
import { TestComponent0, TestComponent1, TestComponent2 } from "./world_spec/world_component_fixtures";

const run = (world: World) => new Scheduler(world).tick();
const fixture = (opts: { fn: (world: World) => void }) => {
  const system1 = sys([], opts.fn, [TestComponent0]);
  const system2 = sys([], opts.fn, [TestComponent1]);
  const system3 = sys([], opts.fn, [TestComponent2]);

  const world1 = new World();
  const world2 = new World();

  return { system1, system2, system3, world1, world2 };
};

test("[World -> System.condition()] create system with condition and add it to the world", (t) => {
  const { world1, world2, system1, system2 } = fixture({ fn: () => t.fail() });

  world1.system(system1);
  t.deepEqual(system1.conditions, [TestComponent0]);
  t.is(system1.disabled, true);
  t.is(system1.prev, -1);
  t.is(system1.next, -1);
  t.is(system1.id, 0);
  t.is(world1.systems[system1.id], system1);
  t.is(world1.components.get(TestComponent0.id)?.dependent_system[0], system1);
  t.throws(() => world2.system(system1));

  world1.system(system2);
  t.deepEqual(system2.conditions, [TestComponent1]);
  t.is(system2.disabled, true);
  t.is(system2.prev, -1);
  t.is(system2.next, -1);
  t.is(system2.id, 1);
  t.is(world1.systems[system2.id], system2);
  t.is(world1.components.get(TestComponent1.id)?.dependent_system[0], system2);
  t.throws(() => world2.system(system2));

  t.is(world1.systems.length, 2);

  run(world1);
});

test("[World -> System.condition()] adding new condition component enable systems", (t) => {
  const { world1, system1, system2, system3 } = fixture({ fn: () => t.fail() });

  world1.system(system1);
  world1.system(system2);
  world1.system(system3);

  const entity1 = world1.entity([TestComponent0.create(world1)]);

  t.is(system1.id, 0);
  t.is(system1.next, -1);
  t.is(system1.prev, -1);
  t.is(system1.disabled, false);

  t.is(system2.id, 1);
  t.is(system2.next, -1);
  t.is(system2.prev, -1);
  t.is(system2.disabled, true);

  t.is(system3.id, 2);
  t.is(system3.next, -1);
  t.is(system3.prev, -1);
  t.is(system3.disabled, true);

  TestComponent2.create(world1).attach(world1, entity1);

  t.is(system1.prev, -1);
  t.is(system1.id, 0);
  t.is(system1.next, 2);
  t.is(system1.disabled, false);

  t.is(system2.prev, -1);
  t.is(system2.id, 1);
  t.is(system2.next, -1);
  t.is(system2.disabled, true);

  t.is(system3.prev, 0);
  t.is(system3.id, 2);
  t.is(system3.next, -1);
  t.is(system3.disabled, false);

  TestComponent1.create(world1).attach(world1, entity1);

  t.is(system1.prev, -1);
  t.is(system1.id, 0);
  t.is(system1.next, 1);
  t.is(system1.disabled, false);

  t.is(system2.prev, 0);
  t.is(system2.id, 1);
  t.is(system2.next, 2);
  t.is(system2.disabled, false);

  t.is(system3.prev, 1);
  t.is(system3.id, 2);
  t.is(system3.next, -1);
  t.is(system3.disabled, false);
});

test("[World -> System.condition()] scheduler correctly run systems after adding", (t) => {
  const pass = (world: World) => t.is(world, world);
  const fail = () => t.fail();
  const { world1, system1, system2, system3 } = fixture({ fn: fail });

  t.plan(6);

  world1.system(system1);
  world1.system(system2);
  world1.system(system3);

  run(world1);

  const entity1 = world1.entity([TestComponent0.create(world1)]);
  system1.exec = pass;

  run(world1);

  TestComponent2.create(world1).attach(world1, entity1);
  system3.exec = pass;

  run(world1);

  TestComponent1.create(world1).attach(world1, entity1);
  system2.exec = pass;

  run(world1);
});

test("[World -> System.condition()] removing components disable systems", (t) => {
  const { world1, system1, system2, system3 } = fixture({ fn: () => t.fail() });

  world1.system(system1);
  world1.system(system2);
  world1.system(system3);

  const entity1 = world1.entity([
    TestComponent0.create(world1),
    TestComponent1.create(world1),
    TestComponent2.create(world1),
  ]);

  t.is(system1.prev, -1);
  t.is(system1.id, 0);
  t.is(system1.next, 1);
  t.is(system1.disabled, false);

  t.is(system2.prev, 0);
  t.is(system2.id, 1);
  t.is(system2.next, 2);
  t.is(system2.disabled, false);

  t.is(system3.prev, 1);
  t.is(system3.id, 2);
  t.is(system3.next, -1);
  t.is(system3.disabled, false);

  TestComponent1.manager(world1).clear(entity1);

  t.is(system1.prev, -1);
  t.is(system1.id, 0);
  t.is(system1.next, 2);
  t.is(system1.disabled, false);

  t.is(system2.prev, -1);
  t.is(system2.id, 1);
  t.is(system2.next, -1);
  t.is(system2.disabled, true);

  t.is(system3.prev, 0);
  t.is(system3.id, 2);
  t.is(system3.next, -1);
  t.is(system3.disabled, false);

  TestComponent0.manager(world1).clear(entity1);

  t.is(system1.prev, -1);
  t.is(system1.id, 0);
  t.is(system1.next, -1);
  t.is(system1.disabled, true);

  t.is(system2.prev, -1);
  t.is(system2.id, 1);
  t.is(system2.next, -1);
  t.is(system2.disabled, true);

  t.is(system3.prev, -1);
  t.is(system3.id, 2);
  t.is(system3.next, -1);
  t.is(system3.disabled, false);

  TestComponent2.clear_collection(world1);

  t.is(system1.prev, -1);
  t.is(system1.id, 0);
  t.is(system1.next, -1);
  t.is(system1.disabled, true);

  t.is(system2.prev, -1);
  t.is(system2.id, 1);
  t.is(system2.next, -1);
  t.is(system2.disabled, true);

  t.is(system3.prev, -1);
  t.is(system3.id, 2);
  t.is(system3.next, -1);
  t.is(system3.disabled, true);
});

test("[World -> System.condition()] scheduler correctly run systems after removing", (t) => {
  const pass = (world: World) => t.is(world, world);
  const fail = () => t.fail();
  const { world1, system1, system2, system3 } = fixture({ fn: pass });

  t.plan(6);

  const entity1 = world1.entity([
    TestComponent0.create(world1),
    TestComponent1.create(world1),
    TestComponent2.create(world1),
  ]);

  world1.system(system1);
  world1.system(system2);
  world1.system(system3);

  run(world1);

  TestComponent1.manager(world1).clear(entity1);
  system2.exec = fail;

  run(world1);

  TestComponent0.manager(world1).clear(entity1);
  system1.exec = fail;

  run(world1);

  TestComponent2.manager(world1).clear(entity1);
  system3.exec = fail;

  run(world1);
});
