import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import TrackList from './pages/TrackList';
import TrackDetail from './pages/TrackDetail';
import AddTrack from './pages/AddTrack';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Profile from './pages/Profile';
import ArtistDetail from './pages/ArtistDetail';
import ArtistDashboard from './pages/ArtistDashboard';
import AdminClaims from './pages/AdminClaims';
import NotificationsPage from './pages/Notifications';
import ScrollToTop from './components/ScrollToTop';
import { SpeechProvider } from './context/SpeechContext';
import PublicProfile from './pages/PublicProfile';
import UserRedirect from './pages/UserRedirect';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <SpeechProvider>
        <Navbar />
        <main className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tracks" element={<TrackList />} />
            <Route path="/tracks/new" element={<AddTrack />} />
            <Route path="/tracks/:id" element={<TrackDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/artists/:id" element={<ArtistDetail />} />
            <Route path="/artist" element={<ArtistDashboard />} />
            <Route path="/admin/claims" element={<AdminClaims />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/users/:id" element={<PublicProfile />} />
            <Route path="/u/:username" element={<UserRedirect />} />
          </Routes>
        </main>
        <Footer />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            },
          }}
        />
      </SpeechProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}