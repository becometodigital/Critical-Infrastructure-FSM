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
  ArrowRight,
  User,
  Phone,
  CreditCard,
  Mail,
  ChevronRight,
  Info,
  Layers,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../../utils/AuthContext';
import { INITIAL_USER_ACCOUNTS } from '../../data/usersDatabase';

interface AuthScreenProps {
  onSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccess }) => {
  const {
    login,
    verifyMfa,
    verifyInvite,
    redeemInvite,
    registerBank,
    requestPasswordReset,
    resetPassword,
    loginAsDemoUser,
  } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'REDEEM_INVITE' | 'REGISTER_BANK' | 'FORGOT_PASSWORD'>('LOGIN');

  // Login & MFA state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [tempMfaToken, setTempMfaToken] = useState<string | null>(null);

  // Invitation state
  const [inviteCode, setInviteCode] = useState('');
  const [verifiedInvite, setVerifiedInvite] = useState<any | null>(null);
  const [inviteFullName, setInviteFullName] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteCnic, setInviteCnic] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // Bank Registration state
  const [bankOrgName, setBankOrgName] = useState('');
  const [bankAdminName, setBankAdminName] = useState('');
  const [bankEmail, setBankEmail] = useState('');
  const [bankPassword, setBankPassword] = useState('');
  const [bankNtn, setBankNtn] = useState('');
  const [bankPhone, setBankPhone] = useState('');

  // Password reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetStep, setResetStep] = useState<'REQUEST' | 'SUBMIT'>('REQUEST');

  // Feedback states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);

  // 1. Handle Corporate Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mfaRequired && tempMfaToken) {
        await verifyMfa(tempMfaToken, mfaCode);
        setSuccess('Identity and MFA verified. Entering secure workspace...');
        if (onSuccess) onSuccess();
      } else {
        const res = await login(email, password, mfaCode);
        if (res.mfaRequired) {
          setMfaRequired(true);
          setTempMfaToken(res.tempToken);
          setSuccess('Enter the 6-digit corporate verification OTP code.');
        } else {
          setSuccess('Authenticated successfully. Loading portal...');
          if (onSuccess) onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Verify Invitation Code
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
      setError(err.message || 'Invalid or expired invitation token.');
      setVerifiedInvite(null);
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // 3. Handle Redeem Invitation
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
      setSuccess('Enterprise profile activated & authenticated!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to redeem invitation.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Handle Bank Registration
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
      setSuccess('Bank client account created and authenticated!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Bank registration failed.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Handle Password Reset
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await requestPasswordReset(resetEmail);
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setResetStep('SUBMIT');
        setSuccess('Challenge token generated. Please enter your new password.');
      } else {
        setSuccess(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Password reset request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resetPassword(resetToken, newPassword);
      setSuccess('Password changed successfully! You may now sign in.');
      setMode('LOGIN');
      setPassword('');
      setResetStep('REQUEST');
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  // Demo 1-click select
  const handleDemoSelect = async (userId: string) => {
    setError(null);
    setLoading(true);
    try {
      await loginAsDemoUser(userId);
      setSuccess('Sandbox persona active.');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Demo switch failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="enterprise-auth-screen" className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 font-sans selection:bg-cyan-500/30">
      
      {/* Top Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg shadow-cyan-950/40">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold tracking-tight text-white">
                  OPSGRID CLOUD
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 font-mono font-medium">
                  CRITICAL INFRASTRUCTURE FSM
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Mission-Critical Infrastructure Operations • Multi-Tenant SaaS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSandbox(!showSandbox)}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-xs text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{showSandbox ? 'Hide Sandbox Personas' : 'Reviewer Demo Sandbox'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-xl bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
          
          {/* Header Title Banner */}
          <div className="px-6 pt-6 pb-4 border-b border-slate-800/80 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">
                {mode === 'LOGIN' && 'Corporate Sign In'}
                {mode === 'REDEEM_INVITE' && 'Redeem Enterprise Invitation'}
                {mode === 'REGISTER_BANK' && 'Bank Organization Onboarding'}
                {mode === 'FORGOT_PASSWORD' && 'Reset Corporate Password'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {mode === 'LOGIN' && 'Authenticate with your authorized corporate credentials'}
                {mode === 'REDEEM_INVITE' && 'Activate your pre-authorized role with an administrator invite code'}
                {mode === 'REGISTER_BANK' && 'Register a new institutional client account & branch manager'}
                {mode === 'FORGOT_PASSWORD' && 'Secure token-based password recovery'}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="flex border-b border-slate-800/80 bg-slate-950/40 text-xs font-medium overflow-x-auto">
            <button
              onClick={() => { setMode('LOGIN'); setError(null); setSuccess(null); }}
              className={`px-4 py-3 border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                mode === 'LOGIN'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Sign In
            </button>

            <button
              onClick={() => { setMode('REDEEM_INVITE'); setError(null); setSuccess(null); }}
              className={`px-4 py-3 border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                mode === 'REDEEM_INVITE'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              Redeem Invite
            </button>

            <button
              onClick={() => { setMode('REGISTER_BANK'); setError(null); setSuccess(null); }}
              className={`px-4 py-3 border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
                mode === 'REGISTER_BANK'
                  ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              Register Bank Org
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-4">
            
            {/* Error Message Box */}
            {error && (
              <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">{error}</div>
              </div>
            )}

            {/* Success Message Box */}
            {success && (
              <div className="p-3.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex-1">{success}</div>
              </div>
            )}

            {/* 1. CORPORATE SIGN IN FORM */}
            {mode === 'LOGIN' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Corporate Email Address</label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="e.g. manager.lahore@hbl.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                    />
                    <Mail className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-slate-300">Password</label>
                    <button
                      type="button"
                      onClick={() => { setMode('FORGOT_PASSWORD'); setError(null); setSuccess(null); }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                    />
                    <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-3" />
                  </div>
                </div>

                {/* MFA Step if challenged */}
                {mfaRequired && (
                  <div className="p-4 bg-indigo-950/40 border border-indigo-500/40 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-indigo-300 text-xs font-medium">
                      <Shield className="w-4 h-4 text-indigo-400" />
                      <span>Two-Factor Authentication Challenge</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Enter the 6-digit corporate verification OTP. (Sandbox OTP: <strong className="text-cyan-300 font-mono">849201</strong>)
                    </p>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="849201"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.trim())}
                      className="w-full bg-slate-800 border border-indigo-500/60 rounded-xl px-3.5 py-2.5 text-center text-sm font-mono tracking-widest text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs py-2.5 rounded-xl transition shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  {loading ? 'Authenticating Credentials...' : mfaRequired ? 'Verify 2FA & Access Portal' : 'Sign In to Protected Portal'}
                </button>
              </form>
            )}

            {/* 2. REDEEM INVITATION FORM */}
            {mode === 'REDEEM_INVITE' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Single-Use Enterprise Invitation Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. PIONEER-NOC-8821 or TECH-CERTIFIED-9182"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyInviteCode}
                      disabled={isVerifyingCode}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-medium text-cyan-300 rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      {isVerifyingCode ? 'Verifying...' : 'Verify'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pre-seeded test codes: <span className="font-mono text-cyan-400">PIONEER-NOC-8821</span>, <span className="font-mono text-cyan-400">PIONEER-OPS-4910</span>, <span className="font-mono text-cyan-400">TECH-CERTIFIED-9182</span>
                  </p>
                </div>

                {verifiedInvite && (
                  <form onSubmit={handleRedeemInvite} className="space-y-3 pt-2 border-t border-slate-800">
                    <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Assigned Corporate Email:</span>
                        <strong className="text-white font-mono">{verifiedInvite.email}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Pre-Configured Role:</span>
                        <span className="px-2 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded font-mono text-[10px]">
                          {verifiedInvite.role}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Organization:</span>
                        <span className="text-slate-300">{verifiedInvite.organizationName}</span>
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
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Mobile Phone</label>
                        <input
                          type="text"
                          placeholder="+92 300 1234567"
                          value={invitePhone}
                          onChange={(e) => setInvitePhone(e.target.value)}
                          className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      {verifiedInvite.role === 'FIELD_TECHNICIAN' && (
                        <div>
                          <label className="block text-xs font-medium text-slate-300 mb-1">National CNIC ID</label>
                          <input
                            type="text"
                            required
                            placeholder="35202-9876543-1"
                            value={inviteCnic}
                            onChange={(e) => setInviteCnic(e.target.value)}
                            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Set Account Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={invitePassword}
                        onChange={(e) => setInvitePassword(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-2.5 rounded-xl transition shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {loading ? 'Activating Profile...' : 'Activate Enterprise Account & Sign In'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* 3. REGISTER BANK ORG */}
            {mode === 'REGISTER_BANK' && (
              <form onSubmit={handleRegisterBank} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Bank / Institution Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Standard Chartered Bank"
                      value={bankOrgName}
                      onChange={(e) => setBankOrgName(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">NTN / Registration</label>
                    <input
                      type="text"
                      placeholder="NTN-98214-4"
                      value={bankNtn}
                      onChange={(e) => setBankNtn(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Branch Operations Lead</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tariq Mehmood"
                      value={bankAdminName}
                      onChange={(e) => setBankAdminName(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="+92 300 7654321"
                      value={bankPhone}
                      onChange={(e) => setBankPhone(e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Corporate Work Email</label>
                  <input
                    type="email"
                    required
                    placeholder="tariq.mehmood@sc.com"
                    value={bankEmail}
                    onChange={(e) => setBankEmail(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={bankPassword}
                    onChange={(e) => setBankPassword(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs py-2.5 rounded-xl transition shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  <Building className="w-3.5 h-3.5" />
                  {loading ? 'Registering Organization...' : 'Register Institutional Account & Open Portal'}
                </button>
              </form>
            )}

            {/* 4. FORGOT PASSWORD */}
            {mode === 'FORGOT_PASSWORD' && (
              <div className="space-y-4">
                {resetStep === 'REQUEST' ? (
                  <form onSubmit={handleRequestReset} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">Corporate Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. engineer@yourcompany.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Verifying...' : 'Request Password Reset Token'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleCompleteReset} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Reset Authorization Token</label>
                      <input
                        type="text"
                        required
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">New Password</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Updating Password...' : 'Save New Password & Return to Login'}
                    </button>
                  </form>
                )}

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('LOGIN'); setError(null); setSuccess(null); }}
                    className="text-xs text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  >
                    Back to Corporate Sign In
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Reviewer Sandbox Toggle Tray */}
      {showSandbox && (
        <div className="bg-slate-900 border-t border-slate-800 p-6">
          <div className="max-w-7xl mx-auto space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Reviewer Demo Personas (1-Click Switch)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Quickly test each role-scoped view and permission matrix
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {INITIAL_USER_ACCOUNTS.map((user) => (
                <button
                  key={user.userId}
                  onClick={() => handleDemoSelect(user.userId)}
                  className="p-3 bg-slate-800/70 hover:bg-slate-800 border border-slate-700 rounded-xl text-left transition flex items-start justify-between cursor-pointer group"
                >
                  <div>
                    <div className="text-xs font-medium text-white group-hover:text-cyan-300 transition">
                      {user.fullName}
                    </div>
                    <div className="text-[10px] text-slate-400">{user.designation}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">{user.email}</div>
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                    {user.portalType.replace('_', ' ')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 px-6 py-4 text-center text-xs text-slate-500">
        OpsGrid Cloud • Protected by RBAC, session security & tenant isolation
      </footer>

    </div>
  );
};
