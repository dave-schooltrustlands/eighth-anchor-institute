// School Trust Campus — literal Grounds Plan.
// Status: 'active' | 'allied' | 'chapter' | 'reserved' | 'under-formation'
export const buildings = [
  {
    id: 'library',
    address: '1 Record Walk',
    name: "America's School Trust Library",
    short: 'Library',
    status: 'active',
    role: 'Archive',
    domain: 'schooltrusts.net',
    href: 'https://schooltrusts.net',
    whatToDo: 'Read the founding texts, primary sources, and the 240-year record.',
    cta: 'Enter the Library',
    // Grounds-plan position (percent of plan width/height)
    x: 18,
    y: 28,
  },
  {
    id: 'astl',
    address: '2 Accountability Row',
    name: 'Advocates for School Trust Lands — National',
    short: 'ASTL National',
    status: 'allied',
    role: 'Coalition',
    domain: 'schooltrustlands.net',
    href: 'https://schooltrustlands.net',
    whatToDo: 'Track state-by-state accountability and join the national coalition.',
    cta: 'Enter ASTL',
    x: 62,
    y: 28,
  },
  {
    id: 'oastl',
    address: '3 Oregon House',
    name: 'Oregon Advocates for School Trust Lands',
    short: 'OASTL',
    status: 'chapter',
    role: 'State chapter',
    domain: 'TBD',
    href: '#oastl-tbd',
    whatToDo: 'The first state chapter — Oregon ledger, Oregon stewardship.',
    cta: 'Enter OASTL',
    x: 62,
    y: 66,
  },
  {
    id: 'orww',
    address: '4 Field Station Road',
    name: 'Oregon Websites and Watersheds Project',
    short: 'ORWW',
    status: 'allied',
    role: 'Field research',
    domain: 'orww.org',
    href: 'https://orww.org',
    whatToDo: 'Allied field-station archive of Oregon forest research and watershed records.',
    cta: 'Enter ORWW',
    x: 18,
    y: 66,
  },
];

export const reservedPlots = [
  { id: 'wa', label: 'Reserved plot: Washington Chapter', x: 84, y: 18 },
  { id: 'ut', label: 'Reserved plot: Utah Chapter', x: 84, y: 47 },
  { id: 'ms', label: 'Reserved plot: Mississippi Chapter', x: 84, y: 76 },
];

// Labeled paths between buildings: [from, to, label]
export const paths = [
  { from: 'library', to: 'astl', label: 'Evidence to action' },
  { from: 'library', to: 'oastl', label: 'Oregon record' },
  { from: 'oastl', to: 'orww', label: 'Forest research' },
  { from: 'astl', to: 'oastl', label: 'National coalition' },
];
