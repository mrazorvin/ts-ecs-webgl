const SSCDAabb = require("../utils/Aaab");
const SSCDVector = require("../utils/Vector");
const SSCDShape = require("./Shape");

class SSCDRectangle extends SSCDShape {
  // define the rectangle shape
  // @param position - starting position (vector)
  // @param size - rectangle size (vector)
  constructor(position, size) {
    super();

    // set radius and size
    this.__size = size;

    // set starting position
    this.set_position(position);
  }
}

module.exports = SSCDRectangle;

// rectangle prototype
Object.assign(SSCDRectangle.prototype, {
  // set type and collision type
  __type: "rectangle",
  __collision_type: "rectangle",

  // render (for debug purposes)
  // @param ctx - 2d context of a canvas
  // @param camera_pos - optional camera position to transform the render position
  render: function (ctx, camera_pos) {
    // apply camera on position
    var position = this.__position.sub(camera_pos);

    // draw the rect
    ctx.beginPath();
    ctx.rect(position.x, position.y, this.__size.x, this.__size.y);

    // draw stroke
    ctx.lineWidth = "7";
    ctx.strokeStyle = this.__get_render_stroke_color(0.75);
    ctx.stroke();

    // draw fill
    ctx.fillStyle = this.__get_render_fill_color(0.35);
    ctx.fill();
  },

  // return rectangle size
  get_size: function () {
    return this.__size.clone();
  },

  // return axis-aligned-bounding-box
  build_aabb: function () {
    return new SSCDAabb(this.__position, this.__size);
  },

  // return absolute top-left corner
  get_top_left: function () {
    throw new Error("[SSCDWorld -> Rectangle] non-optimized method call");
    this.__top_left_c = this.__top_left_c || this.__position.clone();
    return this.__top_left_c;
  },

  // return absolute bottom-left corner
  get_bottom_left: function () {
    throw new Error("[SSCDWorld -> Rectangle] non-optimized method call, un-commit __update_position_hook");
    this.__bottom_left_c = this.__bottom_left_c || this.__position.add(new SSCDVector(0, this.__size.y));
    return this.__bottom_left_c;
  },

  // return absolute top-right corner
  get_top_right: function () {
    throw new Error("[SSCDWorld -> Rectangle] non-optimized method call, un-commit __update_position_hook");
    this.__top_right_c = this.__top_right_c || this.__position.add(new SSCDVector(this.__size.x, 0));
    return this.__top_right_c;
  },

  // return absolute bottom-right corner
  get_bottom_right: function () {
    throw new Error("[SSCDWorld -> Rectangle] non-optimized method call, un-commit __update_position_hook");
    this.__bottom_right_c = this.__bottom_right_c || this.__position.add(new SSCDVector(this.__size.x, this.__size.y));
    return this.__bottom_right_c;
  },

  // return absolute center
  get_abs_center: function () {
    throw new Error("[SSCDWorld -> Rectangle] non-optimized method call, un-commit __update_position_hook");
    this.__abs_center_c = this.__abs_center_c || this.__position.add(this.__size.divide_scalar(2));
    return this.__abs_center_c;
  },

  // on position change
  // __update_position_hook: function () {
  //   // clear corner cache
  //   this.__top_left_c = undefined;
  //   this.__top_right_c = undefined;
  //   this.__bottom_left_c = undefined;
  //   this.__bottom_right_c = undefined;
  //   this.__abs_center_c = undefined;
  // },
});
