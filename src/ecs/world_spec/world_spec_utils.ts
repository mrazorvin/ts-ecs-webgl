import { ExecutionContext } from "ava";
import { IComponent } from "../Component";
import { Entity, World } from "../World";
import { TestComponent0 } from "./world_spec_fixtures";

export const validate_deleted_entity = (
  t: ExecutionContext,
  world: World,
  entity: Entity,
  exceptions?: Array<typeof IComponent>
) => {
  t.true(Object.values(entity.components).flatMap((container) => Object.values(container)).length !== 0);
  t.true(Object.values(entity.register).flatMap((register) => Object.values(register)).length !== 0);

  for (const row_id in entity.components) {
    for (const column_id in entity.components[row_id]) {
      const pos_in_collection = entity.register[row_id]![column_id]!;
      const component = entity.components[row_id]![column_id]!;
      t.is(pos_in_collection, null);

      if (component != null && exceptions !== undefined) {
        if (exceptions.find((Constructor) => component.constructor === Constructor)) {
          t.not(component, null);
          t.false(world.components.get((component.constructor as typeof IComponent).id)?.pool.includes(component));
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
