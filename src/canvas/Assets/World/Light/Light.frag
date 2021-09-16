#version 300 es
precision mediump float;

uniform vec2 u_Resolution;

in vec2 v_UV;
flat in vec2 v_Origin;

// Rendering parameters
#define FADE_POWER		    2.0
#define AMBIENT			      0.5
#define FADE_FREQUENCY		6.0
#define FADE_VARIATION		0.1

#define DELTA	0.001

out vec4 o_Color;
void main(void) {
  float mult = u_Resolution.x / u_Resolution.y;
  vec2 light_pos = vec2(v_Origin.x * mult, v_Origin.y);
  vec2 ray_origin_pos = vec2(v_UV.x * mult, v_UV.y);
  vec2 light_direction = light_pos - ray_origin_pos;
  float light_distance = length(light_direction);

  if(light_distance < 1.0) {
    float light_intensity = max(0.0, 0.5 - light_distance);
    o_Color = vec4(0.55, 0.54, 0.54, 1);
    o_Color *= vec4(light_intensity);
    o_Color = o_Color * mix(light_intensity, 1.0, AMBIENT) * 4.0;
    o_Color = vec4(o_Color.rgb, max(o_Color.r, 0.01));
  } else {
    discard;
  }
}