// @ts-expect-error
import { sscd as SSCD_OLD } from "sscd";
import { describe, it, expect } from "vitest";
import { SSCDCircle, SSCDRectangle, SSCDShape, SSCDVector, SSCDWorld } from ".";

function validate(
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	props: { world: SSCDWorld; old_world?: { [key: string]: any } },
	...rows: number[][]
) {
	const world = props.world;
	const old_world = props.old_world;
	const width = rows[0]?.length;

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const result: any[][] = [];

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	const old_result: any[][] = [];

	const errors: string[] = [];
	const old_errors: string[] = [];
	if (width === undefined) {
		throw new Error("you must pass at least one row");
	}
	for (let y = 0; y < rows.length; y++) {
		const row = rows[y];
		if (row.length !== width) {
			throw new Error(`all rows must have same size ${width} != ${row.length}`);
		}
		for (let x = 0; x < width; x++) {
			const chunk = world.__grid[x][y];
			const old_chunk = old_world?.__grid[x]?.[y] as SSCDShape[];

			const expectation = row[x];
			const test_row = result[x] ?? (result[x] = []);
			test_row[y] = chunk?.elements;
			if (chunk) {
				chunk.elements.length = chunk.size;
			}

			if (old_world) {
				const old_test_row = old_result[x] ?? (old_result[x] = []);
				old_test_row[y] = old_chunk || [];
			}

			// compare state with old world
			if (old_world && !old_chunk && chunk && chunk.size !== 0) {
				old_errors.push(
					`empty chunk size difference [${x}][${y}].size !== 0, received ${chunk.size}`,
				);
			}

			if (old_world && old_chunk) {
				if (old_chunk.length !== chunk.size) {
					old_errors.push(
						`filled chunk size difference [${x}][${y}].size !== old_size:${old_chunk.length}, received ${chunk.size}`,
					);
				}

				if (expectation > 0) {
					const first_old = old_chunk[0];
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					const _result: any[] = [];

					old_world.test_collision(first_old.__position, undefined, _result);

					const { __grid_chunks, __id, __world, __grid_bounderies, ...old_el } =
						// biome-ignore lint/suspicious/noExplicitAny: <explanation>
						_result[0] as any;
					const first_new = chunk.elements[0];

					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					let _custom: any;

					world.test_collision(
						new SSCDCircle(first_new.__position, 1),
						undefined,
						(collection) => {
							_custom = collection;
						},
					);

					const { __found, __world: __world2, ...new_el } = _custom;

					expect(JSON.parse(JSON.stringify(old_el))).toEqual(
						JSON.parse(JSON.stringify(new_el)),
					);
				}
			}

			if (expectation === 0 && chunk && chunk?.size !== 0) {
				errors.push(
					`expected [${x}][${y}].size === 0, but received ${chunk?.size}`,
				);
			} else if (expectation === 1 && chunk.size !== 1) {
				errors.push(
					`expected [${x}][${y}].size ==== 1, but received ${chunk.size}`,
				);
			}
		}
	}

	let z = -1;
	rows: for (const row of result) {
		z++;
		let last_value = row[row.length - 1];
		if (row.length === 1) {
			if (last_value === undefined) {
				row.length = 0;
				continue;
			}
		}

		for (let i = row.length - 2; i >= 0; i--) {
			const next_value = row[i];
			if (last_value === undefined) {
				row.length -= 1;
				last_value = next_value;
			}

			if (last_value !== undefined && next_value === undefined) {
				errors.push(`undefined values cannot be inside array [${z}][${i}]`);
				continue rows;
			}
		}
	}

	if (errors.length === 0 && old_errors.length === 0) {
		return "";
	}

	if (old_errors.length > 0) {
		console.log(old_result);
	}

	console.log(result);

	return errors.concat(old_errors);
}

