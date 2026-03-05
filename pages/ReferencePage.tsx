
import React, { useState, useEffect } from 'react';
import { FileText, Download, Trash2, Plus, X, UploadCloud, Search, File, FileSpreadsheet, FileIcon, AlertTriangle, ShieldCheck, Globe, Lock } from 'lucide-react';
import { db, auth } from '../services/firebase';
import { ReferenceDocument } from '../types';
import { useApp } from '../contexts/AppContext';

interface ReferencePageProps {
  activeTheme: any;
  user: any;
}

const ReferencePage: React.FC<ReferencePageProps> = ({ activeTheme, user }) => {
  const [documents, setDocuments] = useState<ReferenceDocument[]>([]);
  // Single-tenant: no companyId needed
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [driveLink, setDriveLink] = useState('');

  // Define the Firestore Collection Reference compatible with current Rules
  // Rule allows: /initiatives/{document=**}
  // So we store references at: initiatives/global_storage/files/{docId}
  const referencesRef = db.collection('initiatives').doc('global_storage').collection('files');

  useEffect(() => {
    setLoading(true);
    // Use the nested path
    const unsubscribe = referencesRef
      .orderBy('uploadDate', 'desc')
      .onSnapshot(
        snapshot => {
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReferenceDocument));
          setDocuments(docs);
          setLoading(false);
          setError(null);
          setIsPermissionError(false);
        },
        (err: any) => {
          setLoading(false);
          if (err.code === 'permission-denied') {
            console.warn("ReferencePage: Access denied (permission-denied). User might need to login.");
            setError("Bạn không có quyền truy cập dữ liệu này. Vui lòng đăng nhập để xem.");
            setIsPermissionError(true);
          } else {
            console.error("ReferencePage Firestore Error:", err);
            setError("Không thể tải dữ liệu. Vui lòng kiểm tra kết nối mạng.");
            setIsPermissionError(false);
          }
        }
      );
    return unsubscribe;
  }, [user]);

  const handleUpload = async () => {
    if (!title || !driveLink) return alert('Vui lòng nhập tiêu đề và link Drive tài liệu');

    // Check both prop and current auth instance
    const currentUser = auth.currentUser || user;
    if (!currentUser) return alert('Vui lòng đăng nhập để thực hiện chức năng này.');

    setUploading(true);
    try {
      const newDoc: Omit<ReferenceDocument, 'id'> = {
        title,
        description,
        driveLink,
        uploadDate: Date.now(),
        uploadedBy: currentUser.email || 'unknown'
      };

      // Save to the nested collection
      await referencesRef.add(newDoc);

      setUploading(false);
      setIsModalOpen(false);
      resetForm();
    } catch (innerErr: any) {
      console.error("Post-upload Error:", innerErr);
      alert("Đã xảy ra lỗi khi lưu thông tin vào CSDL: " + innerErr.message);
      setUploading(false);
    }
  };

  const handleDelete = async (doc: ReferenceDocument) => {
    const currentUser = auth.currentUser || user;
    if (!currentUser) return alert("Bạn cần quyền quản trị để xóa tài liệu.");
    if (!confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) return;
    try {
      // Delete from Firestore (using nested path)
      await referencesRef.doc(doc.id).delete();
    } catch (error: any) {
      console.error("Delete Error:", error);
      if (error.code === 'permission-denied') {
        alert('Lỗi: Bạn không có quyền xóa dữ liệu này.');
      } else {
        alert('Lỗi khi xóa tài liệu: ' + error.message);
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDriveLink('');
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return { icon: FileText, color: 'text-rose-500', bg: 'bg-rose-50' };
      case 'doc':
      case 'docx': return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'xls':
      case 'xlsx': return { icon: FileSpreadsheet, color: 'text-emerald-600', bg: 'bg-emerald-50' };
      case 'ppt':
      case 'pptx': return { icon: File, color: 'text-orange-600', bg: 'bg-orange-50' };
      default: return { icon: FileIcon, color: 'text-slate-500', bg: 'bg-slate-100' };
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredDocs = documents.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-slide">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Kho tài liệu</h2>
          <div className="flex items-center gap-2 mt-1">
            <Globe size={12} className="text-slate-400" />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Truy cập công khai • Tải về tự do</p>
          </div>
        </div>
        {user && (
          <button
            onClick={() => setIsModalOpen(true)}
            className={`px-6 py-4 ${activeTheme.primary} text-white rounded-2xl font-black shadow-lg shadow-orange-500/30 flex items-center gap-2 hover:brightness-110 transition-all text-xs uppercase tracking-widest`}
          >
            <Plus size={18} /> Tải lên tài liệu mới
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input
          type="text"
          placeholder="Tìm kiếm biểu mẫu, quy định..."
          className="w-full pl-12 pr-6 py-4 bg-white dark:bg-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm font-bold outline-none focus:ring-4 focus:ring-orange-500/10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {error ? (
        <div className="py-20 flex flex-col items-center justify-center text-rose-500 gap-4 bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] border border-rose-100 dark:border-rose-900">
          {isPermissionError ? <Lock size={48} /> : <AlertTriangle size={48} />}
          <div className="text-center space-y-2">
            <p className="font-black text-lg uppercase tracking-tight">{isPermissionError ? "Truy cập bị hạn chế" : "Đã xảy ra lỗi"}</p>
            <p className="font-medium text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">{error}</p>
          </div>
        </div>
      ) : loading ? (
        <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-slate-200 border-t-orange-600 rounded-full animate-spin"></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map(doc => {
            return (
              <div key={doc.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-4 bg-slate-50 text-slate-500 rounded-2xl`}>
                    <FileIcon size={32} />
                  </div>
                  {user ? (
                    <button
                      onClick={() => handleDelete(doc)}
                      className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      title="Xóa tài liệu (Admin)"
                    >
                      <Trash2 size={18} />
                    </button>
                  ) : (
                    <div className="p-2 text-emerald-500 bg-emerald-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all" title="Đã kiểm duyệt">
                      <ShieldCheck size={18} />
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2 line-clamp-2 uppercase tracking-tight leading-tight min-h-[3.25rem]">{doc.title}</h3>
                <p className="text-slate-500 text-sm mb-4 line-clamp-2 min-h-[2.5rem]">{doc.description || "Không có mô tả chi tiết."}</p>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    <p>{new Date(doc.uploadDate).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <a
                    href={doc.driveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase hover:${activeTheme.primary} hover:text-white transition-all`}
                    title="Tải về máy"
                  >
                    <Download size={14} /> Tải về
                  </a>
                </div>
              </div>
            );
          })}

          {filteredDocs.length === 0 && (
            <div className="col-span-full text-center py-20 text-slate-400">
              <UploadCloud size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-bold uppercase text-xs tracking-widest">Chưa có tài liệu nào được tải lên</p>
            </div>
          )}
        </div>
      )}

      {/* Upload Modal - Only renders if user exists (controlled by parent visibility) but keeps internal check too */}
      {isModalOpen && user && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative overflow-hidden">
            <button onClick={() => { setIsModalOpen(false); resetForm(); }} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500"><X size={20} /></button>

            <h3 className="text-2xl font-black uppercase tracking-tighter mb-6">Tải lên tài liệu</h3>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tiêu đề tài liệu</label>
                <input
                  className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm"
                  placeholder="Ví dụ: Quy định công nhận sáng kiến 2024"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Mô tả ngắn</label>
                <textarea
                  className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm resize-none h-24"
                  placeholder="Mô tả nội dung chính..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Đường dẫn tài liệu (Google Drive)</label>
                <input
                  className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl font-bold text-sm"
                  placeholder="https://drive.google.com/..."
                  value={driveLink}
                  onChange={e => setDriveLink(e.target.value)}
                />
              </div>

              {uploading && (
                <div className="flex justify-center text-[10px] font-black uppercase text-slate-400">
                  <span>Đang tải lên...</span>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading}
                className={`w-full py-4 mt-4 ${activeTheme.primary} text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl disabled:opacity-50`}
              >
                {uploading ? 'Đang xử lý...' : 'Xác nhận tải lên'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferencePage;
