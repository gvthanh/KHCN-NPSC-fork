
import React from 'react';
import { LayoutDashboard, BarChart3, Bot, LogOut, BrainCircuit, Sun, Moon, Palette, Plus, FileUp, LogIn, Disc, LayoutGrid, BookOpen, Microscope, Zap, FolderSearch, FilePenLine, ClipboardCheck, ShieldCheck, Globe, Building2 } from 'lucide-react';
import { InitiativeLevel, InitiativeScope } from '../types';
import { useApp } from '../contexts/AppContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isDarkMode: boolean;
  setIsDarkMode: (dark: boolean) => void;
  activeTheme: any;
  setTheme: (theme: any) => void;
  user: any;
  onLogout: () => void;
  onLogin: () => void;
  onAdd: () => void;
  onBatch: () => void;
  onSecurity: () => void;
  currentScope: InitiativeScope; // MỚI
  setCurrentScope: (scope: InitiativeScope) => void; // MỚI
}

const THEME_OPTIONS = ['red', 'blue', 'emerald', 'indigo'];

const Sidebar: React.FC<SidebarProps> = ({
  activeTab, setActiveTab, isDarkMode, setIsDarkMode,
  activeTheme, setTheme, user, onLogout, onLogin, onAdd, onBatch, onSecurity,
  currentScope, setCurrentScope
}) => {
  const { userProfile } = useApp();
  const renderNavButton = (nav: { id: string, label: string, icon: any }) => (
    <button
      key={nav.id}
      onClick={() => setActiveTab(nav.id)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm ${activeTab === nav.id ? `${activeTheme.primary} text-white shadow-lg` : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
    >
      <nav.icon size={16} /> {nav.label}
    </button>
  );

  return (
    <aside className="w-full lg:w-72 bg-slate-950 text-white lg:sticky lg:top-0 lg:h-screen flex flex-col p-5 z-[60] shadow-2xl border-r border-slate-900">
      {/* Brand Logo Section */}
      <div className="flex items-center justify-between mb-6 px-2">
        <div onClick={!user ? onLogin : undefined} className="flex items-center gap-3 group cursor-pointer">
          <div className={`bg-gradient-to-br ${activeTheme.gradient} p-2.5 rounded-xl shadow-lg shadow-orange-600/20`}><BrainCircuit size={24} /></div>
          <div><h1 className="font-extrabold text-xl tracking-tighter">NPC-Innovation</h1><p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Trung tâm đổi mới</p></div>
        </div>
      </div>

      {/* SCOPE SWITCHER - MỚI */}
      <div className="mb-6 bg-slate-900 p-1.5 rounded-2xl flex border border-slate-800 relative">
        <button
          onClick={() => setCurrentScope('Company')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all z-10 ${currentScope === 'Company' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Building2 size={12} /> Nội bộ
        </button>
        <button
          onClick={() => setCurrentScope('NPC')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all z-10 ${currentScope === 'NPC' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Globe size={12} /> Toàn NPC
        </button>
      </div>

      {/* User & Settings Section */}
      {user && (
        <div className="mb-8 p-4 rounded-2xl bg-slate-900/50 border border-slate-800/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${activeTheme.primary} flex items-center justify-center font-black text-white text-sm shadow-md`}>{user.email?.charAt(0).toUpperCase()}</div>
            <div className="flex-1 overflow-hidden">
              <p className="text-[10px] font-black truncate text-slate-200">{user.email}</p>
              <p className="text-[8px] font-bold text-slate-500 uppercase">
                {userProfile?.role === 'admin' ? 'Administrator' : 'Member'}
              </p>
            </div>
            <button onClick={onLogout} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"><LogOut size={14} /></button>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800/50 flex items-center justify-between">
            <div className="flex gap-2">
              {THEME_OPTIONS.map(t => (
                <button key={t} onClick={() => setTheme(t)} className={`w-3.5 h-3.5 rounded-full border border-white/10 transition-transform hover:scale-125 ${t === 'red' ? 'bg-orange-600' : t === 'blue' ? 'bg-blue-600' : t === 'emerald' ? 'bg-emerald-600' : 'bg-indigo-600'}`} />
              ))}
            </div>
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-500 hover:text-white transition-colors">{isDarkMode ? <Sun size={14} /> : <Moon size={14} />}</button>
          </div>
        </div>
      )}

      {/* Navigation Groups */}
      <nav className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-1">

        {/* KHỐI 0: CỔNG ĐĂNG KÝ (PUBLIC) */}
        <div className="space-y-3">
          <div className="p-2 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 shadow-inner">
            {renderNavButton({ id: 'register', label: 'Đăng ký SK', icon: FilePenLine })}
          </div>
        </div>

        {/* KHỐI 0.5: QUẢN TRỊ (ADMIN ONLY) */}
        {user && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <ClipboardCheck size={12} className="text-emerald-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kiểm duyệt</span>
            </div>
            <div className="p-2 rounded-2xl bg-emerald-900/10 border border-emerald-900/30 space-y-1">
              {renderNavButton({ id: 'approvals', label: 'Duyệt bài', icon: ClipboardCheck })}
              {renderNavButton({ id: 'admin', label: 'Cấu hình Firebase', icon: Building2 })}
            </div>
          </div>
        )}

        {/* KHỐI 1: NGHIÊN CỨU KHCN */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <Microscope size={12} className="text-orange-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Quản lý KHCN</span>
          </div>
          <div className="p-2 rounded-2xl bg-slate-900/40 border border-slate-800/60 shadow-inner">
            {renderNavButton({ id: 'research', label: 'Nghiên cứu KHCN', icon: Microscope })}
          </div>
        </div>

        {/* KHỐI 2: HỆ THỐNG SÁNG KIẾN */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-2">
            <Zap size={12} className={currentScope === 'NPC' ? 'text-indigo-500' : 'text-amber-500'} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {currentScope === 'NPC' ? 'Hệ thống Toàn NPC' : 'Hệ thống Nội bộ'}
            </span>
          </div>
          <div className="p-2 rounded-2xl bg-slate-900/40 border border-slate-800/60 shadow-inner space-y-1">
            {[
              { id: 'list', label: 'Danh mục', icon: LayoutDashboard },
              { id: 'bubble', label: 'Bản đồ bóng', icon: Disc },
              { id: 'treemap', label: 'Bản đồ nhiệt', icon: LayoutGrid },
              { id: 'stats', label: 'Thống kê', icon: BarChart3 },
              { id: 'references', label: 'Tài liệu hồ sơ', icon: BookOpen },
              { id: 'chat', label: 'Trợ lý AI', icon: Bot },
            ]
              // Lọc bỏ 'bubble' nếu đang ở chế độ NPC
              .filter(nav => currentScope === 'NPC' ? nav.id !== 'bubble' : true)
              .map(renderNavButton)}
          </div>
        </div>
      </nav>

      {/* Security Button Footer */}
      <div className="mt-auto pt-6 border-t border-slate-900 space-y-3">
        {user && (
          <>
            <button onClick={onAdd} className="w-full flex items-center justify-center gap-2 bg-white text-slate-900 py-3.5 rounded-xl font-black text-xs hover:bg-slate-100 shadow-xl transition-all active:scale-95 uppercase tracking-widest"><Plus size={16} /> Thêm hồ sơ mới</button>
            <button onClick={onBatch} className={`w-full flex items-center justify-center gap-2 ${activeTheme.primary} text-white py-3.5 rounded-xl font-black text-xs shadow-xl transition-all active:scale-95 uppercase tracking-widest`}><FileUp size={16} /> Nhập PDF (AI)</button>
          </>
        )}
        <button
          onClick={onSecurity}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-slate-500 py-3 rounded-xl font-bold text-[10px] hover:text-emerald-500 hover:bg-slate-800 transition-all uppercase tracking-widest border border-slate-800"
        >
          <ShieldCheck size={14} /> Bảo mật & Quyền riêng tư
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
