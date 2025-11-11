-- SQLite Database Schema for a Versioned Document Tree
-- Schema Design by Jules

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Table to store all nodes (folders and documents)
CREATE TABLE nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER,
    node_type TEXT NOT NULL CHECK(node_type IN ('FOLDER', 'DOCUMENT')),
    name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- Table to store document versions
CREATE TABLE document_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    version_number INTEGER NOT NULL,
    content BLOB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES nodes(id) ON DELETE CASCADE,
    UNIQUE(document_id, version_number)
);

-- Closure Table for representing the tree structure
CREATE TABLE node_tree (
    ancestor_id INTEGER NOT NULL,
    descendant_id INTEGER NOT NULL,
    depth INTEGER NOT NULL,
    PRIMARY KEY (ancestor_id, descendant_id),
    FOREIGN KEY (ancestor_id) REFERENCES nodes(id) ON DELETE CASCADE,
    FOREIGN KEY (descendant_id) REFERENCES nodes(id) ON DELETE CASCADE
);

-- FTS5 virtual table for full-text search on document content
CREATE VIRTUAL TABLE document_content_fts USING fts5(
    content,
    content_rowid='id',
    content='document_versions'
);

-- Triggers to keep the FTS index up-to-date with the document_versions table
CREATE TRIGGER after_document_versions_insert AFTER INSERT ON document_versions
BEGIN
    INSERT INTO document_content_fts(rowid, content) VALUES (new.id, new.content);
END;

CREATE TRIGGER after_document_versions_delete AFTER DELETE ON document_versions
BEGIN
    INSERT INTO document_content_fts(document_content_fts, rowid, content) VALUES ('delete', old.id, old.content);
END;

CREATE TRIGGER after_document_versions_update AFTER UPDATE ON document_versions
BEGIN
    INSERT INTO document_content_fts(document_content_fts, rowid, content) VALUES ('delete', old.id, old.content);
    INSERT INTO document_content_fts(rowid, content) VALUES (new.id, new.content);
END;

-- Trigger to update the 'updated_at' timestamp on nodes
CREATE TRIGGER trigger_nodes_updated_at AFTER UPDATE ON nodes
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at -- Prevent recursion
BEGIN
    UPDATE nodes SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

-- Trigger to maintain the closure table after a new node is inserted
CREATE TRIGGER after_nodes_insert AFTER INSERT ON nodes
BEGIN
    -- Add the self-reference link
    INSERT INTO node_tree (ancestor_id, descendant_id, depth)
    VALUES (NEW.id, NEW.id, 0);

    -- If the node has a parent, add links to all ancestors
    INSERT INTO node_tree (ancestor_id, descendant_id, depth)
    SELECT p.ancestor_id, c.descendant_id, p.depth + c.depth + 1
    FROM node_tree AS p, node_tree AS c
    WHERE p.descendant_id = NEW.parent_id AND c.ancestor_id = NEW.id;
END;

-- Trigger to maintain the closure table after a node is moved
CREATE TRIGGER after_nodes_update_parent AFTER UPDATE OF parent_id ON nodes
FOR EACH ROW
WHEN OLD.parent_id IS NOT NEW.parent_id
BEGIN
    -- Delete old hierarchy links for the moved subtree from its old ancestors
    DELETE FROM node_tree
    WHERE descendant_id IN (SELECT descendant_id FROM node_tree WHERE ancestor_id = OLD.id)
    AND ancestor_id IN (SELECT ancestor_id FROM node_tree WHERE descendant_id = OLD.id AND ancestor_id != descendant_id);

    -- Insert new hierarchy links for the moved subtree to its new ancestors
    INSERT INTO node_tree (ancestor_id, descendant_id, depth)
    SELECT
        p.ancestor_id,
        c.descendant_id,
        p.depth + c.depth + 1
    FROM
        node_tree p,
        node_tree c
    WHERE
        p.descendant_id = NEW.parent_id
        AND c.ancestor_id = OLD.id;
END;

-- Indexes for performance optimization
CREATE INDEX idx_nodes_parent_id ON nodes(parent_id);
CREATE INDEX idx_nodes_node_type ON nodes(node_type);
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_node_tree_descendant ON node_tree(descendant_id);
