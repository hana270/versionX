package projet.spring.entities;

public enum InstallerSpecialty {
    PLUMBER_OUTDOOR("Technicien en plomberie extérieure"),
    ELECTRICIAN_LANDSCAPE("Électricien paysager – Éclairage extérieur"),
    LANDSCAPER_POOL_DECORATOR("Paysagiste décorateur de bassins"),
    WALL_POOL_INSTALLER("Installateur de bassins muraux"),
    AQUARIUM_TECHNICIAN("Technicien en aquariophilie et bassins vivants"),
    MASON_POOL_STRUCTURES("Maçon spécialisé en structures de bassins");

    private final String displayName;

    InstallerSpecialty(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }
}