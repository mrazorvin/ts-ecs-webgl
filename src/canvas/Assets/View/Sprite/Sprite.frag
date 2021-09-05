#version 300 es

precision mediump float;

uniform highp sampler2DArray u_Image[16];

flat in vec2 v_Resloution;
flat in float v_Color;
flat in int v_Image;
in vec2 v_UV;

out vec4 o_Color;

vec4 blur9(sampler2DArray image, vec2 uv, vec2 resolution, vec2 direction) {
  vec4 pixel = texture(image, vec3(uv, 0));
  if(v_Color > 8.0) {
    vec4 color = vec4(0.0);
    vec2 off1 = vec2(1.3846153846) * direction;
    vec2 off2 = vec2(3.2307692308) * direction;
    color += pixel * 0.2270270270;
    color += texture(image, vec3(uv + (off1 / resolution), 0)) * 0.3162162162;
    color += texture(image, vec3(uv - (off1 / resolution), 0)) * 0.3162162162;
    color += texture(image, vec3(uv + (off2 / resolution), 0)) * 0.0702702703;
    color += texture(image, vec3(uv - (off2 / resolution), 0)) * 0.0702702703;
    return color;
  } else {
    return pixel;
  }
}

vec4 sampler(int pos, vec2 uv) {
  vec2 resolution = v_Resloution * 2.0;
  vec2 direction = vec2(1, 0);
  if(pos == 0)
    return blur9(u_Image[0], uv, resolution, direction);
  if(pos == 1)
    return blur9(u_Image[1], uv, resolution, direction);
  if(pos == 2)
    return blur9(u_Image[2], uv, resolution, direction);
  if(pos == 3)
    return blur9(u_Image[3], uv, resolution, direction);
  if(pos == 4)
    return blur9(u_Image[4], uv, resolution, direction);
  if(pos == 5)
    return blur9(u_Image[5], uv, resolution, direction);
  if(pos == 6)
    return blur9(u_Image[6], uv, resolution, direction);
  if(pos == 7)
    return blur9(u_Image[7], uv, resolution, direction);
  if(pos == 8)
    return blur9(u_Image[8], uv, resolution, direction);
  if(pos == 9)
    return blur9(u_Image[9], uv, resolution, direction);
  if(pos == 10)
    return blur9(u_Image[10], uv, resolution, direction);
  if(pos == 11)
    return blur9(u_Image[11], uv, resolution, direction);
  if(pos == 12)
    return blur9(u_Image[12], uv, resolution, direction);
  if(pos == 13)
    return blur9(u_Image[13], uv, resolution, direction);
  if(pos == 14)
    return blur9(u_Image[14], uv, resolution, direction);
  if(pos == 15)
    return blur9(u_Image[15], uv, resolution, direction);
}


struct BandlimitedPixelInfo {
  vec2 uv0;
  vec2 uv1;
  vec2 uv2;
  vec2 uv3;
  mediump vec4 weights;
  mediump float l;
};

// Given weights, compute a bilinear filter which implements the weight.
// All weights are known to be non-negative, and separable.
vec3 compute_uv_phase_weight(vec2 weights_u, vec2 weights_v) {
	// The sum of a bilinear sample has combined weight of 1, we will need to adjust the resulting sample
	// to match our actual weight sum.
  float w = dot(weights_u.xyxy, weights_v.xxyy);
  float x = weights_u.y / max(weights_u.x + weights_u.y, 0.001);
  float y = weights_v.y / max(weights_v.x + weights_v.y, 0.001);
  return vec3(x, y, w);
}

#define taylor_sin(x) sin(x)

const float bandlimited_PI = 3.14159265359;
const float bandlimited_PI_half = 0.5 * bandlimited_PI;
const float maximum_support_extent = 1.5;

// https://github.com/Themaister/Granite/blob/master/assets/shaders/inc/bandlimited_pixel_filter.h#L52

