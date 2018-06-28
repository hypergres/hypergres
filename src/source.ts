/**
 * An Source is a specific data collection exposed by a Provider. For example,
 * Tables or Views within a relational database.
 */
export interface Source {
  /**
   * The unique name of this Source. For example, the name of a Table within a
   * relational database
   */
  name: string;

  /**
   * A list of uniquely defining property names on an Source. For example, a
   * list of Primary Keys.
   */
  identifyingProperties: string[];

  /**
   * A list of Sources that *this* Source has relations to.
   */
  has: Relationship[];

  /**
   * A list of Sources that have relations to *this* Source.
   */
  belongsTo: Relationship[];
}

/**
 * Describes the nature of a relationship between two Sources. For example, a
 * foreign key relationship between two Tables within a relational database.
 */
export interface Relationship {
  /**
   * The name of the related Source
   */
  relationName: string;

  /**
   * The name of the property in *this* Source. For example, the name of the
   * Foreign Key.
   */
  localProperty: string;

  /**
   * The name of the property in the *related* Source. For example, the name of
   * the Primary Key in the Table being referenced.
   */
  foreignProperty: string;
}

/**
 * Describes an Source according to the JSON Schema v4 standard
 */
export interface Schema {
  $schema: string;
  title: string;
  type: string;
  properties: SchemaProperties;
  required: string[];
}

/**
 * Describes an Source's properties according to the JSON Schema v4 standard
 */
export interface SchemaProperties {
  [name: string]: PropertyAttributes;
}

/**
 * Describes the attributes of an Source's properties according to the JSON
 * Schema v4 standard
 */
export interface PropertyAttributes {
  type: string;
  format?: string;
  readOnly?: boolean;
  enum?: any[];
  minProperties?: number;
  additionalProperties?: boolean;
  properties?: {
    [key: string]: PropertyAttributes
  };
}
