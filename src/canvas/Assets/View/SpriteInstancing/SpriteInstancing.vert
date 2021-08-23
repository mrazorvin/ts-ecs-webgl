#version 300 es

layout(location = 0) in vec2 a_Position;
layout(location = 1) in vec2 a_UV;
layout(location = 2) in mat3 u_Transform;

out mediump vec2 v_UV;

void main(void) {
  gl_Position = vec4(u_Transform * vec3(a_Position, 1), 1);
  v_UV = a_UV;
}