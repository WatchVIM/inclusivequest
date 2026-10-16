import React, { useEffect, useRef, useState } from 'react';
import {
  ABOUT, BRAND, FEATURES, FOUNDER, PODCASTER_CHECKLIST, INVEST_FORM, MISSION_VISION_VALUES,
  SOCIAL_LINKS, STATS, TEAM, TESTIMONIALS, TITLES, WORK_WITH_US_FORMS
} from './content.js';
import { useSyncedSidecar } from './utils/useSyncedSidecar.js';
import './about.css';
import './revisions.css';

const NAV = ['Home', 'About', 'Explore', 'Watch', 'Podcasts', 'For Platforms', 'For Podcasters'];
const SLUGS = {
  Home: 'home', About: 'about', Explore: 'explore', Watch: 'watch',
  Podcasts: 'podcasts', 'For Platforms': 'for-platforms', 'For Podcasters': 'for-podcasters',
  'Sign In': 'sign-in', 'Sign Up': 'sign-up', Invest: 'invest', Privacy: 'privacy',
  Accessibility: 'accessibility', 'Terms of Service': 'terms-of-service', Support: 'support'
};
const DESCRIPTIONS = {
  Home: 'Accessible podcasts with Sign Language interpretation, captions and searchable transcripts.',
  About: 'Our mission, founder story, team, testimonials, and partnership opportunities.',
  Explore: 'Discover Inclusive Quest podcasts by topic and interpreter.',
  Watch: 'Inclusive Quest makes Sign Language interpretation part of the podcast viewing experience.',
  Podcasts: 'Explore podcasts with Sign Language interpretation, captions, and transcripts.',
  'For Platforms': 'Bring integrated Sign Language interpretation and accessible discovery to your podcast platform.',
  'For Podcasters': 'Share your podcast with Inclusive Quest and reach DHH audiences.',
  Invest: 'Learn about investment opportunities in Inclusive Quest.'
};
function currentPage() {
  const slug = window.location.hash.replace(/^#\/?/, '');
  return Object.keys(SLUGS).find((key) => SLUGS[key] === slug) || 'Home';
}
function Icon({ name }) {
  const items = { play: '▶', search: '⌕', captions: 'CC', transcript: '▤',
    people: '◎', star: '✦', heart: '♥', menu: '☰', close: '×', mic: '♫', hands: '👌🏾' };
  return <span className={'icon icon-' + name} aria-hidden="true">{items[name] || '✦'}</span>;
}
function LogoMark({ compact = false }) {
  return <div className={'logo-mark new-brand ' + (compact ? 'compact-brand' : '')}>
    <img src={BRAND.logoSrc} alt="" className={compact ? 'logo-img compact' : 'logo-img'} />
    {!compact && <div className="logo-copy">
      <div className="wordmark">Inclusive <span>Quest</span></div>
      <p>{BRAND.tagline}</p>
    </div>}
  </div>;
}
function Header({ activeTab, navigate }) {
  const [open, setOpen] = useState(false);
  const change = (item) => { navigate(item); setOpen(false); };
  return <header className="site-header">
    <div className="nav-shell">
      <button className="brand-button" onClick={() => change('Home')} aria-label="Inclusive Quest homepage"><LogoMark /></button>
      <nav className="desktop-nav" aria-label="Main navigation">
        {NAV.map((item) => <button key={item} className={'nav-item ' + (activeTab === item ? 'active' : '')}
          aria-current={activeTab === item ? 'page' : undefined} onClick={() => change(item)}>{item}</button>)}
      </nav>
      <div className="header-actions">
        <button className="outline-button" onClick={() => change('Sign In')}>Sign In</button>
        <button className="gradient-button small" onClick={() => change('Sign Up')}>Sign Up</button>
      </div>
      <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>
        <Icon name={open ? 'close' : 'menu'} />
      </button>
    </div>
    {open && <nav className="mobile-nav" aria-label="Mobile navigation">
      {[...NAV, 'Sign In', 'Sign Up'].map((item) => <button key={item}
        onClick={() => change(item)}>{item}</button>)}
    </nav>}
  </header>;
}
function Hero({ navigate }) {
  return <section className="hero-section">
    <div className="glow glow-one" /><div className="glow glow-two" />
    <div className="hero-grid container">
      <div className="hero-copy">
        <div className="mission-pill"><Icon name="heart" /> Built for Deaf and Hard of Hearing communities</div>
        <h1>Accessible Podcasts.<span>See Every Story. See Every Voice.</span></h1>
        <p>Explore the podcast world through Sign Language interpretation, captions, transcripts, and topic-based discovery — with DHH audiences at the center.</p>
        <p className="hero-iq-question"><strong>What's Your IQ?</strong> Not Intelligence. Inclusivity Quotient. <em>Is your content reaching everyone?</em></p>
        <div className="hero-buttons">
          <button className="gradient-button" onClick={() => navigate('Watch')}><Icon name="play" /> Start Watching</button>
          <button className="glass-button" onClick={() => navigate('Explore')}><Icon name="search" /> Start Exploring</button>
        </div>
        <blockquote className="hero-quote">48 million people in the US are Deaf or Hard of Hearing. 1.5 billion worldwide — and growing. The podcast world hasn’t made room for them. IQ does.</blockquote>
      </div>
      <FeaturedPlayerPreview />
    </div>
  </section>;
}
function FeaturedPlayerPreview() {
  return <div className="preview-frame">
    <div className="preview-grid">
      <div className="interpreter-card preview-card">
        <div className="card-topline"><span>Sign Language</span><span>Inclusive Quest</span></div>
        <div className="interpreter-placeholder professional-preview">
          <img className="preview-brand-mark" src={BRAND.logoSrc} alt="" />
          <strong>Sign Language Interpretation</strong>
          <small>Interpreter video preview coming soon</small>
        </div>
      </div>
      <div className="main-preview-card">
        <img src={TITLES[0].poster} alt="She Wears the Pants podcast — Calling All Women in Business: How to Stop Overthinking and Start Taking Smarter Risks" />
        <div className="video-overlay" />
        <div className="caption-box">See Every Story. See Every Voice.</div>
        <div className="fake-controls"><p><Icon name="mic" /> {TITLES[0].title}: {TITLES[0].episodeTitle}</p></div>
      </div>
    </div>
  </div>;
}
function FeatureGrid() {
  return <section className="feature-section"><div className="feature-strip container">
    {FEATURES.map((feature) => <article className="feature-card" key={feature.title}>
      <div className="feature-icon"><Icon name={feature.icon} /></div>
      <h3>{feature.title}</h3><p>{feature.text}</p>
    </article>)}
  </div></section>;
}
function FounderPhoto({ compact = false }) {
  const [failed, setFailed] = useState(false);
  return <div className={compact ? 'founder-photo-shell compact' : 'founder-photo-shell'}>
    {!failed ? <img src={FOUNDER.photoSrc} alt={FOUNDER.photoAlt} className="founder-photo" onError={() => setFailed(true)} /> :
      <div className="founder-photo-placeholder" role="img" aria-label="Founder portrait to be added">
        <Icon name="people" /><span>Founder portrait</span>
      </div>}
  </div>;
}
function Newsletter() {
  const [email, setEmail] = useState('');
  const submit = (event) => {
    event.preventDefault();
    const subject = encodeURIComponent('Inclusive Quest launch waitlist request');
    const body = encodeURIComponent('Please add ' + email.trim() + ' to your launch updates list. I consent to being contacted about the Inclusive Quest launch.');
    window.location.href = 'mailto:' + BRAND.contactEmail + '?subject=' + subject + '&body=' + body;
  };
  return <section className="newsletter container" aria-labelledby="newsletter-heading">
    <div><p className="eyebrow">Launch updates</p><h2 id="newsletter-heading">Be the first to know when IQ launches.</h2>
      <p>Get an invitation when accessible podcasts arrive.</p></div>
    <form onSubmit={submit} className="newsletter-form">
      <label htmlFor="waitlist-email">Email address</label>
      <div><input id="waitlist-email" type="email" autoComplete="email" required
        placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        <button className="gradient-button" type="submit">Join Waitlist</button></div>
      <small>This opens your email app to request launch updates. Direct online signup is coming soon.</small>
    </form>
  </section>;
}
function Testimonials() {
  return <section className="testimonials-section container" aria-labelledby="testimonials-heading">
    <p className="eyebrow">Testimonials</p><h2 id="testimonials-heading">Voices from our community</h2>
    {TESTIMONIALS.length ? <div className="testimonial-grid">{TESTIMONIALS.map((item, index) =>
      <blockquote key={index}><p>“{item.quote}”</p><cite>{item.name}{item.title ? ', ' + item.title : ''}</cite></blockquote>)}</div> :
      <p className="quiet-note">Community testimonials will be added as soon as they are approved.</p>}
  </section>;
}
function FounderHomeSpotlight({ navigate }) {
  return <section className="container founder-home-spotlight" aria-label="Founder story">
    <FounderPhoto compact />
    <div><p className="eyebrow">Founder Story</p><blockquote>“{FOUNDER.homeQuote}”</blockquote>
      <p>Inclusive Quest exists so Deaf and Hard of Hearing audiences can be part of every conversation.</p>
      <button onClick={() => navigate('About')}>Read the founder story →</button>
    </div>
  </section>;
}
function HomePage({ navigate }) {
  return <><Hero navigate={navigate} /><FeatureGrid />
    <section className="home-panels-section">
      <div className="container panel-grid">
        <article className="info-panel"><h3>Captions & Transcripts</h3>
          <p>Follow the conversation with clear captions and searchable transcripts.</p>
          <button onClick={() => navigate('Podcasts')}>Explore podcasts →</button></article>
        <article className="info-panel"><h3>For Platforms</h3>
          <p>Work with IQ to make podcast discovery and Sign Language interpretation more accessible.</p>
          <button onClick={() => navigate('For Platforms')}>Explore partnerships →</button></article>
        <article className="info-panel"><h3>For Podcasters</h3>
          <p>Bring your podcast to DHH audiences with access-first presentation.</p>
          <button onClick={() => navigate('For Podcasters')}>Learn about submissions →</button></article>
      </div>
      <FounderHomeSpotlight navigate={navigate} />
      <div className="container stats-grid">{STATS.map(([value, label]) =>
        <div key={label} className="stat-card"><strong>{value}</strong><span>{label}</span></div>)}</div>
    </section>
    <Testimonials /><section className="container invest-home"><h2>Invest in accessibility for everyone.</h2><p>Inclusive Quest is building toward an accessible podcast future. Explore opportunities to support that vision.</p><button className="glass-button" onClick={() => navigate('Invest')}>Invest in Inclusive Quest →</button></section><Newsletter />
  </>;
}
function SyncedPlayer({ title, captionsEnabled }) {
  const mainRef = useRef(null);
  const aslRef = useRef(null);
  const [layout, setLayout] = useState('left');
  useSyncedSidecar(mainRef, aslRef, true);
  useEffect(() => {
    const video = mainRef.current;
    if (!video) return;
    const setCaptions = () => {
      Array.from(video.textTracks).forEach((track) => {
        if (track.kind === 'captions' || track.kind === 'subtitles') track.mode = captionsEnabled ? 'showing' : 'disabled';
      });
    };
    setCaptions();
    video.addEventListener('loadedmetadata', setCaptions);
    return () => video.removeEventListener('loadedmetadata', setCaptions);
  }, [captionsEnabled, title.id]);
  const hasEpisode = Boolean(title.mainVideoSrc && title.aslVideoSrc);
  return <div className="synced-player-shell">
    <div className="player-title-row">
      <div><p>Accessible Podcasts</p><h2>{title.title}</h2><small>{title.episodeTitle}</small></div>
      {hasEpisode && <div className="player-actions"><button onClick={() => setLayout(layout === 'left' ? 'right' : 'left')}>
        Move Sign Language {layout === 'left' ? 'Right' : 'Left'}</button></div>}
    </div>
    {hasEpisode ? <div className={'video-grid ' + layout}>
      {layout === 'left' && <aside className="sidecar-panel"><div className="card-topline">Sign Language interpretation</div>
        <video ref={aslRef} src={title.aslVideoSrc} muted playsInline preload="metadata"
          aria-label="Sign Language interpreter video" className="sidecar-video" /></aside>}
      <div className="main-video-panel"><video key={title.id} ref={mainRef} src={title.mainVideoSrc}
        poster={title.poster} controls playsInline preload="metadata" aria-label={title.title + ' episode'}>
        {title.captionsSrc && <track kind="captions" label="English" srcLang="en" src={title.captionsSrc} default />}
      </video></div>
      {layout === 'right' && <aside className="sidecar-panel"><div className="card-topline">Sign Language interpretation</div>
        <video ref={aslRef} src={title.aslVideoSrc} muted playsInline preload="metadata" aria-label="Sign Language interpreter video" className="sidecar-video" /></aside>}
    </div> : <div className="watch-unavailable">
      <img src={title.poster} alt={title.title + ' podcast artwork'} />
      <div><p className="eyebrow">Episode coming soon</p><h3>Built-in Sign Language. Clear captions. Every conversation.</h3>
        <p>Podcast playback will appear here when the licensed episode and interpreter media are delivered. Sign Language interpretation will always remain visible.</p></div>
    </div>}
  </div>;
}
function WatchPage({ selectedTitle, captionsEnabled, setSelectedTitle }) {
  return <section className="page-section"><div className="container">
    <SyncedPlayer title={selectedTitle} captionsEnabled={captionsEnabled} />
    <div className="title-grid">{TITLES.map((item) => <button key={item.id}
      className={'title-card ' + (item.id === selectedTitle.id ? 'selected' : '')} onClick={() => setSelectedTitle(item)}>
      <img src={item.poster} alt={item.title + ' podcast artwork'} />
      <div><p>{item.category}</p><h3>{item.title}</h3><span>{item.badge}</span><small>{item.description}</small></div>
    </button>)}</div>
  </div></section>;
}
function PodcastsPage({ navigate, setSelectedTitle, explore = false }) {
  const [search, setSearch] = useState('');
  const filtered = TITLES.filter((item) =>
    [item.title, item.episodeTitle, item.description, item.category, item.interpreter].join(' ').toLowerCase().includes(search.toLowerCase().trim()));
  return <section className="page-section"><div className="container">
    <div className="section-heading"><p className="eyebrow">{explore ? 'Discover' : 'Podcasts'}</p>
      <h1>{explore ? 'Explore accessible conversations.' : 'Every story deserves to be seen.'}</h1></div>
    <div className="search-bar"><Icon name="search" />
      <label className="sr-only" htmlFor="podcast-search">Search podcasts by topic or interpreter</label>
      <input id="podcast-search" placeholder="Search podcasts, topics, or interpreters" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
    <div className="content-grid">{filtered.map((item) => <article key={item.id} className="content-card">
      <img src={item.poster} alt={item.title + ' cover artwork'} />
      <div><p>{item.category} · {item.badge}</p><h2>{item.title}</h2>
        <strong>{item.episodeTitle}</strong><small>{item.description}</small>
        <button onClick={() => { setSelectedTitle(item); navigate('Watch'); }}>View Episode</button></div>
    </article>)}</div>
    {!filtered.length && <p role="status" className="quiet-note">No podcasts matched this search yet.</p>}
  </div></section>;
}
function ForPlatforms() {
  return <section className="page-section"><div className="container creator-grid">
    <div><p className="eyebrow">For Platforms</p><h1>Make more podcast conversations accessible.</h1>
      <p className="large-copy">Partner with Inclusive Quest to bring native Sign Language interpretation, clear captions, transcripts, and accessible discovery to your listeners and viewers.</p>
      <a className="gradient-button link-button" href={WORK_WITH_US_FORMS.platforms.url} target="_blank" rel="noopener noreferrer">Submit a platform inquiry <span aria-hidden="true">↗</span></a>
    </div>
    <div className="checklist-card"><h2>What we can build together</h2>
      {['Integrated Sign Language interpretation', 'Captions and searchable transcripts', 'Topic discovery and interpreter profiles', 'Audience-first accessibility workflows'].map((item) =>
        <div className="checklist-item" key={item}><Icon name="star" /> <span>{item}</span></div>)}
    </div>
  </div>
    <div className="container dedicated-form"><TallySubmissionForm kind="platforms" /></div>
  </section>;
}
function ForPodcasters() {
  return <section className="page-section"><div className="container creator-grid">
    <div><p className="eyebrow">For Podcasters</p><h1>Bring your podcast to more people.</h1>
      <p className="large-copy">We help podcast creators prepare conversations for DHH audiences. Share the essentials of your show, and we'll follow up about accessibility and next steps.</p>
      <a className="gradient-button link-button" href={WORK_WITH_US_FORMS.podcasters.url} target="_blank" rel="noopener noreferrer">Submit your podcast <span aria-hidden="true">↗</span></a>
    </div>
    <div className="checklist-card"><h2>Submission checklist</h2>
      {PODCASTER_CHECKLIST.map((item) =>
        <div key={item} className="checklist-item"><Icon name="star" /><span>{item}</span></div>)}
    </div>
  </div>
    <div className="container dedicated-form"><TallySubmissionForm kind="podcasters" /></div>
  </section>;
}
function TallySubmissionForm({ kind }) {
  const form = kind === 'investment' ? INVEST_FORM : WORK_WITH_US_FORMS[kind];
  return <div className="tally-form-wrap" id={'submission-' + kind}>
    <div className="tally-form-heading">
      <div><h3>{form.heading}</h3><p>{form.description}</p></div>
      <a className="glass-button link-button" href={form.url} target="_blank" rel="noopener noreferrer">
        Open full form <span aria-hidden="true">↗</span>
      </a>
    </div>
    <iframe
      key={kind}
      className="tally-form-frame"
      src={form.embedUrl}
      title={'Inclusive Quest — ' + form.heading}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
    />
    <p className="tally-form-note">This form is hosted by Tally. If the embedded form does not load, use “Open full form” above to submit securely on Tally.</p>
  </div>;
}
function WorkWithUsForms() {
  const [selected, setSelected] = useState('platforms');
  return <div className="work-with-us-forms">
    <div className="form-switcher" role="group" aria-label="Choose a submission form">
      {Object.entries(WORK_WITH_US_FORMS).map(([kind, form]) =>
        <button key={kind} type="button" className={'form-switch ' + (selected === kind ? 'selected' : '')}
          aria-pressed={selected === kind} onClick={() => setSelected(kind)}>{form.label}</button>)}
    </div>
    <TallySubmissionForm kind={selected} />
  </div>;
}
function AboutPage() {
  return <section className="page-section about-page"><div className="container">
    <section className="about-intro-grid" aria-labelledby="about-heading">
      <div><p className="eyebrow">Our mission</p><h1 id="about-heading">About Inclusive Quest</h1></div>
      <div className="about-copy">{ABOUT.paragraphs.map((p) => <p key={p}>{p}</p>)}
        <img className="about-signature-logo" src={BRAND.logoSrc} alt="Inclusive Quest" /></div>
    </section>
    <section className="mission-vision-values" aria-label="Our mission, vision and values">
      {MISSION_VISION_VALUES.map((item) => <article key={item.id} className="mvv-card" id={item.id}>
        <p className="eyebrow">Inclusive Quest</p><h2>{item.heading}</h2><p>{item.text}</p>
      </article>)}
    </section>
    <section className="bio-section" aria-labelledby="bio-heading">
      <p className="eyebrow">Founder Bio</p><h2 id="bio-heading">Founder Bio</h2>
      <p className="founder-name">{FOUNDER.name} — {FOUNDER.title}</p>
      {FOUNDER.bio?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </section>
    <section className="founder-story-grid" aria-labelledby="founder-heading">
      <FounderPhoto />
      <div className="founder-story-copy"><p className="eyebrow">Founder Story</p>
        <h2 id="founder-heading">Why Inclusive Quest exists.</h2>
        {FOUNDER.story.map((p) => <p key={p}>{p}</p>)}
      </div>
    </section>
    <section className="team-section" aria-labelledby="team-heading">
      <div className="section-heading"><p className="eyebrow">The Team</p><h2 id="team-heading">The people building the bridge.</h2></div>
      {TEAM.members.length ? <div className="team-grid">{TEAM.members.map((member) =>
        <article className="team-card" key={member.name}><div>{member.photoSrc && <img src={member.photoSrc}
          alt={member.name + ', ' + member.title} />}</div><div><h3>{member.name}</h3><span>{member.title}</span><p>{member.bio}</p></div></article>)}</div> :
        <div className="team-placeholder-copy"><p>{TEAM.placeholder}</p></div>}
    </section>
    <Testimonials />
    <section className="work-with-us" id="work-with-us" aria-labelledby="work-heading">
      <div className="work-with-us-intro">
        <p className="eyebrow">Work With Us</p>
        <h2 id="work-heading">Help make every conversation accessible.</h2>
        <p>Whether you're a platform, podcaster, interpreter, or other collaborator, select the right form below and share your ideas with Inclusive Quest.</p>
        <p>You can also <a href={'mailto:' + BRAND.contactEmail}>reach our team by email</a> if you have questions.</p>
      </div>
      <WorkWithUsForms />
    </section>
    <section className="invest-prompt" aria-labelledby="invest-about-heading">
      <h2 id="invest-about-heading">Invest in Inclusive Quest</h2>
      <p>Help us build the next generation of inclusive podcast experiences.</p>
      <a href="#/invest" className="gradient-button link-button">Investment inquiry <span aria-hidden="true">↗</span></a>
    </section>
  </div></section>;
}
function InvestPage() {
  return <section className="page-section"><div className="container invest-page">
    <p className="eyebrow">Invest in Inclusive Quest</p>
    <h1>Build a world of accessible conversations.</h1>
    <p className="large-copy">Interested in backing Inclusive Quest? Share your details with the founding team through the dedicated investor inquiry form below.</p>
    <TallySubmissionForm kind="investment" />
  </div></section>;
}
const POLICIES = {
  Privacy: {
    intro: 'Privacy Notice',
    paragraphs: ['Inclusive Quest is preparing for launch. This site does not yet offer purchases or account registration.',
      'If you email us, the information you send may be used to respond to your inquiry. Please do not send sensitive personal details through email.',
      'Platform, podcaster, interpreter, other collaboration, and investment inquiry forms are hosted by Tally, a third-party form service. When you submit a form, the details you provide are collected through Tally and shared with Inclusive Quest to evaluate and respond to your inquiry. Review the privacy information provided by the form service before submitting.',
      'This is an interim notice pending a client-approved privacy policy. For privacy questions, contact info@inclusivequest.co.']
  },
  Accessibility: {
    intro: 'Accessibility at Inclusive Quest',
    paragraphs: ['We are building Inclusive Quest for Deaf and Hard of Hearing audiences, with accessible headings, keyboard-friendly controls, and descriptive image text.',
      'Sign Language interpretation is a core part of our playback design. Captions default to on once episodes are available.',
      'Display controls can help adjust contrast, text size, reduce motion, and highlight links. These controls do not replace assistive technology or accessibility testing.',
      'Please report accessibility barriers to info@inclusivequest.co.']
  },
  'Terms of Service': {
    intro: 'Terms of Service',
    paragraphs: ['This is the prelaunch website for Inclusive Quest. Information, artwork, availability, and features may change before launch.',
      'Content and marks are provided for informational purposes and may not be redistributed without permission of the respective rights holders.',
      'No account, purchase, or subscription is created through the current website. Final platform terms will be published before those services become available.',
      'Contact info@inclusivequest.co with questions.']
  },
  Support: {
    intro: 'Support',
    paragraphs: ['Have questions about Inclusive Quest, podcast accessibility, or an upcoming partnership?',
      'Please contact info@inclusivequest.co. We welcome feedback on captions, interpretation, navigation, and other accessibility needs.']
  }
};
function PolicyPage({ page }) {
  const item = POLICIES[page];
  return <section className="page-section"><div className="container legal-page">
    <p className="eyebrow">Inclusive Quest</p><h1>{item.intro}</h1>
    {item.paragraphs.map((p) => <p key={p}>{p}</p>)}
    <a href={'mailto:' + BRAND.contactEmail}>Contact {BRAND.contactEmail}</a>
  </div></section>;
}
function AccountPage({ page }) {
  return <section className="page-section"><div className="container account-launch">
    <p className="eyebrow">{page}</p><h1>Inclusive Quest is getting ready.</h1>
    <p>Accounts will open with the launch. Join the launch list to receive updates first.</p>
    <Newsletter />
  </div></section>;
}
function AccessibilityPanel({
  captionsEnabled, setCaptionsEnabled, captionStyle, setCaptionStyle,
  textLevel, setTextLevel, settings, setSettings, readAloud, setReadAloud,
  autoRead, setAutoRead, onReadPage, onStopRead, speechSupported, speechStatus
}) {
  const [open, setOpen] = useState(false);
  const options = [
    ['highContrast', 'High contrast'],
    ['adhdFriendly', 'ADHD-friendly reading'],
    ['dyslexiaFriendly', 'Dyslexia-friendly font'],
    ['colorBlind', 'Color-blind friendly'],
    ['pauseMotion', 'Pause animations'],
    ['highlightLinks', 'Highlight links']
  ];
  const toggle = (key) => setSettings((previous) => ({ ...previous, [key]: !previous[key] }));
  const reset = () => {
    setSettings({}); setCaptionsEnabled(true); setCaptionStyle('white-black');
    setTextLevel(0); setReadAloud(false); setAutoRead(false); onStopRead();
  };
  return <div className="a11y-root">
    <button className="a11y-trigger" aria-expanded={open} aria-controls="a11y-panel"
      onClick={() => setOpen(!open)}><span aria-hidden="true">♿</span> Accessibility</button>
    {open && <section id="a11y-panel" className="a11y-panel" aria-label="Accessibility preferences">
      <div className="a11y-panel-heading"><h2>Accessibility preferences</h2>
        <button onClick={() => setOpen(false)} aria-label="Close accessibility preferences">×</button></div>
      <p>Choose how you want to experience Inclusive Quest. Sign Language interpretation is always available by design.</p>
      <div className="a11y-range-group">
        <label htmlFor="a11y-text-size">Text size <strong>{['Default', 'Large', 'Larger', 'Largest'][textLevel]}</strong></label>
        <input id="a11y-text-size" type="range" min="0" max="3" step="1"
          value={textLevel} onChange={(event) => setTextLevel(Number(event.target.value))}
          aria-valuetext={['Default', 'Large', 'Larger', 'Largest'][textLevel]} />
        <span className="a11y-range-labels"><span>Default</span><span>Largest</span></span>
      </div>
      {options.map(([key, label]) => <label className="a11y-option" key={key}>
        <span>{label}</span><input type="checkbox" checked={!!settings[key]} onChange={() => toggle(key)} />
      </label>)}
      <label className="a11y-option"><span>Captions (default ON)</span>
        <input type="checkbox" checked={captionsEnabled} onChange={(e) => setCaptionsEnabled(e.target.checked)} /></label>
      <label className="a11y-select-group" htmlFor="caption-style"><span>Caption appearance</span>
        <select id="caption-style" value={captionStyle} onChange={(e) => setCaptionStyle(e.target.value)}>
          <option value="white-black">White on black</option>
          <option value="yellow-black">Yellow on black</option>
          <option value="black-white">Black on white</option>
        </select>
      </label>
      <p className={'caption-sample ' + captionStyle} aria-label="Caption color example">Captions help everyone follow the story.</p>
      <label className="a11y-option"><span>Sign Language mode (always ON)</span>
        <input type="checkbox" checked readOnly disabled aria-label="Sign Language mode is always on" /></label>
      <label className="a11y-option"><span>Read selected or hovered text aloud</span>
        <input type="checkbox" checked={readAloud} onChange={(e) => setReadAloud(e.target.checked)} disabled={!speechSupported} /></label>
      <label className="a11y-option"><span>Auto-read each page aloud</span>
        <input type="checkbox" checked={autoRead} onChange={(e) => setAutoRead(e.target.checked)} disabled={!speechSupported} /></label>
      <div className="a11y-speech-actions">
        <button className="glass-button" disabled={!speechSupported} onClick={onReadPage}>Read this page</button>
        <button className="glass-button" disabled={!speechSupported} onClick={onStopRead}>Stop reading</button>
      </div>
      <p role="status" aria-live="polite" className="a11y-speech-status">{speechSupported ? speechStatus || 'Reading aloud may require a user interaction in your browser.' : 'Read Aloud is unavailable in this browser.'}</p>
      <p className="a11y-helper">This panel complements native screen reader support. Keyboard navigation and semantic page headings remain available.</p>
      <button className="outline-button" onClick={reset}>Reset preferences</button>
    </section>}
  </div>;
}
export default function App() {
  const [activeTab, setActiveTab] = useState(currentPage);
  const [selectedTitle, setSelectedTitle] = useState(TITLES[0]);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionStyle, setCaptionStyle] = useState('white-black');
  const [textLevel, setTextLevel] = useState(0);
  const [settings, setSettings] = useState({});
  const [readAloud, setReadAloud] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('');
  const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const onStopRead = () => { if (speechSupported) window.speechSynthesis.cancel(); setSpeechStatus('Reading stopped.'); };
  const speak = (raw) => {
    if (!speechSupported) { setSpeechStatus('Read Aloud is unavailable in this browser.'); return; }
    window.speechSynthesis.cancel();
    const content = String(raw || '').replace(/\\s+/g, ' ').trim();
    if (!content) { setSpeechStatus('No text to read.'); return; }
    const chunks = content.match(/.{1,900}(?:\\s|$)/g) || [content];
    chunks.forEach((chunk, index) => {
      const utterance = new window.SpeechSynthesisUtterance(chunk.trim());
      utterance.rate = 0.92;
      utterance.lang = 'en-US';
      if (index === chunks.length - 1) utterance.onend = () => setSpeechStatus('Finished reading.');
      utterance.onerror = () => setSpeechStatus('Speech playback was interrupted or blocked by the browser.');
      window.speechSynthesis.speak(utterance);
    });
    setSpeechStatus('Reading aloud. Press Stop reading or Escape to stop.');
  };
  const onReadPage = () => speak(document.getElementById('main-content')?.innerText || '');
  useEffect(() => {
    if (!readAloud || !speechSupported) return;
    const main = document.getElementById('main-content');
    if (!main) return;
    let hoverTimer;
    const readSelection = () => {
      const selected = String(window.getSelection()?.toString() || '').trim();
      if (selected && selected.length > 2) speak(selected);
    };
    const onHover = (event) => {
      clearTimeout(hoverTimer);
      if (window.getSelection()?.toString().trim()) return;
      const target = event.target.closest?.('p, h1, h2, h3, li, blockquote, article strong');
      if (!target || !main.contains(target)) return;
      hoverTimer = window.setTimeout(() => speak(target.innerText?.slice(0, 1500) || ''), 1000);
    };
    const cancelHover = () => clearTimeout(hoverTimer);
    main.addEventListener('mouseup', readSelection);
    main.addEventListener('mouseover', onHover);
    main.addEventListener('mouseout', cancelHover);
    return () => { clearTimeout(hoverTimer); main.removeEventListener('mouseup', readSelection);
      main.removeEventListener('mouseover', onHover); main.removeEventListener('mouseout', cancelHover); };
  }, [readAloud, activeTab, speechSupported]);
  useEffect(() => {
    if (!autoRead || !speechSupported) return;
    const timer = window.setTimeout(() => onReadPage(), 350);
    return () => window.clearTimeout(timer);
  }, [autoRead, activeTab, speechSupported]);
  useEffect(() => {
    const stopOnEscape = (event) => { if (event.key === 'Escape' && speechSupported) window.speechSynthesis.cancel(); };
    window.addEventListener('keydown', stopOnEscape);
    return () => window.removeEventListener('keydown', stopOnEscape);
  }, [speechSupported]);
  useEffect(() => {
    const onHash = () => setActiveTab(currentPage());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => {
    document.title = 'Inclusive Quest | ' + (activeTab === 'Home' ? 'Accessible Podcasts' : activeTab);
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', (DESCRIPTIONS[activeTab] || 'See Every Story. See Every Voice. — Inclusive Quest'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);
  const navigate = (page) => {
    setActiveTab(page);
    window.location.hash = '/' + SLUGS[page];
  };
  let page;
  if (activeTab === 'Home') page = <HomePage navigate={navigate} />;
  else if (activeTab === 'About') page = <AboutPage />;
  else if (activeTab === 'Explore' || activeTab === 'Podcasts') page =
    <PodcastsPage navigate={navigate} setSelectedTitle={setSelectedTitle} explore={activeTab === 'Explore'} />;
  else if (activeTab === 'Watch') page = <WatchPage selectedTitle={selectedTitle} setSelectedTitle={setSelectedTitle} captionsEnabled={captionsEnabled} />;
  else if (activeTab === 'Invest') page = <InvestPage />;
  else if (activeTab === 'For Platforms') page = <ForPlatforms />;
  else if (activeTab === 'For Podcasters') page = <ForPodcasters />;
  else if (activeTab === 'Sign In' || activeTab === 'Sign Up') page = <AccountPage page={activeTab} />;
  else if (POLICIES[activeTab]) page = <PolicyPage page={activeTab} />;
  else page = <HomePage navigate={navigate} />;
  const classes = Object.entries(settings).filter(([, enabled]) => enabled).map(([key]) => key).join(' ');
  return <div className={'app-shell ' + classes} data-text-level={textLevel} data-caption-style={captionStyle}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <Header activeTab={activeTab} navigate={navigate} />
    <main id="main-content" tabIndex="-1">{page}</main>
    <footer className="site-footer"><div className="container footer-inner">
      <div className="footer-brand"><LogoMark /><p className="footer-tagline">{BRAND.footerTagline}</p></div>
      <nav aria-label="Footer links" className="footer-links">
        {['Privacy', 'Accessibility', 'Terms of Service', 'Support', 'Invest'].map((item) =>
          <a key={item} href={'#/' + SLUGS[item]}>{item}</a>)}
        <a href={'mailto:' + BRAND.contactEmail}>{BRAND.contactEmail}</a>
        {SOCIAL_LINKS.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">{item.label}</a>)}
      </nav>
      <p className="copyright">© 2026 Inclusive Quest. All rights reserved.</p>
    </div></footer>
    <AccessibilityPanel captionsEnabled={captionsEnabled} setCaptionsEnabled={setCaptionsEnabled}
      captionStyle={captionStyle} setCaptionStyle={setCaptionStyle}
      textLevel={textLevel} setTextLevel={setTextLevel} settings={settings} setSettings={setSettings}
      readAloud={readAloud} setReadAloud={setReadAloud} autoRead={autoRead} setAutoRead={setAutoRead}
      onReadPage={onReadPage} onStopRead={onStopRead} speechSupported={speechSupported} speechStatus={speechStatus} />
  </div>;
}
