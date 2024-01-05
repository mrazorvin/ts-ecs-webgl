import { Hash } from "./Hash";
import { IComponent } from "./Component";
import {
	TestComponent1,
	TestComponent2,
	TestComponent3,
} from "./world_spec/world_component_fixtures";
import { expect, it } from "vitest";

const HEAD_HASH = new Hash(IComponent, undefined);

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function cmp(v1: any, v2: any) {
	expect(v1).toBe(v2);
}

it("[World -> Hash]", () => {
	const hash1 = HEAD_HASH.add(TestComponent1);
	const hash2 = HEAD_HASH.add(TestComponent2);
	cmp(hash1, HEAD_HASH.add(TestComponent1));
	cmp(hash2, HEAD_HASH.add(TestComponent2));

	expect(hash1).not.toBe(HEAD_HASH);
	expect(hash2).not.toBe(HEAD_HASH);

	const hash12 = hash1.add(TestComponent2);
	const hash21 = hash2.add(TestComponent1);
	cmp(hash12, hash21);

	expect(hash12).not.toBe(hash1);
	expect(hash12).not.toBe(hash2);

	const hash123 = hash12.add(TestComponent3);
	const hash213 = hash12.add(TestComponent3);
	const hash312 = HEAD_HASH.add(TestComponent3)
		.add(TestComponent1)
		.add(TestComponent2);
	cmp(hash123, hash213);
	cmp(hash213, hash312);

	expect(hash123).not.toBe(hash1);
	expect(hash123).not.toBe(hash2);
	expect(hash123).not.toBe(hash12);

	cmp(hash123.value, TestComponent3);
	cmp(hash312.prev?.value, TestComponent2);
	cmp(hash312.prev?.prev?.value, TestComponent1);
});
