import { default as test } from "ava";
import { Entity, World } from "./World";
import { InitComponent } from "./Component";
import { EntityPool, Pool } from "./Pool";
import { DeleteEntity } from "./DeleteEntity";

class Component0 extends InitComponent() {
  log1() {}
}

class Component1 extends InitComponent() {
  log1() {}
}

class Component2 extends InitComponent() {
  log2() {}
}

class Component3 extends InitComponent() {
  log3() {}
}

class Component4 extends InitComponent() {
  log4() {}
}

class Component5 extends InitComponent() {
  log5() {}
}

class Component6 extends InitComponent() {
  log6() {}
}

class Component7 extends InitComponent() {
  log7() {}
}

class Component8 extends InitComponent() {
  log8() {}
}

class Component9 extends InitComponent() {
  log9() {}
}

test("[EntityPool.pop()]", (t) => {
  const pool = new EntityPool([Component2, Component1]!);
  const entity = pool.pop();

  t.deepEqual(pool.components, [Component2, Component1]!);
  t.is(entity, undefined);
});

test("[EntityPool.push()]", (t) => {
  const pool = new EntityPool([Component1, Component2]);
  const entity = new Entity();

  pool.push(entity);

  t.is(pool.entities.length, 1);
  t.is(pool.entities[0]!, entity);
  t.is(entity.ref.entity, entity);
});

test("[EntityPool.create()]", (t) => {
  const pool = new EntityPool([Component1, Component9]);
  const component1 = new Component1();
  const component9 = new Component9();

  // lazy initialization
  pool.pop();

  const entity = pool.create?.(component1, component9);

  t.deepEqual(pool.components, [Component1, Component9]);
  t.is(entity?.components["_0"]!["_1"]!, component1);
  t.is(entity?.components["_1"]!["_0"]!, component9);
});

test("[EntityPool.create() inverse]", (t) => {
  const pool = new EntityPool([Component9, Component1]!);
  const component1 = new Component1();
  const component9 = new Component9();

  // lazy initialization
  pool.pop();

  const entity = pool.create?.(component9, component1);

  t.deepEqual(pool.components, [Component9, Component1]!);
  t.is(entity?.components["_0"]!["_1"]!, component1);
  t.is(entity?.components["_1"]!["_0"]!, component9);
});

test("[EntityPool.instantiate()]", (t) => {
  const pool = new EntityPool([Component9, Component1]!);
  const world = new World();
  const component1 = new Component1();
  const component9 = new Component9();

  // lazy initialization
  pool.pop();

  const entity = pool.instantiate?.(world, (create) =>
    create(component9, component1)
  );

  t.is(world.components[Component1.id]?.refs[0]!, entity);
  t.is(world.components[Component1.id]?.refs.length, 1);
  t.is(world.components[Component1.id]?.size, 1);

  t.is(world.components[Component9.id]?.refs[0]!, entity);
  t.is(world.components[Component9.id]?.refs.length, 1);
  t.is(world.components[Component9.id]?.size, 1);
});

test("[EntityPool.reuse()]", (t) => {
  const pool = new EntityPool([Component1, Component9]);
  const world = new World();
  const component1 = new Component1();
  const component9 = new Component9();
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

  t.is(world.components[Component1.id]?.refs[0]!, entity);
  t.is(world.components[Component1.id]?.refs.length, 1);
  t.is(world.components[Component1.id]?.size, 1);

  t.is(world.components[Component9.id]?.refs[0]!, entity);
  t.is(world.components[Component9.id]?.refs.length, 1);
  t.is(world.components[Component9.id]?.size, 1);

  const entity2 = pool.reuse?.(world, entity!, (create, c1, c9) =>
    create(c1 ?? component1, c9 ?? component9)
  );

  t.is(entity, entity2);
  t.is(world.components[Component1.id]?.refs[0]!, entity);
  t.is(world.components[Component1.id]?.refs[1]!, entity2);
  t.is(world.components[Component1.id]?.size, 2);
  t.is(world.components[Component1.id]?.refs.length, 2);

  t.is(Component1.get(entity!), Component1.get(entity2!));
  t.is(Component9.get(entity!), Component9.get(entity2!));
});

test("[Pool.get()]", (t) => {
  const entity_pool = new EntityPool([Component1, Component9]);
  const world = new World();
  let created = false;
  let updated = false;
  const reuse_component1 = new Component1();
  const reuse_component9 = new Component9();
  const pool = new Pool(
    entity_pool,
    (create) => {
      created = true;
      updated = false;
      return create(new Component1(), new Component9());
    },
    (create, c1, c9) => {
      created = false;
      updated = true;
      return create(c1 || new Component1(), c9 || new Component9());
    }
  );

  t.is(entity_pool.entities.length, 0);

  const entity = pool.get(world);

  t.is(world.components[Component1.id]?.refs[0]!, entity);
  t.is(world.components[Component1.id]?.refs.length, 1);
  t.is(world.components[Component1.id]?.size, 1);

  t.is(world.components[Component9.id]?.refs[0]!, entity);
  t.is(world.components[Component9.id]?.refs.length, 1);
  t.is(world.components[Component9.id]?.size, 1);

  t.is(created, true);
  t.is(updated, false);

  t.is(entity_pool.entities.length, 0);

  // console.log("Before Delete 1", world.components[Component1.id]);
  // console.log("Before Delete 9", world.components[Component9.id]);

  // console.log(entity);
  // console.log(
  //   DeleteEntity.generate_function(entity.hash, entity?.pool?.hash).toString()
  // );

  world.delete_entity(entity);

  // console.log("After Delete 1", world.components[Component1.id]);
  // console.log("After Delete 9", world.components[Component9.id]);

  t.is(entity_pool.entities.length, 1);
  t.is(entity_pool.entities[0]!, entity);

  const new_entity = pool.get(world);

  t.is(entity_pool.entities.length, 0);
  t.is(new_entity, entity);
  t.is(new_entity.components["_0"]!["_1"]!, entity.components["_0"]!["_1"]!);
  t.is(new_entity.components["_1"]!["_0"]!, entity.components["_1"]!["_0"]!);

  // console.log(world.components[Component1.id]);

  t.is(world.components[Component1.id]?.refs[0]!, new_entity);
  t.is(world.components[Component1.id]?.refs[1]!, undefined);
  t.is(world.components[Component1.id]?.refs.length, 1);
  t.is(world.components[Component1.id]?.size, 1);

  t.is(world.components[Component9.id]?.refs[0]!, new_entity);
  t.is(world.components[Component9.id]?.refs[1]!, undefined);
  t.is(world.components[Component9.id]?.refs.length, 1);
  t.is(world.components[Component9.id]?.size, 1);
});

// Add spec with register check
// Add spec when create/reuse function don't set component on entity
// Add spec with prev entity
