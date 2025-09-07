import React, { useState } from 'react';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import Features from './components/Features';
import VideoUpload from './components/VideoUpload';
import Showcase from './components/Showcase';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import TrackUpload from './components/TrackUplod';
import SimulationSelector from './components/SimulationSelector';

function App() {
  const [artifacts, setArtifacts] = useState<{
    csv?: string;
    map?: string;
    video?: string;
  } | null>(null);

  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <HeroSection />

      {/* Show dashboard only if analysis is done */}
      {artifacts && <Dashboard artifacts={artifacts} />}

      <Features />

      {/* Pass callback so VideoUpload can update artifacts */}
      <VideoUpload onAnalysisComplete={setArtifacts} />
      <TrackUpload onAnalysisComplete={setArtifacts} />
      <SimulationSelector />
      <Showcase />
      <Footer />
    </div>
  );
}

export default App;