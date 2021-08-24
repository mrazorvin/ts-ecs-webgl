#version 300 es

layout(location = 0) in vec2 a_Position;
layout(location = 1) in vec2 a_UV;
layout(location = 2) in vec2 a_Frame;
layout(location = 3) in mat3 a_Transform;

out mediump vec2 v_UV;

void main(void) {
  gl_Position = vec4(a_Transform * vec3(a_Position, 1), 1);
  v_UV = a_UV + a_Frame;
}