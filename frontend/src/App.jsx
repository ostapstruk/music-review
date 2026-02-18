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
import Profile from './pages/Profile';
import ArtistDetail from './pages/ArtistDetail';
import ScrollToTop from './components/ScrollToTop';

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <AuthProvider>
        <Navbar />
        <main className="container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tracks" element={<TrackList />} />
            <Route path="/tracks/new" element={<AddTrack />} />
            <Route path="/tracks/:id" element={<TrackDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/artists/:id" element={<ArtistDetail />} />
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
      </AuthProvider>
    </BrowserRouter>
  );
}