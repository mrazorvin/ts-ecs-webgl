import { default as test } from "ava";
import { Entity, World } from "./World";
import { EntityPool, Pool } from "./Pool";
import {
  TestComponent1,
  TestComponent2,
  TestComponent9,
} from "./world_spec/world_spec_fixtures";

test("[EntityPool.pop()]", (t) => {
  const pool = new EntityPool([TestComponent2, TestComponent1]!);
  const entity = pool.pop();

  t.deepEqual(pool.components, [TestComponent2, TestComponent1]!);
  t.is(entity, undefined);
});

test("[EntityPool.push()]", (t) => {
  const pool = new EntityPool([TestComponent1, TestComponent2]);
  const entity = new Entity();

  pool.push(entity);

  t.is(pool.entities.length, 1);
  t.is(pool.entities[0]!, entity);
  t.is(entity.ref.entity, entity);
});

test("[EntityPool.create()]", (t) => {
  const pool = new EntityPool([TestComponent1, TestComponent9]);
  const component1 = new TestComponent1();
  const component9 = new TestComponent9(TestComponent9);

  // lazy initialization
  pool.pop();

  const entity = pool.create?.(component1, component9);

  t.deepEqual(pool.components, [TestComponent1, TestComponent9]);
  t.is(entity?.components["_0"]!["_1"]!, component1);
  t.is(entity?.components["_1"]!["_0"]!, component9);
});

test("[EntityPool.create() inverse]", (t) => {
  const pool = new EntityPool([TestComponent9, TestComponent1]!);
  const component1 = new TestComponent1();
  const component9 = new TestComponent9();

  // lazy initialization
  pool.pop();

  const entity = pool.create?.(component9, component1);

  t.deepEqual(pool.components, [TestComponent9, TestComponent1]!);
  t.is(entity?.components["_0"]!["_1"]!, component1);
  t.is(entity?.components["_1"]!["_0"]!, component9);
});

test("[EntityPool.instantiate()]", (t) => {
  const pool = new EntityPool([TestComponent9, TestComponent1]!);
  const world = new World();
  const component1 = new TestComponent1();
  const component9 = new TestComponent9();

  // lazy initialization
  pool.pop();

  const entity = pool.instantiate?.(world, (create) =>
    create(component9, component1)
  );

  t.is(world.components[TestComponent1.id]?.refs[0]!, entity);
  t.is(world.components[TestComponent1.id]?.refs.length, 1);
  t.is(world.components[TestComponent1.id]?.size, 1);

  t.is(world.components[TestComponent9.id]?.refs[0]!, entity);
  t.is(world.components[TestComponent9.id]?.refs.length, 1);
  t.is(world.components[TestComponent9.id]?.size, 1);
});

test("[EntityPool.reuse()]", (t) => {
  const pool = new EntityPool([TestComponent1, TestComponent9]);
  const world = new World();
  const component1 = new TestComponent1();
  const component9 = new TestComponent9();
  const empty_entity = world.entity([component1, component9]);

  const prev_ref = empty_entity.ref;

  world.delete_entity(empty_entity);

  // lazy initialization
  pool.pop();

  const entity = pool.reuse?.(world, empty_entity, (create, c1, c9) =>
    create(c1 ?? component1, c9 ?? component9)
  );

  // pool reuse entities instances
  t.is(entity, empty_entity);
  t.not(prev_ref, empty_entity.ref);

  t.is(world.components[TestComponent1.id]?.refs[0]!, entity);
  t.is(world.components[TestComponent1.id]?.refs.length, 1);
  t.is(world.components[TestComponent1.id]?.size, 1);

  t.is(world.components[TestComponent9.id]?.refs[0]!, entity);
  t.is(world.components[TestComponent9.id]?.refs.length, 1);
  t.is(world.components[TestComponent9.id]?.size, 1);

  const entity2 = pool.reuse?.(world, entity!, (create, c1, c9) =>
    create(c1 ?? component1, c9 ?? component9)
  );

  t.is(entity, entity2);
  t.is(world.components[TestComponent1.id]?.refs[0]!, entity);
  t.is(world.components[TestComponent1.id]?.refs[1]!, entity2);
  t.is(world.components[TestComponent1.id]?.size, 2);
  t.is(world.components[TestComponent1.id]?.refs.length, 2);

  t.is(TestComponent1.get(entity!), TestComponent1.get(entity2!));
  t.is(TestComponent9.get(entity!), TestComponent9.get(entity2!));
});

test("[Pool.get()]", (t) => {
  const entity_pool = new EntityPool([TestComponent1, TestComponent9]);
  const world = new World();
  let created = false;
  let updated = false;
  const pool = new Pool(
    entity_pool,
    (create) => {
      created = true;
      updated = false;
      return create(new TestComponent1(), new TestComponent9());
    },
    (create, c1, c9) => {
      created = false;
      updated = true;
      return create(c1 || new TestComponent1(), c9 || new TestComponent9());
    }
  );

  t.is(entity_pool.entities.length, 0);

  const entity = pool.get(world);

  t.is(world.components[TestComponent1.id]?.refs[0]!, entity);
  t.is(world.components[TestComponent1.id]?.refs.length, 1);
  t.is(world.components[TestComponent1.id]?.size, 1);

  t.is(world.components[TestComponent9.id]?.refs[0]!, entity);
  t.is(world.components[TestComponent9.id]?.refs.length, 1);
  t.is(world.components[TestComponent9.id]?.size, 1);

  t.is(created, true);
  t.is(updated, false);

  t.is(entity_pool.entities.length, 0);

  // console.log("Before Delete 1", world.components[TestComponent1.id]);
  // console.log("Before Delete 9", world.components[TestComponent9.id]);

  // console.log(entity);
  // console.log(
  //   DeleteEntity.generate_function(entity.hash, entity?.pool?.hash).toString()
  // );

  world.delete_entity(entity);

  // console.log("After Delete 1", world.components[TestComponent1.id]);
  // console.log("After Delete 9", world.components[TestComponent9.id]);

  t.is(entity_pool.entities.length, 1);
  t.is(entity_pool.entities[0]!, entity);

  const new_entity = pool.get(world);

  t.is(entity_pool.entities.length, 0);
  t.is(new_entity, entity);
  t.is(new_entity.components["_0"]!["_1"]!, entity.components["_0"]!["_1"]!);
  t.is(new_entity.components["_1"]!["_0"]!, entity.components["_1"]!["_0"]!);

  // console.log(world.components[TestComponent1.id]);

  t.is(world.components[TestComponent1.id]?.refs[0]!, new_entity);
  t.is(world.components[TestComponent1.id]?.refs[1]!, undefined);
  t.is(world.components[TestComponent1.id]?.refs.length, 1);
  t.is(world.components[TestComponent1.id]?.size, 1);

  t.is(world.components[TestComponent9.id]?.refs[0]!, new_entity);
  t.is(world.components[TestComponent9.id]?.refs[1]!, undefined);
  t.is(world.components[TestComponent9.id]?.refs.length, 1);
  t.is(world.components[TestComponent9.id]?.size, 1);
});

// Add spec with register check
// Add spec when create/reuse function don't set component on entity
// Add spec with prev entity
