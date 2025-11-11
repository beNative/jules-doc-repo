# SQLite Database Schema for a Versioned Document Tree

This document provides a detailed explanation of the SQLite database schema designed for an application that visually organizes documents in a treeview structure. The schema is designed to be scalable, high-performance, and extensible, supporting features like document versioning, hierarchical organization, and full-text search.

The complete SQL schema definition can be found in the `database_schema.sql` file.

## Schema Design Rationale

The schema is designed around a few core concepts:

-   **Nodes:** Both folders and documents are treated as "nodes" in the tree, which simplifies the data model.
-   **Closure Table for Hierarchy:** The tree structure is represented using the Closure Table pattern, which provides a good balance of performance and flexibility for hierarchical queries.
-   **Document Versioning:** Each document can have multiple versions, with the content of each version stored separately.
-   **Full-Text Search:** SQLite's FTS5 extension is used for efficient full-text search of document content.

## Table Definitions

### `nodes`

This table stores the metadata for every node in the tree, whether it's a folder or a document.

| Column       | Type    | Description                                                                 |
| :----------- | :------ | :-------------------------------------------------------------------------- |
| `id`         | INTEGER | Primary key for the node.                                                   |
| `parent_id`  | INTEGER | Foreign key to `nodes(id)`, representing the parent node in the hierarchy.  |
| `node_type`  | TEXT    | The type of the node, either 'FOLDER' or 'DOCUMENT'.                        |
| `name`       | TEXT    | The name of the node (e.g., "My Document.txt" or "Source Code").            |
| `created_at` | INTEGER | The timestamp when the node was created.                                    |
| `updated_at` | INTEGER | The timestamp when the node was last updated.                               |

### `document_versions`

This table stores the content of each version of a document.

| Column           | Type    | Description                                                                      |
| :--------------- | :------ | :------------------------------------------------------------------------------- |
| `id`             | INTEGER | Primary key for the version.                                                     |
| `document_id`    | INTEGER | Foreign key to `nodes(id)`, linking this version to a specific document node.    |
| `version_number` | INTEGER | A sequential number for each version of a document.                              |
| `content`        | BLOB    | The actual content of the document version, stored as a binary large object.     |
| `created_at`     | INTEGER | The timestamp when this version was created.                                     |

### `node_tree` (Closure Table)

This table stores all the paths in the tree, allowing for efficient querying of ancestors and descendants.

| Column          | Type    | Description                                                          |
| :-------------- | :------ | :------------------------------------------------------------------- |
| `ancestor_id`   | INTEGER | Foreign key to `nodes(id)`, representing the ancestor in a path.     |
| `descendant_id` | INTEGER | Foreign key to `nodes(id)`, representing the descendant in a path.   |
| `depth`         | INTEGER | The distance between the ancestor and the descendant.                |

### `document_content_fts` (FTS5 Virtual Table)

This is a virtual table that provides full-text search capabilities on the `content` column of the `document_versions` table.

## Hierarchy Management

The `node_tree` table is automatically maintained by triggers:

-   `after_nodes_insert`: When a new node is inserted, this trigger adds the necessary entries to the `node_tree` table to represent its position in the hierarchy.
-   `after_nodes_update_parent`: When a node's `parent_id` is updated (i.e., the node is moved), this trigger updates the `node_tree` table to reflect the new hierarchy.

## Performance Considerations

-   **Indexing:** Indexes are created on frequently queried columns, such as `parent_id` in the `nodes` table and `document_id` in the `document_versions` table.
-   **Deep Tree Traversals:** The Closure Table pattern is optimized for read-heavy operations, such as fetching all descendants of a node.
-   **Full-Text Search:** The FTS5 extension provides a highly efficient way to search the content of documents.

## Extensibility

-   **New Document Types:** The schema can be extended to support new document types by adding a `mime_type` or `file_extension` column to the `document_versions` or `nodes` table.
-   **New Metadata:** Additional metadata can be added by creating a new `node_metadata` table with a foreign key to the `nodes` table.

## Optional Enhancements

-   **Soft Deletes:** A "soft delete" feature can be implemented by adding an `is_deleted` flag to the `nodes` table.
-   **Audit Logs:** An `audit_log` table can be created to track all changes to the database.
-   **Versioned Metadata:** If metadata also needs to be versioned, columns for the metadata can be added to the `document_versions` table.
