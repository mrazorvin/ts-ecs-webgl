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
  cleared = true;
  size = 0;
}

// 1. track added cells - collections
// 2. on delete keep everything as it is, add deleted tag
// 3. on re-adding, clear tracked cells, if they not cleared yet
// 3.1 it's possible to has something like clearing id adn if if > than delete id, then don't clear collection
// 4. clear remains cells

// in fact the only place when we need guaranty that elements was removed is pool
// for such case we must set the special_id - when element was removed
// then we need to iterate over collections and check if they was cleared after
// or before element removing
// for example if world.id = 3;
// deleting element will set __deleted = 3;
// adding this element again required to check if all collections was cleared after 3
// so we will check if collection.cleared was 3 or higher, if so then add element to collection
// if not then clear collection and set cleared to 4

module.exports = SSCDWorld;

// collision world prototype
Object.assign(SSCDWorld.prototype, {
  // init the world
  __init_world: function (params) {
    // set defaults
    params = params || {};
    params.grid_size = params.grid_size || 512;
    params.grid_error = params.grid_error !== undefined ? params.grid_error : 2;

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

    // all the shapes currently in this world
    this.__all_shapes = {};

    // create the empty collision flags dictionary
    this.__collision_tags = {};
    this.__next_coll_tag = 0;
  },

  // define a new collision tag
  __create_collision_tag: function (name) {
    // if already exist throw exception
    if (this.__collision_tags[name]) {
      throw new SSCDIllegalActionError("Collision tag named '" + name + "' already exist!");
    }

    // set collision tag
    this.__collision_tags[name] = 1 << this.__next_coll_tag++;
  },

  // all-tags flags
  _ALL_TAGS_VAL: Number.MAX_SAFE_INTEGER || 4294967295,

  // clean-up world memory
  cleanup: function () {
    // iterate over grid rows
    var rows = Object.keys(this.__grid);
    for (var _i = 0; _i < rows.length; ++_i) {
      var i = rows[_i];

      // iterate over grid columns in current row:
      var columns = Object.keys(this.__grid[i]);
      for (var _j = 0; _j < columns.length; ++_j) {
        var j = columns[_j];

        // if empty grid chunk delete it
        if (this.__grid[i][j].length === 0) {
          delete this.__grid[i][j];
        }
      }

      // if no more columns are left in current row delete the row itself
      if (Object.keys(this.__grid[i]).length === 0) {
        delete this.__grid[i];
      }
    }
  },

  // get the hash value of a list of collision tags or individual tag
  // tags can either be a single string or a list of strings
  __get_tags_value: function (tags) {
    // special case: undefined return all possible tags
    if (tags === undefined) {
      return this._ALL_TAGS_VAL;
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
    if (this.__collision_tags[name] === undefined) {
      this.__create_collision_tag(name);
    }

    // return collision tag
    return this.__collision_tags[name];
  },

  // get the grid range that this object touches
  __get_grid_range: function (obj) {
    // get bounding box
    var aabb = obj.get_aabb();

    // calc all grid chunks this shape touches
    var min_i = Math.floor(aabb.position.x / this.__params.grid_size);
    var min_j = Math.floor(aabb.position.y / this.__params.grid_size);
    var max_i = Math.floor((aabb.position.x + aabb.size.x) / this.__params.grid_size);
    var max_j = Math.floor((aabb.position.y + aabb.size.y) / this.__params.grid_size);

    // return grid range
    return {
      min_x: min_i,
      min_y: min_j,
      max_x: max_i,
      max_y: max_j,
    };
  },

  // add collision object to world
  add: function (obj) {
    // if object already in world throw exception
    if (obj.__world !== null && obj.__world !== this && obj.__deleted === false) {
      throw new SSCDIllegalActionError("Object to add is already in a collision world!");
    }

    // get grid range
    var grids = this.__get_grid_range(obj);
    if (grids.min_x < 0 || grids.min_y < 0) {
      throw new Error(`Negative world coordinates not supported ${JSON.stringify(grids)}`);
    }

    // add shape to all grid parts
    for (var i = grids.min_x; i <= grids.max_x; ++i) {
      for (var j = grids.min_y; j <= grids.max_y; ++j) {
        // make sure lists exist
        this.__grid[i] = this.__grid[i] || [];
        var curr_grid_chunk = (this.__grid[i][j] = this.__grid[i][j] || new Row());

        curr_grid_chunk.elements[curr_grid_chunk.size] = obj;
        curr_grid_chunk.size += 1;
      }
    }

    // set world and grid chunks boundaries
    obj.__world = this;
    obj.__grid_bounderies = grids;
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

    const grid = this.__get_grid_range(obj);
    for (var i = grid.min_x; i <= grid.max_x; ++i) {
      for (var j = grid.min_y; j <= grid.max_y; ++j) {
        const chunk = this.__grid[i][j];
        const idx = chunk.elements.indexOf(obj);
        if (idx === 0) {
          chunk.size = 0;
          continue;
        }
        chunk.elements[idx] = chunk.elements[(chunk.size -= 1)];
      }
    }
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

  // check collision and return first object found.
  // obj: object to check collision with (vector or collision shape)
  // collision_tags: optional single or multiple tags to check collision with
  // return: first object collided with, or null if don't collide with anything
  pick_object: function (obj, collision_tags) {
    var outlist = [];
    if (this.test_collision(obj, collision_tags, outlist, 1)) {
      return outlist[0];
    }
    return null;
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
    var grid;

    // if shape is in this world, use its grid range from cache
    if (obj.__world === this) {
      grid = obj.__grid_bounderies;
    }
    // if not in world, generate grid range
    else {
      grid = this.__get_grid_range(obj);
    }

    const current_search = this.__search_id++;

    // iterate over grid this shape touches
    for (var i = grid.min_x; i <= grid.max_x; ++i) {
      // skip empty rows
      if (this.__grid[i] === undefined) continue;

      // iterate on current grid row
      for (var j = grid.min_y; j <= grid.max_y; ++j) {
        var curr_grid_chunk = this.__grid[i][j];

        // skip empty grid chunks
        if (curr_grid_chunk === undefined) continue;

        // iterate over objects in cell
        let size = curr_grid_chunk.size;
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
          if (this.__do_collision(curr_obj, obj)) {
            if (cb(curr_obj) === false) return true;
          }
        }
      }
    }
  },

  // do actual collision check between source and target
  __do_collision: function (src, target) {
    return src.test_collide_with(target);
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
});

class SSCDIllegalActionError extends Error {
  constructor(message) {
    this.name = "Illegal Action";
    this.message = message || "";
  }
}
