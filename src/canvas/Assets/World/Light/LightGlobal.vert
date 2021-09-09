#version 300 es

in vec2 a_Position;
in vec2 a_UV;

out mediump vec2 v_UV;
void main(void) {
  gl_Position = vec4(a_Position, 1, 1);
  v_UV = a_UV;
}