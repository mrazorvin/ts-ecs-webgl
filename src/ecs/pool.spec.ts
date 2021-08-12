import { ComponentFactory, HASH_HEAD, InitComponent } from "./Component";
import { TestComponent1, TestComponent2, TestComponent7, TestComponent9 } from "./world_spec/world_component_fixtures";

import { default as test } from "ava";
import { Entity, World } from "./World";
import { EntityPool, Pool, WorldPool } from "./Pool";
import { validate_component, validate_deleted_entity } from "./world_spec/world_spec_utils";
import { SubWorld } from "./SubWorld";

test("[EntityPool.pop()]", (t) => {
  const pool = new EntityPool([TestComponent2, TestComponent1]!);
  const entity = pool.pop();

  t.deepEqual(pool.components, [TestComponent2, TestComponent1]!);
  t.is(pool.hash, HASH_HEAD.add(TestComponent1).add(TestComponent2));
  t.is(entity, undefined);
});

test("[EntityPool.push()]", (t) => {
  const pool = new EntityPool([TestComponent1, TestComponent2]);
  const entity = new Entity(undefined);

  pool.push(entity);

  t.is(pool.entities.length, 1);
  t.is(pool.entities[0]!, entity);

  // push method, ignore existed ref, this is our responsibility to clear ref before
  // pushing to pool
  t.is(entity.ref.entity, entity);
});

test("[EntityPool.create()]", (t) => {
  const world = new World();
  const pool = new EntityPool([TestComponent1, TestComponent9]);
  const component1 = TestComponent1.create(world);
  const component9 = TestComponent9.create(world);

  // lazy initialization, pool will be lazy initialized after first pop()
  // so we need to ask pool for entity at least once
  pool.pop();

  const entity = pool.create?.(component1, component9);

  t.deepEqual(pool.components, [TestComponent1, TestComponent9]);
  t.is(entity?.hash, pool.hash);
  t.is(entity?.components["_0"]!["_1"]!, component1);
  t.is(entity?.components["_1"]!["_0"]!, component9);
  t.is(entity?.register["_0"]?.["_1"], undefined);
  t.is(entity?.register["_1"]?.["_0"], undefined);
  t.is(entity, entity?.ref?.entity);
  t.is(entity?.pool, pool as EntityPool<any>);
});

test("[EntityPool.instantiate()]", (t) => {
  const pool = new EntityPool([TestComponent9, TestComponent1]!);
  const world = new World();
  const component1 = TestComponent1.create(world);
  const component9 = TestComponent9.create(world);

  // lazy initialization
  pool.pop();

  const entity = pool.instantiate?.(world, (world, create) => create(component9, component1));

  t.is(entity?.hash, pool.hash);
  t.is(entity?.components["_0"]!["_1"]!, component1);
  t.is(entity?.components["_1"]!["_0"]!, component9);
  t.is(entity?.register["_0"]?.["_1"], 0);
  t.is(entity?.register["_1"]?.["_0"], 0);
  t.is(entity, entity?.ref?.entity);
  t.is(entity?.pool, pool as EntityPool<any>);

  validate_component(t, world, entity!, component1, {
    Constructor: TestComponent1,
    id: 0,
    size: 1,
    columns: 1,
    rows: 2,
  });

  validate_component(t, world, entity!, component9, {
    Constructor: TestComponent9,
    id: 0,
    size: 1,
    columns: 1,
    rows: 2,
  });
});

test("[EntityPool.reuse()]", (t) => {
  const pool = new EntityPool([TestComponent1, TestComponent9]);
  const world = new World();
  const component1 = TestComponent1.create(world);
  const component7 = TestComponent7.create(world);
  const component9 = TestComponent9.create(world);
  const empty_entity = world.entity([component1, component7, component9]);

  const prev_ref = empty_entity.ref;
  const prev_hash = empty_entity.hash;
  const prev_components = empty_entity.components;
  const prev_registers = empty_entity.register;

  empty_entity.pool = pool as EntityPool<any>;

  world.delete_entity(empty_entity);
  validate_deleted_entity(t, world, empty_entity, pool.components);
  t.is(prev_hash, empty_entity?.hash);
  t.is(prev_ref, empty_entity?.ref);
  t.is(prev_ref.entity, undefined);
  t.is(TestComponent1.get(empty_entity), component1);
  t.is(TestComponent7.get(empty_entity), null);
  t.is(TestComponent9.get(empty_entity), component9);

  // lazy initialization
  pool.pop();

  const entity = pool.reuse?.(world, empty_entity, (world, create, c1, c9) => create(c1!, c9!));

  // pool reuse entities instances
  t.is(entity, empty_entity);
  t.not(entity?.ref, prev_ref);
  t.is(entity?.ref.entity, entity);
  t.is(entity?.hash, prev_hash);
  t.is(entity?.components, prev_components);
  t.is(entity?.register, prev_registers);

  t.is(entity?.components["_0"]!["_1"]!, component1);
  t.is(entity?.components["_1"]!["_0"]!, component9);
  t.is(entity?.register["_0"]?.["_1"], 0);
  t.is(entity?.register["_1"]?.["_0"], 0);

  validate_component(t, world, entity!, component1, {
    Constructor: TestComponent1,
    id: 0,
    size: 1,
    // there must be, since we reuse container which used for component 7
    columns: 2,
    rows: 2,
  });

  validate_component(t, world, entity!, component9, {
    Constructor: TestComponent9,
    id: 0,
    size: 1,
    columns: 1,
    rows: 2,
  });
});

