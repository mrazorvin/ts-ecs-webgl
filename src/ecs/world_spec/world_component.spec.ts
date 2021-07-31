import { default as test } from "ava";
import { World } from "../World";
import {
  TestComponent1,
  TestComponent2,
  TestComponent3,
} from "./world_spec_fixtures";

test("[World.entity()]", (t) => {
  const world = new World();
  const component = new TestComponent1();
  const expected_entity = world.entity([component]);

  t.assert(
    world.components[TestComponent1.id]!.refs.find(
      (entity) => entity === expected_entity
    )
  );
  t.is(TestComponent1.get(expected_entity), component);
});

test("[World.entity()]", (t) => {
  const world = new World();
  const component = new TestComponent1();
  const expected_entity = world.entity([component]);

  t.assert(
    world.components[TestComponent1.id]!.refs.find(
      (entity) => entity === expected_entity
    )
  );
  t.is(TestComponent1.get(expected_entity), component);
});

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
  t.plan(12);
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

  world.query([TestComponent3, TestComponent1], (_, component2, component1) => {
    t.true(component1 instanceof TestComponent1);
    t.true(component2 instanceof TestComponent3);
  });

  world.query([TestComponent1, TestComponent3], (_, component1, component2) => {
    t.true(component1 instanceof TestComponent1);
    t.true(component2 instanceof TestComponent3);
  });
});
