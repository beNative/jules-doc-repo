import React, { useState, useEffect, useCallback } from 'react';

// --- Placeholder Components ---
const Header = () => <header className="bg-gray-200 dark:bg-gray-700 border-b border-gray-300 dark:border-gray-600 px-2 py-1 flex items-center space-x-2 text-gray-700 dark:text-gray-300">Toolbar</header>;
const Footer = ({ nodeCount }) => <footer className="bg-gray-200 dark:bg-gray-700 border-t border-gray-300 dark:border-gray-600 px-3 py-0.5 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400"><div>{nodeCount} records.</div></footer>;
const Editor = ({ content, onSave }) => {
    const [text, setText] = useState(content);
    useEffect(() => setText(content), [content]);

    return (
        <main className="flex-1 flex flex-col bg-white dark:bg-[#1E1E1E]">
            <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 p-1">
                <button onClick={() => onSave(text)} className="p-1 hover:bg-gray-300 dark:hover:bg-gray-600 rounded">Save</button>
            </div>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="flex-1 p-2 overflow-auto font-mono text-gray-800 dark:text-gray-300 bg-transparent resize-none"
            />
        </main>
    )
};


// --- Tree View Component ---
const TreeView = ({ nodes, onSelectNode, selectedNodeId, onCreateNode, onDeleteNode }) => {
    const buildTree = (nodes, parentId = null) => {
        return nodes
            .filter(node => node.parent_id === parentId)
            .map(node => (
                <TreeNode key={node.id} node={node} allNodes={nodes} onSelectNode={onSelectNode} selectedNodeId={selectedNodeId} onCreateNode={onCreateNode} onDeleteNode={onDeleteNode} />
            ));
    };

    return <ul className="space-y-1">{buildTree(nodes)}</ul>;
};

const TreeNode = ({ node, allNodes, onSelectNode, selectedNodeId, onCreateNode, onDeleteNode }) => {
    const isFolder = node.node_type === 'FOLDER';
    const isSelected = node.id === selectedNodeId;
    const children = allNodes.filter(child => child.parent_id === node.id);

    return (
        <li>
            <div className={`flex items-center ${isSelected ? 'bg-blue-200 dark:bg-blue-800 rounded-md' : ''}`}>
                <span onClick={() => onSelectNode(node)} className="cursor-pointer">
                    {isFolder ? '📁' : '📄'} {node.name}
                </span>
                {isFolder && <button onClick={() => onCreateNode(node.id, 'DOCUMENT')} className="ml-2 text-xs">+</button>}
                 <button onClick={() => onDeleteNode(node.id)} className="ml-2 text-xs">x</button>
            </div>
            {isFolder && children.length > 0 && (
                <ul className="ml-4 mt-1 space-y-1">
                    {children.map(child => <TreeNode key={child.id} node={child} allNodes={allNodes} onSelectNode={onSelectNode} selectedNodeId={selectedNodeId} onCreateNode={onCreateNode} onDeleteNode={onDeleteNode} />)}
                </ul>
            )}
        </li>
    );
};


// --- Main App Component ---
export default function App() {
    const [nodes, setNodes] = useState([]);
    const [selectedNode, setSelectedNode] = useState(null);
    const [documentContent, setDocumentContent] = useState('');

    const fetchNodes = useCallback(async () => {
        const fetchedNodes = await window.electronAPI.getNodes();
        setNodes(fetchedNodes);
    }, []);

    useEffect(() => {
        fetchNodes();
    }, [fetchNodes]);

    const handleSelectNode = async (node) => {
        setSelectedNode(node);
        if (node.node_type === 'DOCUMENT') {
            const content = await window.electronAPI.getDocumentContent(node.id);
            setDocumentContent(content);
        } else {
            setDocumentContent('');
        }
    };

    const handleSaveContent = async (content) => {
        if (selectedNode && selectedNode.node_type === 'DOCUMENT') {
            await window.electronAPI.saveDocumentContent({ documentId: selectedNode.id, content });
            alert('Saved!');
        }
    };

    const handleCreateNode = async (parentId, type) => {
        const name = prompt(`Enter name for new ${type.toLowerCase()}:`);
        if (name) {
            const newNode = await window.electronAPI.createNode({ parentId, name, type });
            setNodes([...nodes, newNode]);
        }
    };

    const handleDeleteNode = async (nodeId) => {
        if(confirm('Are you sure you want to delete this node and all its children?')) {
            await window.electronAPI.deleteNode(nodeId);
            fetchNodes(); // Refresh the tree
            setSelectedNode(null);
            setDocumentContent('');
        }
    }

    return (
        <div className="bg-background-light dark:bg-background-dark text-gray-800 dark:text-gray-200 font-display text-sm h-screen flex flex-col antialiased">
            <Header />
            <div className="flex-grow flex overflow-hidden">
                <aside className="w-64 bg-white dark:bg-gray-900 flex flex-col border-r border-gray-300 dark:border-gray-600">
                     <div className="border-b border-gray-300 dark:border-gray-600 p-1">
                        <button onClick={() => handleCreateNode(null, 'FOLDER')} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">New Folder</button>
                    </div>
                    <div className="flex-grow p-2 overflow-y-auto">
                        <TreeView nodes={nodes} onSelectNode={handleSelectNode} selectedNodeId={selectedNode?.id} onCreateNode={handleCreateNode} onDeleteNode={handleDeleteNode} />
                    </div>
                </aside>
                <Editor content={documentContent} onSave={handleSaveContent} />
            </div>
            <Footer nodeCount={nodes.length} />
        </div>
    );
}
