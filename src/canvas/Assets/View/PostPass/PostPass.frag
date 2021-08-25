#version 300 es

precision mediump float;

in vec2 v_UV;
uniform sampler2D u_Image;

vec4 myTexture( sampler2D tex, vec2 uv, vec2 res)
{
    uv = uv*res;
    vec2 seam = floor(uv+0.5);
    uv = seam + clamp( (uv-seam)/fwidth(uv), -0.5, 0.5);
    return texture(tex, uv/res);
}


out vec4 o_Color;
void main(void) {
  // if (v_UV.x < 0.535) {
  // o_Color = myTexture(u_Image, v_UV, vec2(980, 360));
  // } 
  o_Color = texture(u_Image, v_UV); 
}