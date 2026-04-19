import { FiGithub, FiCode } from 'react-icons/fi';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span className="footer-text">
          MusicReview © {new Date().getFullYear()} — Дипломний проєкт
        </span>
        <div className="footer-links">
          <a href="https://github.com/ostapstruk/music-review" 
             target="_blank" rel="noopener noreferrer"
             className="footer-link">
            <FiGithub size={16} />
            GitHub
          </a>
          <a href="/docs" className="footer-link">
            <FiCode size={16} />
            API Docs
          </a>
        </div>
      </div>
    </footer>
  );
}