BandlimitedPixelInfo compute_pixel_weights(vec2 uv, vec2 res, vec2 inv_size, float extent_mod) {
	// Get derivatives in texel space.
	// Need a non-zero derivative.
  vec2 extent = max(fwidth(uv) * res * 1.0, 1.0 / 256.0);

	// Get base pixel and phase, range [0, 1).
  vec2 pixel = uv * res - 0.5;
  vec2 base_pixel = floor(pixel);
  vec2 phase = pixel - base_pixel;

  BandlimitedPixelInfo info;
  mediump vec2 inv_extent = extent_mod / extent;
  if(any(greaterThan(extent, vec2(maximum_support_extent)))) {
		// We need to just do regular minimization filtering.
    info = BandlimitedPixelInfo(vec2(0.0), vec2(0.0), vec2(0.0), vec2(0.0), vec4(0.0, 0.0, 0.0, 0.0), 0.0);
  } else if(all(lessThanEqual(extent, vec2(0.5)))) {
		// We can resolve the filter by just sampling a single 2x2 block.
    mediump vec2 shift = 0.5 + 0.5 * taylor_sin(bandlimited_PI_half * clamp(inv_extent * (phase - 0.5), -1.0, 1.0));
    info = BandlimitedPixelInfo((base_pixel + 0.5 + shift) * inv_size, vec2(0.0), vec2(0.0), vec2(0.0), vec4(1.0, 0.0, 0.0, 0.0), 1.0);
  } else {
    mediump float max_extent = max(extent.x, extent.y);
    mediump float l = clamp(1.0 - (max_extent - 1.0) / (maximum_support_extent - 1.0), 0.0, 1.0);

    mediump vec4 sine_phases_x = bandlimited_PI_half * clamp(inv_extent.x * (phase.x + vec4(1.5, 0.5, -0.5, -1.5)), -1.0, 1.0);
    mediump vec4 sines_x = taylor_sin(sine_phases_x);

    mediump vec4 sine_phases_y = bandlimited_PI_half * clamp(inv_extent.y * (phase.y + vec4(1.5, 0.5, -0.5, -1.5)), -1.0, 1.0);
    mediump vec4 sines_y = taylor_sin(sine_phases_y);

    mediump vec2 sine_phases_end = bandlimited_PI_half * clamp(inv_extent * (phase - 2.5), -1.0, 1.0);
    mediump vec2 sines_end = taylor_sin(sine_phases_end);

    mediump vec4 weights_x = 0.5 * (sines_x - vec4(sines_x.yzw, sines_end.x));
    mediump vec4 weights_y = 0.5 * (sines_y - vec4(sines_y.yzw, sines_end.y));

    mediump vec3 w0 = compute_uv_phase_weight(weights_x.xy, weights_y.xy);
    mediump vec3 w1 = compute_uv_phase_weight(weights_x.zw, weights_y.xy);
    mediump vec3 w2 = compute_uv_phase_weight(weights_x.xy, weights_y.zw);
    mediump vec3 w3 = compute_uv_phase_weight(weights_x.zw, weights_y.zw);

    info = BandlimitedPixelInfo((base_pixel - 0.5 + w0.xy) * inv_size, (base_pixel + vec2(1.5, -0.5) + w1.xy) * inv_size, (base_pixel + vec2(-0.5, 1.5) + w2.xy) * inv_size, (base_pixel + 1.5 + w3.xy) * inv_size, vec4(w0.z, w1.z, w2.z, w3.z), l);
  }

  return info;
}

vec4 sample_bandlimited_pixel_array(int pos, vec2 uv, BandlimitedPixelInfo info) {
  vec4 color = sampler(pos, uv);
  mediump vec4 bandlimited = info.weights.x * sampler(pos, info.uv0);
  if (info.weights.x < 1.0) {
    bandlimited += info.weights.y * sampler(pos, info.uv1);
    bandlimited += info.weights.z * sampler(pos, info.uv2);
    bandlimited += info.weights.w * sampler(pos, info.uv3);
  }
  color = mix(color, bandlimited, info.l);

  return color;
}

void main(void) {

  vec4 color = sample_bandlimited_pixel_array(v_Image, v_UV, compute_pixel_weights(v_UV, v_Resloution, 1.0 / v_Resloution, 2.0));
  // vec4 color = my_texture2(v_Image, v_UV);

  if(v_Color > 8.0 && color.a > 0.01) {
    color.r *= 0.05;
    color.g *= 0.05;
    color.b *= 0.05;
    color.a = color.a > 0.3 ? 0.25 : color.a;
  }
  o_Color = color;
}
