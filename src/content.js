export const BRAND = {
  name: 'InclusiveQest',
  tagline: 'Hear Every Story. See Every Voice.',
  logoSrc: '/inclusiveqest-logo.png',
  supportEmail: 'support@inclusiveqest.com'
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
