import { default as test } from "ava";
import { Query } from "./Query";
import { SubWorld } from "./SubWorld";
import { BaseScheduler, q, sys, System, World } from "./World";
import {
  TestComponent0,
  TestComponent2,
  TestComponent3,
  TestComponent8,
  TestComponent9,
} from "./world_spec/world_component_fixtures";

class Scheduler extends BaseScheduler {
  start() {
    this.tick();
  }
}

const total_entities = 3;

const exec = (opts?: {
  world?: World;
  scheduler?: Scheduler;
  fn?: (world: World, system: System) => void;
  system_before_first_tick?: (system: System) => void;
  system_after_first_tick?: (system: System) => void;
}) => {
  let world = opts?.world;
  if (world === undefined) {
    world = new World();
    for (let i = 0; i < total_entities; i++) {
      world.entity([TestComponent0.create(world), TestComponent2.create(world), TestComponent3.create(world)]);
      world.entity([TestComponent8.create(world)]);
      world.entity([TestComponent8.create(world)], new World());
      world.entity([TestComponent9.create(world)], new World());
    }
  }

  if (opts !== undefined) {
    let scheduler = opts.scheduler;
    if (scheduler === undefined) {
      scheduler = new Scheduler(world);
    } else {
      scheduler.world = world;
    }
    if (opts.fn !== undefined && world.systems[0] === undefined) {
      const _fn = opts.fn;
      const fn = (world: World) => _fn(world, system);
      const system: System = sys([], fn);
      world.system(system);
      // system will be added only on next tick
      scheduler.tick();
    } else if (world.systems[0] !== undefined && opts.fn !== undefined) {
      const _fn = opts.fn;
      world.systems[0].exec = (world: World) => _fn(world, world.systems[0]!) as any;
    }

    // running system
    scheduler.tick();

    return { scheduler, world };
  }

  return { world };
};

test("[World -> Query] array/simple query", (t) => {
  const { world } = exec();

  t.plan(total_entities);
  q.run(world, q([TestComponent0]), (_, c0) => {
    t.true(c0 instanceof TestComponent0);
  });
});

test("[World -> Query] complex query", (t) => {
  const { world } = exec();

  t.plan(total_entities * 2);
  q.run(world, q({ components: [TestComponent8] }), (_, c8) => {
    t.true(c8 instanceof TestComponent8);
  });
});

test("[World -> Query] world query", (t) => {
  const query = q({ components: [TestComponent8], world: true }) as any as Query<any>;

  t.is(query.components[0], TestComponent8);
  t.is(query.components[1], SubWorld);
});

test("[World -> Query] complex query with world", (t) => {
  const { world } = exec();

  t.plan(total_entities);
  q.run(world, q({ components: [TestComponent8], world: true }), (entity) => {
    t.true(entity.world instanceof World);
  });
});

test("[World -> Query] query inside system", (t) => {
  t.plan(total_entities);

  exec({
    fn: (world) => {
      q.run(world, q([TestComponent0]), (_, c0) => {
        t.true(c0 instanceof TestComponent0);
      });
    },
  });
});

test("[World -> Query] query system cache", (t) => {
  let world: { world: World; scheduler?: Scheduler };
  let query_type = q([TestComponent0]);
  let query: undefined | typeof query_type;
  let tests = 0;

  const get_query = () => {
    if (query === undefined) {
      query = q([TestComponent0]);
    } else {
      throw new Error("can't create query multiple times");
    }

    return query;
  };

  const run = (_: any) => tests++;

  world = exec({
    fn: (world, system) => {
      run(t.deepEqual(Object.keys(system.queries), []));
      run(q.run(world, q.id("cached_query") ?? get_query(), (_, c0) => run(t.true(c0 instanceof TestComponent0))));
      run(t.deepEqual(Object.keys(system.queries), ["cached_query"]));
      run(t.is(system.queries["cached_query"], query as any));
    },
  });

  world = exec({
    ...world,
    fn: (world, system) => {
      run(t.deepEqual(Object.keys(system.queries), ["cached_query"]));
      run(t.is(system.queries["cached_query"], query as any));
      run(q.run(world, q.id("cached_query") ?? get_query(), (_, c0) => run(t.true(c0 instanceof TestComponent0))));
      run(t.deepEqual(Object.keys(system.queries), ["cached_query"]));

      // using same query in the tick not allowed
      t.throws(() => {
        q.run(world, q.id("cached_query") ?? get_query(), (_, c0) => run(t.true(c0 instanceof TestComponent0)));
      });
    },
  });

  t.true(tests >= 10);
});

test("[World -> Query] pre-defined query", (t) => {
  let world: { world: World; scheduler?: Scheduler };
  let query = q([TestComponent0]);

  t.plan(2);

  world = exec({
    fn: (world, system) => {
      q.run(world, query, (_, c0) => undefined);
      t.is(Object.keys(system.queries).length, 0);
    },
  });

  world = exec({
    ...world,
    fn: (world, system) => {
      t.throws(() => {
        q.run(world, q.id("never_do_this") ?? query, (_, c0) => undefined);
      });
    },
  });
});

test("[World -> Query] local cache", (t) => {
  const world1 = exec({
    fn: (world) => {
      q.run(world, q.id("cached") ?? q([TestComponent0]), (_, c0) => undefined);
    },
  });

  const world2 = exec({
    fn: (world) => {
      q.run(world, q.id("cached") ?? q([TestComponent0]), (_, c0) => undefined);
    },
  });

  t.not(world1.world.systems[0]?.queries["cached"], world2.world.systems[0]?.queries["cached"]);
});

test("[World -> Query] world reset", (t) => {
  let world = exec({
    fn: () => {
      q.id("cached");
      t.throws(() => {
        q.id("cached");
      });
    },
  });

  world = exec({
    ...world,
    fn: (world) => {
      q.run(world, q.id("cached") ?? q([TestComponent0]), (_, c0) => undefined);
    },
  });

  const query = q.id("cached");
  t.is(query, undefined);
});
