#version 300 es

precision mediump float;

uniform float u_PointSize;

out vec4 result_color;

void main(void) {
  float color = (40.0 - u_PointSize) / 20.0;
  result_color = vec4(color, color, color, 1.0);
}