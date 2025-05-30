package com.example.installations_microservice.entities;

import java.io.Serializable;
import java.util.Objects;

import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AffectationInstallateurId implements Serializable {
    private Long affectationId;
    private Long installateurId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AffectationInstallateurId that = (AffectationInstallateurId) o;
        return Objects.equals(affectationId, that.affectationId) &&
               Objects.equals(installateurId, that.installateurId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(affectationId, installateurId);
    }
}