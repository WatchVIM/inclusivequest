# Inclusive Quest Content Editing

The About page, Founder Story, and Team section are intentionally driven from one file so routine content updates do not require component changes.

## Founder photo

Upload one image named exactly:

`public/founder-photo.jpg`

That single image is used automatically in both locations:

- About page — large Founder Story photo
- Homepage — smaller Founder Story photo near the statistics section

If the image has not been uploaded yet, the site shows a clean “Founder photo coming soon” placeholder instead of a broken image.

## Founder name and title

Open `src/content.js` and edit the `FOUNDER` object:

```js
export const FOUNDER = {
  photoSrc: '/founder-photo.jpg',
  photoAlt: 'Inclusive Quest founder',
  name: 'Founder Name',
  title: 'Founder & CEO',
  // ...
};
```

## Add team members

Open `src/content.js` and find `TEAM.members`.

Add one object per person using these four fields:

```js
members: [
  {
    name: 'Full Name',
    title: 'Role / Title',
    bio: 'Short biography.',
    photoSrc: '/team/full-name.jpg'
  }
]
```

Upload team photos into `public/team/` using the same filename referenced in `photoSrc`.

When `TEAM.members` is empty, the site automatically displays the current founder-led placeholder copy and the “Get in touch” link.

## Edit About or Founder Story copy

The About copy lives in `ABOUT.paragraphs` in `src/content.js`.

The Founder Story copy lives in `FOUNDER.story` in `src/content.js`.

Each paragraph is a separate quoted item, so wording can be changed without touching the page layout.

## Contact link

The Work With Us email is controlled by `BRAND.contactEmail` in `src/content.js`.
