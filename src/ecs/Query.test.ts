import { describe, expect, it } from "vitest";
import { Query } from "./Query";
import { SubWorld } from "./SubWorld";
import { BaseScheduler, q, sys, System, World } from "./World";
import {
	TestComponent0,
	TestComponent2,
	TestComponent3,
	TestComponent8,
	TestComponent9,
} from "./world_spec/world_component_fixtures";

class Scheduler extends BaseScheduler {
	start() {
		this.tick();
	}
}

const total_entities = 3;

const exec = (opts?: {
	world?: World;
	scheduler?: Scheduler;
	fn?: (world: World, system: System) => void;
	system_before_first_tick?: (system: System) => void;
	system_after_first_tick?: (system: System) => void;
}) => {
	let world = opts?.world;
	if (world === undefined) {
		world = new World();
		for (let i = 0; i < total_entities; i++) {
			world.entity([
				TestComponent0.create(world),
				TestComponent2.create(world),
				TestComponent3.create(world),
			]);
			world.entity([TestComponent8.create(world)]);
			world.entity([TestComponent8.create(world)], new World());
			world.entity([TestComponent9.create(world)], new World());
		}
	}

	if (opts !== undefined) {
		let scheduler = opts.scheduler;
		if (scheduler === undefined) {
			scheduler = new Scheduler(world);
		} else {
			scheduler.world = world;
		}
		if (opts.fn !== undefined && world.systems[0] === undefined) {
			const _fn = opts.fn;
			const fn = (world: World) => _fn(world, system);
			const system: System = sys([], fn);
			world.system(system);
		} else if (world.systems[0] !== undefined && opts.fn !== undefined) {
			const _fn = opts.fn;
			world.systems[0].exec = (world: World) =>
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				_fn(world, world.systems[0]!) as any;
		}

		// running system
		scheduler.tick();

		return { scheduler, world };
	}

	return { world };
};

describe("Query", () => {
	it("[World -> Query] array/simple query", () => {
		const { world } = exec();

		expect.assertions(total_entities);
		q.run(world, q([TestComponent0]), (_, c0) => {
			expect(c0 instanceof TestComponent0).toBe(true);
		});
	});

	it("[World -> Query] complex query", () => {
		const { world } = exec();

		expect.assertions(total_entities * 2);
		q.run(world, q({ components: [TestComponent8] }), (_, c8) => {
			expect(c8 instanceof TestComponent8).toBe(true);
		});
	});

	it("[World -> Query] world query", () => {
		const query = q({
			components: [TestComponent8],
			world: true,
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		}) as any as Query<any>;

		expect(query.components[0]).toBe(TestComponent8);
		expect(query.components[1]).toBe(SubWorld);
	});

	it("[World -> Query] complex query with world", () => {
		const { world } = exec();

		expect.assertions(total_entities);
		q.run(world, q({ components: [TestComponent8], world: true }), (entity) => {
			expect(entity.world instanceof World).toBe(true);
		});
	});

	it("[World -> Query] query inside system", () => {
		expect.assertions(total_entities);

		exec({
			fn: (world) => {
				q.run(world, q([TestComponent0]), (_, c0) => {
					expect(c0 instanceof TestComponent0).toBe(true);
				});
			},
		});
	});

	it("[World -> Query] query system cache", () => {
		let world: { world: World; scheduler?: Scheduler };
		const query_type = q([TestComponent0]);
		let query: undefined | typeof query_type;
		let tests = 0;

		const get_query = () => {
			if (query === undefined) {
				query = q([TestComponent0]);
			} else {
				throw new Error("can't create query multiple times");
			}

			return query;
		};

		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const run = (_: any) => tests++;

		world = exec({
			fn: (world, system) => {
				run(expect(Object.keys(system.queries)).toEqual([]));
				run(
					q.run(world, q.id("cached_query") ?? get_query(), (_, c0) =>
						run(expect(c0 instanceof TestComponent0).toBe(true)),
					),
				);
				run(expect(Object.keys(system.queries)).toEqual(["cached_query"]));
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				run(expect(system.queries["cached_query"], query as any));
			},
		});

		world = exec({
			...world,
			fn: (world, system) => {
				run(expect(Object.keys(system.queries)).toEqual(["cached_query"]));
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				run(expect(system.queries["cached_query"], query as any));
				run(
					q.run(world, q.id("cached_query") ?? get_query(), (_, c0) =>
						run(expect(c0 instanceof TestComponent0).toBe(true)),
					),
				);
				run(expect(Object.keys(system.queries)).toEqual(["cached_query"]));

				// using same query in the tick not allowed
				expect(() => {
					q.run(world, q.id("cached_query") ?? get_query(), (_, c0) =>
						run(expect(c0 instanceof TestComponent0).toBe(true)),
					);
				}).throws();
			},
		});

		expect(tests >= 10).toBe(true);
	});

	it("[World -> Query] pre-defined query", () => {
		let world: { world: World; scheduler?: Scheduler };
		const query = q([TestComponent0]);

		expect.assertions(2);

		world = exec({
			fn: (world, system) => {
				q.run(world, query, (_, c0) => undefined);
				expect(Object.keys(system.queries).length).toBe(0);
			},
		});

		world = exec({
			...world,
			fn: (world, system) => {
				expect(() => {
					q.run(world, q.id("never_do_expect") ?? query, (_, c0) => undefined);
				}).throws();
			},
		});
	});

	it("[World -> Query] local cache", () => {
		const world1 = exec({
			fn: (world) => {
				q.run(
					world,
					q.id("cached") ?? q([TestComponent0]),
					(_, c0) => undefined,
				);
			},
		});

		const world2 = exec({
			fn: (world) => {
				q.run(
					world,
					q.id("cached") ?? q([TestComponent0]),
					(_, c0) => undefined,
				);
			},
		});

		expect(world1.world.systems[0]?.queries["cached"]).not.toBe(
			world2.world.systems[0]?.queries["cached"],
		);
	});

	it("[World -> Query] world reset", () => {
		let world = exec({
			fn: () => {
				q.id("cached");
				expect(() => {
					q.id("cached");
				}).throws();
			},
		});

		world = exec({
			...world,
			fn: (world) => {
				q.run(
					world,
					q.id("cached") ?? q([TestComponent0]),
					(_, c0) => undefined,
				);
			},
		});

		const query = q.id("cached");
		expect(query, undefined);
	});
});
