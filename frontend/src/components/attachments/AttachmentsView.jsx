import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  getAttachments,
  deleteAttachment,
  downloadAttachment,
  uploadProjectAttachment,
} from '../../services/api';
import { formatDistanceToNow, format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../../utils/errorUtils';
import {
  Search,
  FileText,
  Image as ImageIcon,
  Video,
  File,
  Download,
  Trash2,
  Eye,
  Filter,
  X,
  CheckSquare,
  Plus,
} from 'lucide-react';


const AttachmentsView = ({ onCreateAttachment }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    addedBy: '',
    attachmentType: '',
    dateAdded: '',
  });
  const queryClient = useQueryClient();
  const [viewingAttachment, setViewingAttachment] = useState(null);

  const { data: attachmentsResponse, refetch } = useQuery({
    queryKey: ['attachments', id, filters],
    queryFn: () =>
      getAttachments(id, filters).then((res) => res.data),
  });

  // Extract attachments array from paginated response
  const attachments = Array.isArray(attachmentsResponse?.data)
    ? attachmentsResponse.data
    : Array.isArray(attachmentsResponse)
      ? attachmentsResponse
      : [];

  const uploadMutation = useMutation({
    mutationFn: (file) => uploadProjectAttachment(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries(['attachments', id]);
      toast.success('Attachment uploaded successfully');
    },
    onError: (error) => {
      toast.error('Failed to upload attachment: ' + getErrorMessage(error));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId) => deleteAttachment(attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries(['attachments', id]);
      toast.success('Attachment deleted');
    },
  });

  const handleDelete = (attachmentId) => {
    if (window.confirm('Are you sure you want to delete this attachment?')) {
      deleteMutation.mutate(attachmentId);
    }
  };

  const handleDownload = async (attachment) => {
    try {
      const response = await downloadAttachment(attachment._id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.originalName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download attachment');
    }
  };

  const handleView = (attachment) => {
    setViewingAttachment(attachment);
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return ImageIcon;
    }
    if (mimeType.startsWith('video/')) {
      return Video;
    }
    return FileText;
  };

  const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return 'image';
    }
    if (mimeType.startsWith('video/')) {
      return 'video';
    }
    if (mimeType.startsWith('application/pdf')) {
      return 'pdf';
    }
    return 'document';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredAttachments = attachments.filter((attachment) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      attachment.originalName?.toLowerCase().includes(query) ||
      attachment.issueId?.title?.toLowerCase().includes(query) ||
      attachment.issueId?.key?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search attachments"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={filters.addedBy}
            onChange={(e) => setFilters({ ...filters, addedBy: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Added by</option>
            {/* You can populate this with users */}
          </select>
          <select
            value={filters.attachmentType}
            onChange={(e) => setFilters({ ...filters, attachmentType: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Attachment type</option>
            <option value="image">Image</option>
            <option value="document">Document</option>
            <option value="video">Video</option>
          </select>
          <input
            type="date"
            value={filters.dateAdded}
            onChange={(e) => setFilters({ ...filters, dateAdded: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {(filters.addedBy || filters.attachmentType || filters.dateAdded) && (
            <button
              onClick={() => setFilters({ addedBy: '', attachmentType: '', dateAdded: '' })}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Clear filters
            </button>
          )}
          <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium">
            Share
          </button>

          <label className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium flex items-center space-x-2 cursor-pointer">
            <Plus size={16} />
            <span>Upload</span>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  uploadMutation.mutate(file);
                }
              }}
            />
          </label>
        </div>
      </div>

      {/* Attachments Grid */}
      {
        filteredAttachments.length === 0 ? (
          <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No attachments</h3>
            <p className="text-gray-600 mb-6">
              Upload files to issues to see them here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAttachments.map((attachment) => {
              const FileIcon = getFileIcon(attachment.mimeType);
              const isImage = attachment.mimeType.startsWith('image/');

              return (
                <div
                  key={attachment._id}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Thumbnail/Preview */}
                  <div
                    className={`${isImage ? 'h-48 bg-gray-100' : 'h-32 bg-gray-50'
                      } flex items-center justify-center cursor-pointer relative group`}
                    onClick={() => handleView(attachment)}
                  >
                    {isImage ? (
                      <img
                        src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/${attachment._id}/download`}
                        alt={attachment.originalName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = 'flex';
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className={`${isImage ? 'hidden' : 'flex'
                        } items-center justify-center w-full h-full`}
                    >
                      <FileIcon className="w-12 h-12 text-gray-400" />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                      <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate mb-1">
                          {attachment.originalName}
                        </h3>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <CheckSquare className="w-3 h-3" />
                          <span
                            className="hover:text-primary-600 cursor-pointer"
                            onClick={() =>
                              navigate(`/issues/${attachment.issueId._id}`)
                            }
                          >
                            {attachment.issueId?.key} {attachment.issueId?.title}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        {attachment.uploadedBy?.avatar ? (
                          <img
                            src={attachment.uploadedBy.avatar}
                            alt={attachment.uploadedBy.name}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs">
                            {attachment.uploadedBy?.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="text-xs text-gray-600">
                          <div>{attachment.uploadedBy?.name}</div>
                          <div>
                            {formatDistanceToNow(new Date(attachment.createdAt), {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleDownload(attachment)}
                          className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
                          title="Download"
                        >
                          <Download size={16} />
                        </button>
                        {(attachment.uploadedBy?._id === user?._id ||
                          user?.role === 'admin') && (
                            <button
                              onClick={() => handleDelete(attachment._id)}
                              className="p-1.5 hover:bg-red-50 rounded text-gray-600 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      {formatFileSize(attachment.size)} • {getFileType(attachment.mimeType)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {/* Attachment Modal */}
      {viewingAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm transition-opacity"
          onClick={() => setViewingAttachment(null)}
        >
          <div
            className="relative w-full max-w-5xl h-[85vh] p-4 flex flex-col items-center justify-center outline-none"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2 z-10 bg-black/50 rounded-full"
              onClick={() => setViewingAttachment(null)}
            >
              <X size={24} />
            </button>

            <div className="w-full h-full flex items-center justify-center overflow-hidden rounded-lg bg-black/20">
              {viewingAttachment.mimeType.startsWith('image/') ? (
                <img
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/${viewingAttachment._id}/download`}
                  alt={viewingAttachment.originalName}
                  className="max-w-full max-h-full object-contain"
                />
              ) : viewingAttachment.mimeType.startsWith('video/') ? (
                <video
                  controls
                  className="max-w-full max-h-full"
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/${viewingAttachment._id}/download`}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                <iframe
                  src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attachments/${viewingAttachment._id}/download`}
                  className="w-full h-full bg-white"
                  title={viewingAttachment.originalName}
                />
              )}
            </div>

            <div className="absolute bottom-6 bg-black/50 text-white text-sm px-4 py-2 rounded-full backdrop-blur-md">
              {viewingAttachment.originalName}
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default AttachmentsView;

