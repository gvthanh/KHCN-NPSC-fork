
import React, { useMemo, useCallback } from 'react';
import { db } from "./services/firebase";
import { useInitiatives } from "./hooks/useInitiatives";
import Sidebar from "./components/Sidebar";
import ListPage from "./pages/ListPage";
import ChatPage from "./pages/ChatPage";
import StatsPage from "./pages/StatsPage";
import BubblePage from "./pages/BubblePage";
import TreeMapPage from "./pages/TreeMapPage";
import ReferencePage from "./pages/ReferencePage";
import ResearchPage from "./pages/ResearchPage";
import RegisterPage from "./pages/RegisterPage";
import ApprovalPage from "./pages/ApprovalPage";
import ErrorBoundary from "./ErrorBoundary";
import BatchImportModal from "./components/BatchImportModal";
import SecurityAuditModal from "./components/SecurityAuditModal";
import LoginModal from "./components/modals/LoginModal";
import EditInitiativeModal from "./components/modals/EditInitiativeModal";
import ViewInitiativeModal from "./components/modals/ViewInitiativeModal";
import EditResearchModal from "./components/modals/EditResearchModal";

import { useApp } from "./contexts/AppContext";
import { useModal } from "./contexts/ModalContext";
import { auth } from "./services/firebase";

const App: React.FC = () => {
  const {
    activeTab, setActiveTab,
    theme, setTheme, activeTheme,
    isDarkMode, setIsDarkMode,
    user,
    currentScope, setCurrentScope,
    pointConfig, savePointConfig
  } = useApp();

  const {
    isBatchOpen, closeBatch, openBatch,
    isSecurityOpen, closeSecurity, openSecurity,
    openLogin, openEditInitiative, openViewInitiative, openEditProject
  } = useModal();

  const { initiatives: allInitiatives } = useInitiatives();

  // Lọc dữ liệu hiển thị theo Scope
  const displayInitiatives = useMemo(() => {
    return allInitiatives.filter(i => {
      const scope = i.scope || 'Company';
      return scope === currentScope;
    });
  }, [allInitiatives, currentScope]);

  // Hàm xóa dùng chung cho tất cả các trang
  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Xác nhận xóa sáng kiến này?')) return;
    try {
      await db.collection("initiatives").doc(id).delete();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Lỗi khi xóa. Bạn có thể không có quyền thực hiện thao tác này.");
    }
  }, []);

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col lg:flex-row bg-[#f8fafc] dark:bg-slate-950 transition-colors duration-300">
        <Sidebar
          activeTab={activeTab} setActiveTab={setActiveTab}
          isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
          activeTheme={activeTheme} setTheme={setTheme}
          user={user} onLogout={() => auth.signOut()} onLogin={openLogin}
          onAdd={() => activeTab === 'research' ? openEditProject() : openEditInitiative()}
          onBatch={openBatch}
          onSecurity={openSecurity}
          currentScope={currentScope} setCurrentScope={setCurrentScope}
        />

        <main className="flex-1 p-4 lg:p-10 overflow-y-auto">
          <div className="animate-slide">
            {activeTab === 'register' && <RegisterPage activeTheme={activeTheme} />}
            {activeTab === 'approvals' && <ApprovalPage activeTheme={activeTheme} />}
            {activeTab === 'list' && <ListPage initiatives={displayInitiatives} activeTheme={activeTheme} user={user} onView={openViewInitiative} onEdit={openEditInitiative} onDelete={handleDelete} />}
            {activeTab === 'stats' && <StatsPage initiatives={displayInitiatives} activeTheme={activeTheme} onViewItem={openViewInitiative} pointConfig={pointConfig} onUpdatePointConfig={savePointConfig} user={user} />}
            {activeTab === 'chat' && <ChatPage initiatives={displayInitiatives} activeTheme={activeTheme} />}
            {activeTab === 'references' && <ReferencePage activeTheme={activeTheme} user={user} />}
            {activeTab === 'research' && <ResearchPage activeTheme={activeTheme} user={user} onEdit={openEditProject} onAdd={openEditProject} />}
            {activeTab === 'bubble' && <BubblePage initiatives={displayInitiatives} activeTheme={activeTheme} user={user} onView={openViewInitiative} onEdit={openEditInitiative} onDelete={handleDelete} />}
            {activeTab === 'treemap' && <TreeMapPage initiatives={displayInitiatives} activeTheme={activeTheme} user={user} onView={openViewInitiative} onEdit={openEditInitiative} onDelete={handleDelete} />}
          </div>
        </main>

        {/* Global Modals Managed by Context */}
        <LoginModal />
        <BatchImportModal isOpen={isBatchOpen} onClose={closeBatch} activeTheme={activeTheme} />
        <SecurityAuditModal isOpen={isSecurityOpen} onClose={closeSecurity} activeTheme={activeTheme} user={user} />
        <EditInitiativeModal />
        <ViewInitiativeModal />
        <EditResearchModal />
      </div>
    </ErrorBoundary>
  );
};

export default App;
