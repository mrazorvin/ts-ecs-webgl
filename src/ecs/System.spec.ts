import { describe, expect, it } from "vitest";
import { Scheduler, sys, World } from "./World";
import {
	TestComponent0,
	TestComponent1,
	TestComponent2,
} from "./world_spec/world_component_fixtures";

const run = (world: World) => new Scheduler(world).tick();
const fixture = (opts: { fn: (world: World) => void }) => {
	const system1 = sys([], opts.fn, [TestComponent0]);
	const system2 = sys([], opts.fn, [TestComponent1]);
	const system3 = sys([], opts.fn, [TestComponent2]);

	const world1 = new World();
	const world2 = new World();

	return { system1, system2, system3, world1, world2 };
};

describe("[System]", () => {
	it("[World -> System.condition()] create system with condition and add it to the world", () => {
		const { world1, world2, system1, system2 } = fixture({
			fn: () => expect.fail(),
		});

		world1.system(system1);
		expect(system1.conditions).toEqual([TestComponent0]);
		expect(system1.disabled).toBe(true);
		expect(system1.prev).toBe(-1);
		expect(system1.next).toBe(-1);
		expect(system1.id).toBe(0);
		expect(world1.systems[system1.id]).toBe(system1);
		expect(world1.components.get(TestComponent0.id)?.dependent_system[0]).toBe(
			system1,
		);
		expect(() => world2.system(system1)).throws();

		world1.system(system2);
		expect(system2.conditions).toEqual([TestComponent1]);
		expect(system2.disabled).toBe(true);
		expect(system2.prev).toBe(-1);
		expect(system2.next).toBe(-1);
		expect(system2.id).toBe(1);
		expect(world1.systems[system2.id]).toBe(system2);
		expect(world1.components.get(TestComponent1.id)?.dependent_system[0]).toBe(
			system2,
		);
		expect(() => world2.system(system2)).throws();

		expect(world1.systems.length).toBe(2);

		run(world1);
	});

	it("[World -> System.condition()] adding new condition component enable systems", () => {
		const { world1, system1, system2, system3 } = fixture({
			fn: () => expect.fail(),
		});

		world1.system(system1);
		world1.system(system2);
		world1.system(system3);

		const entity1 = world1.entity([TestComponent0.create(world1)]);

		expect(system1.id).toBe(0);
		expect(system1.next).toBe(-1);
		expect(system1.prev).toBe(-1);
		expect(system1.disabled).toBe(false);

		expect(system2.id).toBe(1);
		expect(system2.next).toBe(-1);
		expect(system2.prev).toBe(-1);
		expect(system2.disabled).toBe(true);

		expect(system3.id).toBe(2);
		expect(system3.next).toBe(-1);
		expect(system3.prev).toBe(-1);
		expect(system3.disabled).toBe(true);

		TestComponent2.create(world1).attach(world1, entity1);

		expect(system1.prev).toBe(-1);
		expect(system1.id).toBe(0);
		expect(system1.next).toBe(2);
		expect(system1.disabled).toBe(false);

		expect(system2.prev).toBe(-1);
		expect(system2.id).toBe(1);
		expect(system2.next).toBe(-1);
		expect(system2.disabled).toBe(true);

		expect(system3.prev).toBe(0);
		expect(system3.id).toBe(2);
		expect(system3.next).toBe(-1);
		expect(system3.disabled).toBe(false);

		TestComponent1.create(world1).attach(world1, entity1);

		expect(system1.prev).toBe(-1);
		expect(system1.id).toBe(0);
		expect(system1.next).toBe(1);
		expect(system1.disabled).toBe(false);

		expect(system2.prev).toBe(0);
		expect(system2.id).toBe(1);
		expect(system2.next).toBe(2);
		expect(system2.disabled).toBe(false);

		expect(system3.prev).toBe(1);
		expect(system3.id).toBe(2);
		expect(system3.next).toBe(-1);
		expect(system3.disabled).toBe(false);
	});

	it("[World -> System.condition()] scheduler correctly run systems after adding", () => {
		const pass = (world: World) => expect(world).toBe(world);
		const fail = () => expect.fail();
		const { world1, system1, system2, system3 } = fixture({ fn: fail });

		world1.system(system1);
		world1.system(system2);
		world1.system(system3);

		run(world1);

		const entity1 = world1.entity([TestComponent0.create(world1)]);
		system1.exec = pass;

		run(world1);

		TestComponent2.create(world1).attach(world1, entity1);
		system3.exec = pass;

		run(world1);

		TestComponent1.create(world1).attach(world1, entity1);
		system2.exec = pass;

		run(world1);
	});

	it("[World -> System.condition()] removing components disable systems", () => {
		const { world1, system1, system2, system3 } = fixture({
			fn: () => expect.fail(),
		});

		world1.system(system1);
		world1.system(system2);
		world1.system(system3);

		const entity1 = world1.entity([
			TestComponent0.create(world1),
			TestComponent1.create(world1),
			TestComponent2.create(world1),
		]);

		expect(system1.prev).toBe(-1);
		expect(system1.id).toBe(0);
		expect(system1.next).toBe(1);
		expect(system1.disabled).toBe(false);

		expect(system2.prev).toBe(0);
		expect(system2.id).toBe(1);
		expect(system2.next).toBe(2);
		expect(system2.disabled).toBe(false);

		expect(system3.prev).toBe(1);
		expect(system3.id).toBe(2);
		expect(system3.next).toBe(-1);
		expect(system3.disabled).toBe(false);

		TestComponent1.manager(world1).clear(entity1);

		expect(system1.prev).toBe(-1);
		expect(system1.id).toBe(0);
		expect(system1.next).toBe(2);
		expect(system1.disabled).toBe(false);

		expect(system2.prev).toBe(-1);
		expect(system2.id).toBe(1);
		expect(system2.next).toBe(-1);
		expect(system2.disabled).toBe(true);

		expect(system3.prev).toBe(0);
		expect(system3.id).toBe(2);
		expect(system3.next).toBe(-1);
		expect(system3.disabled).toBe(false);

		TestComponent0.manager(world1).clear(entity1);

		expect(system1.prev).toBe(-1);
		expect(system1.id).toBe(0);
		expect(system1.next).toBe(-1);
		expect(system1.disabled).toBe(true);

		expect(system2.prev).toBe(-1);
		expect(system2.id).toBe(1);
		expect(system2.next).toBe(-1);
		expect(system2.disabled).toBe(true);

		expect(system3.prev).toBe(-1);
		expect(system3.id).toBe(2);
		expect(system3.next).toBe(-1);
		expect(system3.disabled).toBe(false);

		TestComponent2.clear_collection(world1);

		expect(system1.prev).toBe(-1);
		expect(system1.id).toBe(0);
		expect(system1.next).toBe(-1);
		expect(system1.disabled).toBe(true);

		expect(system2.prev).toBe(-1);
		expect(system2.id).toBe(1);
		expect(system2.next).toBe(-1);
		expect(system2.disabled).toBe(true);

		expect(system3.prev).toBe(-1);
		expect(system3.id).toBe(2);
		expect(system3.next).toBe(-1);
		expect(system3.disabled).toBe(true);
	});

	it("[World -> System.condition()] scheduler correctly run systems after removing", () => {
		const pass = (world: World) => expect(world).toBe(world);
		const fail = () => expect.fail();
		const { world1, system1, system2, system3 } = fixture({ fn: pass });

		const entity1 = world1.entity([
			TestComponent0.create(world1),
			TestComponent1.create(world1),
			TestComponent2.create(world1),
		]);

		world1.system(system1);
		world1.system(system2);
		world1.system(system3);

		run(world1);

		TestComponent1.manager(world1).clear(entity1);
		system2.exec = fail;

		run(world1);

		TestComponent0.manager(world1).clear(entity1);
		system1.exec = fail;

		run(world1);

		TestComponent2.manager(world1).clear(entity1);
		system3.exec = fail;

		run(world1);
	});
});
