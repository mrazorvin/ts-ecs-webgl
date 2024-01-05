import { describe, expect, it } from "vitest";
import { SSCDCircle, SSCDShape, SSCDVector, SSCDWorld } from "./index";

describe("[SCDWorld]", () => {
	it("init world", () => {
		const world = new SSCDWorld({ grid_size: 32 * 5 });

		for (let i = 0; i < 10000; i++) {
			const circle = new SSCDCircle(new SSCDVector(i + 10, 10), 10);
			world.add(circle);
			circle.set_collision_tags(["wall", "glass"]);
		}

		for (let i = 0; i < 10000; i++) {
			const circle = new SSCDCircle(new SSCDVector(i + 10, 10), 10);
			world.add(circle);
			circle.set_collision_tags([]);
		}

		const result: SSCDShape[] = [];
		const circle = new SSCDCircle(new SSCDVector(10, 10), 10);
		world.test_collision(circle, ["wall"], (x) => {
			result.push(x);
		});

		expect(result.length).toBe(21);
	});
});
