import { glMatrix, mat3 } from "gl-matrix";
import { expect, it } from "vitest";

glMatrix.ARRAY_TYPE = Array;

const g_x = 6;
const g_y = 6;
const g_width = 4;
const g_height = 4;
const g_center_x = g_width / 2;
const g_center_y = g_height / 2;
const g_rotate = glMatrix.toRadian(90);
const g_scale_x = 2;
const g_scale_y = 3;

console.log(g_rotate);

function fast_transform(
	out: number[] | Float32Array,
	x: number,
	y: number,
	width: number,
	height: number,
	rotate: number,
	scale_x: number,
	scale_y: number,
) {
	const s = rotate === 0 ? 0 : Math.sin(rotate);
	const c = rotate === 0 ? 1 : Math.cos(rotate);
	const center_x = width / 2;
	const center_y = height / 2;

	out[0] = c * scale_x;
	out[1] = s * scale_x;
	out[2] = 0;
	out[3] = -s * scale_y;
	out[4] = +c * scale_y;
	out[5] = 0;
	out[6] =
		-center_x * (c * scale_x) - center_y * (-s * scale_y) + (center_x + x);
	out[7] =
		-center_x * (s * scale_x) - center_y * (+c * scale_y) + (center_y + y);
	out[8] = 1;

	return out;
}

it("mat3 vs inline", () => {
	const view = mat3.create();
	mat3.fromTranslation(view, [g_x, g_y]);
	mat3.translate(view, view, [g_center_x, g_center_y]);
	mat3.rotate(view, view, g_rotate);
	mat3.scale(view, view, [g_scale_x, g_scale_y]);
	mat3.translate(view, view, [-g_center_x, -g_center_y]);

	expect(
		fast_transform(
			[],
			g_x,
			g_y,
			g_width,
			g_height,
			g_rotate,
			g_scale_x,
			g_scale_y,
		),
	).toEqual(view as number[]);
});
