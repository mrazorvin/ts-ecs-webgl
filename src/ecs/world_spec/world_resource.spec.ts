import { World, Resource, Scheduler, System, sys } from "../World";
import {
	TestResource0,
	TestResource1,
	TestResource2,
	TestResource3,
	TestResource4,
	TestResource5,
	TestResource6,
	TestResource7,
	TestResource8,
	TestResource9,
} from "./world_resources_fixtures";
import { describe } from "node:test";
import { expect, it } from "vitest";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function cmp(v1: any, v2: any) {
	expect(v1).toBe(v2);
}

describe("[Resource]", () => {
	it("[World.resource()] cache", () => {
		const world = new World();

		world.resource(new TestResource0());
		cmp(world.resources["_0"]!["_0"]!.constructor, TestResource0);

		world.resource(new TestResource1());
		cmp(world.resources["_0"]!["_1"]!.constructor, TestResource1);

		world.resource(new TestResource2());
		cmp(world.resources["_0"]!["_2"]!.constructor, TestResource2);

		world.resource(new TestResource3());
		cmp(world.resources["_0"]!["_3"]!.constructor, TestResource3);

		world.resource(new TestResource4());
		cmp(world.resources["_0"]!["_4"]!.constructor, TestResource4);

		world.resource(new TestResource5());
		cmp(world.resources["_0"]!["_5"]!.constructor, TestResource5);

		world.resource(new TestResource6());
		cmp(world.resources["_0"]!["_6"]!.constructor, TestResource6);

		world.resource(new TestResource7());
		cmp(world.resources["_0"]!["_7"]!.constructor, TestResource7);

		world.resource(new TestResource8());
		cmp(world.resources["_0"]!["_8"]!.constructor, TestResource8);

		world.resource(new TestResource9());
		cmp(world.resources["_1"]!["_0"]!.constructor, TestResource9);
	});

	class TestSystem extends System {
		dependencies = [];
		exec() {
			this.fn();
		}
		constructor(public fn: () => void) {
			super();
		}
	}

	it("[World.system()]", async () => {
		let iterations = 0;
		const world = new World();
		const system = new TestSystem(() =>
			iterations++ < 10 ? expect(true).toBe(true) : null,
		);
		const scheduler = new Scheduler(world);

		await new Promise((resolve) => {
			expect.assertions(10);
			world.system(system);

			scheduler.start();
      
			setTimeout(resolve, 200);
		});
	});

	it("[World.system_once()]", async () => {
		const world = new World();
		const system = new TestSystem(() => expect(true).toBe(true));
		const scheduler = new Scheduler(world);

		await new Promise((resolve) => {
			expect.assertions(1);
			world.system_once(system);

			scheduler.start();
			setTimeout(resolve, 100);
		});
	});

	class TestResource extends Resource {
		dispose() {}
	}

	it("[World.resource()]", () => {
		const world = new World();
		const resource = new TestResource();
		world.resource(resource);
		cmp(resource, TestResource.get(world));

		world.resource(new TestResource());
		expect(resource).not.toBe(TestResource.get(world));
	});

	it("[World -> System.dependencies] don't exec system until all dependencies will be ready", async () => {
		const system = sys([TestResource], () => expect.fail());
		const world = new World();
		const scheduler = new Scheduler(world);

		await new Promise((resolve) => {
			expect.assertions(0);

			world.system_once(system);
			world.system(system);

			scheduler.start();
			setTimeout(resolve, 100);
		});
	});

	it("[World -> System.dependencies] exec systems when all dependencies are ready", async () => {
		const world = new World();
		const scheduler = new Scheduler(world);
		const resource = new TestResource();

		expect.assertions(1);

		world.system_once(sys([TestResource], () => expect(null)));
		world.resource(resource);

		// inject system
		scheduler.tick();
		// run system
		scheduler.tick();
	});

	it("[World -> SubWorld.system_once]", async () => {
		expect.assertions(1);

		const world = new World();
		const scheduler = new Scheduler(world);

		await new Promise((resolve) => {
			world.system_once(
				sys([], (s_world) =>
					s_world.system_once(
						sys([], () => {
							expect(null);
						}),
					),
				),
			);

			scheduler.start();
			setTimeout(resolve, 100);
		});
	}, 100);

	it("[World -> SubWorld.system]", async () => {
		expect.assertions(10);

		const world = new World();
		const scheduler = new Scheduler(world);

		let i = 1;

		await new Promise((resolve) => {
			world.system_once(
				sys([], (s_world) =>
					s_world.system(
						sys([], () => {
							expect(null);
							if (++i > 10) {
								resolve(null);
							}
						}),
					),
				),
			);

			scheduler.start();
		});
	});
});
