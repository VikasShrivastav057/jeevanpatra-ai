export type BuiltInTemplateId =
  | 'saffron'
  | 'peacock'
  | 'midnight'
  | 'rose'
  | 'lotus'
  | 'royal'
  | 'classic-red'
  | 'south-indian'
  | 'jain'
  | 'muslim'
  | 'christian'
  | 'modern-blue'
  | 'heritage'
  | 'hindu-premium'
  | 'monochrome-pearl'
  | 'navy-executive'
  | 'botanical-blush'
  | 'garden-sage'
  | 'aesthetic-air'
  | 'charcoal-profile'
  | 'saffron-editorial'
  | 'azure-formal'
  | 'ruby-ledger'
  | 'vintage-parchment'
  | 'onyx-tuft'
  | 'peacock-nocturne'
  | 'royal-peacock-columns'
  | 'black-gold-registry'
  | 'peach-floral-registry'
  | 'pearl-jewel-luxe'
  | 'emerald-gold-registry'
  | 'shri-ram-devotional'
  | 'radha-krishna-devotional'
  | 'mahadev-parvati-devotional';

export type TemplateId = BuiltInTemplateId | 'ai-custom';
export type TemplateCategory = 'Hindu' | 'Jain' | 'Muslim' | 'Christian' | 'Traditional' | 'Modern' | 'Classic' | 'Professional';

export type TemplateTheme = {
  stage: string;
  paper: string;
  primary: string;
  accent: string;
  text: string;
  muted: string;
  contact: string;
};

export type TemplateCatalogItem = {
  id: BuiltInTemplateId;
  name: string;
  category: TemplateCategory;
  note: string;
  editorNote: string;
  blessing: string;
  popular?: boolean;
  theme: TemplateTheme;
};

