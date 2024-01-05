import { describe, expect, it } from "vitest";
import { Resource, World } from "./World";

describe("[world]", () => {
	it("[World -> World.dispose()] dispose resources and nested worlds", () => {
		class R1_World extends Resource {
			dispose(target_world: World) {
				expect(target_world).toBe(world);
			}
		}
		class R2_World extends Resource {
			dispose(target_world: World) {
				expect(target_world).toBe(world);
			}
		}

		class R3_SubWorld extends Resource {
			dispose(target_world: World) {
				expect(target_world).toBe(sub_world);
			}
		}
		class R4_SubWorld extends Resource {
			dispose(target_world: World) {
				expect(target_world).toBe(sub_world);
			}
		}

		const world = new World();
		const sub_world = new World();

		world.resource(new R1_World());
		world.resource(new R2_World());
		sub_world.resource(new R3_SubWorld());
		sub_world.resource(new R4_SubWorld());
		world.entity([], sub_world);

		world.dispose();
	});

	it("[World -> World.dispose()] resource reuse", () => {
		const disposed: Array<typeof Resource> = [];

		class R1_World extends Resource {
			dispose() {
				disposed.push(R1_World);
			}
		}
		class R2_World extends Resource {
			dispose() {
				disposed.push(R2_World);
			}
		}

		class R3_SubWorld extends Resource {
			dispose() {
				disposed.push(R3_SubWorld);
			}
		}

		class R4_SubWorld extends Resource {
			dispose() {
				disposed.push(R4_SubWorld);
			}
		}

		const world = new World();
		const sub_world = new World();
		const r1 = new R1_World();
		const r2 = new R2_World();
		world.resource(r1);
		world.resource(r2);
		sub_world.resource(new R3_SubWorld());
		sub_world.resource(new R4_SubWorld());
		world.entity([], sub_world);

		const reused_r1 = R1_World.reuse(world);
		const reused_r2 = R2_World.reuse(world);

		expect(reused_r1).toBe(r1);
		expect(reused_r2).toBe(r2);
		expect(R1_World.get(world)).toBe(null);
		expect(R2_World.get(world)).toBe(null);
		world.dispose();

		expect(disposed).toEqual([R3_SubWorld, R4_SubWorld]);
	});
});
