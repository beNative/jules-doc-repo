import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import BetterSqlite3 from 'better-sqlite3';
import { readFileSync } from 'fs';

let db;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, '../renderer/index.html'));
}

app.whenReady().then(() => {
  // Initialize database
  const dbPath = path.join(app.getPath('userData'), 'database.db');
  db = new BetterSqlite3(dbPath);

  // Run schema to create tables if they don't exist
  const schema = readFileSync(path.join(__dirname, '../../database/database_schema.sql'), 'utf-8');
  db.exec(schema);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    db.close();
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-nodes', () => {
  const stmt = db.prepare(`
    SELECT n.id, n.parent_id, n.name, n.node_type
    FROM nodes n
  `);
  return stmt.all();
});

ipcMain.handle('get-document-content', (event, documentId) => {
  const stmt = db.prepare(`
    SELECT content
    FROM document_versions
    WHERE document_id = ?
    ORDER BY version_number DESC
    LIMIT 1
  `);
  const result = stmt.get(documentId);
  return result ? result.content.toString('utf-8') : '';
});

ipcMain.handle('save-document-content', (event, { documentId, content }) => {
  const getNextVersion = db.prepare('SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM document_versions WHERE document_id = ?');
  const { next_version } = getNextVersion.get(documentId);

  const insertStmt = db.prepare(`
    INSERT INTO document_versions (document_id, version_number, content)
    VALUES (?, ?, ?)
  `);
  insertStmt.run(documentId, next_version, content);

  // Also update the node's updated_at timestamp
  const updateNode = db.prepare('UPDATE nodes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  updateNode.run(documentId);

  return { success: true };
});

ipcMain.handle('create-node', (event, { parentId, name, type }) => {
  const stmt = db.prepare(`
    INSERT INTO nodes (parent_id, name, node_type)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(parentId, name, type);
  const newNodeId = result.lastInsertRowid;

  if(type === 'DOCUMENT') {
    const insertVersion = db.prepare('INSERT INTO document_versions (document_id, version_number, content) VALUES (?, 1, ?)');
    insertVersion.run(newNodeId, '');
  }

  return { id: newNodeId, parent_id: parentId, name, node_type: type };
});

ipcMain.handle('delete-node', (event, nodeId) => {
    const stmt = db.prepare('DELETE FROM nodes WHERE id = ?');
    stmt.run(nodeId);
    return { success: true };
});
