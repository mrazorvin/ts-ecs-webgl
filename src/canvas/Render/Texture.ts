// import * as url from "url:./Ogre.astc";
// import { pixi_compressed_textures } from "./Parser";
// let result: any;
// async function init() {
//   result = pixi_compressed_textures.ASTCLoader.load(await (await (await fetch(url)).blob()).arrayBuffer());
// }
// init();
// if (!image.src.includes("Ogre")) {
//   gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
// } else {
//   var ext = gl.getExtension("WEBGL_compressed_texture_astc");
//   gl.compressedTexImage2D(gl.TEXTURE_2D, 0, result.internalFormat, result.width, result.height, 0, result.astcData);
// }

export class Texture {
  id = new TextureID();

  constructor(
    public image: HTMLImageElement,
    public texture: WebGLTexture,
  ) {
    if (!image.complete) {
      throw new Error("[new Texture()] can't create texture with unloaded image");
    }
  }

  dispose(gl: WebGL2RenderingContext) {
    this.image.src = "";
    gl.deleteTexture(this.texture);
  }
}

let id_seq = 0;

export class TextureID {
  // @ts-expect-error
  #type: TextureID;

  constructor(public id = `${id_seq++}`) {}
}

export namespace TextureID {}

export namespace Texture {
  export import ID = TextureID;

  export async function load_image(path: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = path;

      if (img.complete) {
        return resolve(img);
      }

      img.onload = () => resolve(img);
      img.onerror = () => reject(img);
    });
  }

  export function create_cubemap(gl: WebGL2RenderingContext, images: HTMLImageElement[]) {
    const texture = gl.createTexture();
    if (texture == null) {
      throw new Error("[Texture -> create_cubemap()] WebGL can't allocate mem for texture");
    }

    if (images.length !== 6) {
      throw new Error("[Texture -> create_cubemap()] Cubemap must contains excatly 6 images");
    }

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

    texture_configuration: {
      for (let i = 0; i < images.length; i++) {
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, images[i]);
      }
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

    return new Texture(images[0], texture);
  }

  export function create(
    gl: WebGL2RenderingContext,
    image: HTMLImageElement,
    {
      prev_texture: existed_texture = null as WebGLTexture | null,
      normals_image = null as HTMLImageElement | null,
      mimap = true,
    },
  ) {
    const texture = existed_texture ?? gl.createTexture();
    if (texture == null) {
      throw new Error(`[Texture -> create()] WebGL can't allocate mem for texture`);
    }

    // texture arrays
    // https://gamedev.stackexchange.com/questions/147854/unpacking-sprite-sheet-into-2d-texture-array

    // If texture dosen't have norma maps
    // It's depth === 1 this means it could be accessed via texture(UV);
    //
    // If texture HAVE normal maps, then texture should be accessed
    // via texture(vec3(texture, 1)), and normal map could be acces in first index
    // via texture(vec3(texture, 0)
    //
    // This allows us to crete normal map indedependent shader i.e shader is written with normal map in mind
    // but when normal map non exists it will be ignored
    const normals_depth = 1;
    const texture_depth = normals_image != null ? 2 : 1;

    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, image.width, image.height, texture_depth);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, 0, image.width, image.height, 1, gl.RGBA, gl.UNSIGNED_BYTE, image);
    if (normals_image != null) {
      gl.texSubImage3D(
        gl.TEXTURE_2D_ARRAY,
        0,
        0,
        0,
        1,
        normals_image.width,
        normals_image.height,
        normals_depth,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        normals_image,
      );
    }
    if (mimap) {
      gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
    }
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, null);
    return new Texture(image, texture);
  }
}