export const templateCatalog: readonly TemplateCatalogItem[] = [
  {
    id: 'saffron', name: 'Saffron Grace', category: 'Hindu', note: 'Warm ivory with sacred saffron accents', editorNote: 'Warm & traditional', popular: true,
    blessing: '॥ श्री गणेशाय नमः ॥',
    theme: { stage: '#f4e4d6', paper: 'linear-gradient(145deg,#fffaf2,#fff1df)', primary: '#8f342b', accent: '#d49a3a', text: '#5b3430', muted: '#724a43', contact: '#f6e3cd' },
  },
  {
    id: 'peacock', name: 'Peacock Arch', category: 'Traditional', note: 'Regal blue arch and gold details', editorNote: 'Regal & expressive', popular: true,
    blessing: 'शुभ विवाह',
    theme: { stage: '#e2edea', paper: 'linear-gradient(145deg,#fbf7ed,#f1eadb)', primary: '#07505e', accent: '#d0a54a', text: '#123f4b', muted: '#355761', contact: '#e4ede9' },
  },
  {
    id: 'midnight', name: 'Midnight Gold', category: 'Modern', note: 'Deep charcoal with elegant gold', editorNote: 'Bold & elegant', popular: true,
    blessing: 'MARRIAGE BIODATA',
    theme: { stage: '#cbd5d4', paper: 'linear-gradient(145deg,#173033,#0d2527)', primary: '#f0ca70', accent: '#ebcc7b', text: '#fff1c9', muted: '#d7c9a9', contact: '#243f40' },
  },
  {
    id: 'rose', name: 'Rose Heritage', category: 'Traditional', note: 'Soft rose borders and graceful details', editorNote: 'Soft & graceful',
    blessing: 'शुभ विवाह',
    theme: { stage: '#f4e2e4', paper: 'linear-gradient(145deg,#fff8f6,#f8e9ea)', primary: '#874253', accent: '#d9a7af', text: '#653e47', muted: '#72515a', contact: '#f4e4e6' },
  },
  {
    id: 'lotus', name: 'Marigold Lotus', category: 'Hindu', note: 'Festive floral warmth and celebration', editorNote: 'Floral & festive',
    blessing: '॥ श्री गणेशाय नमः ॥',
    theme: { stage: '#f6ead0', paper: 'linear-gradient(145deg,#fffdf4,#fff2d5)', primary: '#8d420d', accent: '#e4a33b', text: '#59432f', muted: '#6f583c', contact: '#f9e9c8' },
  },
  {
    id: 'royal', name: 'Royal Ivory', category: 'Classic', note: 'Refined ivory, navy and antique gold', editorNote: 'Classic & refined',
    blessing: 'MARRIAGE BIODATA',
    theme: { stage: '#e2e7eb', paper: 'linear-gradient(145deg,#fffef9,#f4f0e4)', primary: '#1f425a', accent: '#c39a4b', text: '#283a4b', muted: '#52616b', contact: '#e9eef0' },
  },
  {
    id: 'classic-red', name: 'Classic Elegance', category: 'Hindu', note: 'Rich maroon mandala-inspired frame', editorNote: 'Maroon & ceremonial', popular: true,
    blessing: '॥ शुभ मंगल ॥',
    theme: { stage: '#efe0d2', paper: 'linear-gradient(145deg,#79090f,#52060a)', primary: '#d9a640', accent: '#f0c968', text: '#fff0bd', muted: '#e5c98a', contact: '#8c171c' },
  },
  {
    id: 'south-indian', name: 'South Indian Classic', category: 'Hindu', note: 'Temple-red border on warm parchment', editorNote: 'Temple-inspired warmth',
    blessing: '॥ श्री गणेशाय नमः ॥',
    theme: { stage: '#f5e8d7', paper: 'linear-gradient(145deg,#fff6e6,#fbe9cd)', primary: '#8f0f16', accent: '#d7841d', text: '#5c3025', muted: '#704c40', contact: '#f6ddbd' },
  },
  {
    id: 'jain', name: 'Jain Traditional', category: 'Jain', note: 'Auspicious crimson and fine gold lines', editorNote: 'Crimson & auspicious',
    blessing: '॥ नमो अरिहंताणं ॥',
    theme: { stage: '#ead8ca', paper: 'linear-gradient(145deg,#a5080d,#71060a)', primary: '#f2ca69', accent: '#f1d181', text: '#fff0c0', muted: '#e7cf9b', contact: '#b52327' },
  },
  {
    id: 'muslim', name: 'Muslim Contemporary', category: 'Muslim', note: 'Emerald architectural arch and gold', editorNote: 'Emerald architectural arch', popular: true,
    blessing: 'بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ',
    theme: { stage: '#dbe9e7', paper: 'linear-gradient(145deg,#155d5d,#0d4548)', primary: '#f1cf73', accent: '#f0d47f', text: '#fff4cf', muted: '#d4dfd0', contact: '#216c69' },
  },
  {
    id: 'christian', name: 'Christian Modern', category: 'Christian', note: 'Burgundy architectural frame and gold', editorNote: 'Burgundy & refined',
    blessing: 'With God’s grace',
    theme: { stage: '#eadbd9', paper: 'linear-gradient(145deg,#8a1f25,#5d151a)', primary: '#f3d58d', accent: '#f3d58d', text: '#fff1cf', muted: '#e6cfc0', contact: '#9b3035' },
  },
  {
    id: 'modern-blue', name: 'Modern Elite', category: 'Modern', note: 'Clean blue gradient and minimal lines', editorNote: 'Clean blue minimalism',
    blessing: 'MARRIAGE BIODATA',
    theme: { stage: '#dfe9f2', paper: 'linear-gradient(145deg,#5a83e8,#66cfdc)', primary: '#061b3b', accent: '#ffffff', text: '#061b3b', muted: '#061b3b', contact: '#ffffff99' },
  },
  {
    id: 'heritage', name: 'Heritage Premium', category: 'Traditional', note: 'Carved brown arch with antique character', editorNote: 'Antique carved arch',
    blessing: 'शुभ विवाह',
    theme: { stage: '#e7d8c7', paper: 'linear-gradient(145deg,#fffdf8,#efe0c9)', primary: '#5c2d1b', accent: '#b8844d', text: '#4c3025', muted: '#674b3e', contact: '#ead7bd' },
  },
  {
    id: 'hindu-premium', name: 'Hindu Premium', category: 'Hindu', note: 'Royal purple canopy and warm gold', editorNote: 'Royal purple & gold',
    blessing: '॥ श्री गणेशाय नमः ॥',
    theme: { stage: '#e7d9eb', paper: 'linear-gradient(145deg,#6e1f73,#46134c)', primary: '#f1cf74', accent: '#f1cf74', text: '#fff0bd', muted: '#dfc9df', contact: '#7d2d82' },
  },
  {
    id: 'monochrome-pearl', name: 'Monochrome Pearl', category: 'Classic', note: 'Crisp black linework on luminous white', editorNote: 'Monochrome & precise',
    blessing: 'BIO DATA',
    theme: { stage: '#e7e7e7', paper: 'linear-gradient(145deg,#ffffff,#f5f5f2)', primary: '#181c20', accent: '#a7aaad', text: '#202326', muted: '#62676a', contact: '#eeeeeb' },
  },
  {
    id: 'navy-executive', name: 'Navy Executive', category: 'Professional', note: 'Structured navy columns with champagne accents', editorNote: 'Executive two-column navy', popular: true,
    blessing: 'MARRIAGE BIO DATA',
    theme: { stage: '#d5dce5', paper: 'linear-gradient(145deg,#102d52,#071a33)', primary: '#f1d39a', accent: '#d4a968', text: '#f7f0df', muted: '#ced7e0', contact: '#193a62' },
  },
  {
    id: 'botanical-blush', name: 'Botanical Blush', category: 'Modern', note: 'Airy blush paper with watercolor foliage', editorNote: 'Blush botanical frame', popular: true,
    blessing: 'A NEW BEGINNING',
    theme: { stage: '#eee7e3', paper: 'linear-gradient(145deg,#fffaf8,#f8efeb)', primary: '#9d5d69', accent: '#93a984', text: '#493f3e', muted: '#776865', contact: '#f2e5e3' },
  },
  {
    id: 'garden-sage', name: 'Garden Sage', category: 'Traditional', note: 'Soft green leaves and a calm garden border', editorNote: 'Sage garden frame',
    blessing: 'TOGETHER WITH FAMILY',
    theme: { stage: '#e1e9e0', paper: 'linear-gradient(145deg,#fffef9,#f1f5ea)', primary: '#4d6f58', accent: '#a8b98b', text: '#34433a', muted: '#667269', contact: '#e7eee0' },
  },
  {
    id: 'aesthetic-air', name: 'Aesthetic Air', category: 'Modern', note: 'Spacious editorial typography and a soft portrait halo', editorNote: 'Light editorial minimalism',
    blessing: 'OUR STORY',
    theme: { stage: '#ece7df', paper: 'linear-gradient(145deg,#fffefb,#f7f3ed)', primary: '#b17d3d', accent: '#e1c594', text: '#31363a', muted: '#6c706e', contact: '#f4eee3' },
  },
  {
    id: 'charcoal-profile', name: 'Charcoal Profile', category: 'Professional', note: 'Contemporary dark profile with a strong split layout', editorNote: 'Dark profile & columns',
    blessing: 'PERSONAL PROFILE',
    theme: { stage: '#d6d3d2', paper: 'linear-gradient(145deg,#343438,#222226)', primary: '#f4f1eb', accent: '#b7a48e', text: '#fbf8f1', muted: '#d1ccc5', contact: '#3f3e43' },
  },
  {
    id: 'saffron-editorial', name: 'Saffron Editorial', category: 'Professional', note: 'Bold saffron sidebar with an editorial information grid', editorNote: 'Orange editorial sidebar',
    blessing: 'BIO DATA',
    theme: { stage: '#f1e2d6', paper: 'linear-gradient(90deg,#e85e18 0 29%,#fff9f0 29%)', primary: '#c7470e', accent: '#f4a05b', text: '#3d332d', muted: '#76665c', contact: '#fbe7d6' },
  },
  {
    id: 'azure-formal', name: 'Azure Formal', category: 'Professional', note: 'Clean blue bands and organized form-style sections', editorNote: 'Blue formal document',
    blessing: 'BIO DATA',
    theme: { stage: '#e0e7ef', paper: 'linear-gradient(145deg,#ffffff,#f1f6fa)', primary: '#173f78', accent: '#6b91bd', text: '#25384d', muted: '#687586', contact: '#e4edf6' },
  },
  {
    id: 'ruby-ledger', name: 'Ruby Ledger', category: 'Classic', note: 'Cream document with ruby section bars and fine florals', editorNote: 'Ruby form & florals',
    blessing: 'BIO DATA',
    theme: { stage: '#f0ddd8', paper: 'linear-gradient(145deg,#fff9ef,#f7eadc)', primary: '#8c2730', accent: '#d88578', text: '#493b38', muted: '#76635f', contact: '#f1d8d3' },
  },
  {
    id: 'vintage-parchment', name: 'Vintage Parchment', category: 'Traditional', note: 'Antique paper with engraved corner ornaments', editorNote: 'Sepia antique document',
    blessing: 'MARRIAGE BIO DATA',
    theme: { stage: '#ddd0bb', paper: 'linear-gradient(145deg,#efe2c6,#d9c49f)', primary: '#5a4630', accent: '#907452', text: '#3f3428', muted: '#655743', contact: '#d8c4a4' },
  },
  {
    id: 'onyx-tuft', name: 'Onyx Tuft', category: 'Classic', note: 'Quilted black backdrop with ornate gold framing', editorNote: 'Black quilt & gold', popular: true,
    blessing: 'MARRIAGE BIO DATA',
    theme: { stage: '#cfc9c1', paper: 'linear-gradient(145deg,#242326,#111113)', primary: '#d7b978', accent: '#f0d69c', text: '#fff5df', muted: '#d7cbb6', contact: '#302e31' },
  },
  {
    id: 'peacock-nocturne', name: 'Peacock Nocturne', category: 'Traditional', note: 'Midnight blue with a ceremonial peacock crown', editorNote: 'Peacock blue & gold',
    blessing: 'शुभ विवाह',
    theme: { stage: '#d4d9df', paper: 'linear-gradient(145deg,#0b2148,#071630)', primary: '#d9b85e', accent: '#2e8095', text: '#fff1ca', muted: '#c7d0d7', contact: '#122d58' },
  },
  {
    id: 'royal-peacock-columns', name: 'Royal Peacock Columns', category: 'Traditional', note: 'Deep royal blue, peacock crown and paired information columns', editorNote: 'Royal peacock two-column', popular: true,
    blessing: 'BIO DATA',
    theme: { stage: '#d4d9df', paper: 'linear-gradient(145deg,#061f5a,#02143d)', primary: '#f3d7a8', accent: '#347c9c', text: '#fff7e8', muted: '#d4deed', contact: '#0a2c66' },
  },
  {
    id: 'black-gold-registry', name: 'Black Gold Registry', category: 'Classic', note: 'Textured black paper, circular portrait and ornamental gold corners', editorNote: 'Black registry & gold corners', popular: true,
    blessing: 'BIO DATA',
    theme: { stage: '#d0cec8', paper: 'linear-gradient(145deg,#222225,#0d0d0f)', primary: '#f0eee8', accent: '#c7a75b', text: '#fffdf7', muted: '#d6d2ca', contact: '#f0eee8' },
  },
  {
    id: 'peach-floral-registry', name: 'Peach Floral Registry', category: 'Modern', note: 'Warm ivory paper, peach florals and a clean two-column registry', editorNote: 'Peach floral two-column', popular: true,
    blessing: 'BIO DATA',
    theme: { stage: '#eee7df', paper: 'linear-gradient(145deg,#fffdf9,#f5eee7)', primary: '#4a403c', accent: '#e7ae93', text: '#3d3734', muted: '#6c625d', contact: '#f5d9ca' },
  },
  {
    id: 'pearl-jewel-luxe', name: 'Pearl Jewel Luxe', category: 'Classic', note: 'Pearl strands, crystal brooches and peach two-column detail bars', editorNote: 'Pearl jewel reference match', popular: true,
    blessing: 'BIO DATA',
    theme: { stage: '#eee5dc', paper: '#fbf5ee', primary: '#161514', accent: '#e5a783', text: '#25211f', muted: '#5e554f', contact: '#f5d7c5' },
  },
  {
    id: 'emerald-gold-registry', name: 'Emerald Gold Registry', category: 'Classic', note: 'Emerald damask, ivory-gold flourishes and peach two-column detail bars', editorNote: 'Emerald damask reference match', popular: true,
    blessing: 'BIO DATA',
    theme: { stage: '#cfd3cf', paper: '#062c25', primary: '#fffdf7', accent: '#f0c9a8', text: '#fffdf7', muted: '#e5e7df', contact: '#f3cfb2' },
  },
  {
    id: 'shri-ram-devotional', name: 'Shri Ram Devotional', category: 'Hindu', note: 'Shri Ram and Mata Sita with temple gardens, florals and a warm heritage palette', editorNote: 'Shri Ram temple poster match', popular: true,
    blessing: '॥ श्रीराम ॥',
    theme: { stage: '#f1ddbd', paper: '#fff8e8', primary: '#941b17', accent: '#d99b31', text: '#302820', muted: '#665143', contact: '#fae2bd' },
  },
  {
    id: 'radha-krishna-devotional', name: 'Radha Krishna Devotional', category: 'Hindu', note: 'Radha Krishna garden scene with peacock, lotus flowers and palace details', editorNote: 'Radha Krishna floral poster match', popular: true,
    blessing: 'RADHA KRISHNA',
    theme: { stage: '#ecdfca', paper: '#fff9e8', primary: '#8b1f19', accent: '#d99d34', text: '#312820', muted: '#685448', contact: '#fae4c7' },
  },
  {
    id: 'mahadev-parvati-devotional', name: 'Mahadev Parvati Devotional', category: 'Hindu', note: 'Mahadev and Mata Parvati in a Himalayan temple and river landscape', editorNote: 'Mahadev Himalayan poster match', popular: true,
    blessing: 'ॐ नमः शिवाय',
    theme: { stage: '#dbe6ec', paper: '#fffaf0', primary: '#0d4276', accent: '#d49427', text: '#26384a', muted: '#536579', contact: '#dcebf5' },
  },
] as const;

export const builtInTemplateIds = templateCatalog.map((item) => item.id) as BuiltInTemplateId[];

export function getTemplateById(id: string) {
  return templateCatalog.find((item) => item.id === id);
}
