export interface MonsterAssets<ATLAS extends {}> {
  atlas: ATLAS;
  sheet_src: string;
  sheet_n_src?: string;
}

export function monster_assets<ATLAS extends {}>(atlas: ATLAS, sheet_src: string, sheet_n_src?: string) {
  return { atlas, sheet_src, sheet_n_src } as MonsterAssets<ATLAS>;
}
