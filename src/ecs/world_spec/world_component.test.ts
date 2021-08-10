import { default as test } from "ava";
import { ComponentFactory, IComponent } from "../Component";
import { DeleteEntity } from "../DeleteEntity";
import { $, Entity, InitComponent, World } from "../World";
import { validate_component, validate_deleted_entity } from "./world_spec_utils";
import { TestComponent3, TestComponent1, TestComponent2, TestComponent0, TestComponent9 } from "./world_spec_fixtures";

// test that TestComponent1 has expected container class, register class, row_id, column id

test("[InitComponent()] Component 1", (t) => {
  const id = TestComponent0.id;
  const row_id = TestComponent0.storage_row_id;
  const column_id = TestComponent0.container_column_id;
  t.is(id, 0);
  t.is(row_id, 0);
  t.is(column_id, 0);
});

test("[InitComponent()] Component 9", (t) => {
  const id = TestComponent9.id;
  const row_id = TestComponent9.storage_row_id;
  const column_id = TestComponent9.container_column_id;
  t.is(id, 9);
  t.is(row_id, 1);
  t.is(column_id, 0);
});

// test that after attaching all affecting values such as collection.refs, collection.size
// entity.hash, entity.register, entity.components
test("[World.entity(), Component.attach(), Component.get()]", (t) => {
  const world = new World();
  const component1 = TestComponent1.create(world);

  const entity = world.entity([component1]);
  validate_component(t, world, entity, component1, {
    id: 0,
    Constructor: TestComponent1,
    size: 1,
    rows: 1,
    columns: 1,
  });

  component1.attach(world, entity);
  validate_component(t, world, entity, component1, {
    id: 0,
    Constructor: TestComponent1,
    size: 1,
    rows: 1,
    columns: 1,
  });

  const override_component = TestComponent1.create(world);
  override_component.attach(world, entity);
  validate_component(t, world, entity, override_component, {
    id: 0,
    Constructor: TestComponent1,
    size: 1,
    rows: 1,
    columns: 1,
  });

  const shared_component = component1;
  const entity_with_shared = world.entity([shared_component]);
  validate_component(t, world, entity_with_shared, shared_component, {
    id: 1,
    Constructor: TestComponent1,
    size: 2,
    rows: 1,
    columns: 1,
  });

  const component2 = TestComponent2.create(world);
  component2.attach(world, entity);
  validate_component(t, world, entity, override_component, {
    id: 0,
    Constructor: TestComponent1,
    size: 2,
    rows: 1,
    columns: 2,
  });
  validate_component(t, world, entity, component2, {
    id: 0,
    Constructor: TestComponent2,
    size: 1,
    rows: 1,
    columns: 2,
  });

  const component9 = TestComponent9.create(world);
  component9.attach(world, entity);
  validate_component(t, world, entity, component9, {
    id: 0,
    Constructor: TestComponent9,
    size: 1,
    rows: 2,
    columns: 1,
  });
});