describe("[SSCDWorld vs SSCD", () => {
	it("[SSCDWorld vs SSCD]", (t) => {
		const new_world = new SSCDWorld({ grid_size: 16, size: 3 });

		const new_circle1 = new SSCDCircle(new SSCDVector(30, 30), 10);
		const new_circle2 = new SSCDCircle(new SSCDVector(30, 30), 10);

		const C1 = 0;
		const C2 = 1;
		const C3 = 2;

		const R1 = 0;
		const R2 = 1;
		const R3 = 2;

		const E0 = 0;
		const E1 = 1;

		// column-based grid
		//
		// |[0]| |[0]| |[0]|
		// |[0]| |[1]| |[1]|
		// |[0]| |[1]| |[1]|

		new_world.add(new_circle1);

		expect(new_world.__grid[C1][R2].elements[E0]).toBe(undefined);
		expect(new_world.__grid[C1][R1].elements[E0]).toBe(undefined);
		expect(new_world.__grid[C1][R3].elements[E0]).toBe(undefined);

		expect(new_world.__grid[C2][R1].elements[E0]).toBe(undefined);
		expect(new_world.__grid[C2][R2].elements[E0]).toBe(new_circle1);
		expect(new_world.__grid[C2][R3].elements[E0]).toBe(new_circle1);

		expect(new_world.__grid[C3][R1].elements[E0]).toBe(undefined);
		expect(new_world.__grid[C3][R2].elements[E0]).toBe(new_circle1);
		expect(new_world.__grid[C3][R3].elements[E0]).toBe(new_circle1);

		new_world.remove(new_circle1);

		expect(new_world.__grid[C1][R1].size).toBe(0);
		expect(new_world.__grid[C1][R2].size).toBe(0);
		expect(new_world.__grid[C1][R3].size).toBe(0);

		expect(new_world.__grid[C2][R1].size).toBe(0);
		expect(new_world.__grid[C2][R2].size).toBe(0);
		expect(new_world.__grid[C2][R3].size).toBe(0);

		expect(new_world.__grid[C3][R1].size).toBe(0);
		expect(new_world.__grid[C3][R2].size).toBe(0);
		expect(new_world.__grid[C3][R3].size).toBe(0);

		new_world.add(new_circle2);

		expect(new_world.__grid[C2][R2].size).toBe(1);
		expect(new_world.__grid[C2][R3].size).toBe(1);
		expect(new_world.__grid[C3][R2].size).toBe(1);
		expect(new_world.__grid[C3][R3].size).toBe(1);

		expect(new_world.__grid[C2][R2].elements.length).toBe(1);
		expect(new_world.__grid[C2][R3].elements.length).toBe(1);
		expect(new_world.__grid[C3][R2].elements.length).toBe(1);
		expect(new_world.__grid[C3][R3].elements.length).toBe(1);

		new_world.add(new_circle1);

		expect(new_world.__grid[C2][R2].elements[E0]).toBe(new_circle2);
		expect(new_world.__grid[C2][R3].elements[E0]).toBe(new_circle2);
		expect(new_world.__grid[C3][R2].elements[E0]).toBe(new_circle2);
		expect(new_world.__grid[C3][R3].elements[E0]).toBe(new_circle2);

		expect(new_world.__grid[C2][R2].size).toBe(2);
		expect(new_world.__grid[C2][R3].size).toBe(2);
		expect(new_world.__grid[C3][R2].size).toBe(2);
		expect(new_world.__grid[C3][R3].size).toBe(2);

		expect(new_world.__grid[C2][R2].elements[E1]).toBe(new_circle1);
		expect(new_world.__grid[C2][R3].elements[E1]).toBe(new_circle1);
		expect(new_world.__grid[C3][R2].elements[E1]).toBe(new_circle1);
		expect(new_world.__grid[C3][R3].elements[E1]).toBe(new_circle1);

		// DEBUG
		//
		// new_world.remove(new_circle2);
		// new_world.test_collision(new_circle1, undefined, () => undefined);
		//
		// const old_circle = new SSCD_OLD.Circle(new SSCD_OLD.Vector(10, 10), 10);
		// const old_world = new SSCD_OLD.World({ grid_size: 16 });
		// old_world.add(old_circle);
		//
		// new_circle.set_position(new SSCDVector(10, 10));
		//
		// console.log(new_world.__grid);
		// console.log(old_world.__grid);
	});

	it("[SSCDWorld -> SSCDCircle.move_to()]", () => {
		const world1 = new SSCDWorld({ grid_size: 16, size: 3 });
		const circle1 = new SSCDCircle(new SSCDVector(30, 30), 10);
		const old_world = new SSCD_OLD.World({ grid_size: 16 });
		const old_circle = new SSCD_OLD.Circle(new SSCD_OLD.Vector(30, 30), 10);

		old_world.add(old_circle);
		world1.add(circle1);

		expect(
			validate({ world: world1, old_world }, [0, 0, 0], [0, 1, 1], [0, 1, 1]),
		).toBe("");

		const world2 = new SSCDWorld({ grid_size: 16, size: 3 });
		const circle2 = new SSCDCircle(new SSCDVector(10, 10), 10);
		world2.add(circle2);
		old_circle.set_position(new SSCD_OLD.Vector(10, 10));

		expect(
			validate({ world: world2, old_world }, [1, 1, 0], [1, 1, 0], [0, 0, 0]),
		).toBe("");

		const world3 = new SSCDWorld({ grid_size: 16, size: 3 });
		const circle3 = new SSCDCircle(new SSCDVector(10, 10), 10);
		world3.add(circle3);
		circle3.move_to(30, 30);
		old_circle.set_position(new SSCD_OLD.Vector(30, 30));

		expect(
			validate({ world: world3, old_world }, [0, 0, 0], [0, 1, 1], [0, 1, 1]),
		).toBe("");

		circle3.move_to(10, 10);
		old_circle.set_position(new SSCD_OLD.Vector(10, 10));

		expect(
			validate({ world: world3, old_world }, [1, 1, 0], [1, 1, 0], [0, 0, 0]),
		).toBe("");

		circle3.move_to(30, 10);
		old_circle.set_position(new SSCD_OLD.Vector(30, 10));

		expect(
			validate({ world: world3, old_world }, [0, 1, 1], [0, 1, 1], [0, 0, 0]),
		).toBe("");

		circle3.move_to(30, 30);
		old_circle.set_position(new SSCD_OLD.Vector(30, 30));

		expect(
			validate({ world: world3, old_world }, [0, 0, 0], [0, 1, 1], [0, 1, 1]),
		).toBe("");

		circle3.move_to(10, 30);
		old_circle.set_position(new SSCD_OLD.Vector(10, 30));

		expect(
			validate({ world: world3, old_world }, [0, 0, 0], [1, 1, 0], [1, 1, 0]),
		).toBe("");

		expect(() => {
			circle3.move_to(0, 30);

			expect(
				validate({ world: world3, old_world }, [0, 0, 0], [1, 1, 0], [1, 1, 0]),
			).toBe("");
		}).throws();
	});

	it("[SSCDWorld.add()]", (t) => {
		const world = new SSCDWorld({ grid_size: 16, size: 3 });
		const rectangle = new SSCDRectangle(
			new SSCDVector(32, 32),
			new SSCDVector(16, 16),
		);
		const old_world = new SSCD_OLD.World({ grid_size: 16 });
		const old_rectangle = new SSCD_OLD.Rectangle(
			new SSCD_OLD.Vector(32, 32),
			new SSCD_OLD.Vector(16, 16),
		);

		old_world.add(old_rectangle);
		world.add(rectangle);

		expect(
			validate(
				{ world, old_world },
				[0, 0, 0, 0],
				[0, 0, 0, 0],
				[0, 0, 1, 1],
				[0, 0, 1, 1],
			),
		).toBe("");
	});

	it("[SSCDWorld -> SSCDRectangle.move_to()]", (t) => {
		const world = new SSCDWorld({ grid_size: 16, size: 3 });
		const rectangle = new SSCDRectangle(
			new SSCDVector(0, 0),
			new SSCDVector(16, 16),
		);
		const old_world = new SSCD_OLD.World({ grid_size: 16 });
		const old_rectangle = new SSCD_OLD.Rectangle(
			new SSCD_OLD.Vector(0, 0),
			new SSCD_OLD.Vector(16, 16),
		);

		old_world.add(old_rectangle);
		world.add(rectangle);

		expect(
			validate({ world, old_world }, [1, 1, 0], [1, 1, 0], [0, 0, 0]),
		).toBe("");

		rectangle.move_to(16, 0);
		old_rectangle.set_position(new SSCD_OLD.Vector(16, 0));

		expect(
			validate({ world, old_world }, [0, 1, 1], [0, 1, 1], [0, 0, 0]),
		).toBe("");

		rectangle.move_to(16, 16);
		old_rectangle.set_position(new SSCD_OLD.Vector(16, 16));

		expect(
			validate({ world, old_world }, [0, 0, 0], [0, 1, 1], [0, 1, 1]),
		).toBe("");

		rectangle.move_to(0, 16);
		old_rectangle.set_position(new SSCD_OLD.Vector(0, 16));

		expect(
			validate({ world, old_world }, [0, 0, 0], [1, 1, 0], [1, 1, 0]),
		).toBe("");

		rectangle.move_to(32, 32);
		old_rectangle.set_position(new SSCD_OLD.Vector(32, 32));

		expect(
			validate(
				{ world, old_world },
				[0, 0, 0, 0],
				[0, 0, 0, 0],
				[0, 0, 1, 1],
				[0, 0, 1, 1],
			),
		).toBe("");
	});

	it("[SSCDWorld -> add(), readonly]", (t) => {
		const world = new SSCDWorld({ grid_size: 16, size: 3 });
		const readonly_world = new SSCDWorld({
			grid_size: 16,
			size: 3,
			readonly: true,
		});
		const rectangle = new SSCDRectangle(
			new SSCDVector(32, 32),
			new SSCDVector(16, 16),
		);

		// can't add non-initialized rectangle to read-only world
		expect(() => {
			readonly_world.add(rectangle);
		}).throws();

		world.add(rectangle);

		// can't add rectangle second time to mutable world
		expect(() => {
			world.add(rectangle);
		}).throws();

		expect(() => {
			readonly_world.remove(rectangle);
		}).throws();

		readonly_world.add(rectangle);

		collision: {
			let collision: SSCDRectangle | undefined;
			readonly_world.test_collision(
				new SSCDCircle(rectangle.__position, 1),
				undefined,
				(shape) => {
					collision = shape;
				},
			);
			expect(collision).toBe(rectangle);
		}

		readonly_world.clear();

		no_collision: {
			let collision: SSCDRectangle | undefined;
			readonly_world.test_collision(
				new SSCDCircle(rectangle.__position, 1),
				undefined,
				(shape) => {
					collision = shape;
				},
			);
			expect(collision).toBe(undefined);
		}

		readonly_world.add(rectangle);

		collision: {
			let collision: SSCDRectangle | undefined;
			readonly_world.test_collision(
				new SSCDCircle(rectangle.__position, 1),
				undefined,
				(shape) => {
					collision = shape;
				},
			);
			expect(collision).toBe(rectangle);
		}
	});
});
