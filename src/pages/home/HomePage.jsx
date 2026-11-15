import React, { useRef } from 'react';
import HomeActionCard from '../../components/home/HomeActionCard.jsx';
import './HomePage.css';

export default function HomePage({ onRunDemo, onImportFile, busy = false, error = '' }) {
  const fileInputRef = useRef(null);

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (file) onImportFile?.(file);
    event.target.value = '';
  }

  return (
    <main className="home-page">
      <section className="home-panel" aria-labelledby="home-title">
        <div className="home-panel__content">
          <header className="home-intro">
            <span className="home-intro__eyebrow">VISUAL STORY RUNTIME</span>
            <h1 id="home-title">Visual Story Runtime</h1>
            <p>A runtime for interactive stories.</p>
          </header>

          <div className="home-actions" aria-label="Start an experience">
            <HomeActionCard
              icon="play_circle"
              title="Run Demo Script"
              description="Khởi chạy kịch bản demo được tích hợp sẵn."
              variant="primary"
              onClick={onRunDemo}
              disabled={busy}
              loading={busy === 'demo'}
            />
            <HomeActionCard
              icon="data_object"
              title="Import JSON"
              description="Nạp kịch bản JSON của riêng bạn vào runtime."
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={Boolean(busy)}
              loading={busy === 'import'}
            />
            <input
              ref={fileInputRef}
              className="home-file-input"
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              aria-label="Chọn tệp kịch bản JSON"
            />
          </div>
          {error && <p className="home-error" role="alert">{error}</p>}
        </div>
      </section>
    </main>
  );
}
