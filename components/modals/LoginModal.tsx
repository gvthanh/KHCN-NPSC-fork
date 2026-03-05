
import React, { useState } from 'react';
import { LogIn, Mail, Lock, Loader2 } from 'lucide-react';
import { auth } from '../../services/firebase';
import { useApp } from '../../contexts/AppContext';
import { useModal } from '../../contexts/ModalContext';

const LoginModal: React.FC = () => {
  const { isLoginOpen, closeLogin } = useModal();
  const { activeTheme } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isLoginOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    try {
      await auth.signInWithEmailAndPassword(email, password);
      setIsLoading(false);
      closeLogin();
    } catch (err: any) {
      console.error("Login Error:", err);
      setIsLoading(false);
      setAuthError('Email hoặc mật khẩu không đúng.');
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-md p-10 text-center space-y-8 animate-slide">
        <div className={`mx-auto ${activeTheme.primary} w-20 h-20 rounded-[2rem] flex items-center justify-center text-white shadow-xl mb-4`}>
          {isLoading ? <Loader2 className="animate-spin" size={36} /> : <LogIn size={36} />}
        </div>
        <div>
          <h3 className="text-2xl font-black uppercase tracking-tighter dark:text-white">Đăng nhập Hệ thống</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sử dụng tài khoản Admin của đơn vị</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 text-left">
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="email"
              placeholder="Email"
              required
              className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-orange-500/10"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="password"
              placeholder="Mật khẩu"
              required
              className="w-full pl-14 pr-6 py-5 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-orange-500/10"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {authError && <p className="text-[11px] font-black text-rose-500 text-center bg-rose-50 dark:bg-rose-900/20 p-3 rounded-xl">{authError}</p>}

          <button
            disabled={isLoading}
            className={`w-full py-5 ${activeTheme.primary} text-white rounded-[1.5rem] font-black uppercase tracking-widest text-xs shadow-xl hover:brightness-110 transition-all disabled:opacity-50`}
          >
            {isLoading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>
        <button onClick={closeLogin} className="text-[10px] font-bold text-slate-300 uppercase hover:text-orange-500 transition-colors">Đóng</button>
      </div>
    </div>
  );
};

export default LoginModal;
