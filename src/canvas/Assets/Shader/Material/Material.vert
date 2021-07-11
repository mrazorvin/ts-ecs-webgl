#version 300 es

in vec2 a_Position;
in vec2 a_UV;

uniform mat3 u_Transform;
uniform vec2 u_Frame;

out mediump vec2 v_UV;

void main(void) {
  gl_Position = vec4(u_Transform * vec3(a_Position, 1), 1);
  v_UV = a_UV + u_Frame;
}