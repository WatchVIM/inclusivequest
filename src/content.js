export const BRAND = {
  name: 'Inclusive Quest',
  tagline: '',
  logoSrc: '/inclusive-quest-logo.png',
  supportEmail: 'info@inclusivequest.co',
  contactEmail: 'info@inclusivequest.co',
  footerTagline: 'Unveiling Access. One Quest at a Time.'
};

// Submission forms are managed in the client's Tally workspace. Keep these URLs exact.
export const WORK_WITH_US_FORMS = {
  platforms: {
    label: 'Platforms',
    heading: 'Platform partnership inquiry',
    description: 'For platforms and publishers exploring accessible podcast partnerships with Inclusive Quest.',
    url: 'https://tally.so/r/jeDMqQ',
    embedUrl: 'https://tally.so/embed/jeDMqQ?alignLeft=1&hideTitle=1&transparentBackground=1'
  },
  podcasters: {
    label: 'Podcasters',
    heading: 'Podcaster submission',
    description: 'For podcast creators who want to share a show and discuss making it accessible.',
    url: 'https://tally.so/r/LD1G0j',
    embedUrl: 'https://tally.so/embed/LD1G0j?alignLeft=1&hideTitle=1&transparentBackground=1'
  },
  interpreters: {
    label: 'Interpreters',
    heading: 'Interpreter collaboration',
    description: 'For sign language interpreters interested in helping make podcasts more accessible.',
    url: 'https://tally.so/r/OQ1Bj7',
    embedUrl: 'https://tally.so/embed/OQ1Bj7?alignLeft=1&hideTitle=1&transparentBackground=1'
  },
  other: {
    label: 'Other',
    heading: 'Other ways to work with IQ',
    description: 'For advocates, technologists, accessibility professionals, and other collaborators.',
    url: 'https://tally.so/r/J1KkQK',
    embedUrl: 'https://tally.so/embed/J1KkQK?alignLeft=1&hideTitle=1&transparentBackground=1'
  }
};

export const INVEST_FORM = {
  heading: 'Invest in Inclusive Quest',
  description: 'Connect with Inclusive Quest to discuss potential investment and partnership opportunities.',
  url: 'https://tally.so/r/aONj6W',
  embedUrl: 'https://tally.so/embed/aONj6W?alignLeft=1&hideTitle=1&transparentBackground=1'
};

export const MISSION_VISION_VALUES = [
  {
    id: 'mission',
    heading: 'Mission Statement',
    text: 'Inclusive Quest exists to make every podcast accessible to the Deaf and Hard of Hearing community — through live sign language interpretation, captions, and transcripts, built directly into the listening experience.'
  },
  {
    id: 'vision',
    heading: 'Vision Statement',
    text: "A world where accessibility isn't an afterthought. Where every platform and creator's content reaches every listener, in every language — signed or spoken. That's the standard Inclusive Quest is building toward."
  },
  {
    id: 'values',
    heading: 'Our Values',
    text: "Access is Non-Negotiable. Every person deserves to fully experience the content that moves, educates, and connects the world, regardless of level of Deafness, language, or location. We don't add accessibility as an afterthought. We build from it."
  }
];

export const ABOUT = {
  heading: 'About Inclusive Quest',
  paragraphs: [
    "Imagine walking past a world full of conversations you can see but never join. The content is right there — in plain sight. But no one built the bridge to let you in.",
    "That's the daily reality for Deaf and Hard of Hearing people who have been excluded from podcast conversations.",
    'Inclusive Quest (IQ) is that bridge.',
    'We make podcasts accessible through integrated Sign Language interpretation, clear captions, transcripts, and ways to discover relevant conversations.',
    'IQ works with platforms and podcasters to make every story easier to see, understand, and share.',
    "Access is the product. Inclusion is the mission."
  ]
};

export const FOUNDER = {
  heading: '',
  // Upload one image to public/founder-photo.jpg and both founder-photo placements update automatically.
  photoSrc: '/founder-photo.jpg',
  photoAlt: 'Inclusive Quest founder',
  name: 'Alma Beaty',
  title: 'Founder & CEO',
  bio: [
    'Alma Beaty is the Founder and CEO of Inclusive Quest — a platform built to close the gap between the podcast world and the 1.5 billion Deaf and Hard of Hearing people it has yet to reach.',
    'A dual U.S. and Sierra Leonean citizen, Alma placed in the Top 10 at the 2026 Entrepreneur of Impact competition — the only Deaf or Hard of Hearing founder in the room.',
    'She writes, she builds, she advocates. She has learned to find humor in the face of adversity while finding solutions that are often hidden in plain sight.',
    'She has also learned to deliberately ignore outside noise, critics, and naysayers.',
    'Her philosophy is simple: access for one is access for all.'
  ],
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
    hostName: '',
    comingSoon: true,
    badge: 'Sign Language + Captions',
    poster: '/she-wears-the-pants.svg',
    mainVideoSrc: null,
    aslVideoSrc: null,
    captionsSrc: null,
    description: 'Conversations that help women in business move past overthinking and take smarter risks. Accessible playback coming soon.'
  }
];

export const FEATURES = [
  { icon: 'hands', title: 'Live Sign Language Interpretation', text: 'Interpretation built into the podcast experience — not an optional afterthought.' },
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
  ['0', 'Major platforms with native Sign Language interpretation']
];

// Approved testimonials and social links can be added when supplied by the client.
export const TESTIMONIALS = [
  {
    "name": "James McGowan",
    "title": "Deaf Educator",
    "quote": "I was born hearing and became Deaf between 2 and 3 years old due to a high fever.  I remembered that I grew up, and I did not receive the closed caption from the media which is why language deprivation had an impact on my life. I grew up in deaf institutions. My teachers knew American Sign Language and provided the captions on but I didn't understand the English so the teachers had to interpret what the videos being said. I grew up wishing we had the caption and sign language at the same time. I never enjoyed watching podcasts generally because I never understood what they were saying or they added captions that I was not familiar with the terminology.\nMy good friend Alma Beaty the founder, is founding the Inclusive Quest and is changing how Deaf people like myself access platforms like Podcasts. I have always wanted to learn about various options such as business, tiny houses, travels, but there’s no podcast out there accessible in my language to teach me these things. Now with Inclusive Quest, I will have access to educational information that my hearing peers have access to. Deaf and Hard of Hearing people are not behind. We’re simply left behind in a world that is always changing. I do enjoy reading captions. But podcasts in my language; American Sign Language is something that will change my life and the lives of millions of Deaf and Hard of Hearing people. Inclusive Quest is going to change that."
  },
  {
    "name": "Juliana Vadala",
    "title": "Certified ASL Interpreter",
    "quote": "As a professional ASL interpreter who enjoys discussing and sharing media with Deaf friends- the elephant in the room is that we can’t share podcasts or even discuss them because there is a glaring disparity- podcasts are inaccessible to Deaf individuals. While everyone has noticed this disparity no one has taken up the mantle to provide the Deaf community access to podcasts like Inclusive Quest.\n\n‘But podcasts have transcripts now- isn’t that enough?’ Simply put, it’s not enough. Deaf Americans’ primary language is American Sign Language not written English. To make podcasts accessible to the Deaf community, they need to be interpreted into ASL.\n\nAlma Beaty has identified this massive inequality and has worked tirelessly to bridge the gap. This is an important venture to include the Deaf community in the news, updates, conversations and entertainment the rest of the world enjoys via podcasts. Admirable and necessary, Inclusive Quest is making podcasts accessible one clip at a time."
  }
];
export const SOCIAL_LINKS = [];