test("[Pool.get()]", (t) => {
  const entity_pool = new EntityPool([TestComponent1, TestComponent9]);
  const world = new World();
  let created = false;
  let updated = false;
  const pool = new Pool(
    entity_pool,
    (world, create) => {
      created = true;
      updated = false;
      return create(TestComponent1.create(world), TestComponent9.create(world));
    },
    (world, create, c1, c9) => {
      created = false;
      updated = true;
      return create(c1 || TestComponent1.create(world), c9 || TestComponent9.create(world));
    }
  );

  t.is(entity_pool.entities.length, 0);

  const entity = pool.get(world);

  t.is(world.components.get(TestComponent1.id)?.refs[0]!, entity);
  t.is(world.components.get(TestComponent1.id)?.refs.length, 1);
  t.is(world.components.get(TestComponent1.id)?.size, 1);

  t.is(world.components.get(TestComponent9.id)?.refs[0]!, entity);
  t.is(world.components.get(TestComponent9.id)?.refs.length, 1);
  t.is(world.components.get(TestComponent9.id)?.size, 1);

  t.is(created, true);
  t.is(updated, false);

  t.is(entity_pool.entities.length, 0);

  world.delete_entity(entity);

  t.is(entity_pool.entities.length, 1);
  t.is(entity_pool.entities[0]!, entity);

  const new_entity = pool.get(world);

  t.is(entity_pool.entities.length, 0);
  t.is(new_entity, entity);

  t.is(world.components.get(TestComponent1.id)?.refs[0]!, new_entity);
  t.is(world.components.get(TestComponent1.id)?.refs[1]!, undefined);
  t.is(world.components.get(TestComponent1.id)?.refs.length, 1);
  t.is(world.components.get(TestComponent1.id)?.size, 1);

  t.is(world.components.get(TestComponent9.id)?.refs[0]!, new_entity);
  t.is(world.components.get(TestComponent9.id)?.refs[1]!, undefined);
  t.is(world.components.get(TestComponent9.id)?.refs.length, 1);
  t.is(world.components.get(TestComponent9.id)?.size, 1);
});

test("[World -> Pool.instance() + delete_entity()] non-conflict & synergy with generic components pool", (t) => {
  class ExpensiveComponent extends InitComponent({ use_pool: 20 }) {
    position: Float32Array;
    static create = ComponentFactory(ExpensiveComponent, (prev_component, x, y) => {
      if (prev_component !== undefined) {
        prev_component.position[0] = x;
        prev_component.position[1] = y;

        return prev_component;
      }
      return new ExpensiveComponent(x, y);
    });

    constructor(x: number, y: number) {
      super();
      this.position = new Float32Array([x, y]);
    }
  }

  const entity_pool = new EntityPool([TestComponent1, ExpensiveComponent]);
  const world = new World();
  const pool = new Pool(
    entity_pool,
    (world, create) => {
      return create(TestComponent1.create(world), ExpensiveComponent.create(world, 1, 2));
    },
    (world, create) => {
      return create(TestComponent1.create(world), ExpensiveComponent.create(world, 3, 4));
    }
  );

  // simple components pooling
  const entity = pool.get(world);
  const existed_component = ExpensiveComponent.get(entity);
  const new_component = ExpensiveComponent.create(world, 1, 2);
  const collection = world.components.get(ExpensiveComponent.id)!;
  const components_pool = collection.pool;
  t.is(components_pool.length, 0);
  t.is(collection.size, 1);

  // re-attaching component, must return existed component to the pool
  ExpensiveComponent.manager(world).attach(entity, new_component);
  t.is(components_pool.length, 1);
  t.is(collection.size, 1);
  t.not(existed_component, new_component);
  t.is(ExpensiveComponent.get(entity), new_component);

  // pooled-entity from the pool also used component from the components-pool
  // because attaching component to the entity from previous step return component to the pool
  const entity2 = pool.get(world);
  t.is(components_pool.length, 0);
  t.is(collection.size, 2);
  t.is(ExpensiveComponent.get(entity2), existed_component);

  // fully deleting entity from the world, returns it and it's component only to the entity pool
  // but components_poll stay clear, so no components returned to the pool
  world.delete_entity(entity);
  t.is(components_pool.length, 0);
  // check that component still attached to the entity
  t.is(ExpensiveComponent.get(entity), new_component);
  t.is(entity_pool.entities.length, 1);

  // we re-used entity from the pool, but not component because component not in components-pool
  // component will be cleared by GC
  const entity3 = pool.get(world);
  t.not(ExpensiveComponent.get(entity3), new_component);
  t.is(entity_pool.entities.length, 0);

  // we deleted single component, so it has only single option to return to components-pool
  ExpensiveComponent.manager(world).clear(entity2);
  t.is(components_pool.length, 1);
  const entity4 = pool.get(world);
  t.is(components_pool.length, 0);
  t.is(ExpensiveComponent.get(entity4), existed_component);
  t.not(ExpensiveComponent.get(entity3), existed_component);
});

test("[World -> WorldPool]", (t) => {
  const components_pool = new EntityPool([TestComponent1, TestComponent2], SubWorld);
  const world_pool = new WorldPool({
    pool: components_pool,
    init_world: (world) => world,
    world_reuse: (prev_world, new_world) => new_world,
    instantiate: (world, create) => create(TestComponent1.create(world), TestComponent2.create(world)),
    reuse: (world, create, c1, c2) => create(c1 ?? TestComponent1.create(world), c2 || TestComponent2.create(world)),
  });

  t.is(world_pool.pool, components_pool);
});
