import React, { createContext, useContext, useEffect, useState } from 'react';
import { SPONSOR_PLACEMENTS, visibleSponsor } from './sponsor-model.js';
import { useContent } from '../cms/ContentProvider.jsx';
import './sponsors.css';

// Only the isolated layout review overrides the CMS. Public pages read published snapshots.
const SponsorContext = createContext(null);
export function SponsorPreviewProvider({ sponsors, children }) {
  return <SponsorContext.Provider value={sponsors}>{children}</SponsorContext.Provider>;
}
export default function SponsorPlacement({ placement, episodeId }) {
  const reviewSponsors = useContext(SponsorContext);
  const { SPONSORS } = useContent();
  const sponsor = visibleSponsor(reviewSponsors ?? SPONSORS, placement, episodeId);
  const [failedImage, setFailedImage] = useState(false);
  useEffect(() => setFailedImage(false), [sponsor?.imageSrc]);
  if (!sponsor) return null;
  return <aside className="sponsor-placement container" aria-label={`${SPONSOR_PLACEMENTS[placement]} sponsorship`}>
    <p className="sponsor-disclosure">Sponsored</p>
    <a className="sponsor-card" href={sponsor.destinationUrl} target="_blank" rel="sponsored noopener noreferrer"
      aria-label={`Visit ${sponsor.name} (opens in a new tab)`}>
      <div className="sponsor-artwork">{failedImage ? <span className="sponsor-image-fallback">{sponsor.name}</span> :
        <img src={sponsor.imageSrc} alt={sponsor.imageAlt} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailedImage(true)} />}</div>
      <div className="sponsor-copy"><strong>{sponsor.name}</strong><span>Visit sponsor <span aria-hidden="true">↗</span></span><small>Opens in a new tab</small></div>
    </a>
  </aside>;
}

