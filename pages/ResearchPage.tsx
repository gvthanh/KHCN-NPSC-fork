
import React, { useState, useEffect, useMemo } from 'react';
import {
  Microscope, Users, UserCheck, GraduationCap, DollarSign,
  CheckCircle2, Plus, Search, Trash2, Edit2, ExternalLink, Loader2,
  Eye, X, Info, Calendar, Award, FileText
} from 'lucide-react';
import { db } from '../services/firebase';
import { ResearchProject, SettlementStatus, ProjectStatus } from '../types';
import { useApp } from '../contexts/AppContext';

const SETTLEMENT_LABELS: Record<SettlementStatus, { label: string, color: string }> = {
  chua_thanh_toan: { label: 'Chưa thanh toán', color: 'bg-rose-500' },
  dang_thanh_toan: { label: 'Đang thanh toán', color: 'bg-amber-500' },
  da_quyet_toan: { label: 'Đã quyết toán', color: 'bg-emerald-500' }
};

const PROJECT_STATUS_LABELS: Record<ProjectStatus, { label: string, color: string }> = {
  dang_thuc_hien: { label: 'Đang thực hiện', color: 'bg-blue-500' },
  da_nghiem_thu: { label: 'Đã nghiệm thu', color: 'bg-emerald-500' },
  da_huy: { label: 'Đã hủy', color: 'bg-slate-500' }
};

