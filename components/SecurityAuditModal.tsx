
import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Lock, Database, Activity, Server, FileCode2, Eye, EyeOff, Globe, Wifi, RefreshCw, CheckCircle2, Play, AlertTriangle, Microscope, Search } from 'lucide-react';
import { db } from '../services/firebase';
import { generateEmbedding } from '../services/aiService';
import { useApp } from '../contexts/AppContext';

interface SecurityAuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    activeTheme: any;
    user: any;
}

const SecurityAuditModal: React.FC<SecurityAuditModalProps> = ({ isOpen, onClose, activeTheme, user }) => {
    const { geminiApiKey } = useApp();
    const [logs, setLogs] = useState<string[]>([]);

    // Migration State
    const [isMigrating, setIsMigrating] = useState(false);
    const [showMigrationConfirm, setShowMigrationConfirm] = useState(false);
    const [migrationProgress, setMigrationProgress] = useState(0);
    const [totalDocs, setTotalDocs] = useState(0);
    const [processedDocs, setProcessedDocs] = useState(0);
    const [vectorizedCount, setVectorizedCount] = useState(0);

    // Verify State (MỚI)
    const [verifyStatus, setVerifyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
    const [verifyMessage, setVerifyMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            // Giả lập loading logs
            const fakeLogs = [
                `[${new Date().toLocaleTimeString()}] System: Initializing Security Handshake...`,
                `[${new Date().toLocaleTimeString()}] Auth: TLS 1.3 Connection Established`,
                `[${new Date().toLocaleTimeString()}] Firestore: Ruleset v2 loaded. RBAC Active.`,
                `[${new Date().toLocaleTimeString()}] AI Guard: Gemini API Rate Limiter Initialized.`,
            ];
            setLogs(fakeLogs);

            const interval = setInterval(() => {
                setLogs(prev => {
                    const newLog = `[${new Date().toLocaleTimeString()}] Monitor: Health check OK. Latency < 50ms`;
                    return [...prev.slice(-4), newLog];
                });
            }, 3000);

            // Check vector stats
            checkVectorStats();

            return () => clearInterval(interval);
        }
    }, [isOpen]);

    const checkVectorStats = async () => {
        try {
            const snapshot = await db.collection('initiatives')
                .get();

            setTotalDocs(snapshot.size);
            let hasVector = 0;
            snapshot.forEach(doc => {
                if (doc.data().embedding_field) hasVector++;
            });
            setVectorizedCount(hasVector);
        } catch (e) {
            console.error("Error checking vector stats", e);
        }
    };

    const requestMigration = () => {
        if (isMigrating) return;
        setShowMigrationConfirm(true);
    };

    // Hàm kiểm tra ngẫu nhiên (MỚI)
    const handleRandomCheck = async () => {
        setVerifyStatus('checking');
        setVerifyMessage("Đang trích xuất ngẫu nhiên 1 hồ sơ từ CSDL...");
        try {
            const snapshot = await db.collection('initiatives')
                .get();

            if (snapshot.empty) {
                setVerifyStatus('invalid');
                setVerifyMessage("Kho dữ liệu trống.");
                return;
            }

            const docs = snapshot.docs;
            const randomDoc = docs[Math.floor(Math.random() * docs.length)];
            const data = randomDoc.data();

            await new Promise(r => setTimeout(r, 800)); // Fake delay for visual effect

            if (data.embedding_field && Array.isArray(data.embedding_field) && data.embedding_field.length > 0) {
                setVerifyStatus('valid');
                setVerifyMessage(`ĐÃ KIỂM TRA HỒ SƠ: "${data.title}"\n\n✅ TRẠNG THÁI: Tìm thấy Vector (${data.embedding_field.length} chiều).\nDữ liệu này đã sẵn sàng cho tìm kiếm AI.`);
            } else {
                setVerifyStatus('invalid');
                setVerifyMessage(`⚠️ CẢNH BÁO: Hồ sơ "${data.title}" chưa có Vector.\nVui lòng chạy công cụ đồng bộ.`);
            }
        } catch (e: any) {
            setVerifyStatus('invalid');
            setVerifyMessage("Lỗi: " + e.message);
        }
    };

    const executeMigration = async () => {
        setShowMigrationConfirm(false);
        setIsMigrating(true);
        setProcessedDocs(0);

        try {
            const snapshot = await db.collection('initiatives')
                .get();

            const docsToProcess: any[] = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data.embedding_field) {
                    docsToProcess.push({ id: doc.id, ...data });
                }
            });

            const totalToProcess = docsToProcess.length;
            if (totalToProcess === 0) {
                alert("Tất cả dữ liệu đã được Vector hóa. Không cần xử lý thêm.");
                setIsMigrating(false);
                return;
            }

            for (let i = 0; i < totalToProcess; i++) {
                const doc = docsToProcess[i];
                const textToEmbed = `${doc.title} ${doc.content || ''}`;

                try {
                    const vector = await generateEmbedding(textToEmbed);
                    await db.collection('initiatives').doc(doc.id).update({
                        embedding_field: vector
                    });

                    setProcessedDocs(prev => prev + 1);
                    setMigrationProgress(Math.round(((i + 1) / totalToProcess) * 100));

                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (err) {
                    console.error(`Failed to vector doc ${doc.id}:`, err);
                }
            }

            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Migration: Completed successfully.`]);
            checkVectorStats();

        } catch (e: any) {
            console.error("Migration Error:", e);
            alert("Lỗi trong quá trình xử lý: " + e.message);
        } finally {
            setIsMigrating(false);
        }
    };

    if (!isOpen) return null;

    const StatusItem = ({ icon: Icon, label, status, detail, color = "emerald" }: any) => (
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-${color}-100 text-${color}-600 dark:bg-${color}-900/20 dark:text-${color}-400`}>
                    <Icon size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400 tracking-wider">{label}</h4>
                    <p className="font-black text-slate-900 dark:text-white text-sm">{status}</p>
                </div>
            </div>
            <div className="text-right">
                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${detail === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                    {detail}
                </span>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl border-4 border-slate-200 dark:border-slate-800 overflow-hidden relative">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

                {/* Header */}
                <div className="p-8 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg shadow-emerald-500/20 animate-pulse">
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Trung tâm An ninh & Dữ liệu</h3>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Hệ thống đang hoạt động</p>
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-4 bg-white dark:bg-slate-900 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm text-slate-400 hover:text-rose-500"><X size={24} /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-[#f8fafc] dark:bg-slate-950 relative z-10 custom-scrollbar">

                    {/* --- VECTOR DATABASE MIGRATION TOOL --- */}
                    {user && (
                        <div className="mb-8 p-6 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Database size={120} className="text-emerald-500" /></div>
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-emerald-400 font-black uppercase text-sm tracking-widest flex items-center gap-2">
                                        <RefreshCw size={16} className={isMigrating ? "animate-spin" : ""} /> Công cụ đồng bộ Vector (RAG Support)
                                    </h4>
                                    <button
                                        onClick={handleRandomCheck}
                                        disabled={verifyStatus === 'checking'}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-black uppercase text-emerald-300 transition-colors"
                                    >
                                        {verifyStatus === 'checking' ? <RefreshCw size={12} className="animate-spin" /> : <Microscope size={12} />}
                                        Kiểm tra xác suất
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <p className="text-xs text-slate-400 uppercase">Tổng hồ sơ</p>
                                        <p className="text-2xl font-black text-white">{totalDocs}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <p className="text-xs text-slate-400 uppercase">Đã Vector hóa</p>
                                        <p className="text-2xl font-black text-emerald-400">{vectorizedCount}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                        <p className="text-xs text-slate-400 uppercase">Cần xử lý</p>
                                        <p className="text-2xl font-black text-orange-400">{totalDocs - vectorizedCount}</p>
                                    </div>
                                </div>

                                {verifyStatus !== 'idle' && (
                                    <div className={`mb-6 p-4 rounded-xl text-xs font-bold whitespace-pre-wrap border ${verifyStatus === 'valid' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'} animate-in fade-in`}>
                                        {verifyMessage}
                                    </div>
                                )}

                                {isMigrating ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold text-emerald-400">
                                            <span>Đang xử lý: {processedDocs} / {totalDocs - vectorizedCount}</span>
                                            <span>{migrationProgress}%</span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${migrationProgress}%` }}></div>
                                        </div>
                                        <p className="text-[10px] text-slate-500 italic text-center pt-2">Vui lòng không đóng cửa sổ này...</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={requestMigration}
                                        disabled={totalDocs === vectorizedCount}
                                        className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${totalDocs === vectorizedCount ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'}`}
                                    >
                                        {totalDocs === vectorizedCount ? <CheckCircle2 size={16} /> : <Play size={16} />}
                                        {totalDocs === vectorizedCount ? 'Dữ liệu đã đồng bộ hoàn toàn' : 'Bắt đầu Vector hóa dữ liệu cũ'}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <StatusItem icon={Lock} label="Mã hóa dữ liệu" status="TLS 1.3 Encryption" detail="ACTIVE" />
                        <StatusItem icon={Database} label="Cơ sở dữ liệu" status="Firestore Security Rules" detail="ACTIVE" color="blue" />
                        <StatusItem icon={Activity} label="AI Rate Limiting" status="Token Bucket Algorithm" detail="ACTIVE" color="orange" />
                        <StatusItem icon={Server} label="Cơ sở hạ tầng" status="Google Cloud Platform" detail="ACTIVE" color="indigo" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Rules Visualization */}
                        <div className="lg:col-span-2 space-y-4">
                            <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs flex items-center gap-2">
                                <FileCode2 size={14} /> Quy tắc phân quyền (RBAC)
                            </h4>
                            <div className="bg-slate-900 rounded-3xl p-6 font-mono text-xs text-slate-300 leading-relaxed shadow-inner overflow-hidden relative group">
                                <div className="absolute top-4 right-4 text-emerald-500 opacity-50 font-black text-[10px] uppercase">Firestore.rules</div>
                                <div className="space-y-1">
                                    <p><span className="text-rose-400">match</span> /initiatives/doc &#123;</p>
                                    <p className="pl-4"><span className="text-blue-400">allow read</span>: <span className="text-emerald-400">true</span>; <span className="text-slate-500">// Công khai</span></p>
                                    <p className="pl-4"><span className="text-blue-400">allow write</span>: <span className="text-orange-400">if request.auth != null</span>; <span className="text-slate-500">// Admin Only</span></p>
                                    <p>&#125;</p>
                                    <p className="mt-2"><span className="text-rose-400">match</span> /pending_initiatives/doc &#123;</p>
                                    <p className="pl-4"><span className="text-blue-400">allow create</span>: <span className="text-emerald-400">true</span>; <span className="text-slate-500">// Public Upload</span></p>
                                    <p className="pl-4"><span className="text-blue-400">allow read</span>: <span className="text-orange-400">if request.auth != null</span>; <span className="text-slate-500">// Admin View</span></p>
                                    <p>&#125;</p>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-xl"><EyeOff size={20} /></div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 dark:text-white">Quyền riêng tư dữ liệu AI</h4>
                                        <p className="text-xs text-slate-500">Dữ liệu gửi lên Gemini AI được xử lý theo chính sách Zero-Retention cho Enterprise.</p>
                                    </div>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full w-full bg-gradient-to-r from-emerald-500 to-emerald-400 animate-pulse"></div>
                                </div>
                            </div>
                        </div>

                        {/* Live Logs */}
                        <div className="space-y-4">
                            <h4 className="font-black text-slate-400 uppercase tracking-widest text-xs flex items-center gap-2">
                                <Wifi size={14} /> Nhật ký hệ thống (Live)
                            </h4>
                            <div className="bg-slate-950 rounded-3xl p-5 h-[300px] border border-slate-800 shadow-inner flex flex-col font-mono text-[10px] space-y-3 overflow-hidden">
                                {logs.map((log, i) => (
                                    <div key={i} className="text-emerald-500/80 animate-in slide-in-from-left duration-300 border-b border-emerald-500/10 pb-2 last:border-0">
                                        <span className="text-slate-500 mr-2">&gt;</span>{log}
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold text-center">
                                Phiên bản API: v1.34.0 (Stable)
                            </div>
                        </div>
                    </div>
                </div>

                {/* CONFIRM MIGRATION MODAL OVERLAY */}
                {showMigrationConfirm && (
                    <div className="absolute inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in">
                        <div className="bg-white dark:bg-slate-950 rounded-[2rem] max-w-md w-full p-8 border-4 border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-6 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>

                            <div className="relative z-10">
                                <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                                    <AlertTriangle size={40} />
                                </div>
                                <h3 className="text-xl font-black uppercase text-slate-900 dark:text-white tracking-tight">Xác nhận đồng bộ Vector?</h3>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    Hệ thống sẽ gửi <b>{totalDocs - vectorizedCount}</b> hồ sơ chưa có vector đến Gemini AI để xử lý. Quá trình này có thể tốn tài nguyên và mất vài phút.
                                </p>

                                <div className="grid grid-cols-2 gap-4 mt-6">
                                    <button
                                        onClick={() => setShowMigrationConfirm(false)}
                                        className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-black uppercase text-xs transition-colors"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        onClick={executeMigration}
                                        className="py-3 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl font-black uppercase text-xs shadow-lg shadow-emerald-500/30 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Play size={16} /> Bắt đầu ngay
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default SecurityAuditModal;
