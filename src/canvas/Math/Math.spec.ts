import { glMatrix, mat3, vec2 } from "gl-matrix";
import { default as test } from "ava";

test("[Math] cross-type compatibility", (t) => {
  glMatrix.setMatrixArrayType(Array);
  const array_mat = mat3.identity(mat3.create());
  const array_vec = vec2.fromValues(1, 2);
  t.true(array_mat instanceof Array);
  t.true(array_vec instanceof Array);
  t.is(array_mat[0], 1);
  t.is(array_mat[4], 1);
  t.is(array_mat[8], 1);

  glMatrix.setMatrixArrayType(Float32Array);
  const array32_mat = mat3.identity(mat3.create());
  const array32_vec = vec2.fromValues(1, 2);
  t.true(array32_mat instanceof Float32Array);
  t.true(array32_vec instanceof Float32Array);
  t.is(array32_mat[0], 1);
  t.is(array32_mat[4], 1);
  t.is(array32_mat[8], 1);

  mat3.translate(array32_mat, array32_mat, array_vec);
  t.is(array32_mat[6], 1);
  t.is(array32_mat[7], 2);

  mat3.translate(array_mat, array_mat, array32_vec);
  t.is(array_mat[6], 1);
  t.is(array_mat[7], 2);
});
