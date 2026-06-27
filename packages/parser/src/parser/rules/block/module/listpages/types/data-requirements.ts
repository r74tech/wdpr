import type { ListUsersDataRequirement } from "../../listusers/types";
import type { ListPagesQuery } from "./query";
import type { ListPagesVariable } from "./variables";

/**
 * Data requirement for a single ListPages module.
 */
export interface ListPagesDataRequirement {
  /** Unique identifier for this module instance */
  id: number;

  /** Query parameters */
  query: ListPagesQuery;

  /** Variables used in the template */
  neededVariables: ListPagesVariable[];

  /** Indices needed for content{n} */
  contentSectionIndices?: number[];

  /** Lengths needed for preview(n) */
  previewLengths?: number[];

  /** Field names needed for form_data{field} etc. */
  formFields?: string[];

  /** Prefix for tags_linked|prefix */
  tagsLinkPrefix?: string;

  /** Prefix for _tags_linked|prefix */
  hiddenTagsLinkPrefix?: string;

  /**
   * URL attribute prefix for multiple ListPages modules.
   * When set, URL parameters are prefixed, e.g. "page2" -> "/page2_limit/1".
   */
  urlAttrPrefix?: string;

  /**
   * Raw attribute values before URL resolution.
   * Contains original string values that may include "@URL" or "@URL|default".
   */
  rawAttributes: Record<string, string>;
}

/**
 * All data requirements from parsing.
 */
export interface DataRequirements {
  listPages: ListPagesDataRequirement[];
  listUsers: ListUsersDataRequirement[];
}
