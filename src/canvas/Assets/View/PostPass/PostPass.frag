#version 300 es

precision mediump float;

in vec2 v_UV;
uniform sampler2D u_Image;

out vec4 o_Color;
void main(void) {
  o_Color = texture(u_Image, v_UV); 
}