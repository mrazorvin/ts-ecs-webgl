const SSCDNotImplementedError = require("../utils/NotImplemented");
const SSCDVector = require("../utils/Vector");
const SSCDCollisionManager = require("./ShapesCollider");
const SSCDWorld = require("../World");

// base shape class
class SSCDShape {
  constructor() {
    // create position and set default type
    this.__position = new SSCDVector();
    this.__world = null;
    this.__last_insert_aabb = null; // will store the aabb at the last time this shape grid was last updated
    this.__found = -1;
  }
}

module.exports = SSCDShape;
const ALL_TAGS_VAL = Number.MAX_SAFE_INTEGER;

// base shape prototype
Object.assign(SSCDShape.prototype, {
  // shape type (need to be overridden by children)
  __type: "shape",

  // define the collision type of this shape (how collision is tested against it)
  __collision_type: null,

  // to detect if this object is a collision shape
  is_shape: true,

  // optional data or object you can attach to shapes
  __data: null,

  // to give unique id to every shape for internal usage
  __next_id: 0,

  // default type flags: everything
  __collision_tags: [],
  __collision_tags_val: ALL_TAGS_VAL,

  // set the collision tags of this shape.
  // for example, if you want this shape to be tagged as "wall", use:
  //		shape.set_collision_tags("walls");
  //
  // you can also set multiple tags, like this:
  //		shape.set_collision_tags(["walls", "glass"]);
  //
  // note: set tags to null to reset all collision tags
  //
  // @param tags - string or list of strings to set as collision tags for this shape.
  //
  set_collision_tags: function (tags) {
    // can't set tags without world instance
    if (this.__world === null) {
      throw new SSCDIllegalActionError("Can't set tags for a shape that is not inside a collision world!");
    }

    // special case - if tags is null, reset tags
    if (tags === null) {
      this.__collision_tags = [];
      this.__collision_tags_val = ALL_TAGS_VAL;
    }
    // else, set tags
    else {
      // set the collision tag hash value
      this.__collision_tags_val = this.__world.__get_tags_value(tags);

      // convert tags to array and store them
      if (!tags instanceof Array) {
        tags = [tags];
      }
      this.__collision_tags = tags;
    }

    // if there's a hook to call when setting tags, call it
    if (this.__update_tags_hook) {
      this.__update_tags_hook();
    }

    // return self
    return this;
  },

  // optional hook to call after updating collision tags
  __update_tags_hook: null,

  // return collision tag(s) (always return a list of strings)
  get_collision_tags: function (tags) {
    return this.__collision_tags;
  },

  // check if collision tags match given tags list.
  // @param tags - tags to check. can either be the tags numeric value, a single string, or a list of strings.
  // note: if provided string or list of strings this shape must be inside a collision world.
  collision_tags_match: function (tags) {
    // if need to convert tags to their numeric value
    if (isNaN(tags)) {
      // if don't have collision world raise error
      if (this.__world === null) {
        throw new SSCDIllegalActionError(
          "If you provide tags as string(s) the shape must be inside a collision world to convert them!"
        );
      }
      tags = this.__world.__get_tags_value(tags);
    }

    // check if tags match
    return (this.__collision_tags_val & tags) !== 0;
  },

  // check collision with other object
  // @param obj - any other shape or vector.
  test_collide_with: function (obj) {
    return SSCDCollisionManager.test_collision(this, obj);
  },

  // repeal an object from this object.
  // this means, in simple words, we push the other object outside to prevent penetration.
  // this works in a very simply way - it iterates and push the penetrating object outside from center until its no longer collided.
  // @param obj: object or vector to repeal (must have move() function).
  // @param force: force factor, the bigger this is the stronger / faster the repealing will be. default to 1.
  // @param iterations: max iterations of repeal-and-test-again routines. default to 1.
  // @param factor_self: factor to multiply force that will apply on this shape. default to 0.
  // @param factor_other: factor to multiply force that will apply on this shape. default to 1.
  // NOTE: this function assume there's collision on start, meaning first iteration of repeal will ALWAYS happen.
  // @return: total movement due to repeling (vector).
  repel: function (obj, force, iterations, factor_self, factor_other) {
    // set defaults
    force = force || 1;
    iterations = iterations || 1;
    if (factor_self === undefined) factor_self = 0;
    if (factor_other === undefined) factor_other = 1;

    // get push vectors
    var push_vector_other, push_vector_self;
    var push_vector = this.get_repel_direction(obj).multiply_scalar_self(force);
    if (factor_other) push_vector_other = push_vector.multiply_scalar(factor_other);
    if (factor_self) push_vector_self = push_vector.multiply_scalar(factor_self * -1);

    // for return value
    var ret = SSCDVector.ZERO.clone();

    // now do the repeling
    var collide = true;
    while (collide && iterations > 0) {
      // decreate iterations count
      iterations--;

      // do pushing
      if (push_vector_other) obj.move(push_vector_other);
      if (push_vector_self) this.move(push_vector_self);
      ret.add_self(push_vector);

      // check if still colliding
      collide = this.test_collide_with(obj);
    }

    // return total pushed
    return ret;
  },

  // get repel direction between this shape and another shape / vector.
  get_repel_direction: function (obj) {
    // get the center of this object
    var center = this.get_abs_center();

    // get center of other object / vector
    var other_center;
    if (obj instanceof SSCDVector) {
      other_center = obj;
    } else {
      other_center = obj.get_abs_center();
    }

    // return repel direction vector
    return other_center.sub(center).normalize_self();
  },

  // return shape fill color for debug rendering.
  // @param opacity - if provided, will use this opacity in return color.
  __get_render_fill_color: function (opacity) {
    // if have override fill color use it:
    if (this.__override_fill_color) {
      return this.__override_fill_color;
    }

    // else, return color based on tag
    return this.__collision_tags_to_color(this.__collision_tags_val, opacity);
  },

  // return shape stroke color for debug rendering.
  // @param opacity - if provided, will use this opacity in return color.
  __get_render_stroke_color: function (opacity) {
    // if have override stroke color use it:
    if (this.__override_stroke_color) {
      return this.__override_stroke_color;
    }

    // else, return color based on tag
    return this.__collision_tags_to_color(this.__collision_tags_val, opacity);
  },

  // set colors to override the debug rendering colors.
  // note1: values accept any html5 color value (eg "rgba(r,g,b,a)" or "white").
  // note2: set nulls to use default colors (based on shape tags).
  // @param fill_color - shape fill color in debug render.
  // @param stroke_color - shape stroke color in debug render.
  set_debug_render_colors: function (fill_color, stroke_color) {
    this.__override_fill_color = fill_color;
    this.__override_stroke_color = stroke_color;
  },

  // default override colors is null - don't override debug colors.
  __override_fill_color: null,
  __override_stroke_color: null,

  // return color based on collision tags
  // @param tags - list with collision tags.
  // @param opacity - output color opacity.
  __collision_tags_to_color: function (tags, opacity) {
    var r = Math.round(Math.abs(Math.sin(tags)) * 255);
    var g = Math.round(Math.abs(Math.cos(tags)) * 255);
    var b = Math.round(r ^ g);
    return "rgba(" + r + "," + g + "," + b + "," + opacity + ")";
  },

  // attach data/object to this shape.
  // @param obj - anything you want to attach to this shape.
  set_data: function (obj) {
    this.__data = obj;
    return this;
  },

  // return the attached data / object of this shape.
  get_data: function () {
    return this.__data;
  },

  // return shape type.
  get_name: function () {
    return this.__type;
  },

  // render shape axis-aligned-bounding-box.
  // @param ctx - 2d context of a canvas.
  // @param camera_pos - optional camera position to transform the render position.
  render_aabb: function (ctx, camera_pos) {
    var box = this.get_aabb();

    // draw the rect
    ctx.beginPath();
    ctx.rect(box.position.x - camera_pos.x, box.position.y - camera_pos.y, box.size.x, box.size.y);

    // draw stroke
    ctx.lineWidth = "1";
    ctx.strokeStyle = "rgba(50, 175, 45, 0.5)";
    ctx.stroke();
  },

  // set the current position of this shape.
  // @param vector - new position.
  set_position: function (vector) {
    this.__position.x = vector.x;
    this.__position.y = vector.y;
    this.__update_position();
    return this;
  },

  // get position (return vector).
  get_position: function () {
    return this.__position.clone();
  },

  // move the shape from its current position.
  // @param vector - vector to move the shape.
  move: function (vector) {
    this.set_position(this.__position.add(vector));
    return this;
  },

  // move the shape from its current position.
  // @param vector - vector to move the shape.
  move_to: function (next_x, next_y) {
    // copy of set_position()
    const obj = this;
    const world = this.__world;
    const aabb = this.__aabb;
    const prev_aabb_x = aabb.position.x;
    const prev_aabb_y = aabb.position.y;

    const prev_grid = {
      min_x: Math.floor(aabb.position.x / world.__params.grid_size),
      min_y: Math.floor(aabb.position.y / world.__params.grid_size),
      max_x: Math.floor((aabb.position.x + aabb.size.x) / world.__params.grid_size),
      max_y: Math.floor((aabb.position.y + aabb.size.y) / world.__params.grid_size),
    };
    this.__position.x = next_x;
    this.__position.y = next_y;

    // get grid range
    if (this.__update_position_hook) {
      this.__update_position_hook();
    }

    // copy of update_position() -> update_aabb_pos()
    this.__update_aabb_pos_fast(next_x, next_y);

    const next_grid = {
      min_x: Math.floor(aabb.position.x / world.__params.grid_size),
      min_y: Math.floor(aabb.position.y / world.__params.grid_size),
      max_x: Math.floor((aabb.position.x + aabb.size.x) / world.__params.grid_size),
      max_y: Math.floor((aabb.position.y + aabb.size.y) / world.__params.grid_size),
    };
    if (
      Math.abs(aabb.position.x - prev_aabb_x) <= world.__params.grid_error &&
      Math.abs(aabb.position.y - prev_aabb_y) <= world.__params.grid_error
    ) {
      return this;
    }

    this.__last_insert_aabb = aabb;

    const start_x = Math.min(prev_grid.min_x, next_grid.min_x);
    const end_x = Math.max(prev_grid.max_x, next_grid.max_x);
    const start_y = Math.min(prev_grid.min_y, next_grid.min_y);
    const end_y = Math.max(prev_grid.max_y, next_grid.max_y);
    const grid = world.__grid;

    if (start_x < 0 || start_y < 0) {
      throw new Error(`[SSCDWorld -> Shape.move_to()] can't move outside of world`);
    }

    // adding row over max rows should also fill all remains rows
    // adding new column over max should also fill

    // add shape to all grid parts
    for (var x = start_x; x <= end_x; x++) {
      for (var y = start_y; y <= end_y; y++) {
        //
        //
        if (x >= next_grid.min_x && x <= next_grid.max_x) {
          if (y >= next_grid.min_y && y <= next_grid.max_y) {
            if (x >= prev_grid.min_x && x <= prev_grid.max_x) {
              if (y >= prev_grid.min_y && y <= prev_grid.max_y) {
                continue;
              } else {
                const row = grid[x] ?? world.fill_columns(x);
                const curr_grid_chunk = row[y] ?? world.fill_rows(x, y);
                curr_grid_chunk.elements[curr_grid_chunk.size] = obj;
                curr_grid_chunk.size += 1;
              }
            } else {
              const row = grid[x] ?? world.fill_columns(x);
              const curr_grid_chunk = row[y] ?? world.fill_rows(x, y);
              curr_grid_chunk.elements[curr_grid_chunk.size] = obj;
              curr_grid_chunk.size += 1;
            }
          } else {
            if (x < prev_grid.min_x || x > prev_grid.max_x || y < prev_grid.min_y || y > prev_grid.max_y) {
              continue;
            }
            const chunk = grid[x][y];
            const idx = chunk.elements.indexOf(obj);
            chunk.elements[idx] = chunk.elements[(chunk.size -= 1)];
          }
        } else {
          if (x < prev_grid.min_x || x > prev_grid.max_x || y < prev_grid.min_y || y > prev_grid.max_y) {
            continue;
          }
          const chunk = grid[x][y];
          const idx = chunk.elements.indexOf(obj);
          chunk.elements[idx] = chunk.elements[(chunk.size -= 1)];
        }
      }
    }

    return this;
  },

  // should be called whenever position changes.
  __update_position: function () {
    // call position-change hook
    if (this.__update_position_hook) {
      this.__update_position_hook();
    }

    // remove bounding box cache
    if (this.__aabb) {
      this.__update_aabb_pos();
    }

    // update in world
    this.__update_parent_world();
  },

  // called to update axis-aligned-bounding-box position.
  // this function called AFTER the position update, meaning new position applied.
  // this function only called if have aabb in cache.
  __update_aabb_pos: function () {
    this.__aabb.position = this.__position;
  },

  __update_aabb_pos_fast: function (next_x, next_y) {
    this.__aabb.position = this.__position;
  },

  // return the absolute center of the shape.
  get_abs_center: function () {
    var aabb = this.get_aabb();
    return aabb.position.add(aabb.size.multiply_scalar(0.5));
  },

  // reset bounding box.
  reset_aabb: function () {
    this.__aabb = undefined;
  },

  // update this shape in parent world (call this when shape change position or change and need to notify world).
  __update_parent_world: function () {
    if (this.__world) {
      this.__world.__update_shape_grid(this);
    }
  },

  // optional hook you can override that will be called whenever shape position changes.
  __update_position_hook: null,

  // render (for debug purposes).
  // @param ctx - 2d context of a canvas.
  // @param camera_pos - optional camera position to transform the render position.
  render: function (ctx, camera_pos) {
    throw new SSCDNotImplementedError();
  },

  // build the shape's axis-aligned bounding box.
  build_aabb: function () {
    throw new SSCDNotImplementedError();
  },

  // return the axis-aligned-bounding-box of this shape.
  get_aabb: function () {
    return this.__aabb ?? (this.__aabb = this.build_aabb());
  },
});
