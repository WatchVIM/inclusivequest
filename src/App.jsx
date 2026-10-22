import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  BRAND, FEATURES, PODCASTER_CHECKLIST, INVEST_FORM,
  SOCIAL_LINKS, STATS, TEAM, WORK_WITH_US_FORMS
} from './content.js';
import { useSyncedSidecar } from './utils/useSyncedSidecar.js';
import { useContent } from './cms/ContentProvider.jsx';
import { parseYouTubeUrl } from './cms/content-model.js';
import './about.css';
import './revisions.css';
import SponsorPlacement from './sponsors/SponsorPlacement.jsx';

const NAV = ['Home', 'About', 'Explore', 'Watch', 'Podcasts', 'For Platforms', 'For Podcasters', 'Blog'];
const SLUGS = {
  Home: 'home', About: 'about', Explore: 'explore', Watch: 'watch',
  Podcasts: 'podcasts', 'For Platforms': 'for-platforms', 'For Podcasters': 'for-podcasters',
  'Sign In': 'sign-in', 'Sign Up': 'sign-up', Invest: 'invest', Privacy: 'privacy',
  Accessibility: 'accessibility', 'Terms of Service': 'terms-of-service', Support: 'support', Blog: 'blog'
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
  if (typeof window === 'undefined') return 'Home';
  const slug = window.location.hash.replace(/^#\/?/, '');
  if (slug.startsWith('blog/')) return 'Post:' + slug.slice(5);
  return Object.keys(SLUGS).find((key) => SLUGS[key] === slug) || (slug ? 'Page:' + slug : 'Home');
}
function Icon({ name }) {
  const items = { play: '▶', search: '⌕', captions: 'CC', transcript: '▤',
    people: '◎', star: '✦', heart: '♥', menu: '☰', close: '×', mic: '♫', hands: '👌🏾' };
  return <span className={'icon icon-' + name} aria-hidden="true">{items[name] || '✦'}</span>;
}
function GradientWords({ children }) {
  return String(children || '').split(/(\b(?:mission|vision|values|founder|quest|bridge|community|accessible|build|people|checklist|launches)\b)/gi)
    .map((part, index) => index % 2 ? <span className="gradient-word" key={index}>{part}</span> : part);
}
function InterpreterMark({ className = '' }) {
  const { HOME } = useContent();
  return <img className={className} src={HOME.interpreterImageSrc || BRAND.logoSrc}
    alt={HOME.interpreterImageSrc ? HOME.interpreterImageAlt || '' : ''} />;
}
function LogoMark({ compact = false }) {
  return <div className={'logo-mark new-brand ' + (compact ? 'compact-brand' : '')}>
    <img src={BRAND.logoSrc} alt="" className={compact ? 'logo-img compact' : 'logo-img'} />
    {!compact && <div className="logo-copy">
      <div className="wordmark">Inclusive <span>Quest</span></div>
    </div>}
  </div>;
}
function Header({ activeTab, navigate }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const menuId = useId();
  const change = (item) => { navigate(item); setOpen(false); };
  useEffect(() => {
    if (!open) return undefined;
    menuRef.current?.querySelector('button')?.focus();
    const dismiss = (event) => {
      if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [open]);
  useEffect(() => setOpen(false), [activeTab]);
  return <header className="site-header">
    <div className="nav-shell">
      <button className="brand-button" onClick={() => change('Home')} aria-label="Inclusive Quest homepage"><LogoMark /></button>
      <nav className="desktop-nav" aria-label="Main navigation">
        {NAV.map((item) => <button key={item} className={'nav-item ' + (activeTab === item || (item === 'Blog' && activeTab.startsWith('Post:')) ? 'active' : '')}
          aria-current={activeTab === item || (item === 'Blog' && activeTab.startsWith('Post:')) ? 'page' : undefined} onClick={() => change(item)}>{item}</button>)}
      </nav>
      <div className="header-actions">
        <button className="outline-button" onClick={() => change('Sign In')}>Sign In</button>
        <button className="gradient-button small" onClick={() => change('Sign Up')}>Sign Up</button>
      </div>
      <button ref={triggerRef} className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open} aria-controls={menuId}>
        <Icon name={open ? 'close' : 'menu'} />
      </button>
    </div>
    {open && <nav ref={menuRef} id={menuId} className="mobile-nav" aria-label="Mobile navigation">
      {[...NAV, 'Sign In', 'Sign Up'].map((item) => <button key={item} aria-current={activeTab === item ? 'page' : undefined}
        onClick={() => change(item)}>{item}</button>)}
    </nav>}
  </header>;
}
function Hero({ navigate }) {
  const { HOME } = useContent();
  return <section className="hero-section">
    <div className="glow glow-one" /><div className="glow glow-two" />
    <div className="hero-grid container">
      <div className="hero-copy">
        <div className="mission-pill"><Icon name="heart" /> Built for Deaf and Hard of Hearing communities</div>
        <h1><GradientWords>{HOME.heading}</GradientWords><span className="hero-subtitle">{HOME.subtitle}</span></h1>
        {HOME.paragraphs?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        <p className="hero-iq-question"><strong>What's Your IQ?</strong> <s>Not Intelligence.</s> Inclusivity Quotient. <em>Is your content reaching everyone?</em></p>
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
  const { TITLES, HOME } = useContent();
  const title = TITLES[0];
  return <div className="preview-frame">
    <div className="preview-grid">
      <div className="interpreter-card preview-card">
        <div className="interpreter-placeholder professional-preview">
          <InterpreterMark className="preview-brand-mark" />
          {HOME.interpreterTitle && <strong>{HOME.interpreterTitle}</strong>}
          {HOME.interpreterSubtitle && <small>{HOME.interpreterSubtitle}</small>}
        </div>
      </div>
      <div className="main-preview-card">
        {(HOME.imageSrc || title?.poster) && <img src={HOME.imageSrc || title.poster} alt={HOME.imageSrc ? HOME.imageAlt : title.imageAlt || title.episodeTitle || title.title} />}
        <div className="video-overlay" />
        <div className="caption-box">Unveiling Access, One Quest at a Time.</div>
        <div className="fake-controls"><p><Icon name="mic" /> {title ? `${title.title}: ${title.episodeTitle}` : 'Accessible conversations coming soon'}</p></div>
      </div>
    </div>
  </div>;
}
function FeatureGrid() {
  return <section className="feature-section"><div className="feature-strip container">
    {FEATURES.map((feature) => <article className="feature-card" key={feature.title}>
      <div className="feature-icon">{feature.icon === 'hands' ? <InterpreterMark className="feature-interpreter-mark" /> : <Icon name={feature.icon} />}</div>
      <h3><GradientWords>{feature.title}</GradientWords></h3><p>{feature.text}</p>
    </article>)}
  </div></section>;
}
function FounderPhoto({ compact = false }) {
  const { FOUNDER } = useContent();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [FOUNDER.photoSrc]);
  return <div className={compact ? 'founder-photo-shell compact' : 'founder-photo-shell'}>
    {!failed && FOUNDER.photoSrc ? <img src={FOUNDER.photoSrc} alt={FOUNDER.photoAlt} className="founder-photo" onError={() => setFailed(true)} /> :
      <div className="founder-photo-placeholder" role="img" aria-label="Founder portrait to be added">
        <Icon name="people" /><span>Founder portrait</span>
      </div>}
  </div>;
}
function Newsletter() {
  const { previewMode } = useContent();
  const [email, setEmail] = useState('');
  const submit = (event) => {
    event.preventDefault();
    if (previewMode) return;
    const subject = encodeURIComponent('Inclusive Quest launch waitlist request');
    const body = encodeURIComponent('Please add ' + email.trim() + ' to your launch updates list. I consent to being contacted about the Inclusive Quest launch.');
    window.location.href = 'mailto:' + BRAND.contactEmail + '?subject=' + subject + '&body=' + body;
  };
  return <section className="newsletter container" aria-labelledby="newsletter-heading">
    <div><p className="eyebrow">Launch updates</p><h2 id="newsletter-heading"><GradientWords>Be the first to know when IQ launches.</GradientWords></h2>
      <p>Get an invitation when accessible podcasts arrive.</p></div>
    <form onSubmit={submit} className="newsletter-form">
      <label htmlFor="waitlist-email">Email address</label>
      <div><input id="waitlist-email" type="email" autoComplete="email" required
        placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} />
        <button className="gradient-button" type="submit" disabled={previewMode}>Join Waitlist</button></div>
      <small>{previewMode ? 'Email signup is disabled in this draft preview.' : 'This opens your email app to request launch updates. Direct online signup is coming soon.'}</small>
    </form>
  </section>;
}
function Testimonials() {
  const { TESTIMONIALS } = useContent();
  return <section className="testimonials-section container" aria-labelledby="testimonials-heading">
    <p className="eyebrow">Testimonials</p><h2 id="testimonials-heading"><GradientWords>Voices from our community</GradientWords></h2>
    {TESTIMONIALS.length ? <div className="testimonial-grid">{TESTIMONIALS.map((item, index) =>
      <blockquote key={index}><p>“{item.quote}”</p><cite>{item.name}{item.title ? ', ' + item.title : ''}</cite></blockquote>)}</div> :
      <p className="quiet-note">Community testimonials will be added as soon as they are approved.</p>}
  </section>;
}
function FounderHomeSpotlight({ navigate }) {
  const { FOUNDER } = useContent();
  return <section className="container founder-home-spotlight" aria-label="Founder story">
    <FounderPhoto compact />
    <div><p className="eyebrow"><GradientWords>Founder Story</GradientWords></p><blockquote>“{FOUNDER.homeQuote}”</blockquote>
      <p>Inclusive Quest exists so Deaf and Hard of Hearing audiences can be part of every conversation.</p>
      <button onClick={() => navigate('About')}>Read the founder story →</button>
    </div>
  </section>;
}
function HomePage({ navigate }) {
  return <><Hero navigate={navigate} /><FeatureGrid /><SponsorPlacement placement="home" />
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
function EpisodeTags({ tags = [] }) {
  return tags.length ? <ul className="episode-tags" aria-label="Episode topics">{tags.map((tag, index) => <li key={`${tag}-${index}`}>{tag}</li>)}</ul> : null;
}
function YouTubePlayer({ title, captionsEnabled }) {
  const [loaded, setLoaded] = useState(false);
  const youtube = parseYouTubeUrl(title.youtubeUrl);
  if (!youtube) return null;
  return <div className="youtube-player">
    {loaded ? <iframe className="youtube-frame"
      src={youtube.embedUrl + '?rel=0&cc_load_policy=' + (captionsEnabled ? '1' : '0')}
      title={`${title.title}: ${title.episodeTitle || 'Podcast episode'} — YouTube player`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /> :
      <div className="youtube-consent">
        {title.poster && <img src={title.poster} alt={title.imageAlt || title.title + ' episode artwork'} />}
        <div><h3>{title.episodeTitle || title.title}</h3><p>The video loads from YouTube only after you choose to play it.</p>
          <button type="button" className="gradient-button" onClick={() => setLoaded(true)}><Icon name="play" /> Load YouTube video</button>
        </div>
      </div>}
    <p className="youtube-note">Hosted on YouTube. Captions and Sign Language interpretation depend on the uploaded video.
      {' '}<a href={youtube.url} target="_blank" rel="noopener noreferrer">Watch on YouTube</a></p>
  </div>;
}
function SyncedPlayer({ title, captionsEnabled }) {
  const mainRef = useRef(null);
  const aslRef = useRef(null);
  const [layout, setLayout] = useState('left');
  const hasEpisode = !title.comingSoon && Boolean(title.mainVideoSrc && title.aslVideoSrc);
  useSyncedSidecar(mainRef, aslRef, hasEpisode);
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
  }, [captionsEnabled, title.id, title.mainVideoSrc, title.captionsSrc]);
  const youtube = !title.comingSoon && parseYouTubeUrl(title.youtubeUrl);
  return <div className="synced-player-shell">
    <div className="player-title-row">
      <div><p>Accessible Podcasts</p><h2>{title.title}</h2><small>{title.episodeTitle}</small>
        {title.hostName && <p className="episode-host">Hosted by {title.hostName}</p>}</div>
      {hasEpisode && <div className="player-actions"><button onClick={() => setLayout(layout === 'left' ? 'right' : 'left')}>
        Move Sign Language {layout === 'left' ? 'Right' : 'Left'}</button></div>}
    </div>
    {hasEpisode ? <div className={'video-grid ' + layout}>
      <aside className="sidecar-panel"><div className="card-topline">Sign Language interpretation</div>
        <video ref={aslRef} src={title.aslVideoSrc} muted playsInline preload="metadata"
          aria-label="Sign Language interpreter video" className="sidecar-video" /></aside>
      <div className="main-video-panel"><video key={title.id} ref={mainRef} src={title.mainVideoSrc}
        poster={title.poster} controls playsInline preload="metadata" aria-label={title.title + ' episode'}>
        {title.captionsSrc && <track kind="captions" label="English" srcLang="en" src={title.captionsSrc} default />}
      </video></div>
    </div> : youtube ? <YouTubePlayer key={youtube.videoId} title={title} captionsEnabled={captionsEnabled} /> : <div className="watch-unavailable">
      {title.poster && <img src={title.poster} alt={title.imageAlt || title.title + ' podcast artwork'} />}
      <div><InterpreterMark className="watch-interpreter-mark" /><p className="eyebrow">Episode coming soon</p><h3>Built-in Sign Language. Clear captions. Every conversation.</h3>
        <p>Podcast playback will appear here when the licensed episode and interpreter media are delivered. Sign Language interpretation will always remain visible.</p>
        {title.comingSoon && <button className="glass-button" disabled>Coming soon</button>}</div>
    </div>}
    <div className="episode-details"><p className="eyebrow">{title.category}</p><p>{title.description}</p><EpisodeTags tags={title.tags} /></div>
  </div>;
}
function WatchPage({ selectedTitle, captionsEnabled, setSelectedTitle }) {
  const { TITLES } = useContent();
  if (!selectedTitle) return <section className="page-section"><div className="container"><h1><GradientWords>Watch accessible podcasts</GradientWords></h1><p className="quiet-note">Episodes will appear here when they are published.</p></div></section>;
  return <section className="page-section"><div className="container">
    <SyncedPlayer key={selectedTitle.id} title={selectedTitle} captionsEnabled={captionsEnabled} />
    <SponsorPlacement placement="episode" episodeId={selectedTitle.id} />
    <div className="title-grid">{TITLES.map((item) => <button key={item.id}
      className={'title-card ' + (item.id === selectedTitle.id ? 'selected' : '')} onClick={() => setSelectedTitle(item)}>
      {item.poster ? <img src={item.poster} alt={item.imageAlt || item.title + ' podcast artwork'} /> : <div className="episode-artwork-placeholder" aria-hidden="true"><Icon name="mic" /></div>}
      <div><p>{item.category}</p><h3>{item.title}</h3>{item.hostName && <p className="episode-host">Hosted by {item.hostName}</p>}<span>{item.comingSoon ? 'Coming soon' : item.badge}</span><small>{item.description}</small></div>
    </button>)}</div>
  </div></section>;
}
function PodcastsPage({ navigate, setSelectedTitle, explore = false }) {
  const { TITLES, CATEGORIES } = useContent();
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const filtered = TITLES.filter((item) =>
    [item.title, item.episodeTitle, item.description, item.category, item.interpreter, item.hostName, ...(item.tags || [])].join(' ').toLowerCase().includes(search.toLowerCase().trim()) && (!category || item.category === category));
  return <section className="page-section"><div className="container">
    <div className="section-heading"><p className="eyebrow">{explore ? 'Discover' : 'Podcasts'}</p>
      <h1><GradientWords>{explore ? 'Explore accessible conversations.' : 'Every story deserves to be seen.'}</GradientWords></h1></div>
    <div className="search-bar"><Icon name="search" />
      <label className="sr-only" htmlFor="podcast-search">Search podcasts by topic or interpreter</label>
      <input id="podcast-search" placeholder="Search podcasts, topics, or interpreters" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
    {CATEGORIES.length > 0 && <div className="podcast-categories"><label htmlFor="podcast-category">Topic</label><select id="podcast-category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All topics</option>{CATEGORIES.map((item) => <option value={item.name} key={item.id}>{item.name}</option>)}</select>{CATEGORIES.find((item) => item.name === category)?.description && <p>{CATEGORIES.find((item) => item.name === category).description}</p>}</div>}
    <div className="content-grid">{filtered.map((item) => <article key={item.id} className="content-card">
      {item.poster ? <img src={item.poster} alt={item.imageAlt || item.title + ' cover artwork'} /> : <div className="episode-artwork-placeholder" aria-hidden="true"><Icon name="mic" /></div>}
      <div><p>{item.category} · {item.comingSoon ? 'Coming soon' : item.badge}</p><h2>{item.title}</h2>
        <strong>{item.episodeTitle}</strong>{item.hostName && <p className="episode-host">Hosted by {item.hostName}</p>}<small>{item.description}</small><EpisodeTags tags={item.tags} />
        <button onClick={() => { setSelectedTitle(item); navigate('Watch'); }}>View Episode</button></div>
    </article>)}</div>
    {!filtered.length && <p role="status" className="quiet-note">No podcasts matched this search yet.</p>}
  </div></section>;
}
function BlogByline({ post }) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(post.date || '') ? new Date(post.date + 'T12:00:00Z') : null;
  const validDate = date && !Number.isNaN(date.getTime());
  if (!post.author && !validDate) return null;
  return <p className="blog-byline">{post.author && <span>By {post.author}</span>}
    {validDate && <time dateTime={post.date}>{date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</time>}</p>;
}
function BlogPage({ navigate }) {
  const { POSTS } = useContent();
  return <section className="page-section"><div className="container">
    <div className="section-heading"><p className="eyebrow">Inclusive Quest</p><h1>Stories & updates</h1></div>
    {POSTS.length ? <div className="content-grid">{POSTS.map((post) => <article className="content-card" key={post.id}>
      {post.imageSrc && <img src={post.imageSrc} alt={post.imageAlt} />}
      <div><img className="blog-brand-stamp" src={BRAND.logoSrc} alt="Inclusive Quest" /><h2>{post.title}</h2><BlogByline post={post} /><p>{post.excerpt}</p><button onClick={() => navigate('Post:' + post.slug)}>Read story →</button></div>
    </article>)}</div> : <p className="quiet-note">Stories will appear here when they are published.</p>}
  </div></section>;
}
function BlogPostPage({ post, navigate }) {
  return <section className="page-section"><article className="container cms-article">
    <button className="glass-button" onClick={() => navigate('Blog')}>← All stories</button>
    {post ? <><img className="blog-brand-stamp" src={BRAND.logoSrc} alt="Inclusive Quest" /><h1>{post.title}</h1><BlogByline post={post} /><p className="large-copy">{post.excerpt}</p>
      {post.imageSrc && <img className="cms-page-image" src={post.imageSrc} alt={post.imageAlt} />}
      {post.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</> :
      <><h1>Story unavailable</h1><p>This story has not been published or is no longer available.</p></>}
  </article></section>;
}
function ManagedPage({ item }) {
  return <section className="page-section"><article className="container cms-article">
    <p className="eyebrow">Inclusive Quest</p><h1>{item.heading || item.title}</h1>
    {item.subtitle && <p className="large-copy">{item.subtitle}</p>}
    {item.imageSrc && <img className="cms-page-image" src={item.imageSrc} alt={item.imageAlt} />}
    {item.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
  </article></section>;
}
function ForPlatforms() {
  return <section className="page-section"><div className="container creator-grid">
    <div><p className="eyebrow">For Platforms</p><h1><GradientWords>Make more podcast conversations accessible.</GradientWords></h1>
      <p className="large-copy">Partner with Inclusive Quest to bring native Sign Language interpretation, clear captions, transcripts, and accessible discovery to your listeners and viewers.</p>
      <a className="gradient-button link-button" href={WORK_WITH_US_FORMS.platforms.url} target="_blank" rel="noopener noreferrer">Submit a platform inquiry <span aria-hidden="true">↗</span></a>
    </div>
    <div className="checklist-card"><h2><GradientWords>What we can build together</GradientWords></h2>
      {['Integrated Sign Language interpretation', 'Captions and searchable transcripts', 'Topic discovery and interpreter profiles', 'Audience-first accessibility workflows', 'Listeners/Watchers'].map((item) =>
        <div className="checklist-item" key={item}><Icon name="star" /> <span>{item}</span></div>)}
    </div>
  </div>
    <div className="container dedicated-form"><TallySubmissionForm kind="platforms" /></div>
  </section>;
}
function ForPodcasters() {
  return <section className="page-section"><div className="container creator-grid">
    <div><p className="eyebrow">For Podcasters</p><h1><GradientWords>Bring your podcast to more people.</GradientWords></h1>
      <p className="large-copy">We help podcast creators prepare conversations for DHH audiences. Share the essentials of your show, and we'll follow up about accessibility and next steps.</p>
      <a className="gradient-button link-button" href={WORK_WITH_US_FORMS.podcasters.url} target="_blank" rel="noopener noreferrer">Submit your podcast <span aria-hidden="true">↗</span></a>
    </div>
    <div className="checklist-card"><h2><GradientWords>Submission checklist</GradientWords></h2>
      {PODCASTER_CHECKLIST.map((item) =>
        <div key={item} className="checklist-item"><Icon name="star" /><span>{item}</span></div>)}
    </div>
  </div>
    <div className="container dedicated-form"><TallySubmissionForm kind="podcasters" /></div>
  </section>;
}
function TallySubmissionForm({ kind }) {
  const { previewMode } = useContent();
  const form = kind === 'investment' ? INVEST_FORM : WORK_WITH_US_FORMS[kind];
  return <div className="tally-form-wrap" id={'submission-' + kind}>
    <div className="tally-form-heading">
      <div><h3>{form.heading}</h3><p>{form.description}</p></div>
      <a className="glass-button link-button" href={form.url} target="_blank" rel="noopener noreferrer">
        Open full form <span aria-hidden="true">↗</span>
      </a>
    </div>
    {previewMode ? <p className="quiet-note">The live submission form is disabled in this draft preview.</p> : <iframe
      key={kind}
      className="tally-form-frame"
      src={form.embedUrl}
      title={'Inclusive Quest — ' + form.heading}
      loading="lazy"
      referrerPolicy="strict-origin-when-cross-origin"
    />}
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
function AboutPage({ navigate }) {
  const { ABOUT, FOUNDER, MISSION_VISION_VALUES } = useContent();
  return <section className="page-section about-page"><div className="container">
    <section className="about-intro-grid" aria-labelledby="about-heading">
      <div className="about-heading-block"><p className="eyebrow"><GradientWords>Our mission</GradientWords></p><h1 id="about-heading"><GradientWords>{ABOUT.heading}</GradientWords></h1>
        <img className="about-signature-logo" src={BRAND.logoSrc} alt="Inclusive Quest" />{ABOUT.subtitle && <p>{ABOUT.subtitle}</p>}</div>
      <div className="about-copy">{ABOUT.paragraphs.map((p) => <p key={p}>{p}</p>)}</div>
      {ABOUT.imageSrc && <div className="about-signature"><img className="cms-page-image" src={ABOUT.imageSrc} alt={ABOUT.imageAlt} /></div>}
    </section>
    <section className="mission-vision-values" aria-label="Our mission, vision and values">
      {MISSION_VISION_VALUES.map((item) => <article key={item.id} className="mvv-card" id={item.id}>
        <p className="eyebrow">Inclusive Quest</p><h2><GradientWords>{item.heading}</GradientWords></h2>{item.subtitle && <p>{item.subtitle}</p>}{item.paragraphs?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}{item.imageSrc && <img className="cms-page-image" src={item.imageSrc} alt={item.imageAlt} />}
      </article>)}
    </section>
    <section className="bio-section" aria-labelledby={FOUNDER.heading ? 'bio-heading' : 'bio-label'}>
      <p className="eyebrow" id="bio-label"><GradientWords>Founder Bio</GradientWords></p>{FOUNDER.heading && <h2 id="bio-heading"><GradientWords>{FOUNDER.heading}</GradientWords></h2>}
      <p className="founder-name">{FOUNDER.name} — {FOUNDER.title}</p>
      {FOUNDER.bio?.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </section>
    <section className="founder-story-grid" aria-labelledby="founder-heading">
      <FounderPhoto />
      <div className="founder-story-copy"><p className="eyebrow"><GradientWords>Founder Story</GradientWords></p>
        <h2 id="founder-heading"><GradientWords>Why Inclusive Quest exists.</GradientWords></h2>
        {FOUNDER.story.map((p) => <p key={p}>{p}</p>)}
      </div>
    </section>
    <section className="team-section" aria-labelledby="team-heading">
      <div className="section-heading"><p className="eyebrow">The Team</p><h2 id="team-heading"><GradientWords>The people building the bridge.</GradientWords></h2></div>
      {TEAM.members.length ? <div className="team-grid">{TEAM.members.map((member) =>
        <article className="team-card" key={member.name}><div>{member.photoSrc && <img src={member.photoSrc}
          alt={member.name + ', ' + member.title} />}</div><div><h3>{member.name}</h3><span>{member.title}</span><p>{member.bio}</p></div></article>)}</div> :
        <div className="team-placeholder-copy"><p>{TEAM.placeholder}</p></div>}
    </section>
    <Testimonials />
    <section className="work-with-us" id="work-with-us" aria-labelledby="work-heading">
      <div className="work-with-us-intro">
        <p className="eyebrow">Work With Us</p>
        <h2 id="work-heading"><GradientWords>Help make every conversation accessible.</GradientWords></h2>
        <p>Whether you're a platform, podcaster, interpreter, or other collaborator, select the right form below and share your ideas with Inclusive Quest.</p>
        <p>You can also <a href={'mailto:' + BRAND.contactEmail}>reach our team by email</a> if you have questions.</p>
      </div>
      <WorkWithUsForms />
    </section>
    <section className="invest-prompt" aria-labelledby="invest-about-heading">
      <h2 id="invest-about-heading"><GradientWords>Invest in Inclusive Quest</GradientWords></h2>
      <p>Help us build the next generation of inclusive podcast experiences.</p>
      <a href="#/invest" onClick={(event) => { event.preventDefault(); navigate('Invest'); }} className="gradient-button link-button">Investment inquiry <span aria-hidden="true">↗</span></a>
    </section>
  </div></section>;
}
function InvestPage() {
  return <section className="page-section"><div className="container invest-page">
    <p className="eyebrow">Invest in Inclusive Quest</p>
    <h1><GradientWords>Build a world of accessible conversations.</GradientWords></h1>
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
    <p className="eyebrow">{page}</p><h1><GradientWords>Inclusive Quest is getting ready.</GradientWords></h1>
    <p>Accounts will open with the launch. Join the launch list to receive updates first.</p>
    <Newsletter />
  </div></section>;
}
function AccessibilityPanel({
  captionsEnabled, setCaptionsEnabled, captionStyle, setCaptionStyle,
  textLevel, setTextLevel, settings, setSettings, readAloud, setReadAloud,
  autoRead, setAutoRead, onReadPage, onReadSection, onStopRead, speechSupported, speechStatus
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();
  const close = () => { setOpen(false); triggerRef.current?.focus(); };
  useEffect(() => {
    if (!open) return undefined;
    panelRef.current?.querySelector('button')?.focus();
    const dismiss = (event) => { if (event.key === 'Escape') close(); };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, [open]);
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
    <button ref={triggerRef} className="a11y-trigger" aria-expanded={open} aria-controls={panelId}
      onClick={() => setOpen(!open)}><span aria-hidden="true">♿</span> Accessibility</button>
    {open && <section ref={panelRef} id={panelId} className="a11y-panel" aria-label="Accessibility preferences">
      <div className="a11y-panel-heading"><h2>Accessibility preferences</h2>
        <button onClick={close} aria-label="Close accessibility preferences">×</button></div>
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
      <label className="a11y-option"><span>Read selected, focused or hovered text aloud</span>
        <input type="checkbox" checked={readAloud} onChange={(e) => { setReadAloud(e.target.checked); if (!e.target.checked) onStopRead(); }} disabled={!speechSupported} /></label>
      <label className="a11y-option"><span>Auto-read each page aloud</span>
        <input type="checkbox" checked={autoRead} onChange={(e) => { setAutoRead(e.target.checked); if (!e.target.checked) onStopRead(); }} disabled={!speechSupported} /></label>
      <div className="a11y-speech-actions">
        <button className="glass-button" disabled={!speechSupported} onClick={onReadPage}>Read this page</button>
        <button className="glass-button" disabled={!speechSupported} onClick={onReadSection}>Read this Section</button>
        <button className="glass-button" disabled={!speechSupported} onClick={onStopRead}>Stop reading</button>
      </div>
      <p role="status" aria-live="polite" className="a11y-speech-status">{speechSupported ? speechStatus || 'Reading aloud may require a user interaction in your browser.' : 'Read Aloud is unavailable in this browser.'}</p>
      <p className="a11y-helper">This panel complements native screen reader support. Keyboard navigation and semantic page headings remain available.</p>
      <button className="outline-button" onClick={reset}>Reset preferences</button>
    </section>}
  </div>;
}
// Read rendered text, not markup, controls, hidden labels or iframe content.
// Keep inline word spacing and the boundaries of visually separated blocks.
function readableText(element) {
  if (!element) return '';
  const document = element.ownerDocument;
  const ignored = 'script, style, noscript, iframe, video, audio, button, input, select, textarea, [hidden], [aria-hidden="true"], .sr-only';
  const walker = document.createTreeWalker(element, 4);
  const words = [];
  let previousBlock;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent || node.parentElement?.closest(ignored)) continue;
    let parent = node.parentElement;
    let hidden = false;
    let block;
    while (parent && element.contains(parent)) {
      const style = document.defaultView?.getComputedStyle(parent);
      if (style?.display === 'none' || style?.visibility === 'hidden') { hidden = true; break; }
      if (!block && (['block', 'flex', 'grid', 'list-item', 'table-cell'].includes(style?.display) || parent.matches('p, h1, h2, h3, h4, h5, h6, li, blockquote, article, section, div'))) block = parent;
      parent = parent.parentElement;
    }
    if (hidden) continue;
    if (previousBlock && previousBlock !== block) words.push('\n');
    words.push(node.textContent);
    previousBlock = block;
  }
  return words.join('').replace(/[\t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
}
function speechChunks(raw) {
  let remaining = String(raw || '').replace(/\s+/g, ' ').trim();
  const chunks = [];
  while (remaining.length > 240) {
    const candidate = remaining.slice(0, 240);
    const punctuation = [...candidate.matchAll(/[.!?;:]\s/g)].at(-1)?.index;
    const space = candidate.lastIndexOf(' ');
    const end = punctuation > 80 ? punctuation + 1 : space > 0 ? space : 240;
    chunks.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}
export default function App({ previewMode = false, initialPage = 'Home', initialEpisodeId = '' }) {
  const { TITLES, HOME, ABOUT, POSTS, PAGES } = useContent();
  const mainRef = useRef(null);
  const lastSectionRef = useRef(null);
  const speechRunRef = useRef(0);
  const utteranceRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const previousPageRef = useRef(null);
  const [activeTab, setActiveTab] = useState(() => previewMode ? (initialPage === 'Watch' ? 'Watch' : 'Home') : currentPage());
  const [selectedTitleId, setSelectedTitleId] = useState(initialEpisodeId || TITLES[0]?.id || '');
  const selectedTitle = TITLES.find((item) => item.id === selectedTitleId) || TITLES[0] || null;
  const setSelectedTitle = (item) => setSelectedTitleId(item.id);
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const [captionStyle, setCaptionStyle] = useState('white-black');
  const [textLevel, setTextLevel] = useState(0);
  const [settings, setSettings] = useState({});
  const [readAloud, setReadAloud] = useState(false);
  const [autoRead, setAutoRead] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('');
  // Remember consent-based accessibility settings on this device, including optional auto-read.
  useEffect(() => {
    if (previewMode) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem('inclusive-quest-accessibility-v1') || 'null');
      if (!saved || typeof saved !== 'object') return;
      if (typeof saved.captionsEnabled === 'boolean') setCaptionsEnabled(saved.captionsEnabled);
      if (['white-black', 'yellow-black', 'black-white'].includes(saved.captionStyle)) setCaptionStyle(saved.captionStyle);
      if ([0, 1, 2, 3].includes(saved.textLevel)) setTextLevel(saved.textLevel);
      if (saved.settings && typeof saved.settings === 'object') setSettings(saved.settings);
      if (typeof saved.readAloud === 'boolean') setReadAloud(saved.readAloud);
      if (typeof saved.autoRead === 'boolean') setAutoRead(saved.autoRead);
    } catch { /* Private browsing can deny local preference storage. */ }
  }, [previewMode]);
  useEffect(() => {
    if (previewMode) return;
    try {
      window.localStorage.setItem('inclusive-quest-accessibility-v1', JSON.stringify({
        captionsEnabled, captionStyle, textLevel, settings, readAloud, autoRead
      }));
    } catch { /* Preferences remain usable in the current session. */ }
  }, [captionsEnabled, captionStyle, textLevel, settings, readAloud, autoRead, previewMode]);
  const speechSupported = !previewMode && typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  const stopSpeech = useCallback(() => {
    speechRunRef.current += 1;
    window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = null;
    utteranceRef.current = null;
    if (speechSupported) window.speechSynthesis.cancel();
  }, [speechSupported]);
  const onStopRead = useCallback(() => { stopSpeech(); setSpeechStatus('Reading stopped.'); }, [stopSpeech]);
  const speak = useCallback((raw) => {
    if (!speechSupported) { setSpeechStatus('Read Aloud is unavailable in this browser.'); return; }
    stopSpeech();
    const chunks = speechChunks(raw);
    if (!chunks.length) { setSpeechStatus('No text to read.'); return; }
    const run = speechRunRef.current;
    let index = 0;
    const next = () => {
      if (run !== speechRunRef.current) return;
      if (index === chunks.length) { utteranceRef.current = null; setSpeechStatus('Finished reading.'); return; }
      const utterance = new window.SpeechSynthesisUtterance(chunks[index++]);
      utteranceRef.current = utterance;
      utterance.rate = 0.92;
      utterance.lang = 'en-US';
      utterance.onend = next;
      utterance.onerror = () => {
        if (run === speechRunRef.current) { utteranceRef.current = null; setSpeechStatus('Speech playback was interrupted or blocked by the browser. Try Read this page again.'); }
      };
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      } catch {
        utteranceRef.current = null;
        setSpeechStatus('Speech playback could not start. Try again or use your screen reader.');
      }
    };
    setSpeechStatus('Reading aloud. Press Stop reading or Escape to stop.');
    next();
  }, [speechSupported, stopSpeech]);
  const onReadPage = useCallback(() => speak(readableText(mainRef.current)), [speak]);
  const onReadSection = () => {
    const main = mainRef.current;
    if (!main) return;
    const focused = main.contains(document.activeElement) ? document.activeElement.closest('article, section') : lastSectionRef.current;
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    const sections = Array.from(main.querySelectorAll('section, article')).filter((section) => {
      const rect = section.getBoundingClientRect();
      return rect.bottom > 100 && rect.top < viewport;
    }).sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      // Prefer the section crossing the reading line; nested sections win ties.
      return Math.abs(aRect.top - 110) - Math.abs(bRect.top - 110) || (a.contains(b) ? 1 : b.contains(a) ? -1 : 0);
    });
    const target = focused && main.contains(focused) ? focused : sections[0] || main.querySelector('section, article') || main;
    speak(readableText(target));
  };
  useEffect(() => {
    const clearFocusedSection = () => { lastSectionRef.current = null; };
    window.addEventListener('scroll', clearFocusedSection, { passive: true });
    return () => window.removeEventListener('scroll', clearFocusedSection);
  }, []);
  useEffect(() => {
    stopSpeech();
    lastSectionRef.current = null;
    return stopSpeech;
  }, [activeTab, selectedTitleId, stopSpeech]);
  useEffect(() => {
    if (!readAloud || !speechSupported) return undefined;
    const main = mainRef.current;
    if (!main) return undefined;
    const readSelection = (event) => {
      if (event.key === 'Escape') return;
      const selection = window.getSelection();
      const selected = String(selection?.toString() || '').trim();
      if (selected && main.contains(selection.anchorNode) && main.contains(selection.focusNode)) speak(selected);
    };
    const onHover = (event) => {
      window.clearTimeout(hoverTimerRef.current);
      if (window.getSelection()?.toString().trim()) return;
      const target = event.target.closest?.('p, h1, h2, h3, li, blockquote, article strong');
      if (!target || !main.contains(target)) return;
      hoverTimerRef.current = window.setTimeout(() => speak(readableText(target)), 1000);
    };
    const onFocus = (event) => {
      window.clearTimeout(hoverTimerRef.current);
      const target = event.target;
      if (target === main) return;
      const text = target.matches('a, button, input, select, textarea')
        ? target.getAttribute('aria-label') || target.labels?.[0]?.textContent || target.textContent
        : readableText(target);
      if (text?.trim()) speak(text);
    };
    const cancelHover = () => window.clearTimeout(hoverTimerRef.current);
    main.addEventListener('mouseup', readSelection);
    main.addEventListener('keyup', readSelection);
    main.addEventListener('focusin', onFocus);
    main.addEventListener('mouseover', onHover);
    main.addEventListener('mouseout', cancelHover);
    return () => { cancelHover(); main.removeEventListener('mouseup', readSelection);
      main.removeEventListener('keyup', readSelection); main.removeEventListener('focusin', onFocus);
      main.removeEventListener('mouseover', onHover); main.removeEventListener('mouseout', cancelHover); };
  }, [readAloud, activeTab, speechSupported, speak]);
  useEffect(() => {
    if (!autoRead || !speechSupported) return undefined;
    const run = speechRunRef.current;
    const timer = window.setTimeout(() => { if (run === speechRunRef.current) onReadPage(); }, 350);
    return () => window.clearTimeout(timer);
  }, [autoRead, activeTab, speechSupported, onReadPage]);
  useEffect(() => {
    if (previewMode) return undefined;
    const stopOnEscape = (event) => { if (event.key === 'Escape' && speechSupported) onStopRead(); };
    window.addEventListener('keydown', stopOnEscape);
    return () => window.removeEventListener('keydown', stopOnEscape);
  }, [speechSupported, previewMode, onStopRead]);
  useEffect(() => {
    if (previewMode) return undefined;
    const onHash = () => setActiveTab(currentPage());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [previewMode]);
  const currentPost = activeTab.startsWith('Post:') ? POSTS.find((post) => post.slug === activeTab.slice(5)) : null;
  const currentManagedPage = activeTab.startsWith('Page:') ? PAGES.find((item) => item.slug === activeTab.slice(5)) : null;
  const pageTitle = activeTab === 'Home' ? HOME.title || 'Accessible Podcasts' : activeTab === 'About' ? ABOUT.title || 'About' : currentPost?.title || currentManagedPage?.title || activeTab;
  const pageDescription = activeTab === 'Home' ? HOME.paragraphs?.[0] : activeTab === 'About' ? ABOUT.paragraphs?.[0] : currentPost?.excerpt || currentManagedPage?.subtitle;
  useEffect(() => {
    if (previewMode) return;
    document.title = 'Inclusive Quest | ' + pageTitle;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', (pageDescription || DESCRIPTIONS[activeTab] || 'Accessible conversations with Inclusive Quest.'));
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab, pageTitle, pageDescription, previewMode]);
  useEffect(() => {
    if (previousPageRef.current !== null && previousPageRef.current !== activeTab) mainRef.current?.focus({ preventScroll: true });
    previousPageRef.current = activeTab;
  }, [activeTab]);
  const navigate = (page) => {
    setActiveTab(page);
    mainRef.current?.focus({ preventScroll: true });
    if (!previewMode) window.location.hash = '/' + (page.startsWith('Post:') ? 'blog/' + page.slice(5) : page.startsWith('Page:') ? page.slice(5) : SLUGS[page] || 'home');
    else mainRef.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  };
  let page;
  if (activeTab === 'Home') page = <HomePage navigate={navigate} />;
  else if (activeTab === 'About') page = <AboutPage navigate={navigate} />;
  else if (activeTab === 'Explore' || activeTab === 'Podcasts') page =
    <PodcastsPage navigate={navigate} setSelectedTitle={setSelectedTitle} explore={activeTab === 'Explore'} />;
  else if (activeTab === 'Watch') page = <WatchPage selectedTitle={selectedTitle} setSelectedTitle={setSelectedTitle} captionsEnabled={captionsEnabled} />;
  else if (activeTab === 'Blog') page = <BlogPage navigate={navigate} />;
  else if (activeTab.startsWith('Post:')) page = <BlogPostPage post={currentPost} navigate={navigate} />;
  else if (currentManagedPage) page = <ManagedPage item={currentManagedPage} />;
  else if (activeTab === 'Invest') page = <InvestPage />;
  else if (activeTab === 'For Platforms') page = <ForPlatforms />;
  else if (activeTab === 'For Podcasters') page = <ForPodcasters />;
  else if (activeTab === 'Sign In' || activeTab === 'Sign Up') page = <AccountPage page={activeTab} />;
  else if (POLICIES[activeTab]) page = <PolicyPage page={activeTab} />;
  else page = <HomePage navigate={navigate} />;
  const classes = Object.entries(settings).filter(([, enabled]) => enabled).map(([key]) => key).join(' ');
  return <div className={'app-shell ' + (previewMode ? 'site-preview ' : '') + classes} data-text-level={textLevel} data-caption-style={captionStyle}>
    <a className="skip-link" href={previewMode ? '#preview-main-content' : '#main-content'} onClick={(event) => { event.preventDefault(); mainRef.current?.focus(); }}>Skip to content</a>
    <Header activeTab={activeTab} navigate={navigate} />
    <main ref={mainRef} onFocusCapture={(event) => { lastSectionRef.current = event.target.closest('article, section'); }} id={previewMode ? 'preview-main-content' : 'main-content'} tabIndex="-1">{page}</main>
    <footer className="site-footer"><div className="container footer-inner">
      <div className="footer-brand"><LogoMark /><p className="footer-tagline gradient-word">{BRAND.footerTagline}</p></div>
      <nav aria-label="Footer links" className="footer-links">
        {[...NAV, 'Privacy', 'Accessibility', 'Terms of Service', 'Support', 'Invest'].map((item) =>
          <a className="nav-item" aria-current={activeTab === item ? 'page' : undefined} key={item} href={'#/' + SLUGS[item]} onClick={(event) => { event.preventDefault(); navigate(item); }}>{item}</a>)}
        <a href={'mailto:' + BRAND.contactEmail}>{BRAND.contactEmail}</a>
        {SOCIAL_LINKS.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer">{item.label}</a>)}
      </nav>
      <p className="copyright">© 2026 Inclusive Quest. All rights reserved.</p>
    </div></footer>
    <AccessibilityPanel captionsEnabled={captionsEnabled} setCaptionsEnabled={setCaptionsEnabled}
      captionStyle={captionStyle} setCaptionStyle={setCaptionStyle}
      textLevel={textLevel} setTextLevel={setTextLevel} settings={settings} setSettings={setSettings}
      readAloud={readAloud} setReadAloud={setReadAloud} autoRead={autoRead} setAutoRead={setAutoRead}
      onReadPage={onReadPage} onReadSection={onReadSection} onStopRead={onStopRead} speechSupported={speechSupported} speechStatus={speechStatus} />
  </div>;
}

