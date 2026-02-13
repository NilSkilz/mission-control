import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

function FileIcon({ type }) {
  if (type === 'directory') return <span className="text-yellow-400">📁</span>;
  if (type === 'html') return <span className="text-orange-400">🌐</span>;
  if (type === 'markdown') return <span className="text-blue-400">📝</span>;
  return <span className="text-gray-400">📄</span>;
}

function FileTree({ files, onSelect, selectedPath, level = 0 }) {
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (path) => {
    setExpanded(prev => ({ ...prev, [path]: !prev[path] }));
  };

  return (
    <ul className={`space-y-1 ${level > 0 ? 'ml-4 border-l border-gray-700 pl-2' : ''}`}>
      {files.map((file) => (
        <li key={file.path}>
          {file.type === 'directory' ? (
            <div>
              <button
                onClick={() => toggleExpand(file.path)}
                className="flex items-center gap-2 w-full text-left py-1 px-2 rounded hover:bg-gray-800 text-gray-300"
              >
                <span className="text-xs">{expanded[file.path] ? '▼' : '▶'}</span>
                <FileIcon type={file.type} />
                <span>{file.name}</span>
              </button>
              {expanded[file.path] && file.children && (
                <FileTree
                  files={file.children}
                  onSelect={onSelect}
                  selectedPath={selectedPath}
                  level={level + 1}
                />
              )}
            </div>
          ) : (
            <button
              onClick={() => onSelect(file)}
              className={`flex items-center gap-2 w-full text-left py-1 px-2 rounded transition-colors
                ${selectedPath === file.path 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-gray-800 text-gray-300'}`}
            >
              <FileIcon type={file.type} />
              <span className="truncate">{file.name}</span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Documents() {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load file list
  useEffect(() => {
    axios.get(`${API_URL}/api/documents`)
      .then(res => {
        setFiles(res.data.data || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Load selected file content
  const handleSelect = async (file) => {
    setSelectedFile(file);
    try {
      const res = await axios.get(`${API_URL}/api/documents/content`, {
        params: { path: file.path }
      });
      setContent(res.data.data);
    } catch (err) {
      setContent({ error: err.message });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading documents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/50 rounded-lg text-red-200">
        Error loading documents: {error}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4">
      {/* Sidebar - File Tree */}
      <div className="w-64 flex-shrink-0 bg-gray-900 rounded-lg p-4 overflow-y-auto">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          📚 Documents
        </h2>
        {files.length === 0 ? (
          <p className="text-gray-500 text-sm">No documents found</p>
        ) : (
          <FileTree
            files={files}
            onSelect={handleSelect}
            selectedPath={selectedFile?.path}
          />
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden">
        {!selectedFile ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a document to view
          </div>
        ) : content?.error ? (
          <div className="p-4 text-red-400">
            Error loading content: {content.error}
          </div>
        ) : content?.type === 'html' ? (
          <iframe
            srcDoc={content.content}
            className="w-full h-full border-0"
            title={selectedFile.name}
            sandbox="allow-same-origin"
          />
        ) : content?.type === 'markdown' ? (
          <div className="p-6 prose prose-invert max-w-none overflow-y-auto h-full">
            <pre className="whitespace-pre-wrap text-gray-300 font-mono text-sm">
              {content.content}
            </pre>
          </div>
        ) : (
          <pre className="p-6 overflow-y-auto h-full text-gray-300 font-mono text-sm whitespace-pre-wrap">
            {content?.content}
          </pre>
        )}
      </div>
    </div>
  );
}
