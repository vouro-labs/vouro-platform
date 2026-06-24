import React, { useEffect } from 'react';
import { useVouroStore } from './store';
import LandingPage from './components/LandingPage';
import AppView from './components/AppView';
import IndicatorBar from './components/IndicatorBar';
import { AlertTriangle } from 'lucide-react';

export default function App() {
  const { 
    currentView, 
    appRoute, 
    selectedDistrictId, 
    selectedMissionId, 
    selectedSubmissionId,
    setView,
    setAppRoute,
    selectDistrict,
    selectMission,
    selectSubmission,
    gpuLagDetected,
    setLightweightMode,
    setGpuLagDetected
  } = useVouroStore();

  // Sync URL query parameters to Zustand store on initial load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const routeParam = params.get('route');
    const districtParam = params.get('district');
    const missionParam = params.get('mission');
    const submissionParam = params.get('submission');

    if (viewParam === 'landing' || viewParam === 'app') {
      setView(viewParam);
    }
    if (routeParam) {
      setAppRoute(routeParam);
    }
    if (districtParam) {
      selectDistrict(districtParam);
    }
    if (missionParam) {
      selectMission(missionParam);
    }
    if (submissionParam) {
      selectSubmission(submissionParam);
    }
  }, [setView, setAppRoute, selectDistrict, selectMission, selectSubmission]);

  // Sync Zustand store state to URL query parameters on state changes
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('view', currentView);
    params.set('route', appRoute);
    if (selectedDistrictId) params.set('district', selectedDistrictId);
    if (selectedMissionId) params.set('mission', selectedMissionId);
    if (selectedSubmissionId) params.set('submission', selectedSubmissionId);

    const newSearch = params.toString();
    const newUrl = `${window.location.pathname}?${newSearch}`;
    if (window.location.search !== `?${newSearch}`) {
      window.history.pushState(null, '', newUrl);
    }
  }, [currentView, appRoute, selectedDistrictId, selectedMissionId, selectedSubmissionId]);

  return (
    <div className="w-full min-h-screen bg-vouro-bg text-vouro-text flex flex-col relative">
      {/* Live Health Status Bar at the top of everything */}
      <IndicatorBar />
      
      {/* Navigation Router */}
      {currentView === 'landing' ? (
        <LandingPage />
      ) : (
        <AppView />
      )}

      {/* Floating Performance warning banner */}
      {gpuLagDetected && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-sm bg-vouro-surface/90 backdrop-blur-xl border border-amber-500/30 p-5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] animate-fade-in flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-vouro-text flex items-center gap-1.5 uppercase tracking-wider">
                Performance Warning
              </h4>
              <p className="text-xs text-vouro-text-muted mt-1 leading-relaxed">
                Vouro has detected significant rendering lag. We recommend enabling <strong>Lightweight Mode</strong> to save GPU resources and ensure smooth navigation.
              </p>
            </div>
          </div>
          <div className="flex gap-2 justify-end mt-1">
            <button
              onClick={() => {
                setLightweightMode(true);
                setGpuLagDetected(false);
              }}
              className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold rounded-lg transition-colors duration-200"
            >
              Enable Lightweight
            </button>
            <button
              onClick={() => setGpuLagDetected(false)}
              className="py-1.5 px-3 bg-vouro-ground hover:bg-vouro-ground/85 text-vouro-text-muted hover:text-vouro-text text-xs font-medium rounded-lg transition-colors duration-200"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
