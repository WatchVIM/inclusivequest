import React, { useMemo, useRef, useState } from 'react';
import {
  BRAND,
  CREATOR_CHECKLIST,
  FEATURES,
  MERCH,
  STATS,
  TITLES
} from './content.js';
import { useSyncedSidecar } from './utils/useSyncedSidecar.js';

function Icon({ name, size = 20, className = '' }) {
  const icons = {
    play: '▶',
    search: '⌕',
    captions: 'CC',
    transcript: '▤',
    audio: '◖',
    people: '◎',
    upload: '☁',
    bag: '◈',
    star: '✦',
    heart: '♥',
    menu: '☰',
    close: '×',
    mic: '🎙',
    hands: '☝'
  };

  return (
    <span className={`icon ${className}`} style={{ width: size, height: size, fontSize: Math.max(12, size * 0.78) }}>
      {icons[name] || icons.star}
    </span>
  );
}

function LogoMark({ compact = false, className = '' }) {
  return (
    <div className={`logo-mark ${className}`}>
      <img src={BRAND.logoSrc} alt={`${BRAND.name} logo`} className={compact ? 'logo-img compact' : 'logo-img'} />
      {!compact && (
        <div className="logo-copy">
          <div className="wordmark">
            Inclusive<span>Qest</span>
          </div>
          <p>{BRAND.tagline}</p>
        </div>
      )}
    </div>
  );
}

