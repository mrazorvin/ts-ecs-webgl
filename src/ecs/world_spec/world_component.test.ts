import { InitComponent, ComponentFactory, IComponent } from "../Component";
import {
	TestComponent3,
	TestComponent1,
	TestComponent2,
	TestComponent0,
	TestComponent9,
} from "./world_component_fixtures";

import { DeleteEntity } from "../DeleteEntity";
import { Entity, q, World } from "../World";
import {
	validate_component,
	validate_deleted_entity,
} from "./world_spec_utils";
import { describe } from "node:test";
import { expect, it } from "vitest";

// test that TestComponent1 has expected container class, register class, row_id, column id

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function cmp(v1: any, v2: any) {
	expect(v1).toBe(v2);
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function truthy(v1: any) {
	expect(v1).toBe(true);
}

describe("InitComponent", () => {
	it("[InitComponent()] Component 1", () => {
		const id = TestComponent0.id;
		const row_id = TestComponent0.storage_row_id;
		const column_id = TestComponent0.container_column_id;
		cmp(id, 0);
		cmp(row_id, 0);
		cmp(column_id, 0);
	});

	it("[InitComponent()] Component 9", () => {
		const id = TestComponent9.id;
		const row_id = TestComponent9.storage_row_id;
		const column_id = TestComponent9.container_column_id;
		cmp(id, 9);
		cmp(row_id, 1);
		cmp(column_id, 0);
	});

	// test that after attaching all affecting values such as collection.refs, collection.size
	// entity.hash, entity.register, entity.components
	it("[World.entity(), Component.attach(), Component.get()]", () => {
		const world = new World();
		const component1 = TestComponent1.create(world);

		const entity = world.entity([component1]);
		validate_component(world, entity, component1, {
			id: 0,
			Constructor: TestComponent1,
			size: 1,
			rows: 1,
			columns: 1,
		});

		component1.attach(world, entity);
		validate_component(world, entity, component1, {
			id: 0,
			Constructor: TestComponent1,
			size: 1,
			rows: 1,
			columns: 1,
		});

		const override_component = TestComponent1.create(world);
		override_component.attach(world, entity);
		validate_component(world, entity, override_component, {
			id: 0,
			Constructor: TestComponent1,
			size: 1,
			rows: 1,
			columns: 1,
		});

		const shared_component = component1;
		const entity_with_shared = world.entity([shared_component]);
		validate_component(world, entity_with_shared, shared_component, {
			id: 1,
			Constructor: TestComponent1,
			size: 2,
			rows: 1,
			columns: 1,
		});

		const component2 = TestComponent2.create(world);
		component2.attach(world, entity);
		validate_component(world, entity, override_component, {
			id: 0,
			Constructor: TestComponent1,
			size: 2,
			rows: 1,
			columns: 2,
		});
		validate_component(world, entity, component2, {
			id: 0,
			Constructor: TestComponent2,
			size: 1,
			rows: 1,
			columns: 2,
		});

		const component9 = TestComponent9.create(world);
		component9.attach(world, entity);
		validate_component(world, entity, component9, {
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
	it("[World -> Component.clear(), Component.clear_collection()]", () => {
		const world = new World();

		TestComponent1.clear_collection(world);

		const entities: Entity[] = [];
		entities.push(world.entity([TestComponent1.create(world)]));
		entities.push(world.entity([TestComponent1.create(world)]));
		entities.push(world.entity([TestComponent1.create(world)]));
		entities.push(world.entity([TestComponent1.create(world)]));
		entities.push(world.entity([TestComponent1.create(world)]));
		entities.push(world.entity([TestComponent1.create(world)]));

		validate_component(world, entities[0]!, TestComponent1.get(entities[0]!)!, {
			id: 0,
			Constructor: TestComponent1,
			size: entities.length,
			rows: 1,
			columns: 1,
		});

		TestComponent1.clear_collection(world);

		const hashes = entities.map(({ hash }) => hash);

		// biome-ignore lint/complexity/noForEach: <explanation>
		entities.forEach((entity, i) => {
			const [component] = Object.values(Object.values(entity.components)[0]!);
			const [register] = Object.values(Object.values(entity.register)[0]!);

			cmp(component, null);
			cmp(register, null);
			cmp(entity.pool, undefined);
			cmp(entity.hash, hashes[i]);
		});

		cmp(world.components.get(TestComponent1.id)?.size, 0);
		cmp(world.components.get(TestComponent1.id)?.refs.length, entities.length);

		const entity1 = world.entity([TestComponent2.create(world)]);
		const entity2 = world.entity([TestComponent2.create(world)]);
		TestComponent1.manager(world).clear(entity1);
		validate_component(world, entity1, TestComponent2.get(entity1)!, {
			id: 0,
			Constructor: TestComponent2,
			size: 2,
			rows: 1,
			columns: 1,
		});

		const pre_position =
			entity1.register[`_${TestComponent2.storage_row_id}`]![
				`_${TestComponent2.container_column_id}`
			];

		TestComponent2.manager(world).clear(entity1);
		cmp(world.components.get(TestComponent2.id)?.size, 1);
		cmp(world.components.get(TestComponent2.id)?.refs.length, 2);
		cmp(
			entity1.register[`_${TestComponent2.storage_row_id}`]![
				`_${TestComponent2.container_column_id}`
			],
			null,
		);
		cmp(TestComponent2.get(entity1), null);

		TestComponent2.manager(world).clear(entity1);
		cmp(world.components.get(TestComponent2.id)?.size, 1);
		cmp(world.components.get(TestComponent2.id)?.refs.length, 2);
		cmp(
			entity1.register[`_${TestComponent2.storage_row_id}`]![
				`_${TestComponent2.container_column_id}`
			],
			null,
		);
		cmp(TestComponent2.get(entity1), null);

		cmp(world.components.get(TestComponent2.id)!.refs[0]!, entity2);
		cmp(
			entity2.register[`_${TestComponent2.storage_row_id}`]![
				`_${TestComponent2.container_column_id}`
			],
			pre_position,
		);
	});

	it("[q.run()]", () => {
		expect.assertions(10);

		const world = new World();
		const component1 = TestComponent1.create(world);
		const component3 = TestComponent3.create(world);
		const entity = world.entity([component1, component3]);

		q.run(world, q([TestComponent1]), (e, component) => {
			cmp(entity, e);
			cmp(component, component1);
		});
		q.run(world, q([TestComponent3]), (e, component) => {
			cmp(entity, e);
			cmp(component, component3);
		});

		q.run(
			world,
			q([TestComponent1, TestComponent3]),
			(e, _component1, _component3) => {
				cmp(entity, e);
				cmp(_component1, component1);
				cmp(_component3, component3);
			},
		);

		q.run(
			world,
			q([TestComponent3, TestComponent1]),
			(e, _component3, _component1) => {
				cmp(entity, e);
				cmp(_component1, component1);
				cmp(_component3, component3);
			},
		);

		q.run(world, q([TestComponent2]), () => expect.fail());
		q.run(world, q([TestComponent1, TestComponent2]), () => expect.fail());
		q.run(world, q([TestComponent1, TestComponent2, TestComponent3]), () =>
			expect.fail(),
		);
	});

	it("[q.run()] multiple entities", () => {
		expect.assertions(12);
		const world = new World();

		world.entity([TestComponent1.create(world), TestComponent3.create(world)]);
		world.entity([TestComponent1.create(world), TestComponent3.create(world)]);

		q.run(world, q([TestComponent3]), (e, component) => {
			truthy(component instanceof TestComponent3);
		});

		q.run(world, q([TestComponent1]), (e, component) => {
			truthy(component instanceof TestComponent1);
		});

		q.run(
			world,
			q([TestComponent1, TestComponent3]),
			(e, component1, component2) => {
				truthy(component1 instanceof TestComponent1);
				truthy(component2 instanceof TestComponent3);
			},
		);

		q.run(
			world,
			q([TestComponent3, TestComponent1]),
			(e, component2, component1) => {
				truthy(component1 instanceof TestComponent1);
				truthy(component2 instanceof TestComponent3);
			},
		);
	});

	it("[World.delete_entity()]", () => {
		const world = new World();

		world.entity([TestComponent1.create(world)]);
		world.entity([TestComponent1.create(world)]);

		const comp2_e1 = TestComponent2.create(world);
		const comp2_e2 = TestComponent2.create(world);
		const entity1 = world.entity([comp2_e1]);
		const entity2 = world.entity([comp2_e2]);
		const comp1_e3 = TestComponent1.create(world);
		const comp9_e3 = TestComponent9.create(world);
		const entity3 = world.entity([comp1_e3, comp9_e3]);

		validate_component(world, entity3, TestComponent9.get(entity3)!, {
			Constructor: TestComponent9,
			columns: 1,
			id: 0,
			rows: 2,
			size: 1,
		});

		validate_component(world, entity3, TestComponent1.get(entity3)!, {
			Constructor: TestComponent1,
			columns: 1,
			rows: 2,
			id: 2,
			size: 3,
		});

		const prev_hash = entity1.hash;
		const prev_ref = entity1.ref;
		const prev_registers =
			entity1.register[`_${TestComponent2.storage_row_id}`]![
				`_${TestComponent2.container_column_id}`
			];

		world.delete_entity(entity1);
		validate_deleted_entity(world, entity1);
		cmp(entity1.hash, prev_hash);
		cmp(entity1.ref, prev_ref);
		cmp(entity1.ref.entity, undefined);
		truthy(world.components.get(TestComponent2.id)!.pool.includes(comp2_e1));

		cmp(world.components.get(TestComponent2.id)?.size, 1);
		cmp(world.components.get(TestComponent2.id)?.refs?.length, 2);
		cmp(world.components.get(TestComponent2.id)?.refs[0], entity2);
		cmp(world.components.get(TestComponent2.id)?.refs[1], entity2);
		cmp(
			entity2.register[`_${TestComponent2.storage_row_id}`]![
				`_${TestComponent2.container_column_id}`
			],
			prev_registers,
		);

		world.delete_entity(entity2);
		cmp(world.components.get(TestComponent2.id)?.size, 0);
		cmp(world.components.get(TestComponent2.id)?.refs?.length, 2);
		validate_deleted_entity(world, entity2);
		truthy(world.components.get(TestComponent2.id)!.pool.includes(comp2_e2));
		cmp(world.components.get(TestComponent2.id)!.pool.length, 2);
		cmp(world.components.get(TestComponent2.id)?.refs[0], entity2);
		cmp(world.components.get(TestComponent2.id)?.refs[1], entity2);

		cmp(DeleteEntity.func_cache.size, 1);
		expect(DeleteEntity.func_cache.get(entity2.hash)?.["_"]).not.toBe(
			undefined,
		);

		const new_entity4 = world.entity([TestComponent2.create(world)]);
		validate_component(world, new_entity4, TestComponent2.get(new_entity4)!, {
			Constructor: TestComponent2,
			columns: 1,
			rows: 1,
			id: 0,
			size: 1,
			length: 2,
		});

		world.delete_entity(entity3);
		validate_deleted_entity(world, entity3);
		truthy(world.components.get(TestComponent1.id)!.pool.includes(comp1_e3));
		truthy(world.components.get(TestComponent9.id)!.pool.includes(comp9_e3));

		cmp(world.components.get(TestComponent1.id)?.size, 2);
		cmp(world.components.get(TestComponent9.id)?.size, 0);

		cmp(DeleteEntity.func_cache.size, 2);
		expect(DeleteEntity.func_cache.get(entity3.hash)?.["_"]).not.toBe(
			undefined,
		);

		const entity5 = world.entity([]);
		TestComponent9.create(world).attach(world, entity5);
		TestComponent1.create(world).attach(world, entity5);
		world.delete_entity(entity5);
		validate_deleted_entity(world, entity3);
		cmp(
			DeleteEntity.func_cache.get(entity3.hash)?.["_"],
			DeleteEntity.func_cache.get(entity5.hash)?.["_"],
		);
	});

	it("[World.delete_entity()] dispose", () => {
		const world = new World();
		let dispose_count = 0;
		let disposed_entity: Entity | undefined;
		let disposed_world: World | undefined;
		let disposed_component: IComponent | undefined;
		class DisposableComponent extends InitComponent({ use_pool: false }) {
			static create = ComponentFactory(
				DisposableComponent,
				() => new DisposableComponent(),
			);
			static override dispose(
				world: World,
				entity: Entity,
				component: IComponent,
			) {
				disposed_entity = entity;
				disposed_world = world;
				disposed_component = component;
				dispose_count += 1;
			}
		}

		const component = DisposableComponent.create(world);
		const entity = world.entity([component]);
		world.delete_entity(entity);
		cmp(dispose_count, 1);
		cmp(disposed_world, world);
		cmp(disposed_entity, entity);
		cmp(disposed_component, component);

		world.delete_entity(entity);
		cmp(dispose_count, 1);
	});

	it("[World -> Component.clear()] dispose", () => {
		const world = new World();
		let dispose_count = 0;
		let disposed_entity: Entity | undefined;
		let disposed_world: World | undefined;
		let disposed_component: IComponent | undefined;
		class DisposableComponent extends InitComponent({ use_pool: false }) {
			static create = ComponentFactory(
				DisposableComponent,
				() => new DisposableComponent(),
			);
			static override dispose(
				world: World,
				entity: Entity,
				component: IComponent,
			) {
				disposed_entity = entity;
				disposed_world = world;
				disposed_component = component;
				dispose_count += 1;
			}
		}

		const component = DisposableComponent.create(world);
		const entity = world.entity([component]);
		const manager = DisposableComponent.manager(world);
		manager.clear(entity);
		cmp(dispose_count, 1);
		cmp(disposed_world, world);
		cmp(disposed_entity, entity);
		cmp(disposed_component, component);

		manager.clear(entity);
		cmp(dispose_count, 1);
	});

	it("[World -> Component.clear_collection()] dispose", () => {
		const world = new World();
		let dispose_count = 0;
		let disposed_entity: Entity | undefined;
		let disposed_world: World | undefined;
		let disposed_component: IComponent | undefined;
		class DisposableComponent extends InitComponent({ use_pool: false }) {
			static create = ComponentFactory(
				DisposableComponent,
				() => new DisposableComponent(),
			);
			static override dispose(
				world: World,
				entity: Entity,
				component: IComponent,
			) {
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
		cmp(dispose_count, 2);
		cmp(disposed_world, world);
		cmp(disposed_entity, entity);
		cmp(disposed_component, component);

		DisposableComponent.clear_collection(world);
		cmp(dispose_count, 2);
	});

	it("[World -> Component.clear_collection(), clear(), delete_entity()] pooling", () => {
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

		const validate_pool = (clear: (world: World, entity: Entity) => void) => {
			const world = new World();
			const component = ExpensiveComponent.create(world, 1, 2);
			const entity = world.entity([component]);
			const collection = world.components.get(ExpensiveComponent.id)!;
			const pool = collection.pool;

			cmp(pool.length, 0);
			cmp(collection.size, 1);

			clear(world, entity);

			cmp(pool.length, 1);
			cmp(collection.size, 0);
			cmp(pool[0], component);
			cmp(ExpensiveComponent.get(entity), null);

			const component2 = ExpensiveComponent.create(world, 3, 4);
			cmp(pool.length, 0);
			cmp(collection.size, 0);
			cmp(component2, component);
			cmp(component2.position, component.position);
			cmp(component2.position[0], 3);

			const component3 = ExpensiveComponent.create(world, 3, 4);
			expect(component2).not.toBe(component3);
			expect(component2.position).not.toBe(component3.position);
		};

		validate_pool((world, entity) => world.delete_entity(entity));
		validate_pool((world) => ExpensiveComponent.clear_collection(world));
		validate_pool((world, entity) =>
			ExpensiveComponent.manager(world).clear(entity),
		);
	});
});
