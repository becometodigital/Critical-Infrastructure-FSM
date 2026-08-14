import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Building,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Key,
  Sparkles,
  X,
  Mail,
  User,
  Phone,
  CreditCard,
} from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { INITIAL_USER_ACCOUNTS } from '../../data/usersDatabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    session,
    login,
    verifyMfa,
    verifyInvite,
    redeemInvite,
    registerBank,
    loginAsDemoUser,
    logout,
  } = useAuth();

  // Production tabs: LOGIN as default. No demo personas as primary UI tab.
  const [tab, setTab] = useState<'LOGIN' | 'REDEEM_INVITE' | 'REGISTER_BANK'>('LOGIN');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempMfaToken, setTempMfaToken] = useState<string | null>(null);

  // Invite states
  const [inviteCode, setInviteCode] = useState('');
  const [verifiedInvite, setVerifiedInvite] = useState<any | null>(null);
  const [inviteFullName, setInviteFullName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteCnic, setInviteCnic] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // Bank Reg state
  const [bankOrgName, setBankOrgName] = useState('');
  const [bankAdminName, setBankAdminName] = useState('');
  const [bankEmail, setBankEmail] = useState('');
  const [bankPassword, setBankPassword] = useState('');
  const [bankNtn, setBankNtn] = useState('');
  const [bankPhone, setBankPhone] = useState('');

  // Status states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSandboxTester, setShowSandboxTester] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mfaRequired && tempMfaToken) {
        await verifyMfa(tempMfaToken, mfaCode);
        setSuccess('Identity verified via 2FA. Access granted.');
        setTimeout(() => {
          onClose();
          setSuccess(null);
        }, 500);
      } else {
        const res = await login(email, password, mfaCode);
        if (res.mfaRequired) {
          setMfaRequired(true);
          setTempMfaToken(res.tempToken);
          setSuccess('Enter the 6-digit corporate verification OTP.');
        } else {
          setSuccess('Authenticated successfully!');
          setTimeout(() => {
            onClose();
            setSuccess(null);
          }, 500);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyInviteCode = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invitation token code.');
      return;
    }
    setError(null);
    setIsVerifyingCode(true);
    try {
      const res = await verifyInvite(inviteCode);
      setVerifiedInvite(res);
      setSuccess(`Token verified for ${res.email} (${res.role}). Complete your profile below.`);
    } catch (err: any) {
      setError(err.message || 'Invalid or expired invitation code.');
      setVerifiedInvite(null);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleRedeemInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await redeemInvite({
        inviteCode,
        fullName: inviteFullName,
        password: invitePassword,
        phone: invitePhone,
        cnicNumber: inviteCnic,
      });
      setSuccess('Enterprise account activated and signed in!');
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Invitation redemption failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await registerBank({
        organizationName: bankOrgName,
        ntnNumber: bankNtn,
        adminFullName: bankAdminName,
        adminEmail: bankEmail,
        adminPhone: bankPhone,
        password: bankPassword,
      });
      setSuccess('Bank organization onboarded and signed in!');
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 600);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSelect = async (userId: string) => {
    setError(null);
    setLoading(true);
    try {
      await loginAsDemoUser(userId);
      setSuccess('Switched persona in sandbox mode.');
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 400);
    } catch (err: any) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="enterprise-auth-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Enterprise Identity & Access Portal</h2>
              <p className="text-xs text-slate-400">Deterministic RBAC & Role-Scoped Row-Level Security</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation - Production Posture */}
        <div className="flex border-b border-slate-800 bg-slate-900/60 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => { setTab('LOGIN'); setError(null); setSuccess(null); }}
            className={`px-5 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              tab === 'LOGIN'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            Corporate Login
          </button>

          <button
            onClick={() => { setTab('REDEEM_INVITE'); setError(null); setSuccess(null); }}
            className={`px-5 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              tab === 'REDEEM_INVITE'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            Redeem Enterprise Invite
          </button>

          <button
            onClick={() => { setTab('REGISTER_BANK'); setError(null); setSuccess(null); }}
            className={`px-5 py-3 border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
              tab === 'REGISTER_BANK'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            Register Bank Org
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* 1. CORPORATE LOGIN TAB */}
          {tab === 'LOGIN' && (
            <form onSubmit={handleLogin} className="space-y-4 max-w-md mx-auto py-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Corporate Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="e.g. branch.mgr.lahore@hbl.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                </div>
              </div>

              {mfaRequired && (
                <div className="p-3 bg-indigo-950/40 border border-indigo-500/40 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-indigo-300 text-xs font-medium">
                    <Shield className="w-4 h-4 text-indigo-400" />
                    <span>Two-Factor Authentication OTP</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Enter the 6-digit OTP code sent to your authenticated device. (Sandbox OTP: <strong className="text-cyan-300 font-mono">849201</strong>)
                  </p>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="849201"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.trim())}
                    className="w-full bg-slate-800 border border-indigo-500/60 rounded-xl px-3 py-2 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs py-2.5 rounded-xl transition shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                {loading ? 'Authenticating...' : mfaRequired ? 'Verify 2FA & Access' : 'Sign In to Protected Portal'}
              </button>
            </form>
          )}

          {/* 2. REDEEM INVITATION TAB */}
          {tab === 'REDEEM_INVITE' && (
            <div className="space-y-4 max-w-lg mx-auto py-2">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Single-Use Enterprise Invitation Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. PIONEER-NOC-8821"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleVerifyInviteCode}
                    disabled={isVerifyingCode}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-cyan-300 rounded-xl transition cursor-pointer"
                  >
                    {isVerifyingCode ? 'Verifying...' : 'Verify Token'}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sample invite codes: <span className="font-mono text-cyan-400">PIONEER-NOC-8821</span>, <span className="font-mono text-cyan-400">TECH-CERTIFIED-9182</span>
                </p>
              </div>

              {verifiedInvite && (
                <form onSubmit={handleRedeemInvite} className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Assigned Email:</span>
                      <strong className="text-white font-mono">{verifiedInvite.email}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Role:</span>
                      <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-mono text-[10px]">
                        {verifiedInvite.role}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Engr. Faisal Jameel"
                      value={inviteFullName}
                      onChange={(e) => setInviteFullName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
                      <input
                        type="text"
                        placeholder="+92 300 1234567"
                        value={invitePhone}
                        onChange={(e) => setInvitePhone(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">CNIC / ID</label>
                      <input
                        type="text"
                        placeholder="35202-1234567-1"
                        value={inviteCnic}
                        onChange={(e) => setInviteCnic(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Set Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={invitePassword}
                      onChange={(e) => setInvitePassword(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-2.5 rounded-xl transition shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {loading ? 'Activating Profile...' : 'Activate Account & Access Portal'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* 3. REGISTER BANK TAB */}
          {tab === 'REGISTER_BANK' && (
            <form onSubmit={handleRegisterBank} className="space-y-3 max-w-lg mx-auto py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Bank / Institution Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Allied Bank Limited"
                    value={bankOrgName}
                    onChange={(e) => setBankOrgName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Tax / NTN Registration</label>
                  <input
                    type="text"
                    placeholder="NTN-98234-7"
                    value={bankNtn}
                    onChange={(e) => setBankNtn(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Lead Branch Admin Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tariq Mehmood"
                    value={bankAdminName}
                    onChange={(e) => setBankAdminName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Corporate Email</label>
                  <input
                    type="email"
                    required
                    placeholder="tariq@alliedbank.com"
                    value={bankEmail}
                    onChange={(e) => setBankEmail(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Account Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={bankPassword}
                  onChange={(e) => setBankPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2.5 rounded-xl transition shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Building className="w-3.5 h-3.5" />
                {loading ? 'Creating Tenant Account...' : 'Register Bank & Access Bank Portal'}
              </button>
            </form>
          )}
        </div>

        {/* Developer Sandbox Expander Tray */}
        <div className="bg-slate-950/90 border-t border-slate-800 px-6 py-3">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowSandboxTester(!showSandboxTester)}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{showSandboxTester ? 'Hide Reviewer Sandbox Switcher' : 'Developer / Reviewer Persona Quick Switch'}</span>
            </button>
            {session && (
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Active: <strong className="text-white">{session.fullName}</strong></span>
                <button
                  onClick={() => { logout(); onClose(); }}
                  className="text-rose-400 hover:text-rose-300 font-medium ml-2 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>

          {showSandboxTester && (
            <div className="mt-3 pt-3 border-t border-slate-850 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {INITIAL_USER_ACCOUNTS.map((user) => (
                <button
                  key={user.userId}
                  onClick={() => handleDemoSelect(user.userId)}
                  className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-lg text-left transition cursor-pointer text-[10px]"
                >
                  <div className="font-semibold text-slate-200 truncate">{user.fullName}</div>
                  <div className="text-slate-500 truncate">{user.designation}</div>
                </button>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
