const SSCDCircle = require("./shapes/Circle");
const SSCDMath = require("./utils/Math");
const SSCDVector = require("./utils/Vector");

// a collision world. you create an instance of this class and add bodies to it to check collision.
//
// params is an optional dictionary with the following optional settings:
//			grid_size: 		for better performance, the world is divided into a grid of world-chunks and when collision is checked we will
//								only match objects from the same chunk(s) on grid. this param defines the grid size. default to 512.
//			grid_error: 	max amount of pixels a shape can move before updating the collision grid. default to 2.
//								you can increase this number to make moving objects more efficient for the price of sometimes
//								less accurate collision around the edges. set to 0 if you want to always update grid (useful if all your moving objects move fast)
class SSCDWorld {
  constructor(params) {
    this.__init_world(params);
  }
}

class Row {
  elements = [];
  calculated = 0;
  size = 0;

  getSize(revision) {
    return revision > this.calculated ? 0 : this.size;
  }

  addElement(revision, element) {
    if (revision > this.calculated) {
      this.calculated = revision;
      this.size = 0;
    }

    this.elements[this.size] = element;
    this.size += 1;
  }
}

let __next_coll_tag = 0;
const ALL_TAGS_VAL = Number.MAX_SAFE_INTEGER;
class GlobalTagsCache {}

SSCDWorld.Row = Row;

module.exports = SSCDWorld;