interface ResearchPageProps {
  activeTheme: any;
  user: any;
  onEdit: (project: ResearchProject) => void;
  onAdd: () => void;
}
// ... (rest of the file)
const ResearchPage: React.FC<ResearchPageProps> = ({ activeTheme, user, onEdit, onAdd }) => {
  // Single-tenant: no companyId needed
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingProject, setViewingProject] = useState<ResearchProject | null>(null);

  useEffect(() => {
    const unsubscribe = db.collection('research_projects')
      .orderBy('year', 'desc')
      .onSnapshot(
        snapshot => {
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResearchProject));
          setProjects(docs);
          setLoading(false);
        },
        err => {
          console.error(err);
          setLoading(false);
        }
      );
    return unsubscribe;
  }, []);

  const stats = useMemo(() => {
    const total = projects.length;
    const totalBudget = projects.reduce((acc, p) => acc + (p.budget || 0), 0);
    const completed = projects.filter(p => p.status === 'da_nghiem_thu').length;
    return { total, totalBudget, completed };
  }, [projects]);

  const filteredProjects = projects.filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xác nhận xóa đề tài nghiên cứu này?')) return;
    try {
      await db.collection('research_projects').doc(id).delete();
    } catch (e) {
      alert("Lỗi khi xóa dữ liệu.");
    }
  };

  return (
    <div className="space-y-10 animate-slide pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Nghiên cứu KHCN</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Quản trị danh mục đề tài khoa học công nghệ</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm đề tài..."
            className="w-full pl-12 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm font-bold text-sm outline-none focus:ring-4 focus:ring-orange-500/10 transition-all dark:text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Tổng số đề tài', value: stats.total, icon: Microscope, color: 'blue' },
          { label: 'Tổng kinh phí', value: formatCurrency(stats.totalBudget), icon: DollarSign, color: 'emerald' },
          { label: 'Đã nghiệm thu', value: stats.completed, icon: CheckCircle2, color: 'amber' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-6">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl"><stat.icon size={24} /></div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{stat.value}</h4>
            </div>
          </div>
        ))}
      </div>

      {/* Main List Section */}
      <div className="space-y-6">
        {user && (
          <div className="flex justify-end px-2">
            <button onClick={onAdd} className={`px-8 py-4 ${activeTheme.primary} text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-2 hover:brightness-110 transition-all active:scale-95`}><Plus size={18} /> Thêm đề tài mới</button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-orange-600" size={48} /></div>
        ) : filteredProjects.length > 0 ? (
          filteredProjects.map(project => (
            <div key={project.id} className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 lg:p-12 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
              <div className="flex flex-col lg:flex-row gap-10">
                {/* Content Side */}
                <div className="flex-1 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="bg-slate-900 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest">Năm {project.year}</span>
                      <span className={`${activeTheme.primary} text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest`}>Cấp {project.level}</span>
                      <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${SETTLEMENT_LABELS[project.settlementStatus]?.color || ''}`}>
                        {SETTLEMENT_LABELS[project.settlementStatus]?.label || ''}
                      </div>
                    </div>

                    {/* Action Buttons: Z-index cao để đảm bảo bấm được */}
                    {user && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button onClick={() => onEdit(project)} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-500 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 transition-all hover:scale-110" title="Chỉnh sửa"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(project.id)} className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-400 hover:text-rose-600 rounded-xl shadow-sm border border-rose-100 dark:border-rose-900 transition-all hover:scale-110" title="Xóa đề tài"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </div>

                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-tight group-hover:text-orange-600 transition-colors cursor-pointer" onClick={() => setViewingProject(project)}>
                    {project.title}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg shrink-0"><Users size={16} /></div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Nhóm tác giả</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 line-clamp-1">{project.authors?.join(', ') || 'Chưa cập nhật'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-lg shrink-0"><UserCheck size={16} /></div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Thành viên chính</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 line-clamp-1">{project.mainMembers?.join(', ') || '---'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-lg shrink-0"><GraduationCap size={16} /></div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Chuyên gia</p>
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 line-clamp-1">{project.experts?.join(', ') || '---'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-lg shrink-0"><DollarSign size={16} /></div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Kinh phí</p>
                          <p className="text-sm font-black text-slate-900 dark:text-white">{formatCurrency(project.budget || 0)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setViewingProject(project)}
                    className="flex items-center gap-2 text-xs font-black uppercase text-orange-600 hover:text-orange-700 transition-all tracking-widest bg-orange-50 dark:bg-orange-900/20 px-6 py-3 rounded-xl w-fit"
                  >
                    <Eye size={16} /> Xem nội dung tóm tắt
                  </button>
                </div>

                {/* Progress/Status Side */}
                <div className="lg:w-80 space-y-8 bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ</p>
                      <span className="text-lg font-black text-orange-600">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-white dark:bg-slate-900 h-3 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800">
                      <div className={`h-full ${activeTheme.primary} transition-all duration-1000 shadow-lg shadow-orange-600/20`} style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                      <div className={`w-3 h-3 rounded-full ${PROJECT_STATUS_LABELS[project.status || 'dang_thuc_hien'].color} shadow-lg shadow-blue-500/20 animate-pulse`}></div>
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest">
                        {PROJECT_STATUS_LABELS[project.status || 'dang_thuc_hien'].label}
                      </span>
                    </div>
                    {(project.driveLink || project.attachmentUrl) && (
                      <a href={project.driveLink || project.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-4 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase border border-slate-100 dark:border-slate-800 hover:bg-orange-50 hover:text-orange-600 transition-all shadow-sm">
                        <ExternalLink size={14} /> Xem tài liệu gốc
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="py-32 text-center space-y-6 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-800 p-10 rounded-full w-fit mx-auto text-slate-300"><Microscope size={64} /></div>
            <p className="font-black text-slate-400 uppercase tracking-widest">Chưa có đề tài KHCN nào phù hợp</p>
            {user && <button onClick={onAdd} className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-2 mx-auto"><Plus size={18} /> Thêm đề tài mới</button>}
          </div>
        )}
      </div>

      {/* DETAIL VIEW MODAL - ACCESSIBLE BY EVERYONE */}
      {viewingProject && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-4 border-white dark:border-slate-800">
            {/* Modal Header */}
            <div className="p-6 lg:p-10 border-b dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className={`${activeTheme.primary} p-4 rounded-2xl text-white shadow-lg`}><Info size={24} /></div>
                <h3 className="text-xl lg:text-2xl font-black uppercase tracking-tighter dark:text-white">Chi tiết đề tài nghiên cứu</h3>
              </div>
              <button onClick={() => setViewingProject(null)} className="p-3 lg:p-4 hover:bg-white dark:hover:bg-slate-800 rounded-2xl transition-all shadow-sm text-slate-400"><X size={28} /></button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 lg:p-12 space-y-10 custom-scrollbar">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <span className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"><Calendar size={14} /> Năm {viewingProject.year}</span>
                  <span className={`flex items-center gap-2 ${activeTheme.primary} text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest`}><Award size={14} /> Cấp {viewingProject.level}</span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-black text-slate-900 dark:text-white uppercase leading-tight tracking-tight">
                  {viewingProject.title}
                </h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Users size={12} /> Nhóm tác giả thực hiện</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{viewingProject.authors?.join(', ') || 'Chưa xác định'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><UserCheck size={12} /> Thành viên chính</p>
                    <p className="text-base font-bold text-slate-700 dark:text-slate-300">{viewingProject.mainMembers?.join(', ') || '---'}</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><GraduationCap size={12} /> Chuyên gia tư vấn</p>
                    <p className="text-base font-bold text-slate-700 dark:text-slate-300">{viewingProject.experts?.join(', ') || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><DollarSign size={12} /> Tổng kinh phí phê duyệt</p>
                    <p className="text-xl font-black text-emerald-600">{formatCurrency(viewingProject.budget || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b dark:border-slate-800 pb-2"><FileText size={14} /> Nội dung tóm tắt & Mục tiêu nghiên cứu</p>
                <div className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                  {viewingProject.content || "Nội dung đang được cập nhật..."}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-6 pt-10 border-t dark:border-slate-800">
                <div className="flex items-center gap-6">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tình trạng thực hiện</p>
                    <div className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase text-white shadow-lg ${PROJECT_STATUS_LABELS[viewingProject.status || 'dang_thuc_hien'].color}`}>
                      {PROJECT_STATUS_LABELS[viewingProject.status || 'dang_thuc_hien'].label}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ công việc</p>
                    <p className="text-2xl font-black text-orange-600">{viewingProject.progress}%</p>
                  </div>
                </div>

                {(viewingProject.driveLink || viewingProject.attachmentUrl) && (
                  <a href={viewingProject.driveLink || viewingProject.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 px-10 py-5 ${activeTheme.primary} text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:scale-105 transition-all`}>
                    <ExternalLink size={20} /> Xem tài liệu gốc
                  </a>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-8 bg-slate-50 dark:bg-slate-900 border-t dark:border-slate-800 flex justify-end">
              <button onClick={() => setViewingProject(null)} className="px-10 py-4 bg-white dark:bg-slate-800 border dark:border-slate-700 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm">Đóng cửa sổ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchPage;
