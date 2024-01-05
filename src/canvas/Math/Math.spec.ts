import { glMatrix, mat3, vec2 } from "gl-matrix";
import { expect, it, describe } from "vitest";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function cmp(v1: any, v2: any) {
	expect(v1).toBe(v2);
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function truthy(v1: any) {
	expect(v1).toBe(true);
}

describe("Math", () => {
	it("[Math] cross-type compatibility", () => {
		glMatrix.setMatrixArrayType(Array);
		const array_mat = mat3.identity(mat3.create());
		const array_vec = vec2.fromValues(1, 2);

		// biome-ignore lint/suspicious/useIsArray: <explanation>
		expect(array_mat instanceof Array).toBe(true);

		// biome-ignore lint/suspicious/useIsArray: <explanation>
		expect(array_vec instanceof Array).toBe(true);

		cmp(array_mat[0], 1);
		cmp(array_mat[4], 1);
		cmp(array_mat[8], 1);

		glMatrix.setMatrixArrayType(Float32Array);
		const array32_mat = mat3.identity(mat3.create());
		const array32_vec = vec2.fromValues(1, 2);
		truthy(array32_mat instanceof Float32Array);
		truthy(array32_vec instanceof Float32Array);
		cmp(array32_mat[0], 1);
		cmp(array32_mat[4], 1);
		cmp(array32_mat[8], 1);

		mat3.translate(array32_mat, array32_mat, array_vec);
		cmp(array32_mat[6], 1);
		cmp(array32_mat[7], 2);

		mat3.translate(array_mat, array_mat, array32_vec);
		cmp(array_mat[6], 1);
		cmp(array_mat[7], 2);
	});
});
