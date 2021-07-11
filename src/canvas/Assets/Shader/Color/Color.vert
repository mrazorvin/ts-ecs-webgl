#version 300 es

in vec3 a_Position;
layout(location = 4) in float a_Color;

uniform vec3 u_Color[4];

out lowp vec4 color;

void main(void) {
  color = vec4(u_Color[int(a_Color)], 1);
  gl_Position = vec4(a_Position, 1);
}