// collision world prototype
Object.assign(SSCDWorld.prototype, {
  // init the world
  __init_world: function (params) {
    // set defaults
    params = params || {};
    params.grid_size = params.grid_size || 512;
    params.grid_error = params.grid_error !== undefined ? params.grid_error : 2;

    this.__readonly = params.readonly ? 1 : 0;

    // create grid and set params
    this.__grid = [];
    this.__params = params;

    const size = params.size ?? 50;
    for (let i = 0; i < size; i++) {
      for (let z = 0; z < size; z++) {
        this.__grid[i] = this.__grid[i] ?? [];
        this.__grid[i][z] = new Row();
      }
    }
  },

  // define a new collision tag
  __create_collision_tag: function (name) {
    // if already exist throw exception
    if (GlobalTagsCache[name]) {
      throw new SSCDIllegalActionError("Collision tag named '" + name + "' already exist!");
    }

    if (__next_coll_tag > 30) {
      throw new Error(`[SSCDWold] max tag reached`);
    }

    // set collision tag
    GlobalTagsCache[name] = 1 << __next_coll_tag++;
  },

  // get the hash value of a list of collision tags or individual tag
  // tags can either be a single string or a list of strings
  __get_tags_value: function (tags) {
    // special case: undefined return all possible tags
    if (tags === undefined) {
      return ALL_TAGS_VAL;
    }

    // single tag:
    if (typeof tags === "string") {
      return this.__collision_tag(tags);
    }

    // else, assume a list
    var ret = 0;
    for (var i = 0; i < tags.length; ++i) {
      ret |= this.__collision_tag(tags[i]);
    }
    return ret;
  },

  // return the value of a single collision tag, define it if not exist
  __collision_tag: function (name) {
    // if tag doesn't exist create it
    if (GlobalTagsCache[name] === undefined) {
      this.__create_collision_tag(name);
    }

    // return collision tag
    return GlobalTagsCache[name];
  },

  // add collision object to world
  add: function (obj) {
    // if object already in world throw exception
    if ((obj.__world !== null && this.__readonly === 0) || (obj.__world === null && this.__readonly > 0)) {
      throw new SSCDIllegalActionError(
        "object is already in a collision world or you trying to add object to non-initialized world"
      );
    }

    // get grid range
    var aabb = obj.get_aabb();
    var min_x = Math.floor(aabb.position.x / this.__params.grid_size);
    var min_y = Math.floor(aabb.position.y / this.__params.grid_size);
    var max_x = Math.floor((aabb.position.x + aabb.size.x) / this.__params.grid_size);
    var max_y = Math.floor((aabb.position.y + aabb.size.y) / this.__params.grid_size);
    if (min_x < 0 || min_y < 0) {
      throw new Error(`Negative world coordinates not supported ${JSON.stringify({ min_x, min_y })}`);
    }

    // add shape to all grid parts
    const grid = this.__grid;
    for (var x = min_x; x <= max_x; ++x) {
      for (var y = min_y; y <= max_y; ++y) {
        // make sure lists exist
        var column = grid[x] ?? this.fill_columns(x);
        var chunk = column[y] ?? this.fill_rows(x, y);
        chunk.addElement(this.__readonly, obj);
      }
    }

    // set world and grid chunks boundaries
    if (this.__readonly === 0) {
      obj.__world = this;
    }

    // TODO: possible optimization - remove __last_insert_aabb and this call
    obj.__last_insert_aabb = obj.get_aabb().clone();

    // return the newly added object
    return obj;
  },

  // return all shapes in world
  get_all_shapes: function () {
    var ret = [];
    for (var key in this.__all_shapes) {
      if (this.__all_shapes.hasOwnProperty(key)) {
        ret.push(this.__all_shapes[key]);
      }
    }
    return ret;
  },

  // remove object from world
  remove: function (obj) {
    // if object is not in this world throw exception
    if (obj.__world !== this) {
      throw new SSCDIllegalActionError("Object to remove is not in this collision world!");
    }

    var aabb = obj.get_aabb();
    var min_x = Math.floor(aabb.position.x / this.__params.grid_size);
    var min_y = Math.floor(aabb.position.y / this.__params.grid_size);
    var max_x = Math.floor((aabb.position.x + aabb.size.x) / this.__params.grid_size);
    var max_y = Math.floor((aabb.position.y + aabb.size.y) / this.__params.grid_size);
    for (var x = min_x; x <= max_x; ++x) {
      for (var y = min_y; y <= max_y; ++y) {
        const chunk = this.__grid[x][y];
        const idx = chunk.elements.indexOf(obj);
        chunk.elements[idx] = chunk.elements[(chunk.size -= 1)];
      }
    }

    obj.__world = null;
  },

  // update object grid when it moves or resize etc.
  // this function is used internally by the collision shapes.
  __update_shape_grid: function (obj) {
    var curr_aabb = obj.get_aabb();
    if (
      this.__params.grid_error === 0 ||
      Math.abs(curr_aabb.position.x - obj.__last_insert_aabb.position.x) > this.__params.grid_error ||
      Math.abs(curr_aabb.position.y - obj.__last_insert_aabb.position.y) > this.__params.grid_error ||
      Math.abs(curr_aabb.size.x - obj.__last_insert_aabb.size.x) > this.__params.grid_error ||
      Math.abs(curr_aabb.size.y - obj.__last_insert_aabb.size.y) > this.__params.grid_error
    ) {
      this.remove(obj);
      this.add(obj);
    }
  },

  fill_columns: function (x) {
    const length = this.__grid.length;
    for (let i = length; i <= x; i++) {
      this.__grid[i] = [];
    }

    return this.__grid[x];
  },

  fill_rows: function (x, y) {
    const row = this.__grid[x];
    const length = row.length;
    for (let i = length; i <= y; i++) {
      row[i] = new Row();
    }

    return this.__grid[x][y];
  },

  // test collision with vector or object
  // @param obj: object to check collision with, can be either Vector (for point collision) or any collision shape.
  // @param collision_tags: optional string or list of strings of tags to match collision with. if undefined will accept all tags
  // @param out_list: optional output list. if provided, will be filled with all objects collided with. note: collision is more efficient if not provided.
  // @param ret_objs_count: if provided, will limit returned objects to given count.
  // @return true if collided with anything, false otherwise.
  test_collision: function (obj, collision_tags, out_list, ret_objs_count) {
    // default collision flags
    collision_tags = this.__get_tags_value(collision_tags);

    // handle collision with shape
    if (obj.is_shape) {
      return this.__test_collision_shape(obj, collision_tags, out_list, ret_objs_count);
    }
  },

  __search_id: 0,

  // test collision with other shape
  // see test_collision comment for more info
  __test_collision_shape: function (obj, collision_tags_val, cb) {
    var aabb = obj.get_aabb();
    var min_x = Math.floor(aabb.position.x / this.__params.grid_size);
    var min_y = Math.floor(aabb.position.y / this.__params.grid_size);
    var max_x = Math.floor((aabb.position.x + aabb.size.x) / this.__params.grid_size);
    var max_y = Math.floor((aabb.position.y + aabb.size.y) / this.__params.grid_size);

    const current_search = this.__search_id++;

    // iterate over grid this shape touches
    for (var i = min_x; i <= max_x; ++i) {
      // skip empty rows
      if (this.__grid[i] === undefined) continue;

      // iterate on current grid row
      for (var j = min_y; j <= max_y; ++j) {
        var curr_grid_chunk = this.__grid[i][j];

        // skip empty grid chunks
        if (curr_grid_chunk === undefined) continue;

        // iterate over objects in cell
        let size = curr_grid_chunk.getSize(this.__readonly);
        let elements = curr_grid_chunk.elements;
        for (var x = 0; x < size; x++) {
          // get current object
          var curr_obj = elements[x];

          // check if this object was already tested
          if (curr_obj === obj || curr_obj.__found === current_search) {
            continue;
          } else {
            curr_obj.__found = current_search;
          }

          // if collision tags don't match skip this object
          if (!curr_obj.collision_tags_match(collision_tags_val)) {
            continue;
          }

          // if collide with object:
          if (curr_obj.test_collide_with(obj)) {
            if (cb(curr_obj) === false) return true;
          }
        }
      }
    }
  },

  // debug-render all the objects in world
  // canvas: a 2d canvas object to render on.
  // camera_pos: optional, vector that represent the current camera position is 2d space.
  // show_grid: default to true, if set will render background grid that shows which grid chunks are currently active
  // show_aabb: default to true, if set will render objects axis-aligned bounding boxes
  // NOTE: this function will NOT clear canvas before rendering, if you render within a main loop its your responsibility.
  render: function (canvas, camera_pos, show_grid, show_aabb) {
    // set default camera pos if doesn't exist
    camera_pos = camera_pos || SSCDVector.ZERO;

    // set default show_grid and show_aabb
    if (show_grid === undefined) {
      show_grid = true;
    }
    if (show_aabb === undefined) {
      show_aabb = true;
    }

    // get ctx and reset previous transformations
    var ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // get current grid size
    var grid_size = this.__params.grid_size;

    // get grid parts that are visible based on canvas size and camera position
    var min_i = Math.floor(camera_pos.x / grid_size);
    var min_j = Math.floor(camera_pos.y / grid_size);
    var max_i = min_i + Math.ceil(canvas.width / grid_size);
    var max_j = min_j + Math.ceil(canvas.height / grid_size);

    // a list of objects to render
    var render_list = [];

    // iterate over grid
    for (var i = min_i; i <= max_i; ++i) {
      // go over grid row
      for (var j = min_j; j <= max_j; ++j) {
        // get current grid chunk
        var curr_grid_chunk = undefined;
        if (this.__grid[i]) {
          curr_grid_chunk = this.__grid[i][j];
        }

        // render current grid chunk
        if (show_grid) {
          var position = new SSCDVector(i * grid_size, j * grid_size).sub_self(camera_pos);
          ctx.beginPath();
          ctx.rect(position.x, position.y, grid_size - 1, grid_size - 1);
          ctx.lineWidth = "1";
          if (curr_grid_chunk === undefined || curr_grid_chunk.length === 0) {
            ctx.strokeStyle = "rgba(100, 100, 100, 0.255)";
          } else {
            ctx.strokeStyle = "rgba(255, 0, 0, 0.3)";
          }
          ctx.stroke();
        }

        // if current grid chunk has no objects skip
        if (curr_grid_chunk === undefined) {
          continue;
        }

        // iterate over all objects in current grid chunk and add them to render list
        for (var x = 0; x < curr_grid_chunk.length; ++x) {
          var curr_obj = curr_grid_chunk[x];
          if (render_list.indexOf(curr_obj) === -1) {
            render_list.push(curr_grid_chunk[x]);
          }
        }
      }
    }

    // now render all objects in render list
    for (var i = 0; i < render_list.length; ++i) {
      render_list[i].render(ctx, camera_pos);
      if (show_aabb) {
        render_list[i].render_aabb(ctx, camera_pos);
      }
    }
  },

  clear: function () {
    if (this.__readonly === 0) {
      throw new SSCDIllegalActionError(`[SSCDWorld.clear()] you can't clear non-readonly world`);
    }
    this.__readonly += 1;
  },
});

class SSCDIllegalActionError extends Error {
  constructor(message) {
    super();
    this.name = "Illegal Action";
    this.message = message || "";
  }
}
