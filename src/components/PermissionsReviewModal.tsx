import React from 'react';
import { CredentialInspectionReport, ProviderInspection } from '../types/task';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  User,
  ShieldAlert,
} from 'lucide-react';

interface PermissionsReviewModalProps {
  isOpen: boolean;
  report: CredentialInspectionReport | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
}

export const PermissionsReviewModal: React.FC<PermissionsReviewModalProps> = ({
  isOpen,
  report,
  onConfirm,
  onCancel,
  isSaving,
}) => {
  if (!isOpen || !report) return null;

  const getProviderBrand = (provider: ProviderInspection['provider']) => {
    switch (provider) {
      case 'github':
        return {
          title: 'GitHub',
          badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
          dotClass: 'bg-purple-500',
        };
      case 'google':
        return {
          title: 'Google Tasks',
          badgeClass: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
          dotClass: 'bg-sky-500',
        };
      case 'microsoft':
        return {
          title: 'Microsoft 365 & Teams',
          badgeClass: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border-violet-200 dark:border-violet-800',
          dotClass: 'bg-violet-500',
        };
    }
  };

  const hasOptionalWarnings = report.providers.some((p) =>
    p.permissions.some((perm) => !perm.isGranted && !perm.isRequired)
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                Review Permissions & Identity
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Audit granted scopes before saving credentials
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Scrollable Provider Reviews */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 custom-scrollbar">
          {report.providers.map((p) => {
            const brand = getProviderBrand(p.provider);

            return (
              <div
                key={p.provider}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden"
              >
                {/* Provider Identity Header */}
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.userName || p.provider}
                        className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover shadow-sm"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 shadow-sm">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                          {p.userName || brand.title}
                        </span>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${brand.badgeClass}`}
                        >
                          {brand.title}
                        </span>
                      </div>
                      {p.userEmail && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {p.userEmail}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Readiness Status Pill */}
                  <div>
                    {p.isValid && p.allRequiredGranted ? (
                      <span className="inline-flex items-center space-x-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        <span>Ready</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <XCircle className="h-2.5 w-2.5" />
                        <span>Incomplete</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Validation Error Banner */}
                {p.errorMessage && (
                  <div className="p-2.5 m-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-[11px] text-rose-700 dark:text-rose-300 flex items-start space-x-2">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                    <div>
                      <span className="font-semibold">Authentication Error: </span>
                      <span>{p.errorMessage}</span>
                    </div>
                  </div>
                )}

                {/* Permissions List */}
                {p.permissions.length > 0 && (
                  <div className="p-3 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Detected Scopes & Features
                    </div>
                    <div className="space-y-2">
                      {p.permissions.map((perm) => (
                        <div
                          key={perm.scope}
                          className={`p-2 rounded-lg border text-[11px] transition-colors ${
                            perm.isGranted
                              ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800'
                              : perm.isRequired
                              ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                              : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-2">
                              {perm.isGranted ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              ) : perm.isRequired ? (
                                <XCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <div className="flex items-center space-x-1.5">
                                  <code className="font-mono text-[10px] font-bold text-slate-800 dark:text-slate-200">
                                    {perm.scope}
                                  </code>
                                  <span
                                    className={`text-[8px] font-bold px-1 rounded uppercase tracking-wider ${
                                      perm.isRequired
                                        ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                    }`}
                                  >
                                    {perm.isRequired ? 'Required' : 'Optional'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                                  {perm.description}
                                </div>
                              </div>
                            </div>

                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                perm.isGranted
                                  ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300'
                                  : perm.isRequired
                                  ? 'text-rose-700 bg-rose-100 dark:bg-rose-950/80 dark:text-rose-300'
                                  : 'text-amber-700 bg-amber-100 dark:bg-amber-950/80 dark:text-amber-300'
                              }`}
                            >
                              {perm.isGranted ? 'Granted' : 'Missing'}
                            </span>
                          </div>

                          {/* Impact Note for Missing Scopes */}
                          {!perm.isGranted && perm.featureImpact && (
                            <div
                              className={`mt-1.5 pt-1 border-t text-[10px] ${
                                perm.isRequired
                                  ? 'border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 font-medium'
                                  : 'border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-300'
                              }`}
                            >
                              {perm.isRequired ? '⚠️ Required: ' : 'ℹ️ Note: '}
                              {perm.featureImpact}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Bottom Summary Callout */}
          <div
            className={`p-2.5 rounded-xl border text-[11px] ${
              report.canProceed
                ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
            }`}
          >
            {report.canProceed ? (
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Ready to Save & Synchronize</div>
                  <div className="text-[10px] text-emerald-700/90 dark:text-emerald-300/90">
                    All core permissions are verified.
                    {hasOptionalWarnings &&
                      ' Optional scopes not granted will disable specific sub-features as noted.'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start space-x-2">
                <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Cannot Proceed</div>
                  <div className="text-[10px] text-rose-700/90 dark:text-rose-300/90">
                    One or more required permissions are missing or the token failed validation. Please edit your credentials before continuing.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Back / Edit
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!report.canProceed || isSaving}
            className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !report.canProceed || isSaving
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 active:scale-[0.98]'
            }`}
          >
            <span>{isSaving ? 'Saving...' : 'Confirm & Save'}</span>
            {!isSaving && <ArrowRight className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </div>
  );
};

