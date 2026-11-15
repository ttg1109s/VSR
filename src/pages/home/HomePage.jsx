import React from 'react';
import HomeActionCard from '../../components/home/HomeActionCard.jsx';
import './HomePage.css';

export default function HomePage() {
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
            />
            <HomeActionCard
              icon="data_object"
              title="Import JSON"
              description="Nạp kịch bản JSON của riêng bạn vào runtime."
              variant="secondary"
            />
          </div>
        </div>

        <footer className="home-panel__footer">
          VSR · Interactive Story Runtime
        </footer>
      </section>
    </main>
  );
}
