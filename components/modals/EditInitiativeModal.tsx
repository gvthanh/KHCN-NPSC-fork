
import React, { useState, useEffect, useMemo } from 'react';
import { X, Lightbulb, Save, TrendingUp, Check, Award, Users, Building2, Stamp, ShieldCheck, UploadCloud, FileText, Paperclip, ImageIcon, Loader2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useModal } from '../../contexts/ModalContext';
import { InitiativeLevel } from '../../types';
import { db } from '../../services/firebase';
import { generateEmbedding } from '../../services/aiService';
import { useInitiatives } from '../../hooks/useInitiatives';

const LEVEL_COLORS: Record<string, string> = {
    'HLH': 'bg-slate-500',
    'NPSC': 'bg-red-600',
    'NPC': 'bg-orange-600',
    'EVN': 'bg-rose-700'
};

const INITIATIVE_FIELDS = [
    'Thiết bị điện',
    'Thí nghiệm điện',
    'Tư vấn',
    'CNTT',
    'Giải pháp',
    'Hành chính'
];

const EditInitiativeModal: React.FC = () => {
    const { editingInitiative, closeEditInitiative } = useModal();
    const { activeTheme, currentScope, geminiApiKey } = useApp();
    const { initiatives } = useInitiatives(); // Lấy dữ liệu toàn bộ sáng kiến để làm gợi ý

    // Local state for editing form
    const [formData, setFormData] = useState<any>(null);
    const [rawInitAuthors, setRawInitAuthors] = useState('');

    // States cho gợi ý đơn vị
    const [unitInput, setUnitInput] = useState('');
    const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);

    const [isSaving, setIsSaving] = useState(false);

    // Load data when modal opens
    useEffect(() => {
        if (editingInitiative) {
            setFormData({
                ...editingInitiative,
                // Ensure arrays
                unit: Array.isArray(editingInitiative.unit) ? editingInitiative.unit : (editingInitiative.unit ? [editingInitiative.unit] : []),
                field: Array.isArray(editingInitiative.field) ? editingInitiative.field : (editingInitiative.field ? [editingInitiative.field] : []),
                level: editingInitiative.level || ['HLH'],
                // Set scope from context if not present (new item)
                scope: editingInitiative.scope || currentScope
            });
            setRawInitAuthors(Array.isArray(editingInitiative.authors) ? editingInitiative.authors.join(', ') : (editingInitiative.authors || ''));
        }
    }, [editingInitiative, currentScope]);

    // Tạo danh sách đơn vị duy nhất từ dữ liệu sáng kiến có sẵn để gợi ý
    const availableUnits = useMemo(() => {
        const uniqueUnits = new Set<string>();
        initiatives.forEach(item => {
            const units = Array.isArray(item.unit) ? item.unit : (item.unit ? [item.unit] : []);
            units.forEach(u => {
                if (u && typeof u === 'string') uniqueUnits.add(u.trim());
            });
        });
        return Array.from(uniqueUnits).sort();
    }, [initiatives]);

    if (!editingInitiative || !formData) return null;

    const handleSave = async () => {
        if (!formData.title) return alert("Vui lòng nhập tên sáng kiến.");

        setIsSaving(true);

        try {
            const finalInitiative = {
                ...formData,

                authors: rawInitAuthors.split(',').map(s => s.trim()).filter(s => s !== ''),
                unit: (formData.unit || []).map((s: string) => s.trim()).filter((s: string) => s !== ''),
                field: (formData.field || []).filter((f: string) => f)
            };

            // --- TẠO VECTOR CHO RAG ---
            // Luôn tạo lại vector khi save để đảm bảo dữ liệu mới nhất
            let vector = null;
            try {
                const textToEmbed = `${finalInitiative.title} ${finalInitiative.content || ''}`;
                vector = await generateEmbedding(textToEmbed);
            } catch (e) {
                console.warn(`Could not generate vector for ${finalInitiative.title}`, e);
            }

            // Gắn vector vào data
            if (vector) {
                finalInitiative.embedding_field = vector;
            }
            // ---------------------------

            if (finalInitiative.id) {
                await db.collection("initiatives").doc(finalInitiative.id).update(finalInitiative);
            } else {
                // Thêm createdAt cho item mới
                finalInitiative.createdAt = Date.now();
                await db.collection("initiatives").add(finalInitiative);
            }
            closeEditInitiative();
        } catch (e) {
            alert("Lỗi khi lưu sáng kiến.");
            console.error(e);
        } finally {
            setIsSaving(false);
        }
    };

    // Helper functions for form
    const addUnitTag = (unitName: string) => {
        const trimmed = unitName.trim();
        if (!trimmed) return;
        setFormData((prev: any) => {
            const currentUnits = prev.unit || [];
            if (!currentUnits.includes(trimmed)) return { ...prev, unit: [...currentUnits, trimmed] };
            return prev;
        });
        setUnitInput('');
        setShowUnitSuggestions(false);
    };

    const removeUnitTag = (unitName: string) => {
        setFormData((prev: any) => ({ ...prev, unit: prev.unit.filter((u: string) => u !== unitName) }));
    };

    const toggleLevel = (lvl: InitiativeLevel) => {
        setFormData((prev: any) => {
            const currentLevels = prev.level || [];
            const newLevels = currentLevels.includes(lvl)
                ? currentLevels.filter((l: string) => l !== lvl)
                : [...currentLevels, lvl];
            return { ...prev, level: newLevels };
        });
    };

    const toggleField = (field: string) => {
        setFormData((prev: any) => {
            const currentFields = prev.field || [];
            const newFields = currentFields.includes(field)
                ? currentFields.filter((f: string) => f !== field)
                : [...currentFields, field];
            return { ...prev, field: newFields };
        });
    };



    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-3xl max-h-[95vh] shadow-2xl flex flex-col overflow-hidden border-4 border-white dark:border-slate-800">
                <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                        <h3 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3 dark:text-white"><Lightbulb className={activeTheme.text} /> Thông tin sáng kiến</h3>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${formData.scope === 'NPC' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                            {formData.scope === 'NPC' ? 'Toàn NPC' : 'Nội bộ'}
                        </span>
                    </div>
                    <button onClick={closeEditInitiative} className="p-4 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all shadow-sm text-slate-400"><X size={28} /></button>
                </div>

                <div className="p-8 lg:p-12 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
                    {/* Title */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Tên sáng kiến</label>
                        <input className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-orange-500/20" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                    </div>

                    {/* Year & Scalable */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                        <div className="md:col-span-4 space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Năm công nhận</label>
                            <input type="number" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-orange-500/20" value={formData.year} onChange={e => setFormData({ ...formData, year: parseInt(e.target.value) })} />
                        </div>
                        <div className="md:col-span-8 flex items-center gap-4 px-6 py-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 h-full">
                            <div className={`p-2.5 rounded-full ${formData.isScalable ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'} transition-colors`}><TrendingUp size={18} /></div>
                            <div className="flex-1">
                                <label className="text-xs font-black uppercase text-slate-900 dark:text-white cursor-pointer select-none" htmlFor="scalable-check">Khả năng nhân rộng</label>
                                <p className="text-[9px] text-slate-500 dark:text-slate-400">Đánh dấu nếu có thể áp dụng rộng rãi.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" id="scalable-check" className="sr-only peer" checked={formData.isScalable || false} onChange={(e) => setFormData({ ...formData, isScalable: e.target.checked })} />
                                <div className="w-12 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>
                    </div>

                    {/* Field */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Lĩnh vực</label>
                        <div className="flex flex-wrap gap-2">
                            {Array.from(new Set([...INITIATIVE_FIELDS, ...(formData.field || [])])).map(field => {
                                const isSelected = formData.field?.includes(field);
                                return (
                                    <button key={field} onClick={() => toggleField(field)} className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${isSelected ? `${activeTheme.primary} text-white shadow-md` : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>{field} {isSelected && <Check size={12} />}</button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Level */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2 flex items-center gap-1"><Award size={10} /> Các cấp công nhận</label>
                        <div className="flex flex-wrap gap-2">
                            {(['HLH', 'NPSC', 'NPC', 'EVN'] as InitiativeLevel[]).map(lvl => {
                                const isSelected = formData.level?.includes(lvl);
                                return (
                                    <button key={lvl} onClick={() => toggleLevel(lvl)} className={`px-6 py-3 rounded-2xl font-black text-xs uppercase border-2 transition-all flex items-center gap-2 ${isSelected ? `${LEVEL_COLORS[lvl]} text-white border-transparent shadow-md transform scale-105` : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-orange-200'}`}>{isSelected && <Check size={14} strokeWidth={4} />}{lvl}</button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Authors */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2 flex items-center gap-1"><Users size={10} /> Tác giả</label>
                        <input className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-orange-500/20" value={rawInitAuthors} onChange={e => setRawInitAuthors(e.target.value)} placeholder="Nguyễn Văn A, Trần Thị B..." />
                    </div>

                    {/* Units - Đã khôi phục tính năng gợi ý */}
                    <div className="space-y-2 relative">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2 flex items-center gap-1"><Building2 size={10} /> Đơn vị áp dụng</label>
                        <div className="min-h-[60px] w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-orange-500/20 transition-shadow">
                            {formData.unit?.map((unit: string, idx: number) => (
                                <div key={idx} className={`${activeTheme.primary} text-white px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 animate-in fade-in zoom-in`}><span>{unit}</span><button onClick={() => removeUnitTag(unit)} className="hover:text-red-200"><X size={12} /></button></div>
                            ))}
                            <input className="flex-1 bg-transparent border-none outline-none font-bold text-sm min-w-[150px] py-1 dark:text-white" placeholder={formData.unit && formData.unit.length > 0 ? "Thêm đơn vị..." : "Nhập tên đơn vị..."} value={unitInput} onChange={(e) => { setUnitInput(e.target.value); setShowUnitSuggestions(true); }} onFocus={() => setShowUnitSuggestions(true)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUnitTag(unitInput); } if (e.key === 'Backspace' && !unitInput && formData.unit && formData.unit.length > 0) { removeUnitTag(formData.unit[formData.unit.length - 1]); } }} />
                        </div>
                        {showUnitSuggestions && unitInput && (
                            <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                                {availableUnits.filter(u => u.toLowerCase().includes(unitInput.toLowerCase()) && !formData.unit?.includes(u)).map((u, i) => (<button key={i} onClick={() => addUnitTag(u)} className="w-full text-left px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 transition-colors">{u}</button>))}
                            </div>
                        )}
                        {showUnitSuggestions && <div className="fixed inset-0 z-40" onClick={() => setShowUnitSuggestions(false)}></div>}
                    </div>

                    {/* Content */}
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Nội dung tóm tắt</label>
                        <textarea rows={6} className="w-full px-6 py-5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-[2rem] font-bold resize-none dark:text-white outline-none focus:ring-2 focus:ring-orange-500/20" value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} />
                    </div>

                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-2">Link Drive (Nếu có)</label>
                        <input className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-orange-500/20" value={formData.driveLink || ''} onChange={e => setFormData({ ...formData, driveLink: e.target.value })} placeholder="https://drive.google.com/..." />
                    </div>


                </div>

                <div className="p-8 border-t dark:border-slate-800 flex gap-4 bg-white dark:bg-slate-900">
                    <button onClick={closeEditInitiative} className="flex-1 py-4 border-2 border-slate-200 dark:border-slate-700 rounded-[2rem] font-black text-slate-400 uppercase text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Hủy bỏ</button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`flex-[2] py-4 ${activeTheme.primary} text-white rounded-[2rem] font-black shadow-lg uppercase text-[10px] flex items-center justify-center gap-2 hover:brightness-110 transition-all disabled:opacity-50`}
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {isSaving ? 'Đang tạo Vector & Lưu...' : 'Lưu thông tin'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditInitiativeModal;
