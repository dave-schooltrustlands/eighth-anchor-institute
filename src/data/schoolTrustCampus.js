// School Trust Campus — literal Grounds Plan.
// Status: 'active' | 'allied' | 'chapter' | 'reserved' | 'under-formation'
export const buildings = [
  {
    id: 'library',
    address: '1 Record Walk',
    name: "America's School Trust Library",
    short: 'Library',
    status: 'active',
    statusText: 'Active. Allied institution.',
    role: 'Archive',
    domain: 'schooltrusts.net',
    href: 'https://schooltrusts.net',
    whatToDo:
      "The historical archive of America's school trust lands. Built around Schools of the Republic, the Library preserves the 240-year evidentiary record — state-by-state enabling acts, fund corpus values over time, distribution patterns, litigation history, restoration cases, founding documents from the 1785 Land Ordinance forward. It is the building where the case for everything the Institute does is laid out in detail. Reading Room, Counting House, Map Room, Reference Desk, Newsroom, Court Room, and Writing Room each hold their specific portion of the record.",
    cta: 'Enter the Library',
    x: 18,
    y: 28,
  },
  {
    id: 'astl',
    address: '2 Accountability Row',
    name: 'Advocates for School Trust Lands — National',
    short: 'ASTL National',
    status: 'allied',
    statusText: 'Active. Allied coalition.',
    role: 'Coalition',
    domain: 'schooltrustlands.net',
    href: 'https://schooltrustlands.net',
    whatToDo:
      "The national coalition holding states to their fiduciary duty in real time. Where the Library preserves the record, ASTL acts on it. The Ledger publishes which of the twenty trust-lands states currently discloses complete accounting and which do not. The Press Room serves journalists working the disclosure story. State Tracker watches the live cases. Legal Desk tracks current litigation. Coalition Table convenes the people doing the work. ASTL National is independent from the Institute and operates under its own board; both share substrate and vocabulary.",
    cta: 'Enter ASTL National',
    x: 62,
    y: 28,
  },
  {
    id: 'oastl',
    address: '3 Oregon House',
    name: 'Oregon Advocates for School Trust Lands',
    short: 'OASTL',
    status: 'chapter',
    statusText: 'Active. State chapter — prototype.',
    role: 'State chapter',
    domain: 'oastl-oregon.drdavesullivan.workers.dev',
    href: 'https://oastl-oregon.drdavesullivan.workers.dev',
    whatToDo:
      "The Oregon state chapter of the ASTL coalition. Oregon is the live test case of the national project — the active litigation in ASTL v. Oregon, the Elliott State Forest history, the OASTL board, and the local coalition organizing around the state's fiduciary record. Oregon House is now reachable as a v1 prototype while the chapter's permanent home is built out.",
    cta: 'Visit OASTL Oregon',
    x: 62,
    y: 66,
  },
  {
    id: 'orww',
    address: '4 Field Station Road',
    name: 'Oregon Websites and Watersheds Project',
    short: 'ORWW',
    status: 'allied',
    statusText: 'Active. Allied research archive.',
    role: 'Field research',
    domain: 'orww.org',
    href: 'https://orww.org',
    whatToDo:
      "Bob Zybach's Oregon Websites and Watersheds Project — the field-station archive of Oregon's coastal-range forests, the Elliott State Forest's deep history, the Gould-McClay family records, the Jerry Phillips photographic archive, and decades of educational field research that ground every Oregon-specific claim the campus makes. ORWW is an independent project that has agreed to live on the campus as the allied research building. Its archive is the evidentiary backbone of the Oregon work; its presence on the campus is what makes the campus an ecosystem rather than a portfolio.",
    cta: 'Visit ORWW',
    x: 18,
    y: 66,
  },
];

export const reservedPlots = [
  {
    id: 'wa',
    label: 'Reserved plot: Washington Chapter',
    short: 'Washington Chapter',
    why:
      "ASTL is seeking state experts, school advocates, and records contributors to break ground on a Washington chapter. The state's recent SB 5994 disclosure reforms (signed March 2026) make Washington the strongest current candidate for a working state chapter outside Oregon.",
    cta: 'Help break ground in Washington',
    contactSubject: 'Washington Chapter — help break ground',
    x: 84,
    y: 18,
  },
  {
    id: 'ut',
    label: 'Reserved plot: Utah Chapter',
    short: 'Utah Chapter',
    why:
      "Utah's SITLA model is the recovery benchmark — the case study where reformed disclosure and beneficiary tracking turned the trust around from drift toward defense. ASTL is seeking Utah state experts to lead a chapter that documents the recovery model and serves the live work in adjacent western states.",
    cta: 'Help break ground in Utah',
    contactSubject: 'Utah Chapter — help break ground',
    x: 84,
    y: 47,
  },
  {
    id: 'ms',
    label: 'Reserved plot: Mississippi Chapter',
    short: 'Mississippi Chapter',
    why:
      "Mississippi is the lost-inheritance case — large grant, weak surviving record, beneficiaries currently invisible in state accounting. ASTL is seeking Mississippi state experts and education advocates to lead the recovery-focused chapter that the state's record most needs.",
    cta: 'Help break ground in Mississippi',
    contactSubject: 'Mississippi Chapter — help break ground',
    x: 84,
    y: 76,
  },
];

// Labeled paths between buildings: [from, to, label]
export const paths = [
  { from: 'library', to: 'astl', label: 'Evidence to action' },
  { from: 'library', to: 'oastl', label: 'Oregon record' },
  { from: 'oastl', to: 'orww', label: 'Forest research' },
  { from: 'astl', to: 'oastl', label: 'National coalition' },
];
