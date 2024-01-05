import { expect } from "vitest";
import { IComponent } from "../Component";
import { Entity, World } from "../World";
import { TestComponent0 } from "./world_component_fixtures";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function cmp(v1: any, v2: any) {
	expect(v1).toBe(v2);
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function truthy(v1: any) {
	expect(v1).toBe(true);
}

export const validate_deleted_entity = (
	world: World,
	entity: Entity,
	exceptions?: Array<typeof IComponent>,
) => {
	truthy(
		Object.values(entity.components).flatMap((container) =>
			Object.values(container),
		).length !== 0,
	);
	truthy(
		Object.values(entity.register).flatMap((register) =>
			Object.values(register),
		).length !== 0,
	);

	for (const row_id in entity.components) {
		for (const column_id in entity.components[row_id]) {
			const pos_in_collection = entity.register[row_id]![column_id]!;
			const component = entity.components[row_id]![column_id]!;
			cmp(pos_in_collection, null);

			if (component != null && exceptions !== undefined) {
				if (
					exceptions.find(
						(Constructor) => component.constructor === Constructor,
					)
				) {
					expect(component).not.toBe(null);
					expect(
						world.components
							.get((component.constructor as typeof IComponent).id)
							?.pool.includes(component),
					).toBe(false);
				} else {
					cmp(component, null);
				}
			} else {
				cmp(component, null);
			}
		}
	}
};

export const validate_component = <T extends typeof IComponent>(
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
	},
) => {
	const { Constructor, size, length, rows, columns, id } = props;

	// getting, un-exist component on entity, must return undefined
	// and shouldn't cause any side effect (creating new properties in entity)
	cmp(TestComponent0.get(entity), undefined);

	// collection must changed exactly, one time
	cmp(world.components.get(Constructor.id)?.size, size);
	cmp(world.components.get(Constructor.id)?.refs.length, length ?? size);
	cmp(world.components.get(Constructor.id)?.refs[id], entity);

	const row = `_${Constructor.storage_row_id}`;
	const column = `_${Constructor.container_column_id}`;

	// entity must have exactly one record about new component
	cmp(entity.register[row]?.constructor, Constructor.register_class as unknown);
	cmp(entity.register[row]?.[column], id);
	cmp(Object.keys(entity.register).length, rows);
	cmp(Object.keys(entity.register[row]!).length, columns);

	// entity must have exactly one record about it position in collection
	cmp(
		entity.components[row]?.constructor,
		Constructor.container_class as unknown,
	);
	cmp(entity.components[row]?.[column], component);
	cmp(Object.keys(entity.components).length, rows);
	cmp(Object.keys(entity.components[row]!).length, columns);

	cmp(Constructor.get(entity), component);
};
