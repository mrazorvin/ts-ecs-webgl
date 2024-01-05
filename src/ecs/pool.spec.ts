import { ComponentFactory, HASH_HEAD, InitComponent } from "./Component";
import {
	TestComponent1,
	TestComponent2,
	TestComponent7,
	TestComponent9,
} from "./world_spec/world_component_fixtures";

import { Entity, World } from "./World";
import { EntityPool, Pool, WorldPool } from "./Pool";
import {
	validate_component,
	validate_deleted_entity,
} from "./world_spec/world_spec_utils";
import { SubWorld } from "./SubWorld";
import { describe } from "node:test";
import { expect, it } from "vitest";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function cmp(v1: any, v2: any) {
	expect(v1).toBe(v2);
}

describe("Pool", () => {
	it("[EntityPool.pop()]", () => {
		const pool = new EntityPool([TestComponent2, TestComponent1]!);
		const entity = pool.pop();

		expect(pool.components).toEqual([TestComponent2, TestComponent1]!);
		cmp(pool.hash, HASH_HEAD.add(TestComponent1).add(TestComponent2));
		cmp(entity, undefined);
	});

	it("[EntityPool.push()]", () => {
		const pool = new EntityPool([TestComponent1, TestComponent2]);
		const entity = new Entity(undefined);

		pool.push(entity);

		cmp(pool.entities.length, 1);
		cmp(pool.entities[0]!, entity);

		// push method, ignore existed ref, this is our responsibility to clear ref before
		// pushing to pool
		cmp(entity.ref.entity, entity);
	});

	it("[EntityPool.create()]", () => {
		const world = new World();
		const pool = new EntityPool([TestComponent1, TestComponent9]);
		const component1 = TestComponent1.create(world);
		const component9 = TestComponent9.create(world);

		// lazy initialization, pool will be lazy initialized after first pop()
		// so we need to ask pool for entity at least once
		pool.pop();

		const entity = pool.create?.(component1, component9);

		expect(pool.components).toEqual([TestComponent1, TestComponent9]);
		cmp(entity?.hash, pool.hash);
		cmp(entity?.components["_0"]!["_1"]!, component1);
		cmp(entity?.components["_1"]!["_0"]!, component9);
		cmp(entity?.register["_0"]?.["_1"], undefined);
		cmp(entity?.register["_1"]?.["_0"], undefined);
		cmp(entity, entity?.ref?.entity);

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		cmp(entity?.pool, pool as EntityPool<any>);
	});

	it("[EntityPool.instantiate()]", () => {
		const pool = new EntityPool([TestComponent9, TestComponent1]!);
		const world = new World();
		const component1 = TestComponent1.create(world);
		const component9 = TestComponent9.create(world);

		// lazy initialization
		pool.pop();

		const entity = pool.instantiate?.(world, (world, create) =>
			create(component9, component1),
		);

		cmp(entity?.hash, pool.hash);
		cmp(entity?.components["_0"]!["_1"]!, component1);
		cmp(entity?.components["_1"]!["_0"]!, component9);
		cmp(entity?.register["_0"]?.["_1"], 0);
		cmp(entity?.register["_1"]?.["_0"], 0);
		cmp(entity, entity?.ref?.entity);

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		cmp(entity?.pool, pool as EntityPool<any>);

		validate_component(world, entity!, component1, {
			Constructor: TestComponent1,
			id: 0,
			size: 1,
			columns: 1,
			rows: 2,
		});

		validate_component(world, entity!, component9, {
			Constructor: TestComponent9,
			id: 0,
			size: 1,
			columns: 1,
			rows: 2,
		});
	});

	it("[EntityPool.reuse()]", () => {
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

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		empty_entity.pool = pool as EntityPool<any>;

		world.delete_entity(empty_entity);
		validate_deleted_entity(world, empty_entity, pool.components);
		cmp(prev_hash, empty_entity?.hash);
		cmp(prev_ref, empty_entity?.ref);
		cmp(prev_ref.entity, undefined);
		cmp(TestComponent1.get(empty_entity), component1);
		cmp(TestComponent7.get(empty_entity), null);
		cmp(TestComponent9.get(empty_entity), component9);

		// lazy initialization
		pool.pop();

		const entity = pool.reuse?.(world, empty_entity, (world, create, c1, c9) =>
			create(c1!, c9!),
		);

		// pool reuse entities instances
		cmp(entity, empty_entity);
		expect(entity?.ref).not.toBe(prev_ref);
		cmp(entity?.ref.entity, entity);
		cmp(entity?.hash, prev_hash);
		cmp(entity?.components, prev_components);
		cmp(entity?.register, prev_registers);

		cmp(entity?.components["_0"]!["_1"]!, component1);
		cmp(entity?.components["_1"]!["_0"]!, component9);
		cmp(entity?.register["_0"]?.["_1"], 0);
		cmp(entity?.register["_1"]?.["_0"], 0);

		validate_component(world, entity!, component1, {
			Constructor: TestComponent1,
			id: 0,
			size: 1,
			// there must be, since we reuse container which used for component 7
			columns: 2,
			rows: 2,
		});

		validate_component(world, entity!, component9, {
			Constructor: TestComponent9,
			id: 0,
			size: 1,
			columns: 1,
			rows: 2,
		});
	});

	it("[Pool.get()]", () => {
		const entity_pool = new EntityPool([TestComponent1, TestComponent9]);
		const world = new World();
		let created = false;
		let updated = false;
		const pool = new Pool(
			entity_pool,
			(world, create) => {
				created = true;
				updated = false;
				return create(
					TestComponent1.create(world),
					TestComponent9.create(world),
				);
			},
			(world, create, c1, c9) => {
				created = false;
				updated = true;
				return create(
					c1 || TestComponent1.create(world),
					c9 || TestComponent9.create(world),
				);
			},
		);

		cmp(entity_pool.entities.length, 0);

		const entity = pool.get(world);

		cmp(world.components.get(TestComponent1.id)?.refs[0]!, entity);
		cmp(world.components.get(TestComponent1.id)?.refs.length, 1);
		cmp(world.components.get(TestComponent1.id)?.size, 1);

		cmp(world.components.get(TestComponent9.id)?.refs[0]!, entity);
		cmp(world.components.get(TestComponent9.id)?.refs.length, 1);
		cmp(world.components.get(TestComponent9.id)?.size, 1);

		cmp(created, true);
		cmp(updated, false);

		cmp(entity_pool.entities.length, 0);

		world.delete_entity(entity);

		cmp(entity_pool.entities.length, 1);
		cmp(entity_pool.entities[0]!, entity);

		const new_entity = pool.get(world);

		cmp(entity_pool.entities.length, 0);
		cmp(new_entity, entity);

		cmp(world.components.get(TestComponent1.id)?.refs[0]!, new_entity);
		cmp(world.components.get(TestComponent1.id)?.refs[1]!, undefined);
		cmp(world.components.get(TestComponent1.id)?.refs.length, 1);
		cmp(world.components.get(TestComponent1.id)?.size, 1);

		cmp(world.components.get(TestComponent9.id)?.refs[0]!, new_entity);
		cmp(world.components.get(TestComponent9.id)?.refs[1]!, undefined);
		cmp(world.components.get(TestComponent9.id)?.refs.length, 1);
		cmp(world.components.get(TestComponent9.id)?.size, 1);
	});

	it("[World -> Pool.instance() + delete_entity()] non-conflict & synergy with generic components pool", () => {
		class ExpensiveComponent extends InitComponent({ use_pool: 20 }) {
			position: Float32Array;
			static create = ComponentFactory(
				ExpensiveComponent,
				(prev_component, x, y) => {
					if (prev_component !== undefined) {
						prev_component.position[0] = x;
						prev_component.position[1] = y;

						return prev_component;
					}
					return new ExpensiveComponent(x, y);
				},
			);

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
				return create(
					TestComponent1.create(world),
					ExpensiveComponent.create(world, 1, 2),
				);
			},
			(world, create) => {
				return create(
					TestComponent1.create(world),
					ExpensiveComponent.create(world, 3, 4),
				);
			},
		);

		// simple components pooling
		const entity = pool.get(world);
		const existed_component = ExpensiveComponent.get(entity);
		const new_component = ExpensiveComponent.create(world, 1, 2);
		const collection = world.components.get(ExpensiveComponent.id)!;
		const components_pool = collection.pool;
		cmp(components_pool.length, 0);
		cmp(collection.size, 1);

		// re-attaching component, must return existed component to the pool
		ExpensiveComponent.manager(world).attach(entity, new_component);
		cmp(components_pool.length, 1);
		cmp(collection.size, 1);
		expect(existed_component).not.toBe(new_component);
		cmp(ExpensiveComponent.get(entity), new_component);

		// pooled-entity from the pool also used component from the components-pool
		// because attaching component to the entity from previous step return component to the pool
		const entity2 = pool.get(world);
		cmp(components_pool.length, 0);
		cmp(collection.size, 2);
		cmp(ExpensiveComponent.get(entity2), existed_component);

		// fully deleting entity from the world, returns it and it's component only to the entity pool
		// but components_poll stay clear, so no components returned to the pool
		world.delete_entity(entity);
		cmp(components_pool.length, 0);
		// check that component still attached to the entity
		cmp(ExpensiveComponent.get(entity), new_component);
		cmp(entity_pool.entities.length, 1);

		// we re-used entity from the pool, but not component because component not in components-pool
		// component will be cleared by GC
		const entity3 = pool.get(world);
		expect(ExpensiveComponent.get(entity3)).not.toBe(new_component);
		cmp(entity_pool.entities.length, 0);

		// we deleted single component, so it has only single option to return to components-pool
		ExpensiveComponent.manager(world).clear(entity2);
		cmp(components_pool.length, 1);
		const entity4 = pool.get(world);
		cmp(components_pool.length, 0);
		cmp(ExpensiveComponent.get(entity4), existed_component);
		expect(ExpensiveComponent.get(entity3)).not.toBe(existed_component);
	});

	it("[World -> WorldPool]", () => {
		const components_pool = new EntityPool(
			[TestComponent1, TestComponent2],
			SubWorld,
		);
		const world_pool = new WorldPool({
			pool: components_pool,
			init_world: (world) => world,
			world_reuse: (prev_world, new_world) => new_world,
			instantiate: (world, create) =>
				create(TestComponent1.create(world), TestComponent2.create(world)),
			reuse: (world, create, c1, c2) =>
				create(
					c1 ?? TestComponent1.create(world),
					c2 || TestComponent2.create(world),
				),
		});

		cmp(world_pool.pool, components_pool);
	});
});
