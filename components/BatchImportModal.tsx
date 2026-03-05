
import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, Check, AlertTriangle, Loader2, Save, Wand2, ShieldAlert, Sparkles, CheckCircle2, Info, Globe, Building2 } from 'lucide-react';
import { extractInitiativesFromPDF, checkSimilarityBatch, generateEmbedding } from '../services/aiService';
import { db } from '../services/firebase';
import { BatchItem, InitiativeLevel, Initiative, InitiativeScope } from '../types';
import { useApp } from '../contexts/AppContext';

interface BatchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTheme: any;
}

const BatchImportModal: React.FC<BatchImportModalProps> = ({ isOpen, onClose, activeTheme }) => {
  const { geminiApiKey } = useApp();
  const [step, setStep] = useState<'upload' | 'review'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedItems, setExtractedItems] = useState<BatchItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // MỚI: State chọn scope cho đợt import này
  const [targetScope, setTargetScope] = useState<InitiativeScope>('Company');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = async () => {
        const base64String = (reader.result as string).split(',')[1];

        try {
          // Bước 1: Trích xuất
          const rawData = await extractInitiativesFromPDF(base64String, "application/pdf");

          // Bước 2: Lấy dữ liệu cũ để so sánh (Lấy TOÀN BỘ để check trùng triệt để)
          const snapshot = await db.collection("initiatives").get();
          const existingDocs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Initiative));

          const mappedItems: BatchItem[] = rawData.map((item: any, index: number) => ({
            tempId: `temp_${Date.now()}_${index}`,
            selected: true,
            title: item.title || "Chưa xác định",
            authors: item.authors || [],
            unit: item.unit || [],
            year: item.year || new Date().getFullYear(),
            content: item.content || "",
            // Đảm bảo field là mảng
            field: Array.isArray(item.field) ? item.field : (item.field ? [item.field] : []),
            level: item.level || ["HLH"],
            scope: targetScope // Gán scope đã chọn
          }));

          // Bước 3: Kiểm tra trùng lặp bằng AI
          const similarityResults = await checkSimilarityBatch(
            mappedItems.map(m => ({ tempId: m.tempId, title: m.title, content: m.content })),
            existingDocs
          );

          // Gắn kết quả vào item
          const finalizedItems = mappedItems.map(item => {
            const sim = similarityResults.find((s: any) => s.tempId === item.tempId);
            return {
              ...item,
              similarity: sim,
              selected: sim?.status !== 'duplicate' // Mặc định không chọn nếu trùng lặp cao
            };
          });

          setExtractedItems(finalizedItems);
          setStep('review');
        } catch (aiError) {
          setError("Lỗi AI: " + (aiError as any).message);
        } finally {
          setIsProcessing(false);
        }
      };
    } catch (err) {
      setError("Đã có lỗi xảy ra.");
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    const itemsToSave = extractedItems.filter(i => i.selected);

    if (itemsToSave.length === 0) {
      setError("Vui lòng chọn ít nhất một sáng kiến để lưu.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const batch = db.batch();

      // Xử lý song song việc tạo vector để tiết kiệm thời gian
      const savePromises = itemsToSave.map(async (item) => {
        const docRef = db.collection('initiatives').doc();

        // --- TẠO VECTOR CHO RAG ---
        let vector = null;
        try {
          // Kết hợp tiêu đề và nội dung
          const textToEmbed = `${item.title} ${item.content || ''}`;
          vector = await generateEmbedding(textToEmbed);
        } catch (e) {
          console.warn(`Could not generate vector for ${item.title}`, e);
          // Vẫn cho lưu dù lỗi vector, có thể chạy lại tool migration sau
        }
        // ---------------------------

        // Tạo payload sạch, loại bỏ các trường temp của UI (selected, tempId)
        const payload = {

          title: item.title,
          authors: item.authors,
          unit: item.unit,
          year: item.year,
          content: item.content,
          field: item.field,
          level: item.level,
          scope: targetScope, // Lưu scope chính xác (Company/NPC)
          phase: 'Hoàn thành',
          result: 'Đạt',
          reward: '',
          similarityInfo: item.similarity || null,
          embedding_field: vector, // Lưu vector
          createdAt: Date.now()
        };
        batch.set(docRef, payload);
      });

      await Promise.all(savePromises);
      await batch.commit();

      onClose();
    } catch (err: any) {
      console.error("Batch Save Error:", err);
      setError("Lỗi khi lưu dữ liệu vào hệ thống: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getSimBadge = (status?: string) => {
    switch (status) {
      case 'duplicate': return { icon: ShieldAlert, color: 'text-rose-500 bg-rose-50', label: 'Trùng lặp cao' };
      case 'similar': return { icon: AlertTriangle, color: 'text-amber-500 bg-amber-50', label: 'Tương đồng' };
      case 'new': return { icon: CheckCircle2, color: 'text-emerald-500 bg-emerald-50', label: 'Hợp lệ' };
      default: return { icon: Sparkles, color: 'text-slate-400 bg-slate-50', label: 'Đang kiểm tra' };
    }
  };

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">

        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <div className={`${activeTheme.primary} p-4 rounded-2xl text-white shadow-lg`}><Wand2 size={24} /></div>
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Nhập liệu & Chống trùng</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">AI tự động phân tích và đối soát kho dữ liệu</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white dark:bg-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"><X size={20} className="text-slate-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc] dark:bg-slate-950">
          {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600"><AlertTriangle size={20} /><p className="font-bold text-sm">{error}</p></div>}

          {step === 'upload' ? (
            <div className="flex flex-col gap-6 items-center justify-center h-full min-h-[400px]">
              {/* SCOPE SELECTOR */}
              <div className="bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl flex border border-slate-200 dark:border-slate-700 w-full max-w-md">
                <button
                  onClick={() => setTargetScope('Company')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${targetScope === 'Company' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Building2 size={16} /> Nhập cho Công ty
                </button>
                <button
                  onClick={() => setTargetScope('NPC')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${targetScope === 'NPC' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Globe size={16} /> Nhập cho Hệ thống NPC
                </button>
              </div>

              <div className="flex flex-col items-center justify-center w-full max-w-2xl h-64 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] bg-white dark:bg-slate-900/50 hover:border-orange-300 transition-all group relative">
                <input type="file" onChange={handleFileSelect} accept="application/pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" disabled={isProcessing} />
                <div className={isProcessing ? 'animate-spin' : ''}>
                  {isProcessing ? <Loader2 size={64} className={activeTheme.text} /> : <UploadCloud size={64} className="text-slate-300 group-hover:text-orange-500 transition-colors" />}
                </div>
                <h4 className="mt-6 text-xl font-black text-slate-700 dark:text-slate-300 uppercase">{isProcessing ? 'AI đang đối soát dữ liệu...' : 'Chọn file PDF tổng hợp'}</h4>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h4 className="font-black text-slate-500 uppercase text-xs tracking-widest">Kết quả trích xuất ({extractedItems.length})</h4>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${targetScope === 'NPC' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                  Nguồn nhập: {targetScope === 'NPC' ? 'Hệ thống NPC' : 'Nội bộ Công ty'}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {extractedItems.map((item) => {
                  const badge = getSimBadge(item.similarity?.status);
                  const Icon = badge.icon;
                  return (
                    <div
                      key={item.tempId}
                      className={`p-6 rounded-3xl border-2 transition-all flex gap-6 ${item.selected ? 'bg-white dark:bg-slate-900 border-orange-200 shadow-lg' : 'bg-slate-50 dark:bg-slate-800/50 border-transparent opacity-60'}`}
                    >
                      <div className="pt-1">
                        <button onClick={() => setExtractedItems(prev => prev.map(i => i.tempId === item.tempId ? { ...i, selected: !i.selected } : i))} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${item.selected ? 'bg-orange-600 border-transparent text-white' : 'border-slate-300'}`}>
                          {item.selected && <Check size={16} strokeWidth={3} />}
                        </button>
                      </div>

                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-tight">{item.title}</h4>
                            <div className="flex flex-wrap gap-2">
                              <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{item.year}</span>
                              <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{item.unit.join(', ')}</span>
                            </div>
                          </div>
                          <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 ${badge.color}`}>
                            <Icon size={16} />
                            <span className="text-[10px] font-black uppercase">{badge.label}</span>
                          </div>
                        </div>

                        {item.similarity && item.similarity.status !== 'new' && (
                          <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex gap-3">
                            <Info size={16} className="text-orange-500 shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-[10px] font-bold text-orange-800 dark:text-orange-400 uppercase">Phân tích từ AI (Mức độ giống: {item.similarity.score}%):</p>
                              <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed italic">{item.similarity.reason}</p>
                              {item.similarity.referenceTitle && <p className="text-[9px] font-black text-orange-500 uppercase mt-1">Hồ sơ tham chiếu: {item.similarity.referenceTitle}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {step === 'review' && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-4">
            <button onClick={() => setStep('upload')} className="flex-1 py-4 border-2 border-slate-200 rounded-2xl font-black text-slate-400 uppercase text-xs" disabled={isSaving}>Hủy</button>
            <button
              onClick={handleSave}
              className={`flex-[2] py-4 ${activeTheme.primary} text-white rounded-2xl font-black shadow-lg uppercase text-xs flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed`}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {isSaving ? 'Đang tạo Vector & Lưu...' : `Lưu ${extractedItems.filter(i => i.selected).length} sáng kiến`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BatchImportModal;
