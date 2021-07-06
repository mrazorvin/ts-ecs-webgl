#version 300 es

in vec3 a_Position;

uniform mediump float u_PointSize;
uniform float u_Angle;

void main(void) {
  gl_PointSize = u_PointSize;
  gl_Position = vec4(cos(u_Angle) * 0.8 + a_Position.x, sin(u_Angle) * 0.8 + a_Position.y, a_Position.z, 1.0);
}