package service.trait.export;

import models.traits.Trait;
import models.traitsExport.TraitDetailsEntryType;

import java.util.List;
import java.util.Set;

public class TraitExportRequest {
    public List<Integer> taxonIdList;
    public List<Integer> rankIds;
    public Set<TraitDetailsEntryType> entryTypes;
    public List<Trait> traitList;
}