// clearing entity from component won't delete it, but
// if entity has single component which was cleared, it won't return
// to pool, instead it will be cleared by garbage collector when all references ended
test("[World -> Component.clear(), Component.clear_collection()]", (t) => {
  const world = new World();

  TestComponent1.clear_collection(world);

  const entities: Entity[] = [];
  entities.push(world.entity([TestComponent1.create(world)]));
  entities.push(world.entity([TestComponent1.create(world)]));
  entities.push(world.entity([TestComponent1.create(world)]));
  entities.push(world.entity([TestComponent1.create(world)]));
  entities.push(world.entity([TestComponent1.create(world)]));
  entities.push(world.entity([TestComponent1.create(world)]));

  validate_component(t, world, entities[0]!, TestComponent1.get(entities[0]!)!, {
    id: 0,
    Constructor: TestComponent1,
    size: entities.length,
    rows: 1,
    columns: 1,
  });

  TestComponent1.clear_collection(world);

  const hashes = entities.map(({ hash }) => hash);
  entities.forEach((entity, i) => {
    const [component] = Object.values(Object.values(entity.components)[0]!);
    const [register] = Object.values(Object.values(entity.register)[0]!);

    t.is(component, null);
    t.is(register, null);
    t.is(entity.pool, undefined);
    t.is(entity.hash, hashes[i]);
  });
  t.is(world.components.get(TestComponent1.id)?.size, 0);
  t.is(world.components.get(TestComponent1.id)?.refs.length, entities.length);

  const entity1 = world.entity([TestComponent2.create(world)]);
  const entity2 = world.entity([TestComponent2.create(world)]);
  TestComponent1.manager(world).clear(entity1);
  validate_component(t, world, entity1, TestComponent2.get(entity1)!, {
    id: 0,
    Constructor: TestComponent2,
    size: 2,
    rows: 1,
    columns: 1,
  });

  const pre_position = entity1.register[`_${TestComponent2.storage_row_id}`]![`_${TestComponent2.container_column_id}`];

  TestComponent2.manager(world).clear(entity1);
  t.is(world.components.get(TestComponent2.id)?.size, 1);
  t.is(world.components.get(TestComponent2.id)?.refs.length, 2);
  t.is(entity1.register[`_${TestComponent2.storage_row_id}`]![`_${TestComponent2.container_column_id}`], null);
  t.is(TestComponent2.get(entity1), null);

  TestComponent2.manager(world).clear(entity1);
  t.is(world.components.get(TestComponent2.id)?.size, 1);
  t.is(world.components.get(TestComponent2.id)?.refs.length, 2);
  t.is(entity1.register[`_${TestComponent2.storage_row_id}`]![`_${TestComponent2.container_column_id}`], null);
  t.is(TestComponent2.get(entity1), null);

  t.is(world.components.get(TestComponent2.id)!.refs[0]!, entity2);
  t.is(entity2.register[`_${TestComponent2.storage_row_id}`]![`_${TestComponent2.container_column_id}`], pre_position);
});

test("[World.query()]", (t) => {
  t.plan(10);
  const world = new World();
  const component1 = TestComponent1.create(world);
  const component3 = TestComponent3.create(world);
  const entity = world.entity([component1, component3]);

  // prettier-ignore
  world.query($("q1", (c) => class {
    query = c([TestComponent1], (e, component) => {
      t.is(entity, e);
      t.is(component, component1);
    });
  }).prep());

  // prettier-ignore
  world.query($("q2", (c) => class {
    query = c([TestComponent3], (e, component) => {
      t.is(entity, e);
      t.is(component, component3);
    });
  }).prep());

  // prettier-ignore
  world.query($("q3", (c) => class {
    query = c([TestComponent1, TestComponent3], (e, _component1, _component3) => {
      t.is(entity, e);
      t.is(_component1, component1);
      t.is(_component3, component3);
    });
  }).prep());

  // prettier-ignore
  world.query($("q4", (c) => class {
    query = c([TestComponent3, TestComponent1], (e, _component3, _component1) => {
      t.is(entity, e);
      t.is(_component1, component1);
      t.is(_component3, component3);
    });
  }).prep());

  // prettier-ignore
  world.query($("q5", (c) => class {
    query = c([TestComponent2], () => t.fail());
  }).prep());

  // prettier-ignore
  world.query($("q6", (c) => class {
    query = c([TestComponent1, TestComponent2], () => t.fail());
  }).prep());

  // prettier-ignore
  world.query($("q7", (c) => class {
    query = c([TestComponent1, TestComponent2, TestComponent3], () => t.fail());
  }).prep());
});

test("[World.query()] multiple entities", (t) => {
  t.plan(12);
  const world = new World();

  world.entity([TestComponent1.create(world), TestComponent3.create(world)]);
  world.entity([TestComponent1.create(world), TestComponent3.create(world)]);

  // prettier-ignore
  world.query($("q7", (c) => class {
    query = c([TestComponent3], (e, component) => {
      t.true(component instanceof TestComponent3);
    });
  }).prep());

  // prettier-ignore
  world.query($("q8", (c) => class {
    query = c([TestComponent1], (e, component) => {
      t.true(component instanceof TestComponent1);
    });
  }).prep());

  // prettier-ignore
  world.query($("q9", (c) => class {
    query = c([TestComponent1, TestComponent3], (e, component1, component2) => {
      t.true(component1 instanceof TestComponent1);
      t.true(component2 instanceof TestComponent3);
    });
  }).prep());

  // prettier-ignore
  world.query($("q10", (c) => class {
    query = c([TestComponent3, TestComponent1], (e, component2, component1) => {
      t.true(component1 instanceof TestComponent1);
      t.true(component2 instanceof TestComponent3);
    });
  }).prep());
});

