export const BRAND = {
  name: 'InclusiveQest',
  tagline: 'Hear Every Story. See Every Voice.',
  logoSrc: '/inclusiveqest-logo.png',
  supportEmail: 'support@inclusiveqest.com',
  contactEmail: 'support@inclusiveqest.com'
};

export const ABOUT = {
  heading: 'About Inclusive Quest',
  paragraphs: [
    "Imagine walking past a world full of conversations you can see but never join. The content is right there — in plain sight. But no one built the bridge to let you in.",
    "That's the daily reality for 1.5 billion Deaf and Hard-of-Hearing people worldwide.",
    'Inclusive Quest (IQ) is that bridge.',
    "The global podcast industry is worth $39.6 billion. Zero major platforms offer native ASL interpretation. That's the gap IQ fills.",
    "IQ is the platform that layers ASL interpretation directly onto podcast content. We don't make podcasts. We make podcasts accessible — to a community that has been locked out of the fastest-growing media format on the planet for far too long.",
    'The model is simple: platforms and publishers pay for the integration. DHH viewers access it for free. Access is the product. Inclusion is the mission.',
    "IQ isn't a feature. It's the missing layer."
  ]
};

export const FOUNDER = {
  // Upload one image to public/founder-photo.jpg and both founder-photo placements update automatically.
  photoSrc: '/founder-photo.jpg',
  photoAlt: 'Inclusive Quest founder',
  name: '',
  title: 'Founder',
  homeQuote: 'To build the bridge that should have always been there.',
  story: [
    "My why began when I realized that life doesn't discriminate. Humans do — consciously or not.",
    "Growing up, I watched my neighbor's daughter, no older than 7 or 8, play by herself. Excluded from activities. Excluded from conversations. Forced to stay home while the rest of us went to school. To get her attention, people would shout at her. I watched all of this as a child — and even then, with full hearing, I felt a pain I couldn't yet put into words.",
    "Little did I know that one day I'd be in her shoes.",
    'Excluded from activities. Excluded from conversations. Shouted at. The world kept evolving — but very little of that evolution made room for the Deaf and Hard-of-Hearing community.',
    'Podcasts are one of the largest educational and entertainment platforms available to anyone. But not everyone.',
    'Inclusive Quest exists to change that. To build the bridge that should have always been there. To make sure that no child — and no adult — ever has to sit on the outside of a conversation again.'
  ]
};

export const TEAM = {
  placeholder:
    'IQ is founder-led and growing. We are actively building our team of interpreters, technologists, and accessibility advocates. Interested in joining the quest? Get in touch.',
  // Add future team members here. Example fields:
  // { name: 'Name', title: 'Title', bio: 'Short bio', photoSrc: '/team/name.jpg' }
  members: []
};

export const DEMO_VIDEO = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

// Production note:
// Replace demoVideo URLs with your Mux playback URLs or Mux playback IDs.
// Best practice: store mainPlaybackId and aslPlaybackId per title in your CMS/database.
export const TITLES = [
  {
    id: 'talk-001',
    title: 'Inclusive Voices',
    category: 'Podcast',
    duration: '32 min',
    badge: 'CC + ASL',
    poster: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=1400&auto=format&fit=crop',
    mainVideoSrc: DEMO_VIDEO,
    aslVideoSrc: DEMO_VIDEO,
    captionsSrc: '/sample-captions.vtt',
    mux: {
      mainPlaybackId: 'YOUR_MAIN_MUX_PLAYBACK_ID',
      aslPlaybackId: 'YOUR_ASL_MUX_PLAYBACK_ID'
    },
    description:
      'A visual podcast series with ASL interpretation, captions, and full transcripts built directly into the viewing experience.'
  },
  {
    id: 'doc-002',
    title: 'Beyond the Caption',
    category: 'Documentary',
    duration: '58 min',
    badge: 'Transcript Ready',
    poster: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1400&auto=format&fit=crop',
    mainVideoSrc: DEMO_VIDEO,
    aslVideoSrc: DEMO_VIDEO,
    captionsSrc: '/sample-captions.vtt',
    mux: {
      mainPlaybackId: 'YOUR_MAIN_MUX_PLAYBACK_ID',
      aslPlaybackId: 'YOUR_ASL_MUX_PLAYBACK_ID'
    },
    description:
      'A human-centered documentary exploring how deaf and hard-of-hearing communities experience media, culture, and storytelling.'
  },
  {
    id: 'edu-003',
    title: 'Open Dialogue',
    category: 'Series',
    duration: '29 min',
    badge: 'Accessible Audio',
    poster: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1400&auto=format&fit=crop',
    mainVideoSrc: DEMO_VIDEO,
    aslVideoSrc: DEMO_VIDEO,
    captionsSrc: '/sample-captions.vtt',
    mux: {
      mainPlaybackId: 'YOUR_MAIN_MUX_PLAYBACK_ID',
      aslPlaybackId: 'YOUR_ASL_MUX_PLAYBACK_ID'
    },
    description:
      'A weekly access-first conversation series designed for captions, transcripts, interpreter video, and flexible playback layouts.'
  }
];

export const FEATURES = [
  {
    icon: 'hands',
    title: 'Sign Language',
    text: 'Professional interpreter video beside every story.'
  },
  {
    icon: 'captions',
    title: 'Captions & Subtitles',
    text: 'Accurate, synced, and easy to read.'
  },
  {
    icon: 'transcript',
    title: 'Transcripts',
    text: 'Full episode transcripts for every show.'
  },
  {
    icon: 'audio',
    title: 'Accessible Audio',
    text: 'Clear audio with volume normalization.'
  },
  {
    icon: 'people',
    title: 'Community First',
    text: 'Stories by and for the D/HH community.'
  }
];

export const MERCH = [
  {
    id: 'hoodie-001',
    name: 'InclusiveQest Logo Hoodie',
    price: '$54',
    tag: 'Launch Item'
  },
  {
    id: 'tee-001',
    name: 'Hear Every Story Tee',
    price: '$28',
    tag: 'Best Seller'
  },
  {
    id: 'mug-001',
    name: 'See Every Voice Mug',
    price: '$18',
    tag: 'Creator Pick'
  }
];

export const CREATOR_CHECKLIST = [
  'Main video file or Mux asset ID',
  'ASL/interpreter sidecar video with matching duration',
  'SRT or WebVTT captions',
  'Full transcript',
  'Poster, horizontal hero image, and title logo',
  'Merch artwork or store collection'
];

export const STATS = [
  ['25K+', 'Community Members'],
  ['1,200+', 'Accessible Videos'],
  ['450+', 'Podcast Episodes'],
  ['80+', 'Countries Reached'],
  ['100%', 'Inclusion Focused']
];
