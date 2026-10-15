export const BRAND = {
  name: 'Inclusive Quest',
  tagline: 'See Every Story. See Every Voice.',
  logoSrc: '/inclusive-quest-mark.svg',
  supportEmail: 'info@inclusivequest.co',
  contactEmail: 'info@inclusivequest.co'
};

export const ABOUT = {
  heading: 'About Inclusive Quest',
  paragraphs: [
    "Imagine walking past a world full of conversations you can see but never join. The content is right there — in plain sight. But no one built the bridge to let you in.",
    "That's the daily reality for Deaf and Hard of Hearing people who have been excluded from podcast conversations.",
    'Inclusive Quest (IQ) is that bridge.',
    'We make podcasts accessible through integrated ASL interpretation, clear captions, transcripts, and ways to discover relevant conversations.',
    'IQ works with platforms and podcasters to make every story easier to see, understand, and share.',
    "Access is the product. Inclusion is the mission."
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

export const TITLES = [
  {
    id: 'she-wears-the-pants',
    title: 'She Wears the Pants',
    episodeTitle: 'Calling All Women in Business: How to Stop Overthinking and Start Taking Smarter Risks',
    category: 'Podcast',
    duration: 'Episode preview',
    badge: 'ASL + Captions',
    poster: '/she-wears-the-pants.svg',
    mainVideoSrc: null,
    aslVideoSrc: null,
    captionsSrc: null,
    description: 'Conversations that help women in business move past overthinking and take smarter risks. Accessible playback coming soon.'
  }
];

export const FEATURES = [
  { icon: 'hands', title: 'Live ASL Interpretation', text: 'Interpretation built into the podcast experience — not an optional afterthought.' },
  { icon: 'captions', title: 'Captions & Subtitles', text: 'Clear, synchronized captions designed to keep every conversation easy to follow.' },
  { icon: 'transcript', title: 'Transcripts', text: 'Readable transcripts that make conversations easier to navigate.' },
  { icon: 'search', title: 'Topic Search & Interpreter Profiles', text: 'Search by topic or interpreter. Your content, your way.' },
  { icon: 'people', title: 'Community First', text: 'Designed with DHH audiences at the center, with room for more stories and voices.' }
];

export const PODCASTER_CHECKLIST = [
  'Your podcast title, description, and a contact email',
  'An episode link or audio/video sample',
  'Episode artwork and any available promotional images',
  'A transcript or captions, if you already have them',
  'Any accessibility support or interpreter details you can share'
];

export const STATS = [
  ['37.5M+', 'US adults report difficulty hearing'],
  ['1.5B+', 'Deaf and Hard of Hearing people globally'],
  ['$39.6B', 'Podcast industry'],
  ['0', 'Major platforms with native ASL interpretation']
];

// Approved testimonials and social links can be added when supplied by the client.
export const TESTIMONIALS = [];
export const SOCIAL_LINKS = [];