test("[World.delete_entity()]", (t) => {
  const world = new World();

  world.entity([TestComponent1.create(world)]);
  world.entity([TestComponent1.create(world)]);

  const comp2_e1 = TestComponent2.create(world);
  const comp2_e2 = TestComponent2.create(world);
  const entity1 = world.entity([comp2_e1]);
  const entity2 = world.entity([comp2_e2]);
  const comp1_e3 = TestComponent1.create(world);
  const comp9_e3 =  TestComponent9.create(world);
  const entity3 = world.entity([comp1_e3, comp9_e3]);

  validate_component(t, world, entity3, TestComponent9.get(entity3)!, {
    Constructor: TestComponent9,
    columns: 1,
    id: 0,
    rows: 2,
    size: 1,
  });

  validate_component(t, world, entity3, TestComponent1.get(entity3)!, {
    Constructor: TestComponent1,
    columns: 1,
    rows: 2,
    id: 2,
    size: 3,
  });

  const prev_hash = entity1.hash;
  const prev_ref = entity1.ref;
  const prev_registers = entity1.register[`_${TestComponent2.storage_row_id}`]![
    `_${TestComponent2.container_column_id}`
  ];

  world.delete_entity(entity1);
  validate_deleted_entity(t, world, entity1);
  t.is(entity1.hash, prev_hash);
  t.is(entity1.ref, prev_ref);
  t.is(entity1.ref.entity, undefined);
  t.true(world.components.get(TestComponent2.id)!.pool.includes(comp2_e1));

  t.is(world.components.get(TestComponent2.id)?.size, 1);
  t.is(world.components.get(TestComponent2.id)?.refs?.length, 2);
  t.is(world.components.get(TestComponent2.id)?.refs[0], entity2);
  t.is(world.components.get(TestComponent2.id)?.refs[1], entity2);
  t.is(
    entity2.register[`_${TestComponent2.storage_row_id}`]![`_${TestComponent2.container_column_id}`],
    prev_registers
  );

  world.delete_entity(entity2);
  t.is(world.components.get(TestComponent2.id)?.size, 0);
  t.is(world.components.get(TestComponent2.id)?.refs?.length, 2);
  validate_deleted_entity(t, world, entity2);
  t.true(world.components.get(TestComponent2.id)!.pool.includes(comp2_e2));
  t.is(world.components.get(TestComponent2.id)!.pool.length, 2);
  t.is(world.components.get(TestComponent2.id)?.refs[0], entity2);
  t.is(world.components.get(TestComponent2.id)?.refs[1], entity2);

  t.is(DeleteEntity.func_cache.size, 1);
  t.not(DeleteEntity.func_cache.get(entity2.hash)?.["_"], undefined);

  const new_entity4 = world.entity([TestComponent2.create(world)]);
  validate_component(t, world, new_entity4, TestComponent2.get(new_entity4)!, {
    Constructor: TestComponent2,
    columns: 1,
    rows: 1,
    id: 0,
    size: 1,
    length: 2,
  });

  world.delete_entity(entity3);
  validate_deleted_entity(t, world, entity3);
  t.true(world.components.get(TestComponent1.id)!.pool.includes(comp1_e3));
  t.true(world.components.get(TestComponent9.id)!.pool.includes(comp9_e3));

  t.is(world.components.get(TestComponent1.id)?.size, 2);
  t.is(world.components.get(TestComponent9.id)?.size, 0);

  t.is(DeleteEntity.func_cache.size, 2);
  t.not(DeleteEntity.func_cache.get(entity3.hash)?.["_"], undefined);

  const entity5 = world.entity([]);
  TestComponent9.create(world).attach(world, entity5);
  TestComponent1.create(world).attach(world, entity5);
  world.delete_entity(entity5);
  validate_deleted_entity(t, world, entity3);
  t.is(DeleteEntity.func_cache.get(entity3.hash)?.["_"], DeleteEntity.func_cache.get(entity5.hash)?.["_"]);
});

