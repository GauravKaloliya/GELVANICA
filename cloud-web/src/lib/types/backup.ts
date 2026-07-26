import type { EntityType, Entity, EntityProperty } from "./entity";
import type { Block } from "./block";
import type { Relation } from "./relation";
import type { Tag } from "./tag";
import type { Comment } from "./comment";
import type { FileRecord } from "./file";

export interface WorkspaceExport {
  workspace_id: string;
  exported_at: string;
  entity_types: EntityType[];
  entities: Entity[];
  blocks: Block[];
  relations: Relation[];
  tags: Tag[];
  comments: Comment[];
  properties: EntityProperty[];
  files: FileRecord[];
}

export interface ImportResult {
  workspace_id: string;
  imported: {
    entity_types: number;
    entities: number;
    properties: number;
    property_values: number;
    blocks: number;
    relations: number;
    tags: number;
    comments: number;
    files: number;
    entity_files: number;
  };
}
