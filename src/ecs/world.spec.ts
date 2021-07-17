import { default as test } from "ava";
import {
  Component,
  Resource,
  Scheduler,
  SubWorld,
  System,
  World,
  sys,
} from "./World";

class TestComponent1 extends Component {}

test("[World.resource()] cache", (t) => {
  const world = new World();

  world.resource(new TestResource());
  t.is(world.resources._0._0.constructor, TestResource);
  class R1 extends Resource {}
  class R2 extends Resource {}
  class R3 extends Resource {}
  class R4 extends Resource {}
  class R5 extends Resource {}
  class R6 extends Resource {}
  class R7 extends Resource {}
  class R8 extends Resource {}
  class R9 extends Resource {}
  class R10 extends Resource {}
  class R11 extends Resource {}

  world.resource(new R1());
  t.is(world.resources._0._1.constructor, R1);

  world.resource(new R2());
  t.is(world.resources._0._2.constructor, R2);

  world.resource(new R3());
  t.is(world.resources._0._3.constructor, R3);

  world.resource(new R4());
  t.is(world.resources._0._4.constructor, R4);

  world.resource(new R5());
  t.is(world.resources._0._5.constructor, R5);

  world.resource(new R6());
  t.is(world.resources._0._6.constructor, R6);

  world.resource(new R7());
  t.is(world.resources._0._7.constructor, R7);

  world.resource(new R8());
  t.is(world.resources._0._8.constructor, R8);

  world.resource(new R9());
  t.is(world.resources._0._9.constructor, R9);

  world.resource(new R10());
  t.is(world.resources._0._10.constructor, R10);

  world.resource(new R11());
  t.is(world.resources._1._0.constructor, R11);
});

test("[World.entity()]", (t) => {
  const world = new World();
  const component = new TestComponent1();
  const expected_entity = world.entity([component]);

  t.assert(
    world.components
      .get(TestComponent1)!
      .refs.find(({ entity }) => entity === expected_entity)
  );
  t.is(TestComponent1.get(expected_entity), component);
});

class TestComponent2 extends Component {}
class TestComponent3 extends Component {}

test("[World.query()]", (t) => {
  t.plan(10);
  const world = new World();
  const component1 = new TestComponent1();
  const component3 = new TestComponent3();
  const entity = world.entity([component1, component3]);

  world.query([TestComponent1], (e, component) => {
    t.is(entity, e);
    t.is(component, component1);
  });

  world.query([TestComponent3], (e, component) => {
    t.is(entity, e);
    t.is(component, component3);
  });

  world.query(
    [TestComponent1, TestComponent3],
    (e, _component1, _component3) => {
      t.is(entity, e);
      t.is(_component1, component1);
      t.is(_component3, component3);
    }
  );

  world.query(
    [TestComponent3, TestComponent1],
    (e, _component3, _component1) => {
      t.is(entity, e);
      t.is(_component1, component1);
      t.is(_component3, component3);
    }
  );

  world.query([TestComponent2], () => t.fail());
  world.query([TestComponent1, TestComponent2], () => t.fail());
  world.query([TestComponent1, TestComponent2, TestComponent3], () => t.fail());
});

test("[World.query()] multiple entities", (t) => {
  t.plan(8);
  const world = new World();

  world.query([TestComponent1], () => t.fail());

  world.entity([new TestComponent1(), new TestComponent3()]);
  world.entity([new TestComponent1(), new TestComponent3()]);

  world.query([TestComponent3], (_, component) => {
    t.true(component instanceof TestComponent3);
  });

  world.query([TestComponent1], (_, component) => {
    t.true(component instanceof TestComponent1);
  });

  world.query([TestComponent1, TestComponent3], (_, component1, component2) => {
    t.true(component1 instanceof TestComponent1);
    t.true(component2 instanceof TestComponent3);
  });
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