function Header({ activeTab, setActiveTab }) {
  const [open, setOpen] = useState(false);
  const nav = ['Home', 'Watch', 'Podcasts', 'Merch', 'For Creators'];

  return (
    <header className="site-header">
      <div className="nav-shell">
        <button className="brand-button" onClick={() => setActiveTab('Home')} aria-label="Go to homepage">
          <LogoMark />
        </button>

        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map((item) => (
            <button
              key={item}
              className={activeTab === item ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveTab(item)}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <button className="circle-button" aria-label="Search">
            <Icon name="search" />
          </button>
          <button className="outline-button">Sign In</button>
          <button className="gradient-button small">Sign Up</button>
        </div>

        <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle menu">
          <Icon name={open ? 'close' : 'menu'} size={30} />
        </button>
      </div>

      {open && (
        <div className="mobile-nav">
          {nav.map((item) => (
            <button
              key={item}
              onClick={() => {
                setActiveTab(item);
                setOpen(false);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}

function Hero({ setActiveTab }) {
  return (
    <section className="hero-section">
      <div className="glow glow-one" />
      <div className="glow glow-two" />
      <img src={BRAND.logoSrc} alt="" className="hero-watermark" />

      <div className="hero-grid container">
        <div className="hero-copy">
          <div className="mission-pill">
            <Icon name="heart" /> Built for Deaf & Hard-of-Hearing Communities
          </div>
          <h1>
            Accessible Video <br />& Podcasts.
            <span> Sign Language Beside the Story.</span>
          </h1>
          <p>
            InclusiveQest is a streaming and podcast platform where accessibility comes first. Watch,
            listen, and connect with content that includes sign-language interpretation, captions,
            transcripts, and accessible audio.
          </p>
          <div className="hero-buttons">
            <button className="gradient-button" onClick={() => setActiveTab('Watch')}>
              <Icon name="play" /> Start Watching
            </button>
            <button className="glass-button" onClick={() => setActiveTab('Podcasts')}>
              <Icon name="mic" /> Explore Podcasts
            </button>
          </div>
        </div>

        <FeaturedPlayerPreview />
      </div>
    </section>
  );
}

function FeaturedPlayerPreview() {
  return (
    <div className="preview-frame">
      <div className="preview-grid">
        <div className="interpreter-card preview-card">
          <div className="card-topline">
            <span className="live-badge">● LIVE</span>
            <span>ASL</span>
          </div>
          <div className="interpreter-placeholder">
            <Icon name="hands" size={44} />
            <strong>Interpreter Panel</strong>
            <small>Synced sidecar video</small>
          </div>
          <p className="interpreter-status"><span>●</span> Interpreter: Sarah L.</p>
        </div>

        <div className="main-preview-card">
          <img src={TITLES[0].poster} alt="Inclusive Voices preview" />
          <div className="video-overlay" />
          <div className="player-branding">
            <LogoMark compact />
            <span>Mux-ready player</span>
          </div>
          <div className="caption-box">It’s not just about accessibility, it’s about inclusion.</div>
          <div className="fake-controls">
            <div className="control-row">
              <Icon name="play" />
              <span>08:45 / 32:18</span>
              <div className="progress-track"><div className="progress-fill" /></div>
              <strong>CC</strong>
            </div>
            <p><Icon name="mic" /> Now Playing: Inclusive Voices Podcast • E03 – Redefining Inclusion</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureGrid() {
  return (
    <section className="feature-section">
      <div className="feature-strip container">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="feature-card">
            <div className="feature-icon"><Icon name={feature.icon} /></div>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function SyncedPlayer({ title }) {
  const mainRef = useRef(null);
  const aslRef = useRef(null);
  const [layout, setLayout] = useState('left');
  const [aslEnabled, setAslEnabled] = useState(true);

  useSyncedSidecar(mainRef, aslRef, aslEnabled);

  const interpreterPanel = (
    <aside className={aslEnabled ? 'sidecar-panel' : 'sidecar-panel hidden'}>
      <div className="card-topline">
        <span>Sign Language</span>
        <span>SYNC ON</span>
      </div>
      <video
        ref={aslRef}
        src={title.aslVideoSrc}
        muted
        playsInline
        preload="metadata"
        className="sidecar-video"
      />
    </aside>
  );

  return (
    <div className="synced-player-shell">
      <div className="player-title-row">
        <div>
          <p>Accessible Player</p>
          <h2>{title.title}</h2>
        </div>
        <div className="player-actions">
          <button onClick={() => setAslEnabled(!aslEnabled)}>{aslEnabled ? 'Hide ASL' : 'Show ASL'}</button>
          <button onClick={() => setLayout(layout === 'left' ? 'right' : 'left')}>
            Move ASL {layout === 'left' ? 'Right' : 'Left'}
          </button>
        </div>
      </div>

      <div className={`video-grid ${aslEnabled ? layout : 'no-sidecar'}`}>
        {layout === 'left' && interpreterPanel}
        <main className="main-video-panel">
          <video ref={mainRef} src={title.mainVideoSrc} poster={title.poster} controls playsInline preload="metadata">
            <track kind="captions" label="English" srcLang="en" src={title.captionsSrc} default />
          </video>
          <div className="mux-note"><LogoMark compact /> Mux-ready demo</div>
        </main>
        {layout === 'right' && interpreterPanel}
      </div>

      <p className="production-note">
        Production note: the main video can be Mux-hosted, while the interpreter video remains a
        synced ASL sidecar. This demo uses standard video tags so it can preview without paid or
        external video packages.
      </p>
    </div>
  );
}

function WatchPage() {
  const [selected, setSelected] = useState(TITLES[0]);

  return (
    <section className="page-section">
      <div className="container">
        <SyncedPlayer title={selected} />
        <div className="title-grid">
          {TITLES.map((item) => (
            <button
              key={item.id}
              className={selected.id === item.id ? 'title-card selected' : 'title-card'}
              onClick={() => setSelected(item)}
            >
              <img src={item.poster} alt="" />
              <div>
                <p>{item.category} · {item.duration}</p>
                <h3>{item.title}</h3>
                <span>{item.badge}</span>
                <small>{item.description}</small>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function PodcastsPage() {
  return (
    <section className="page-section">
      <div className="container">
        <div className="search-bar">
          <Icon name="search" />
          <input placeholder="Search podcasts, transcripts, guests, topics..." />
        </div>
        <div className="content-grid">
          {TITLES.map((item) => (
            <article key={item.id} className="content-card">
              <img src={item.poster} alt="" />
              <div>
                <p>{item.category} · {item.duration}</p>
                <h2>{item.title}</h2>
                <small>{item.description}</small>
                <button>Open Episode</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function MerchPage() {
  return (
    <section className="page-section">
      <div className="container">
        <div className="section-heading split">
          <div>
            <p>Merch Store</p>
            <h1>Wear the mission.</h1>
            <small>Launch InclusiveQest merch with logo hoodies, tees, mugs, totes, and creator collaborations.</small>
          </div>
          <button className="white-button"><Icon name="bag" /> View Cart</button>
        </div>

        <div className="merch-grid">
          {MERCH.map((item) => (
            <article key={item.id} className="merch-card">
              <div className="merch-preview">
                <div><img src={BRAND.logoSrc} alt="InclusiveQest merch logo" /></div>
              </div>
              <span>{item.tag}</span>
              <h3>{item.name}</h3>
              <div className="price-row">
                <strong>{item.price}</strong>
                <button>Add to Cart</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CreatorPage() {
  return (
    <section className="page-section">
      <div className="container creator-grid">
        <div>
          <LogoMark className="creator-logo" />
          <p className="eyebrow">For creators</p>
          <h1>Upload once. Deliver access-first.</h1>
          <p className="large-copy">
            Creators can submit video, ASL interpretation, captions, transcripts, key art,
            trailers, and merch collaboration assets.
          </p>
        </div>
        <div className="checklist-card">
          <h2>Submission checklist</h2>
          {CREATOR_CHECKLIST.map((item) => (
            <div key={item} className="checklist-item">
              <Icon name="star" /> <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomePage({ setActiveTab }) {
  return (
    <>
      <Hero setActiveTab={setActiveTab} />
      <FeatureGrid />
      <section className="home-panels-section">
        <div className="container panel-grid">
          <article className="info-panel">
            <h3>Captions & Transcripts</h3>
            <p>Read along with accurate captions and full searchable transcripts.</p>
            <button onClick={() => setActiveTab('Podcasts')}>Learn More →</button>
          </article>
          <article className="info-panel merch-panel">
            <h3>Merch Store</h3>
            <p>Wear your support and rep inclusion with logo-forward products.</p>
            <img src={BRAND.logoSrc} alt="InclusiveQest merch preview" />
            <button onClick={() => setActiveTab('Merch')}>Shop Now →</button>
          </article>
          <article className="info-panel">
            <h3>For Creators</h3>
            <p>Upload videos and podcasts with sign language, captions, and transcripts.</p>
            <button onClick={() => setActiveTab('For Creators')}>Get Started →</button>
          </article>
        </div>

        <div className="container stats-grid">
          {STATS.map(([num, label]) => (
            <div key={label} className="stat-card">
              <strong>{num}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('Home');

  const page = useMemo(() => {
    if (activeTab === 'Watch') return <WatchPage />;
    if (activeTab === 'Podcasts') return <PodcastsPage />;
    if (activeTab === 'Merch') return <MerchPage />;
    if (activeTab === 'For Creators') return <CreatorPage />;
    return <HomePage setActiveTab={setActiveTab} />;
  }, [activeTab]);

  return (
    <div className="app-shell">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />
      {page}
      <footer className="site-footer">
        <div className="container footer-inner">
          <LogoMark />
          <div>
            <span>Privacy</span>
            <span>Accessibility</span>
            <span>Creator Terms</span>
            <span>Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
