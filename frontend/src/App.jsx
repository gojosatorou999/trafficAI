import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import HighwayPage from './pages/HighwayPage';
import GreenCorridorPage from './pages/GreenCorridorPage';
import TransportPage from './pages/TransportPage';
import NarratorPage from './pages/NarratorPage';
import SOSMonitorPage from './pages/SOSMonitorPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="highway" element={<HighwayPage />} />
          <Route path="corridor" element={<GreenCorridorPage />} />
          <Route path="transport" element={<TransportPage />} />
          <Route path="narrator" element={<NarratorPage />} />
          <Route path="sos-monitor" element={<SOSMonitorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
