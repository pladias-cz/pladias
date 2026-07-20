package models;

import io.ebean.Finder;
import io.ebean.Model;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;


@Entity
@Table(name = TaxonRank.QualifiedName)
@SuppressWarnings("serial")
public class TaxonRank extends Model {

    public static final int FormulaAggregateDifferentGenera = 1;
    public static final int FormulaAggregateSameGenus = 2;
    public static final int FormulaSpeciesDifferentGenera = 3;
    public static final int FormulaSpeciesSameGenus = 4;
    public static final int FormulaSubspeciesDifferentSpecies = 5;
    public static final int FormulaSubspeciesSameSpeciesId = 6;
    public static final int FormulaVarietyDifferentSpeciesId = 7;
    public static final int FormulaVarietySameSpeciesId = 8;
    public static final int FormulaFormDifferentSpeciesId = 9;
    public static final int FormulaFormSameSpeciesId = 10;
    public static final int FormulaInfraspecificInformalDifferentSpeciesId = 11;
    public static final int FormulaInfraspecificInformalSameSpeciesId = 12;
    public static final int FormulaCultivarDifferentSpeciesId = 13;
    public static final int FormulaCultivarSameSpeciesId = 14;

    public static final int RegnumId = 15;
    public static final int SubregnumId = 16;
    public static final int DivisionId = 17;
    public static final int SubdivisionId = 18;
    public static final int ClassId = 19;
    public static final int SubclassId = 20;
    public static final int SuperorderId = 21;
    public static final int OrderId = 22;
    public static final int SuborderId = 23;
    public static final int FamilyId = 24;
    public static final int SubfamilyId = 25;
    public static final int TribeId = 26;
    public static final int SubtribeId = 27;
    public static final int GenusId = 28;
    public static final int SubgenusId = 29;
    public static final int SectionId = 30;
    public static final int SubsectionId = 31;
    public static final int SeriesId = 32;
    public static final int SubseriesId = 33;
    public static final int SpeciesId = 34;
    public static final int SubspeciesId = 35;
    public static final int VarietyId = 36;
    public static final int SubvarietyId = 37;
    public static final int FormId = 38;
    public static final int SubformId = 39;
    public static final int HybridGenusId = 40;
    public static final int HybridSubgenusId = 41;
    public static final int HybridSectionId = 42;
    public static final int HybridSubsectionId = 43;
    public static final int HybridSeriesId = 44;
    public static final int HybridSubseriesId = 45;
    public static final int NothospeciesId = 46;
    public static final int NothosubspeciesId = 47;
    public static final int NothovarietyId = 48;
    public static final int HybridSubvarietyId = 49;
    public static final int HybridFormId = 50;
    public static final int HybridSubformId = 51;
    public static final int InformalHigherRankVariousId = 52;
    public static final int AggregateId = 53;
    public static final int InformalInfragenericVariousId = 54;
    public static final int InformalInfraspecificVariousId = 55;
    public static final int GroupId = 56;
    public static final int CultivarId = 57;
    public static final int FormulaGenusId = 58;
    public static final String QualifiedName = "public.taxon_ranks";
    @Id
    private int id;
    @Column(name = "name_eng")
    private String nameEng;
    @Column(name = "name_cz")
    private String nameCz;

    public static Finder<Integer, TaxonRank> find() {
        return new Finder<>(TaxonRank.class);
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getNameEng() {
        return nameEng;
    }

    public void setNameEng(String nameEng) {
        this.nameEng = nameEng;
    }

    public String getNameCz() {
        return nameCz;
    }

    public void setNameCz(String nameCz) {
        this.nameCz = nameCz;
    }

    public void save() {
        throw new UnsupportedOperationException("Entity taxon is read-only.");
    }

    public void update() {
        throw new UnsupportedOperationException("Entity taxon is read-only.");
    }
}