test(`[World.delete_entity()] dispose`, (t) => {
  const world = new World();
  let dispose_count = 0;
  let disposed_entity: Entity | undefined;
  let disposed_world: World | undefined;
  let disposed_component: IComponent | undefined;
  class DisposableComponent extends InitComponent() {
    static create = ComponentFactory(DisposableComponent, () => new DisposableComponent());
    static override dispose(world: World, entity: Entity, component: IComponent) {
      disposed_entity = entity;
      disposed_world = world;
      disposed_component = component;
      dispose_count += 1;
    }
  }

  const component = DisposableComponent.create(world);
  const entity = world.entity([component]);
  world.delete_entity(entity);
  t.is(dispose_count, 1);
  t.is(disposed_world, world);
  t.is(disposed_entity, entity);
  t.is(disposed_component, component);

  world.delete_entity(entity);
  t.is(dispose_count, 1);
});

test(`[World -> Component.clear()] dispose`, (t) => {
  const world = new World();
  let dispose_count = 0;
  let disposed_entity: Entity | undefined;
  let disposed_world: World | undefined;
  let disposed_component: IComponent | undefined;
  class DisposableComponent extends InitComponent() {
    static create = ComponentFactory(DisposableComponent, () => new DisposableComponent());
    static override dispose(world: World, entity: Entity, component: IComponent) {
      disposed_entity = entity;
      disposed_world = world;
      disposed_component = component;
      dispose_count += 1;
    }
  }

  const component = DisposableComponent.create(world);
  const entity = world.entity([component]);
  const manager = DisposableComponent.manager(world)
  manager.clear(entity);
  t.is(dispose_count, 1);
  t.is(disposed_world, world);
  t.is(disposed_entity, entity);
  t.is(disposed_component, component);

  manager.clear(entity);
  t.is(dispose_count, 1);
});


test(`[World -> Component.clear_collection()] dispose`, (t) => {
  const world = new World();
  let dispose_count = 0;
  let disposed_entity: Entity | undefined;
  let disposed_world: World | undefined;
  let disposed_component: IComponent | undefined;
  class DisposableComponent extends InitComponent() {
    static create = ComponentFactory(DisposableComponent, () => new DisposableComponent());
    static override dispose(world: World, entity: Entity, component: IComponent) {
      disposed_entity = entity;
      disposed_world = world;
      disposed_component = component;
      dispose_count += 1;
    }
  }

  world.entity([DisposableComponent.create(world)]);
  const component = DisposableComponent.create(world);
  const entity = world.entity([component]);
  DisposableComponent.clear_collection(world);
  t.is(dispose_count, 2);
  t.is(disposed_world, world);
  t.is(disposed_entity, entity);
  t.is(disposed_component, component);

  DisposableComponent.clear_collection(world);
  t.is(dispose_count, 2);
});

test(`[World -> Component.clear_collection(), clear(), delete_entity()] pooling`, (t) => {
  class ExpensiveComponent extends InitComponent() {
    position: Float32Array;
    static create = ComponentFactory(ExpensiveComponent, (prev_component, x, y) => {
      if (prev_component  !== undefined) {
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

  const validate_pool = (clear: (world: World, entity: Entity) => void) => {
    const world = new World(); 
    const component = ExpensiveComponent.create(world, 1, 2);
    const entity = world.entity([component]);
    const collection = world.components.get(ExpensiveComponent.id)!;
    const pool = collection.pool;
  
    t.is(pool.length, 0);
    t.is(collection.size, 1);

    clear(world, entity);
  
    t.is(pool.length, 1);
    t.is(collection.size, 0);
    t.is(pool[0], component);
    t.is(ExpensiveComponent.get(entity), null);

    const component2 = ExpensiveComponent.create(world, 3, 4);
    t.is(pool.length, 0);
    t.is(collection.size, 0)
    t.is(component2, component);
    t.is(component2.position, component.position);
    t.is(component2.position[0], 3);

    const component3 = ExpensiveComponent.create(world, 3, 4);
    t.not(component2, component3);
    t.not(component2.position, component3.position);
  }

  validate_pool((world, entity) => world.delete_entity(entity));
  validate_pool((world) => ExpensiveComponent.clear_collection(world));
  validate_pool((world, entity) => ExpensiveComponent.manager(world).clear(entity));
});
