export class Texture {
  id = new TextureID();

  constructor(public image: HTMLImageElement, public texture: WebGLTexture) {
    if (!image.complete) {
      throw new Error(
        "[new Texture()] can't create texture with unloaded image"
      );
    }
  }
}

export class TextureID {
  #type = TextureID;
}

export namespace Texture {
  export async function load_image(path: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = path;

      if (img.complete) return resolve(img);
      else {
        img.onload = () => resolve(img);
        img.onerror = () => reject(img);
      }
    });
  }

  export function create(gl: WebGL2RenderingContext, image: HTMLImageElement) {
    const texture = gl.createTexture();
    if (texture == null) {
      throw new Error(
        `[Texture -> create()] WebGL can't allocate mem for texture`
      );
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return new Texture(image, texture);
  }
}
