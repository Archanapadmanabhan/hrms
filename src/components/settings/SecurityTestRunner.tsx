import React, { useState } from 'react';
import { runSecurityTestSuite, SecurityTestCaseResult } from '../../services/securityTests';
import { ShieldCheck, Play, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export const SecurityTestRunner: React.FC = () => {
  const [testResults, setTestResults] = useState<SecurityTestCaseResult[]>(() => runSecurityTestSuite());
  const [isRunning, setIsRunning] = useState(false);

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results = runSecurityTestSuite();
      setTestResults(results);
      setIsRunning(false);
    }, 400);
  };

  const passedCount = testResults.filter((r) => r.passed).length;
  const allPassed = passedCount === testResults.length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-5 text-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Automated Security & Access Control Test Suite
            </h3>
          </div>
          <p className="text-slate-500 text-[11px] mt-0.5">
            Verifies role-based profile visibility, colleague field allowlists, and IDOR prevention across all 10 mandated scenarios.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-bold font-mono">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{passedCount} / {testResults.length} Tests Passed</span>
          </div>

          <button
            onClick={handleRunTests}
            disabled={isRunning}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-2xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Executing Tests...' : 'Re-run Test Suite'}</span>
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-2.5">ID</th>
              <th className="px-4 py-2.5">Scenario</th>
              <th className="px-4 py-2.5">Result</th>
              <th className="px-4 py-2.5">Expected Behavior</th>
              <th className="px-4 py-2.5">Verification Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {testResults.map((test) => (
              <tr key={test.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3 font-mono font-bold text-slate-700">{test.id}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{test.scenario}</td>
                <td className="px-4 py-3">
                  {test.passed ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono">
                      <CheckCircle2 className="h-3 w-3" />
                      PASSED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                      <XCircle className="h-3 w-3" />
                      FAILED
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600 text-[11px] max-w-xs">{test.expected}</td>
                <td className="px-4 py-3 text-slate-500 text-[11px] max-w-sm">{test.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
