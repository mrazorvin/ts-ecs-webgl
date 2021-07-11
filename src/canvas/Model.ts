import { Component } from "@mr/ecs/World";
import { Mesh, MeshID } from "./Render/Mesh";
import { WebGL } from "./Render/WebGL";

export class Model extends Component {
  meshes = new Map<typeof Mesh, MeshID>();

  constructor(...meshes: Array<[typeof Mesh, MeshID]>) {
    super();
    this.meshes = new Map(meshes);
  }

  get<T extends typeof Mesh>(ctx: WebGL, type: T) {
    const id = this.meshes.get(type);
    return id != null ? ctx.meshes.get(id) : undefined;
  }
}
