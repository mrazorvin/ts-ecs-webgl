export interface MonsterAssets<ATLAS extends {}> {
  atlas: ATLAS;
  texture_src: string;
}

export function monster_assets<ATLAS extends {}>(atlas: ATLAS, texture_src: string) {
  return { atlas, texture_src } as MonsterAssets<ATLAS>;
}
