// installer-specialty.enum.ts
export enum InstallerSpecialty {
  PLUMBER_OUTDOOR = 'PLUMBER_OUTDOOR',
  ELECTRICIAN_LANDSCAPE = 'ELECTRICIAN_LANDSCAPE',
  LANDSCAPER_POOL_DECORATOR = 'LANDSCAPER_POOL_DECORATOR',
  WALL_POOL_INSTALLER = 'WALL_POOL_INSTALLER',
  AQUARIUM_TECHNICIAN = 'AQUARIUM_TECHNICIAN',
  MASON_POOL_STRUCTURES = 'MASON_POOL_STRUCTURES'
}

export const InstallerSpecialtyDisplayNames = {
  [InstallerSpecialty.PLUMBER_OUTDOOR]: 'Technicien en plomberie extérieure',
  [InstallerSpecialty.ELECTRICIAN_LANDSCAPE]: 'Électricien paysager – Éclairage extérieur',
  [InstallerSpecialty.LANDSCAPER_POOL_DECORATOR]: 'Paysagiste décorateur de bassins',
  [InstallerSpecialty.WALL_POOL_INSTALLER]: 'Installateur de bassins muraux',
  [InstallerSpecialty.AQUARIUM_TECHNICIAN]: 'Technicien en aquariophilie et bassins vivants',
  [InstallerSpecialty.MASON_POOL_STRUCTURES]: 'Maçon spécialisé en structures de bassins'
};