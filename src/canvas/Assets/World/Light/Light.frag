#version 300 es
precision mediump float;

uniform vec2 u_Resolution;
uniform highp sampler2DArray u_Collisions;

in vec2 v_UV;
flat in vec2 v_Origin;

// Rendering parameters
#define FADE_POWER		    2.0
#define AMBIENT			      0.5
#define FADE_FREQUENCY		6.0
#define FADE_VARIATION		0.1

#define DELTA	0.001

float rand(in vec2 seed) {
  return fract(11.0 * sin(3.0 * seed.x + 5.0 * seed.y));
}

out vec4 o_Color;
void main(void) {
  float mult = u_Resolution.x / u_Resolution.y;
  vec2 light_pos = vec2(v_Origin.x * mult, v_Origin.y);
  vec2 ray_origin_pos = vec2(v_UV.x * mult, v_UV.y);
  float light_distance = length(light_pos - ray_origin_pos);
  vec4 shadow = texture(u_Collisions, vec3(v_UV / 2.0 + 0.5, 0));

  if(light_distance < 0.5) {
    float light_intensity = max(0.0, 0.5 - light_distance);
    o_Color = vec4(0.55, 0.54, 0.54, 1);
    o_Color *= vec4(light_intensity);
    o_Color = o_Color * mix(light_intensity, 1.0, AMBIENT) * 4.0;
  } else {
    o_Color = vec4(0.0);
  }
}