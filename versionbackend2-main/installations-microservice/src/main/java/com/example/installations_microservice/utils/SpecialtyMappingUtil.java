package com.example.installations_microservice.utils;

import java.util.Map;

public class SpecialtyMappingUtil {
    public static final Map<String, String> SPECIALTY_MAPPING = Map.of(
        "PLUMBER_OUTDOOR", "Technicien en plomberie extérieure",
        "ELECTRICIAN_LANDSCAPE", "Électricien paysager – Éclairage extérieur",
        "LANDSCAPER_POOL_DECORATOR", "Paysagiste décorateur de bassins",
        "WALL_POOL_INSTALLER", "Installateur de bassins muraux",
        "AQUARIUM_TECHNICIAN", "Technicien en aquariophilie et bassins vivants",
        "MASON_POOL_STRUCTURES", "Maçon spécialisé en structures de bassins"
    );
    
    public static String convertSpecialty(String specialty) {
        if (specialty == null) {
            return "Non spécifiée";
        }
        return SPECIALTY_MAPPING.getOrDefault(specialty, specialty);
    }
}