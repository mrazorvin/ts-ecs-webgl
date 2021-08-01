import { default as test, ExecutionContext } from "ava";
import { IComponent } from "../Component";
import { DeleteEntity } from "../DeleteEntity";
import { Entity, World } from "../World";
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

export const validate_deleted_entity = (t: ExecutionContext, entity: Entity, exceptions?: Array<typeof IComponent>) => {
  t.true(Object.values(entity.components).flatMap((container) => Object.values(container)).length !== 0);
  t.true(Object.values(entity.register).flatMap((register) => Object.values(register)).length !== 0);

  for (const row_id in entity.components) {
    for (const column_id in entity.components[row_id]) {
      const pos_in_collection = entity.register[row_id]![column_id]!;
      const component = entity.components[row_id]![column_id]!;
      t.is(pos_in_collection, null);

      if (component != null && exceptions !== undefined) {
        if (exceptions.find((Constructor) => component.constructor === Constructor)) {
          // ignore exception
        } else {
          t.is(component, null);
        }
      } else {
        t.is(component, null);
      }
    }
  }
};

export const validate_component = <T extends typeof IComponent>(
  t: ExecutionContext,
  world: World,
  entity: Entity,
  component: IComponent,
  props: {
    Constructor: T;
    size: number;
    length?: number;
    rows: number;
    columns: number;
    id: number;
  }
) => {
  const { Constructor, size, length, rows, columns, id } = props;

  // getting, un-exist component on entity, must return undefined
  // and shouldn't cause any side effect (creating new properties in entity)
  t.is(TestComponent0.get(entity), undefined);

  // collection must changed exactly, one time
  t.is(world.components.get(Constructor.id)?.size, size);
  t.is(world.components.get(Constructor.id)?.refs.length, length ?? size);
  t.is(world.components.get(Constructor.id)?.refs[id], entity);

  const row = `_${Constructor.storage_row_id}`;
  const column = `_${Constructor.container_column_id}`;

  // entity must have exactly one record about new component
  t.is(entity.register[row]?.constructor, Constructor.register_class as unknown);
  t.is(entity.register[row]?.[column], id);
  t.is(Object.keys(entity.register).length, rows);
  t.is(Object.keys(entity.register[row]!).length, columns);

  // entity must have exactly one record about it position in collection
  t.is(entity.components[row]?.constructor, Constructor.container_class as unknown);
  t.is(entity.components[row]?.[column], component);
  t.is(Object.keys(entity.components).length, rows);
  t.is(Object.keys(entity.components[row]!).length, columns);

  t.is(Constructor.get(entity), component);
};

// test that after attaching all affecting values such as collection.refs, collection.size
// entity.hash, entity.register, entity.components
test("[World.entity(), Component.attach(), Component.get()]", (t) => {
  const world = new World();
  const component1 = new TestComponent1();
  // creating new component's don't magically add new collection to the world
  t.is(world.components.get(TestComponent1.id), undefined);

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

  const override_component = new TestComponent1();
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

  const component2 = new TestComponent2();
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

  const component9 = new TestComponent9();
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
  entities.push(world.entity([new TestComponent1()]));
  entities.push(world.entity([new TestComponent1()]));
  entities.push(world.entity([new TestComponent1()]));
  entities.push(world.entity([new TestComponent1()]));
  entities.push(world.entity([new TestComponent1()]));
  entities.push(world.entity([new TestComponent1()]));

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

  const entity1 = world.entity([new TestComponent2()]);
  const entity2 = world.entity([new TestComponent2()]);
  TestComponent1.clear(world, entity1);
  validate_component(t, world, entity1, TestComponent2.get(entity1)!, {
    id: 0,
    Constructor: TestComponent2,
    size: 2,
    rows: 1,
    columns: 1,
  });

  const pre_position = entity1.register[`_${TestComponent2.storage_row_id}`]![`_${TestComponent2.container_column_id}`];

  TestComponent2.clear(world, entity1);
  t.is(world.components.get(TestComponent2.id)?.size, 1);
  t.is(world.components.get(TestComponent2.id)?.refs.length, 2);
  t.is(entity1.register[`_${TestComponent2.storage_row_id}`]![`_${TestComponent2.container_column_id}`], null);
  t.is(TestComponent2.get(entity1), null);

  TestComponent2.clear(world, entity1);
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

  world.query([TestComponent1, TestComponent3], (e, _component1, _component3) => {
    t.is(entity, e);
    t.is(_component1, component1);
    t.is(_component3, component3);
  });

  world.query([TestComponent3, TestComponent1], (e, _component3, _component1) => {
    t.is(entity, e);
    t.is(_component1, component1);
    t.is(_component3, component3);
  });

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

test("[World.delete_entity()]", (t) => {
  const world = new World();

  world.entity([new TestComponent1()]);
  world.entity([new TestComponent1()]);

  const entity1 = world.entity([new TestComponent2()]);
  const entity2 = world.entity([new TestComponent2()]);
  const entity3 = world.entity([new TestComponent1(), new TestComponent9()]);

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
  validate_deleted_entity(t, entity1);
  t.is(entity1.hash, prev_hash);
  t.is(entity1.ref, prev_ref);
  t.is(entity1.ref.entity, undefined);

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
  validate_deleted_entity(t, entity2);
  t.is(world.components.get(TestComponent2.id)?.refs[0], entity2);
  t.is(world.components.get(TestComponent2.id)?.refs[1], entity2);

  t.is(DeleteEntity.func_cache.size, 1);
  t.not(DeleteEntity.func_cache.get(entity2.hash)?.["_"], undefined);

  const new_entity4 = world.entity([new TestComponent2()]);
  validate_component(t, world, new_entity4, TestComponent2.get(new_entity4)!, {
    Constructor: TestComponent2,
    columns: 1,
    rows: 1,
    id: 0,
    size: 1,
    length: 2,
  });

  world.delete_entity(entity3);
  validate_deleted_entity(t, entity3);
  t.is(world.components.get(TestComponent1.id)?.size, 2);
  t.is(world.components.get(TestComponent9.id)?.size, 0);

  t.is(DeleteEntity.func_cache.size, 2);
  t.not(DeleteEntity.func_cache.get(entity3.hash)?.["_"], undefined);

  const entity5 = world.entity([]);
  new TestComponent9().attach(world, entity5);
  new TestComponent1().attach(world, entity5);
  world.delete_entity(entity5);
  validate_deleted_entity(t, entity3);
  t.is(DeleteEntity.func_cache.get(entity3.hash)?.["_"], DeleteEntity.func_cache.get(entity5.hash)?.["_"]);
});
