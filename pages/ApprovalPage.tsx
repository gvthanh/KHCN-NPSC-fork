
import React, { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { checkApprovalSimilarity, generateEmbedding } from '../services/aiService';
import { PendingInitiative, InitiativeLevel, Initiative, AnalysisResult } from '../types';
import { Check, X, ClipboardList, Calendar, Users, Building2, ExternalLink, Loader2, AlertTriangle, Layers, FileText, ZoomIn, ChevronLeft, ChevronRight, Wand2, ShieldAlert, CheckCircle2, Award, Briefcase, Paperclip, Info, Zap, Phone, CalendarClock, FileSearch, XCircle, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

interface ApprovalPageProps {
  activeTheme: any;
}

interface LightboxState {
  images: string[];
  index: number;
}
// ... (rest of the file)
const ApprovalPage: React.FC<ApprovalPageProps> = ({ activeTheme }) => {
  const { geminiApiKey } = useApp();
  const [pendingItems, setPendingItems] = useState<PendingInitiative[]>([]);
  const [approvedItems, setApprovedItems] = useState<Initiative[]>([]); // Dữ liệu tham chiếu
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // State cho AI Scan
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<Record<string, AnalysisResult>>({});

  // Lightbox state: Lưu danh sách ảnh và index hiện tại
  const [lightboxData, setLightboxData] = useState<LightboxState | null>(null);

  // State xem chi tiết sáng kiến tham chiếu (trùng lặp)
  // Thay vì lưu object item, ta lưu ID của pending item đang mở rộng
  const [expandedReferenceId, setExpandedReferenceId] = useState<string | null>(null);
  const [viewingReferenceItem, setViewingReferenceItem] = useState<Initiative | null>(null);

  // State quản lý Xác nhận tại chỗ (Inline Confirm)
  const [confirmAction, setConfirmAction] = useState<{ id: string, type: 'approve' | 'reject' } | null>(null);

  // Lấy danh sách chờ duyệt & tự động map kết quả AI từ người dùng (nếu có)
  useEffect(() => {
    const unsubscribe = db.collection('pending_initiatives')
      .where('status', '==', 'pending')
      .onSnapshot(
        snapshot => {
          const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PendingInitiative));
          // Sắp xếp client-side để tránh lỗi index
          items.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));

          setPendingItems(items);

          // Tự động load kết quả AI check trùng từ người dùng
          const preCalculatedResults: Record<string, AnalysisResult> = {};
          items.forEach(item => {
            if (item.publicAnalysis) {
              preCalculatedResults[item.id] = {
                score: item.publicAnalysis.score,
                isDuplicate: item.publicAnalysis.score >= 50,
                reason: item.publicAnalysis.advice,
                mostSimilarTitle: item.publicAnalysis.similarTitle,
                mostSimilarId: item.publicAnalysis.similarId,
                fromUser: true
              };
            }
          });
          setScanResults(prev => ({ ...prev, ...preCalculatedResults }));

          setLoading(false);
        },
        error => {
          console.error("Error fetching pending:", error);
          setLoading(false);
        }
      );
    return unsubscribe;
  }, []);

  // Lấy danh sách đã duyệt (để làm cơ sở so sánh AI)
  useEffect(() => {
    const fetchApproved = async () => {
      try {
        const snapshot = await db.collection('initiatives')
          .get();
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Initiative));
        setApprovedItems(items);
      } catch (err) {
        console.error("Error fetching approved initiatives for AI context:", err);
      }
    };
    fetchApproved();
  }, []);

  // Hàm xử lý chính: Phê duyệt hoặc Từ chối
  const handleProcessItem = async (item: PendingInitiative, type: 'approve' | 'reject') => {
    // Tắt trạng thái xác nhận
    setConfirmAction(null);
    // Bật loading cho item này
    setProcessingId(item.id);

    try {
      if (type === 'approve') {

        // --- TẠO VECTOR CHO RAG ---
        let vector = null;
        try {
          const textToEmbed = `${item.title} ${item.content || ''}`;
          vector = await generateEmbedding(textToEmbed);
        } catch (e) {
          console.warn(`Could not generate vector for ${item.title}`, e);
        }
        // ---------------------------

        // Logic phê duyệt
        const officialData = {

          title: item.title,
          authors: item.authors,
          unit: item.unit,
          year: item.year,
          content: item.content,
          field: item.field,
          // Support multiple files + legacy
          driveLink: item.driveLink || (item.attachmentUrls && item.attachmentUrls[0]) || '',
          attachmentUrls: item.attachmentUrls || (item.driveLink ? [item.driveLink] : []),
          imageUrl: item.imageUrl || (item.imageUrls && item.imageUrls[0]) || '',
          imageUrls: item.imageUrls || (item.imageUrl ? [item.imageUrl] : []),
          // Thêm số tháng đã áp dụng
          monthsApplied: item.monthsApplied || 0,
          level: ['HLH'] as InitiativeLevel[],
          phase: 'Hoàn thành',
          result: 'Đạt',
          reward: '',
          isScalable: false,
          embedding_field: vector // Lưu vector
        };

        await db.collection('initiatives').add(officialData);
        await db.collection('pending_initiatives').doc(item.id).delete();
      } else {
        // Logic từ chối (Xóa)
        await db.collection('pending_initiatives').doc(item.id).delete();
      }
    } catch (error: any) {
      console.error(error);
      alert("Đã xảy ra lỗi: " + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  // Xử lý AI Rà soát (Admin chạy thủ công)
  const handleAIScan = async (item: PendingInitiative) => {
    if (scanningId) return; // Prevent double click
    setScanningId(item.id);

    try {
      if (approvedItems.length === 0) {
        alert("Kho dữ liệu trống, không thể so sánh.");
        setScanningId(null);
        return;
      }

      // Check trùng lặp
      const result = await checkApprovalSimilarity(
        { title: item.title, content: item.content },
        approvedItems
      );

      if (result) {
        setScanResults(prev => ({ ...prev, [item.id]: result }));
      }
    } catch (error: any) {
      console.error("AI Scan Error:", error);
      alert("Lỗi khi rà soát: " + error.message);
    } finally {
      setScanningId(null);
    }
  };

  // Toggle xem chi tiết sáng kiến tham chiếu (INLINE)
  const handleToggleReference = (refTitle: string, pendingId: string) => {
    // Nếu đang mở đúng item đó thì đóng lại
    if (expandedReferenceId === pendingId) {
      setExpandedReferenceId(null);
      setViewingReferenceItem(null);
      return;
    }

    const refItem = approvedItems.find(i => i.title.trim().toLowerCase() === refTitle.trim().toLowerCase() || i.id === refTitle);
    if (refItem) {
      setViewingReferenceItem(refItem);
      setExpandedReferenceId(pendingId);
    } else {
      alert("Không tìm thấy dữ liệu sáng kiến gốc (có thể tên đã thay đổi hoặc đã bị xóa).");
    }
  };

  // Handlers cho Lightbox navigation
  const openLightbox = (images: string[], index: number) => {
    setLightboxData({ images, index });
  };

  const closeLightbox = () => {
    setLightboxData(null);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxData(prev => {
      if (!prev) return null;
      return { ...prev, index: prev.index < prev.images.length - 1 ? prev.index + 1 : prev.index };
    });
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxData(prev => {
      if (!prev) return null;
      return { ...prev, index: prev.index > 0 ? prev.index - 1 : prev.index };
    });
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-600" size={48} /></div>;

  return (
    <div className="space-y-8 animate-slide pb-20 relative">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Phê duyệt sáng kiến</h2>
          <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-black">{pendingItems.length} chờ duyệt</span>
        </div>
        {!geminiApiKey && (
          <div className="px-4 py-2 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 animate-pulse">
            <AlertTriangle size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">AI Disabled: Thiếu API Key</span>
          </div>
        )}
      </div>

      {pendingItems.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
            <ClipboardList size={40} />
          </div>
          <p className="font-black uppercase text-slate-400 tracking-widest text-xs">Hiện không có đơn đăng ký nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {pendingItems.map(item => {
            const scanResult = scanResults[item.id];
            const isConfirming = confirmAction?.id === item.id;
            const confirmType = confirmAction?.type;
            const isReferenceOpen = expandedReferenceId === item.id;

            return (
              <div key={item.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-2 h-full bg-orange-500"></div>

                <div className="flex flex-col lg:flex-row gap-8">
                  <div className="flex-1 space-y-4">
                    {/* Header: Dates & Authors */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                          <Calendar size={12} /> {new Date(item.submittedAt).toLocaleDateString('vi-VN')}
                        </span>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                          <Users size={12} /> {item.authors.length} Tác giả
                        </span>
                        <span className={`bg-slate-100 dark:bg-slate-800 ${item.monthsApplied && item.monthsApplied >= 3 ? 'text-emerald-500' : 'text-rose-500'} px-3 py-1 rounded-lg text-[10px] font-black uppercase flex items-center gap-1`}>
                          <CalendarClock size={12} /> {item.monthsApplied || 0} Tháng áp dụng
                        </span>
                      </div>

                      {/* Nút AI Scan */}
                      <button
                        onClick={() => handleAIScan(item)}
                        disabled={!!scanningId || !geminiApiKey}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm 
                          ${!geminiApiKey ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50' : scanResult
                            ? (scanResult.isDuplicate ? 'bg-rose-100 text-rose-600 border border-rose-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200')
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                      >
                        {scanningId === item.id ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : scanResult ? (
                          scanResult.isDuplicate ? <ShieldAlert size={14} /> : <CheckCircle2 size={14} />
                        ) : (
                          <Wand2 size={14} />
                        )}
                        {scanningId === item.id ? 'Đang rà soát...' : scanResult ? (scanResult.fromUser ? 'Kết quả từ người dùng' : 'Đã rà soát') : 'AI Rà soát lại'}
                      </button>
                    </div>

                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-tight">{item.title}</h3>

                    {/* Info Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400">Đơn vị</p>
                        <p className="font-bold flex items-center gap-2"><Building2 size={14} className="text-slate-400" /> {item.unit.join(', ')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-400">Lĩnh vực</p>
                        <p className="font-bold flex items-center gap-2"><Layers size={14} className="text-slate-400" /> {item.field.join(', ') || '---'}</p>
                      </div>
                    </div>

                    {/* HIỂN THỊ SỐ ZALO LIÊN HỆ CHO ADMIN */}
                    {item.contactZalo && (
                      <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30">
                        <Phone size={16} className="text-blue-500" />
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                          Zalo/SĐT liên hệ: <span className="font-black">{item.contactZalo}</span>
                        </span>
                      </div>
                    )}

                    {/* AI Scan Result Box (TRÙNG LẶP) */}
                    {scanResult && (
                      <div className={`rounded-2xl border overflow-hidden animate-in fade-in zoom-in duration-300 ${scanResult.isDuplicate ? 'bg-rose-50 border-rose-100 dark:bg-rose-900/20 dark:border-rose-900' : 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900'}`}>
                        <div className="p-4 flex gap-4">
                          <div className={`p-2.5 rounded-full h-fit shrink-0 ${scanResult.isDuplicate ? 'bg-rose-100 text-rose-500' : 'bg-emerald-100 text-emerald-500'}`}>
                            {scanResult.isDuplicate ? <AlertTriangle size={18} /> : <Check size={18} />}
                          </div>
                          <div className="space-y-1 w-full">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase tracking-widest ${scanResult.isDuplicate ? 'text-rose-600' : 'text-emerald-600'}`}>
                                  {scanResult.isDuplicate ? 'Cảnh báo trùng lặp' : 'Nội dung hợp lệ'}
                                </span>
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black text-white ${scanResult.isDuplicate ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                                  {Math.round(scanResult.score)}% giống
                                </span>
                              </div>
                              {scanResult.fromUser && (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-slate-400 uppercase bg-white dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                                  <Zap size={10} className="text-amber-500" /> Check bởi User
                                </span>
                              )}
                            </div>

                            <div className={`text-xs font-medium leading-relaxed whitespace-pre-wrap ${scanResult.isDuplicate ? 'text-rose-800 dark:text-rose-200' : 'text-emerald-800 dark:text-emerald-200'}`}>
                              {scanResult.reason}
                            </div>

                            {(scanResult.mostSimilarTitle || scanResult.mostSimilarId) && (
                              <div className={`mt-3 pt-3 border-t flex flex-wrap items-center gap-2 ${scanResult.isDuplicate ? 'border-rose-200' : 'border-emerald-200'}`}>
                                <span className={`text-[10px] font-bold uppercase ${scanResult.isDuplicate ? 'text-rose-500' : 'text-emerald-500'}`}>Giống nhất với:</span>
                                <button
                                  onClick={() => handleToggleReference(scanResult.mostSimilarId || scanResult.mostSimilarTitle!, item.id)}
                                  className={`flex items-center gap-1 text-[10px] font-black uppercase underline decoration-2 underline-offset-2 ${scanResult.isDuplicate ? 'text-rose-700 hover:text-rose-900' : 'text-emerald-700 hover:text-emerald-900'} transition-colors`}
                                >
                                  {isReferenceOpen ? <ChevronUp size={12} /> : <ExternalLink size={10} />}
                                  {isReferenceOpen ? "Thu gọn so sánh" : (scanResult.mostSimilarTitle || "Xem chi tiết")}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* --- INLINE REFERENCE DETAILS (EXPANDED) --- */}
                        {isReferenceOpen && viewingReferenceItem && (
                          <div className="border-t border-dashed border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-900/10 p-5 animate-in slide-in-from-top-4 duration-300">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="bg-orange-200 text-orange-700 p-1.5 rounded-lg"><Info size={14} /></div>
                              <h4 className="text-xs font-black uppercase text-orange-700 dark:text-orange-400">Dữ liệu sáng kiến gốc (Tham chiếu)</h4>
                            </div>
                            <div className="space-y-3 pl-2 border-l-2 border-orange-300 dark:border-orange-800 ml-2">
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Tên sáng kiến</p>
                                <p className="text-sm font-black text-slate-800 dark:text-white leading-tight">{viewingReferenceItem.title}</p>
                              </div>
                              <div className="flex gap-4">
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Năm</p>
                                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{viewingReferenceItem.year}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Tác giả</p>
                                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{Array.isArray(viewingReferenceItem.authors) ? viewingReferenceItem.authors.join(', ') : viewingReferenceItem.authors}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Nội dung</p>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-6">{viewingReferenceItem.content}</p>
                              </div>
                              <button
                                onClick={() => handleToggleReference("", item.id)}
                                className="w-full py-2 bg-white dark:bg-slate-800 border border-orange-200 dark:border-orange-900/30 rounded-xl text-[10px] font-black uppercase text-orange-600 hover:bg-orange-50 transition-colors"
                              >
                                Đóng so sánh
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI COMPLIANCE RESULT (CHECK FORM) */}
                    {item.complianceCheck && (
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1"><FileSearch size={12} /> Thẩm định mẫu đơn</h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded text-white ${item.complianceCheck.score >= 80 ? 'bg-emerald-500' : item.complianceCheck.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}>
                            Điểm: {item.complianceCheck.score}/100
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {item.complianceCheck.items.map((criterion, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <div className={`mt-0.5 ${criterion.isMet ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {criterion.isMet ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                              </div>
                              <div className="flex-1">
                                <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{criterion.criteria}</p>
                                {!criterion.isMet && <p className="text-[9px] text-rose-500 italic">{criterion.comment}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Content Preview */}
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Nội dung tóm tắt</p>
                      <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{item.content}</div>
                    </div>

                    {/* Attachments */}
                    <div className="flex flex-col gap-2">
                      {(item.attachmentUrls && item.attachmentUrls.length > 0) ? (
                        <div className="flex flex-wrap gap-2">
                          {item.attachmentUrls.map((url, idx) => (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase hover:bg-blue-100">
                              <FileText size={12} /> Tài liệu {idx + 1}
                            </a>
                          ))}
                        </div>
                      ) : item.driveLink && (
                        <a href={item.driveLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-blue-500 hover:underline">
                          <ExternalLink size={12} /> Xem tài liệu đính kèm
                        </a>
                      )}

                      {/* Images */}
                      {(item.imageUrls && item.imageUrls.length > 0) && (
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {item.imageUrls.map((url, idx) => (
                            <button
                              key={idx}
                              onClick={() => openLightbox(item.imageUrls!, idx)}
                              className="relative block w-16 h-16 rounded-lg overflow-hidden border border-slate-200 hover:border-orange-500 transition-colors group/img"
                            >
                              <img src={url} alt={`img-${idx}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors flex items-center justify-center">
                                <ZoomIn size={12} className="text-white opacity-0 group-hover/img:opacity-100" />
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACTION COLUMN (INLINE) */}
                  <div className="flex flex-row lg:flex-col items-center justify-center gap-4 lg:w-48 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800 pt-6 lg:pt-0 lg:pl-6 transition-all">
                    {/* NẾU ĐANG TRONG TRẠNG THÁI XÁC NHẬN */}
                    {isConfirming ? (
                      <div className="flex flex-col gap-3 w-full animate-in fade-in zoom-in duration-200 p-4 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
                        <p className={`text-[11px] font-black uppercase text-center ${confirmType === 'approve' ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {confirmType === 'approve' ? 'Xác nhận duyệt?' : 'Chắc chắn xóa?'}
                        </p>
                        <div className="grid grid-cols-2 gap-2 w-full">
                          <button
                            onClick={() => handleProcessItem(item, confirmType!)}
                            className={`py-2.5 ${confirmType === 'approve' ? 'bg-emerald-500' : 'bg-rose-500'} text-white rounded-xl font-black uppercase text-[10px] shadow-sm hover:scale-105 transition-all`}
                          >
                            Có
                          </button>
                          <button
                            onClick={() => setConfirmAction(null)}
                            className="py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl font-black uppercase text-[10px] hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* NẾU Ở TRẠNG THÁI BÌNH THƯỜNG */
                      <>
                        <button
                          onClick={() => setConfirmAction({ id: item.id, type: 'approve' })}
                          disabled={!!processingId}
                          className={`w-full py-3 ${activeTheme.primary} text-white rounded-xl font-black uppercase text-xs shadow-lg hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-50`}
                        >
                          {processingId === item.id ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                          Phê duyệt
                        </button>
                        <button
                          onClick={() => setConfirmAction({ id: item.id, type: 'reject' })}
                          disabled={!!processingId}
                          className="w-full py-3 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 text-slate-400 hover:border-rose-200 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl font-black uppercase text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Trash2 size={16} /> Từ chối
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIGHTBOX / IMAGE PREVIEW MODAL */}
      {lightboxData && (
        <div
          className="fixed inset-0 z-[2500] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            className="absolute top-6 right-6 p-3 bg-white/10 text-white hover:bg-white/20 hover:text-red-400 rounded-full transition-all z-50"
            onClick={closeLightbox}
          >
            <X size={32} strokeWidth={2.5} />
          </button>

          {/* Prev Button */}
          {lightboxData.index > 0 && (
            <button
              className="absolute left-4 lg:left-10 p-4 bg-white/10 text-white hover:bg-white/20 rounded-full transition-all z-50"
              onClick={handlePrevImage}
            >
              <ChevronLeft size={40} />
            </button>
          )}

          {/* Main Image */}
          <div className="relative max-w-full max-h-full flex flex-col items-center">
            <img
              src={lightboxData.images[lightboxData.index]}
              alt={`Preview ${lightboxData.index + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-90 duration-300"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="mt-4 text-white/70 font-bold uppercase tracking-widest text-sm">
              {lightboxData.index + 1} / {lightboxData.images.length}
            </p>
          </div>

          {/* Next Button */}
          {lightboxData.index < lightboxData.images.length - 1 && (
            <button
              className="absolute right-4 lg:right-10 p-4 bg-white/10 text-white hover:bg-white/20 rounded-full transition-all z-50"
              onClick={handleNextImage}
            >
              <ChevronRight size={40} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ApprovalPage;
