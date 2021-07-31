import { default as test } from "ava";
import { World, Resource, Scheduler, SubWorld, System, sys } from "../World";
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

class TestSystem extends System {
  dependencies = [];
  exec(world: SubWorld) {
    this.fn();
  }
  constructor(public fn: () => void) {
    super();
  }
}

test("[World.system()]", async (t) => {
  let iterations = 0;
  const world = new World();
  const system = new TestSystem(() =>
    iterations++ < 10 ? t.true(true) : null
  );
  const scheduler = new Scheduler(world);

  await new Promise((resolve) => {
    t.plan(10);
    world.system(system);

    scheduler.start();
    setTimeout(resolve, 100);
  });
});

test("[World.system_once()]", async (t) => {
  const world = new World();
  const system = new TestSystem(() => t.true(true));
  const scheduler = new Scheduler(world);

  await new Promise((resolve) => {
    t.plan(1);
    world.system_once(system);

    scheduler.start();
    setTimeout(resolve, 100);
  });
});

class TestResource extends Resource {
  constructor() {
    super();
  }
}

test("[World.resource()]", (t) => {
  const world = new World();
  const resource = new TestResource();
  world.resource(resource);
  t.is(resource, TestResource.get(world));

  world.resource(new TestResource());
  t.not(resource, TestResource.get(world));
});

test("[World -> System.dependencies] don't exec system until all dependencies will be ready", async (t) => {
  const system = sys([TestResource], () => t.fail());
  const world = new World();
  const scheduler = new Scheduler(world);

  await new Promise((resolve) => {
    t.plan(0);

    world.system_once(system);
    world.system(system);

    scheduler.start();
    setTimeout(resolve, 100);
  });
});

test("[World -> System.dependencies] exec systems when all dependencies are ready", async (t) => {
  const world = new World();
  const scheduler = new Scheduler(world);
  const resource = new TestResource();

  await new Promise((resolve) => {
    t.plan(1);
    t.timeout(100);

    world.system_once(sys([TestResource], () => t.pass()));
    world.system(sys([TestResource], () => setTimeout(resolve)));
    world.resource(resource);

    scheduler.start();
  });
});

test("[World -> SubWorld.system_once]", async (t) => {
  t.timeout(100);
  t.plan(1);

  const world = new World();
  const scheduler = new Scheduler(world);

  await new Promise((resolve) => {
    world.system_once(
      sys([], (s_world) =>
        s_world.system_once(
          sys([], () => {
            t.pass();
          })
        )
      )
    );

    scheduler.start();
    setTimeout(resolve, 100);
  });
});

test("[World -> SubWorld.system]", async (t) => {
  t.plan(10);

  const world = new World();
  const scheduler = new Scheduler(world);

  let i = 1;

  await new Promise((resolve) => {
    world.system_once(
      sys([], (s_world) =>
        s_world.system(
          sys([], () => {
            t.pass();
            if (++i > 10) {
              resolve(null);
            }
          })
        )
      )
    );

    scheduler.start();
  });
});

test("[World -> SubWorld.finish] finishing parent SubWorld stop system propagation", async (t) => {
  t.timeout(100);
  t.plan(0);

  const world = new World();
  const scheduler = new Scheduler(world);

  await new Promise((resolve) => {
    world.system_once(
      sys([], (s_parent_world) =>
        s_parent_world.system(
          sys([], (s_world) => {
            s_parent_world.finish();
            s_world.system_once(sys([], () => t.fail()));
          })
        )
      )
    );

    setTimeout(resolve, 50);
    scheduler.start();
  });
});
