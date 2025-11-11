import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getNodes: () => ipcRenderer.invoke('get-nodes'),
  getDocumentContent: (documentId) => ipcRenderer.invoke('get-document-content', documentId),
  saveDocumentContent: (data) => ipcRenderer.invoke('save-document-content', data),
  createNode: (data) => ipcRenderer.invoke('create-node', data),
  deleteNode: (nodeId) => ipcRenderer.invoke('delete-node', nodeId),
});
