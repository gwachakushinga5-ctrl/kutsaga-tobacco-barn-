export const REJECTION_REASONS = [
  {
    code: 'RURAL_HOUSE',
    label: 'Rural house',
    description: 'Detached rural homestead or dwelling.',
  },
  {
    code: 'RONDAVEL',
    label: 'Rondavel',
    description: 'Round traditional hut with a conical roof.',
  },
  {
    code: 'SCHOOL',
    label: 'School',
    description: 'School block, classroom, or campus building.',
  },
  {
    code: 'CLINIC',
    label: 'Clinic',
    description: 'Clinic, health post, or medical structure.',
  },
  {
    code: 'SHED',
    label: 'Shed',
    description: 'Equipment, implement, or general-purpose shed.',
  },
  {
    code: 'TREE',
    label: 'Tree',
    description: 'Tree canopy or vegetation mistaken for a structure.',
  },
  {
    code: 'SHADOW',
    label: 'Shadow',
    description: 'Cast shadow mistaken for a footprint.',
  },
  {
    code: 'ARTIFACT',
    label: 'Image artifact',
    description: 'Cloud, seam, or imagery artefact.',
  },
]

export const REJECTION_REASON_MAP = Object.fromEntries(
  REJECTION_REASONS.map((reason) => [reason.code, reason]),
)
