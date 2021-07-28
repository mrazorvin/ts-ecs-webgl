import { default as test } from "ava";
import { Entity, World } from "./World";
import { Component } from "./Component";
import { EntityPool, Pool } from "./Pool";

class Component0 extends Component.Init() {
  log1() {}
}

class Component1 extends Component.Init() {
  log1() {}
}

class Component2 extends Component.Init() {
  log2() {}
}

class Component3 extends Component.Init() {
  log3() {}
}

class Component4 extends Component.Init() {
  log4() {}
}

class Component5 extends Component.Init() {
  log5() {}
}

class Component6 extends Component.Init() {
  log6() {}
}

class Component7 extends Component.Init() {
  log7() {}
}

class Component8 extends Component.Init() {
  log8() {}
}

class Component9 extends Component.Init() {
  log9() {}
}

Component0.init();
Component1.init();
Component2.init();
Component3.init();
Component4.init();
Component5.init();
Component6.init();
Component7.init();
Component8.init();
Component9.init();

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
  t.is(
    entity?.components["_0"]!.constructor,
    Component1.container_class as any
  );
  t.is(
    entity?.components["_1"]!.constructor,
    Component9.container_class as any
  );
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
  t.is(
    entity?.components["_0"]!.constructor,
    Component1.container_class as any
  );
  t.is(
    entity?.components["_1"]!.constructor,
    Component9.container_class as any
  );
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

  t.is(world.components[Component1.id]?.refs[0]!.entity, entity);
  t.is(world.components[Component1.id]?.refs.length, 1);
  t.is(world.components[Component1.id]?.size, 1);

  t.is(world.components[Component9.id]?.refs[0]!.entity, entity);
  t.is(world.components[Component9.id]?.refs.length, 1);
  t.is(world.components[Component9.id]?.size, 1);
});

test("[EntityPool.reuse()]", (t) => {
  const pool = new EntityPool([Component1, Component9]);
  const world = new World();
  const component1 = new Component1();
  const component9 = new Component9();
  const empty_entity = new Entity();

  // lazy initialization
  pool.pop();

  const entity = pool.reuse?.(world, empty_entity, (create, c1, c9) =>
    create(c1 ?? component1, c9 ?? component9)
  );

  // pool don't reuse entities instances
  t.not(entity, empty_entity);
  t.not(entity?.ref, empty_entity.ref);
  t.not(entity?.ref.entity, empty_entity);

  t.is(world.components[Component1.id]?.refs[0]!.entity, entity);
  t.is(world.components[Component1.id]?.refs.length, 1);
  t.is(world.components[Component1.id]?.size, 1);

  t.is(world.components[Component9.id]?.refs[0]!.entity, entity);
  t.is(world.components[Component9.id]?.refs.length, 1);
  t.is(world.components[Component9.id]?.size, 1);

  const entity2 = pool.reuse?.(world, entity!, (create, c1, c9) =>
    create(c1 ?? component1, c9 ?? component9)
  );

  t.not(entity, entity2);
  t.not(world.components[Component1.id]?.refs[0]!.entity, entity2);
  t.is(world.components[Component1.id]?.refs[0]!.entity, entity);
  t.is(world.components[Component1.id]?.refs[1]!.entity, entity2);
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

  t.is(world.components[Component1.id]?.refs[0]!!.entity, entity);
  t.is(world.components[Component1.id]?.refs.length, 1);
  t.is(world.components[Component1.id]?.size, 1);

  t.is(world.components[Component9.id]?.refs[0]!!.entity, entity);
  t.is(world.components[Component9.id]?.refs.length, 1);
  t.is(world.components[Component9.id]?.size, 1);

  t.is(created, true);
  t.is(updated, false);

  t.is(entity_pool.entities.length, 0);

  console.log("BREAK", world.components[Component1.id]);

  world.delete_entity(entity);

  t.is(entity_pool.entities.length, 1);
  t.is(entity_pool.entities[0]!, entity);

  console.log("BREAK", world.components[Component1.id]);

  const new_entity = pool.get(world);

  t.is(entity_pool.entities.length, 0);
  t.not(new_entity, entity);
  t.is(new_entity.components["_0"]!["_1"]!, entity.components["_0"]!["_1"]!);
  t.is(new_entity.components["_1"]!["_0"]!, entity.components["_1"]!["_0"]!);

  t.is(world.components[Component1.id]?.refs[0]!.entity, undefined);
  t.is(world.components[Component1.id]?.refs[1]!.entity, new_entity);
  t.is(world.components[Component1.id]?.refs.length, 2);
  t.is(world.components[Component1.id]?.size, 1);

  t.is(world.components[Component9.id]?.refs[0]!.entity, undefined);
  t.is(world.components[Component9.id]?.refs[1]!.entity, new_entity);
  t.is(world.components[Component9.id]?.refs.length, 2);
  t.is(world.components[Component9.id]?.size, 1);
});
