#version 300 es

precision mediump float;

uniform sampler2D u_Image;
in vec2 v_UV;
out vec4 o_Color;


void main(void) {
  o_Color = texture(u_Image, v_UV);
}


