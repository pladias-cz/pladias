package service.excel.impl;

import excel.ExcelErrorInfo;
import excel.UpdateEntryInfo;
import geom.Coordinates;
import models.*;
import models.Record;
import org.apache.commons.lang3.StringUtils;
import platform.ProjectConstants;
import platform.Srid;
import play.i18n.Messages;
import repositories.ISquareRepository;
import service.config.IConfigService;
import service.excel.ErrorType;
import service.excel.IExcelTableColumns;
import service.excel.IRecordColumnMapper;
import service.excel.ParsedRecordDetails;
import service.phytochorion.PhytochorionService;
import service.taxon.TaxonSearchService;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class VascularExcelTableValidationService extends AbstractExcelTableValidationService {
    private final ISquareRepository squareRepository;
    private final Set<Long> importableTaxonIds;

    public VascularExcelTableValidationService(
        ISquareRepository repository,
        IRecordColumnMapper colMapper,
        PhytochorionService phytochorionService,
        Project project,
        Messages messages, IConfigService configService) {
        super(colMapper, phytochorionService, project, messages, configService);
        this.squareRepository = repository;
        this.importableTaxonIds = populateImportableTaxonsIds();
    }

    private Set<Long> populateImportableTaxonsIds() {
        List<Taxon> taxons = TaxonSearchService.getImportableTaxons("");
        Set<Long> taxonIds = new HashSet<>();
        for (Taxon t : taxons) {
            taxonIds.add(t.getId());
        }
        return taxonIds;
    }

    @Override
    protected void validateCustom(ParsedRecordDetails wrapper) {
        validateTaxon(wrapper);
        validatePhytochorion(wrapper);
        validateQuadrants(wrapper);
        validateDistrict(wrapper);
        validateNearestTown(wrapper);

        ErrorType errorType = (project != null && project.getId() == Project.AtlasExcerptionProjectId)
            ? ErrorType.ERROR
            : ErrorType.WARNING;

        validateHerbariumHasAuthor(wrapper, errorType);
    }

    private void validateTaxon(ParsedRecordDetails wrapper) {
        Record record = wrapper.getRecord();
        long taxonId = record.getTaxon() != null
            ? record.getTaxon().getId()
            : -1;
        if (!importableTaxonIds.contains(taxonId)) {
            wrapper.addError(
                new ExcelErrorInfo(
                    wrapper.getRowNumber(),
                    colMapper.getColumn(IExcelTableColumns.TAXON_COLUMN_ID),
                    messages.at("ExcelTableValidationService.taxonNotImportable")));
        }
    }

    private void validatePhytochorion(ParsedRecordDetails wrapper) {
        Record record = wrapper.getRecord();
        //the GPS coords have been given
        if (record.hasCoords()) {
            if (record.getPhytochorion() != null) {
                Phytochorion phyto = record.getPhytochorion();
                int precision = (record.getGpsCoordsPrecision() != null) ?
                    record.getGpsCoordsPrecision() :
                    0;

                boolean liesWithinBuffer = coordsWithinBufferedPolygon(phyto, record, precision);
                boolean liesWithinPolygon = liesWithinBuffer && coordsWithinPolygon(phyto, record, precision);

                if (liesWithinPolygon) {
                } else if (liesWithinBuffer) {
                    Phytochorion phytoForLocation = phytochorionService.findByPoint(record.getCoords());

                    String targetPhytoName = phytoForLocation != null ? phytoForLocation.getDetailedName() : "";

                    wrapper.addInfo(
                        new ExcelErrorInfo(wrapper.getRowNumber(),
                            colMapper.getColumn(IExcelTableColumns.PHYTOCHORION_COLUMN_ID),
                            messages.at("ExcelTableValidationService.phytochorionLocationInAcceptableBuffer",
                                Integer.toString(Phytochorion.BufferSizeMeters),
                                targetPhytoName
                            )));
                } else {
                    Phytochorion correctPhyto = phytochorionService.findByPoint(record.getCoords());
                    String targetPhytoName = correctPhyto != null ? correctPhyto.getDetailedName() : "";

                    wrapper.addError(new ExcelErrorInfo(wrapper.getRowNumber(),
                        colMapper.getColumn(IExcelTableColumns.PHYTOCHORION_COLUMN_ID),
                        messages.at("ExcelTableValidationService.correctPhytochorionBasedOnLocationIs",
                            targetPhytoName
                        )));
                }
            } else {
                //compute the phytochorion
                Phytochorion phyto = phytochorionService.findByPoint(record.getCoords());
                if (phyto == null) {
                    wrapper.addError(new ExcelErrorInfo(wrapper.getRowNumber(),
                        colMapper.getColumn(IExcelTableColumns.PHYTOCHORION_COLUMN_ID),
                        messages.at("ExcelTableValidationService.noMatchingPhytochorionFoundForGpsCoords")));
                    return;
                }
                record.setPhytochorion(phyto);
                record.setPhytochorionComputed(true);
                //and populate the excel sheet as well:
                wrapper.addUpdate(new UpdateEntryInfo(wrapper.getRowNumber(),
                    colMapper.getColumn(IExcelTableColumns.PHYTOCHORION_COLUMN_ID), phyto.getPhytoId()));

                wrapper.addInfo(new ExcelErrorInfo(wrapper.getRecordRow().getRowNumber(),
                    colMapper.getColumn(IExcelTableColumns.PHYTOCHORION_COLUMN_ID),
                    messages.at("ExcelTableValidationService.phytochorionComputedFromGpsCoords",
                        phyto.getPhytoId())));
            }
        } else if (record.getPhytochorion() == null) {
            wrapper.addError(new ExcelErrorInfo(wrapper.getRowNumber(),
                colMapper.getColumn(IExcelTableColumns.PHYTOCHORION_COLUMN_ID),
                messages.at("ExcelTableValidationService.phytochorionMustBePresentInAbsenceOfGpsCoords")));
        }
    }

    private void validateQuadrants(ParsedRecordDetails wrapper) {
        Record record = wrapper.getRecord();
        //the GPS coords have been given
        if (record.hasCoords()) {
            if (!record.getQuadrantsLegacy().isEmpty() || !record.getSquaresLegacy().isEmpty()) {
                boolean matchFound = false; // gps coords lie inside the quadrant
                boolean bufferedMatchFound = false;  //gps coords lie within the quadrant + fixed-size-buffer area
                boolean precisionBufferMatch = false; //gps coords lie within the quadrant + fixed-size-buffer + coordinates precision area
                for (QuadrantNew q : record.getQuadrantsLegacy()) {
                    matchFound |= quadrantContainsGpsCoords(q, record);
                    if (matchFound) {
                        bufferedMatchFound = true;
                        precisionBufferMatch = true;
                        break;
                    } else {
                        bufferedMatchFound |= quadrantBufferMatchesWithGpsCoords(q, record, false);
                        precisionBufferMatch |= quadrantBufferMatchesWithGpsCoords(q, record, true);
                    }
                }

                for (MapSquareNew s : record.getSquaresLegacy()) {
                    QuadrantNew[] quadrants = squareRepository.getSquareQuadrants(s);
                    for (QuadrantNew q : quadrants) {
                        matchFound |= quadrantContainsGpsCoords(q, record);
                        if (matchFound) {
                            bufferedMatchFound = true;
                            precisionBufferMatch = true;
                            break;
                        } else {
                            bufferedMatchFound |= quadrantBufferMatchesWithGpsCoords(q, record, false);
                            precisionBufferMatch |= quadrantBufferMatchesWithGpsCoords(q, record, true);
                        }
                    }
                }

                if (!precisionBufferMatch) {
                    QuadrantNew q = QuadrantNew.findByPoint(record.getCoords());
                    wrapper.addError(new ExcelErrorInfo(wrapper.getRecordRow().getRowNumber(),
                        colMapper.getColumn(IExcelTableColumns.SQUARE_COLUMN_ID),
                        messages.at("ExcelTableValidationService.mapSquareDoesNotMatchWithGpsCoords", q != null ? q.getCode() : "")));
                } else if (!matchFound && bufferedMatchFound) {
                    //warning
                    wrapper.addWarning(new ExcelErrorInfo(wrapper.getRecordRow().getRowNumber(),
                        colMapper.getColumn(IExcelTableColumns.SQUARE_COLUMN_ID),
                        messages.at("ExcelTableValidationService.mapSquareDoesNotMatchGpsCoordsBuffer")));
                }
            } else {
                //compute the quadrant from GPS coords
                QuadrantNew q = QuadrantNew.findByPoint(record.getCoords());
                if (q == null) {
                    wrapper.addError(new ExcelErrorInfo(wrapper.getRowNumber(),
                        colMapper.getColumn(IExcelTableColumns.SQUARE_COLUMN_ID),
                        messages.at("ExcelTableValidationService.noMatchingQuadrantFoundForGpsCoords")));
                    return;
                }
                List<QuadrantNew> list = new ArrayList<>();
                list.add(q);
                record.setQuadrantsLegacy(list);
                record.setQuadrantLegacyComputed(true);
                //and populate the excel sheet as well:
                String completeQuadrantId = q.getCode();
                wrapper.addUpdate(new UpdateEntryInfo(wrapper.getRowNumber(), colMapper.getColumn(IExcelTableColumns.SQUARE_COLUMN_ID), completeQuadrantId));

                wrapper.addInfo(new ExcelErrorInfo(wrapper.getRowNumber(),
                    colMapper.getColumn(IExcelTableColumns.SQUARE_COLUMN_ID),
                    messages.at("ExcelTableValidationService.quadrantComputedFromGpsCoords",
                        completeQuadrantId)));
            }
        } else if (record.getQuadrantsLegacy().isEmpty() && record.getSquaresLegacy().isEmpty()) {
            wrapper.addError(new ExcelErrorInfo(wrapper.getRowNumber(),
                colMapper.getColumn(IExcelTableColumns.SQUARE_COLUMN_ID),
                messages.at("ExcelTableValidationService.mapSquareMustBePresentInAbsenceOfGpsCoords")));
        }
    }

    private void validateNearestTown(ParsedRecordDetails wrapper) {

        Record record = wrapper.getRecord();
        String nearestTownName = wrapper.getRecordRow().get(
            colMapper.getColumn(IExcelTableColumns.NEAREST_TOWN_COLUMN_ID));

        Coordinates coords = record.getCoords();
        if (StringUtils.isBlank(nearestTownName) && !record.hasCoords()) {
            String errorMessage = messages.at("ExcelTableValidationService.nearestTownNameRequiredWhenMissingCoords");
            wrapper.addError(new ExcelErrorInfo(wrapper.getRowNumber(),
                colMapper.getColumn(IExcelTableColumns.NEAREST_TOWN_COLUMN_ID), errorMessage));
            return;
        }


        if (record.getDistrict() == null || !record.hasCoords()) {
            String errorMessage = messages.at("ExcelTableValidationService.unableToValidateNearestTown");
            wrapper.addError(new ExcelErrorInfo(wrapper.getRowNumber(),
                colMapper.getColumn(IExcelTableColumns.NEAREST_TOWN_COLUMN_ID), errorMessage));
            return;
        }

        if (StringUtils.isEmpty(nearestTownName)) {
            //nearest town empty -> warn that it has been automatically generated
            List<District> hierarchy = District.findTownHierarchyByPoint(coords);
            if (!hierarchy.isEmpty()) {
                District targetTown = hierarchy.getFirst();
                String errorMessage = messages.at("ExcelTableValidationService.nearestTownComputedFromGpsCoords", targetTown);
                wrapper.addInfo(new ExcelErrorInfo(wrapper.getRowNumber(),
                    colMapper.getColumn(IExcelTableColumns.NEAREST_TOWN_COLUMN_ID), errorMessage));
                //and populate excel:
                wrapper.addUpdate(new UpdateEntryInfo(wrapper.getRowNumber(),
                    colMapper.getColumn(IExcelTableColumns.NEAREST_TOWN_COLUMN_ID), targetTown.getName()));
            }
            return;
        }

        District nearestTown = findNearestTownByDistrictAndName(record.getDistrict(), nearestTownName, wrapper);
        if (nearestTown != null) {
            //formerly nearestTownName "Praha-Zizkov" -> "Zizkov"
            //(the code below would choke on compound town name)
            nearestTownName = nearestTown.getName();
            return;
        }


        //validate that nearest town lies in proximity of GPS coords
        List<District> candidates = District.findNearestTownsByBufferedPoint(coords, _configService.getInteger(ProjectConstants.DistrictBufferMetersKey),
            _configService.getInteger(Srid.CONFIG_UTM_SRID_KEY));
        for (District candidate : candidates) {
            if (nearestTownName.equalsIgnoreCase(candidate.getName())) {
                return;
            }
        }

        //nearest town not found in the proximity
        List<District> hierarchy = District.findTownHierarchyByPoint(coords);
        District computedDistrict = District.findDistrictByPoint(coords);
        if (!hierarchy.isEmpty()) {
            String errorMessage;
            switch (hierarchy.size()) {
                case 3:
                    errorMessage = messages.at("ExcelTableValidationService.incorrectNearestTown",
                        hierarchy.get(0), hierarchy.get(1), hierarchy.get(2), computedDistrict);
                    break;
                case 2:
                    errorMessage = messages.at("ExcelTableValidationService.incorrectNearestTownWithoutBasicMunicipalUnit",
                        hierarchy.get(0), hierarchy.get(1), computedDistrict);
                    break;
                default:
                    return;
            }
            wrapper.addWarning(new ExcelErrorInfo(wrapper.getRowNumber(),
                colMapper.getColumn(IExcelTableColumns.NEAREST_TOWN_COLUMN_ID),
                errorMessage));
        }
    }

    private District findNearestTownByDistrictAndName(District district, String nearestTownName, ParsedRecordDetails wrapper) {
        District nearestTown = null;
        List<District> candidates = District.find().query().where().gt("lft", district.getLeft()).
            lt("rgt", district.getRight()).
            ieq("name", nearestTownName).orderBy().desc("depth").findList();

        if (!candidates.isEmpty()) {
            nearestTown = candidates.getFirst();

        } else if (nearestTownName.contains("-")) {
            String[] components = nearestTownName.split("-");
            if (components.length != 2) {
                wrapper.addError(new ExcelErrorInfo(wrapper.getRowNumber(),
                    colMapper.getColumn(IExcelTableColumns.NEAREST_TOWN_COLUMN_ID),
                    messages.at("ExcelTableValidationService.invalidNearestCompoundTown")));
                return null;
            }
            nearestTown = District.findTownByHierarchyNames(district, components[0], components[1]);
        }
        return nearestTown;
    }

    private void validateDistrict(ParsedRecordDetails wrapper) {
        Record record = wrapper.getRecord();
        String districtName = wrapper.getRecordRow().get(
            colMapper.getColumn(IExcelTableColumns.DISTRICT_COLUMN_ID));

        if (record.hasCoords()) {
            District specifiedDistrict = record.getDistrict();
            Coordinates coords = record.getCoords();
            List<District> computedDistrictCandidates = District.findDistrictCandidatesByBuffer(coords, District.DefaultBufferMeters,
                _configService.getInteger(Srid.CONFIG_UTM_SRID_KEY));
            if (computedDistrictCandidates.isEmpty()) {
                computedDistrictCandidates = District.findDistrictCandidatesByBuffer(coords, District.DefaultOutsideCzechiaBufferMeters,
                    _configService.getInteger(Srid.CONFIG_UTM_SRID_KEY));
            }
            District exactlyComputedDistrict = District.findDistrictByPoint(coords);

            if (computedDistrictCandidates.isEmpty()) {
                String errorMessage = messages.at("ExcelTableValidationService.gpsCoordsOutOfBounds");
                wrapper.addError(new ExcelErrorInfo(wrapper.getRowNumber(),
                    colMapper.getColumn(IExcelTableColumns.GPS_COORDS_COLUMN_ID), errorMessage));
            } else if (specifiedDistrict == null) {
                //populate the excel sheet

                //since candidateDistricts use small buffer, it can happen that the GPS location lies outside of Czech Republic and still
                //the candidate list is not empty. Thus we must be careful so that we do not get NullPointerException
                District computedDistrict = exactlyComputedDistrict != null ? exactlyComputedDistrict : computedDistrictCandidates.getFirst();
                wrapper.addUpdate(new UpdateEntryInfo(wrapper.getRowNumber(),
                    colMapper.getColumn(IExcelTableColumns.DISTRICT_COLUMN_ID), computedDistrict.getName()));

                wrapper.addInfo(new ExcelErrorInfo(wrapper.getRowNumber(),
                    colMapper.getColumn(IExcelTableColumns.DISTRICT_COLUMN_ID),
                    messages.at("ExcelTableValidationService.districtComputedFromGpsCoords",
                        computedDistrict.getName())));
                record.setDistrict(computedDistrict);
            } else {
                boolean foundInCandidates = false;
                for (District candidate : computedDistrictCandidates) {
                    if (candidate.getName().equals(record.getDistrict().getName())) {
                        foundInCandidates = true;
                        break;
                    }
                }
                if (!foundInCandidates) {
                    String computedDistrictName = exactlyComputedDistrict != null ? exactlyComputedDistrict.getName() : "";
                    String errorMessage = messages.at("ExcelTableValidationService.districtDoesNotMatchGpsCoords", computedDistrictName);
                    wrapper.addError(new ExcelErrorInfo(wrapper.getRowNumber(),
                        colMapper.getColumn(IExcelTableColumns.DISTRICT_COLUMN_ID), errorMessage));
                }
            }
        } else if ("".equals(districtName)) {
            String errorMessage = messages.at("ExcelTableValidationService.invalidDistrict");
            wrapper.addError(new ExcelErrorInfo(wrapper.getRowNumber(),
                colMapper.getColumn(IExcelTableColumns.DISTRICT_COLUMN_ID), errorMessage));
        }
    }

    private boolean quadrantBufferMatchesWithGpsCoords(QuadrantNew quadrant, Record record, boolean includePresisionBuffer) {
        int precisionBuffer = 0;
        if (includePresisionBuffer) {
            precisionBuffer =
                record.getGpsCoordsPrecision() != null
                    ? record.getGpsCoordsPrecision()
                    : 0;
        }

        return quadrant.liesWithinBuffer(
            record.getCoords(), precisionBuffer
        );
    }

    private boolean quadrantContainsGpsCoords(QuadrantNew quadrant, Record record) {
        return quadrant.contains(record.getCoords());
    }

    private boolean coordsWithinPolygon(Phytochorion phyto, Record record, int precision) {
        return phyto.coordsWithinPolygon(record.getCoords(), precision);
    }

    private boolean coordsWithinBufferedPolygon(Phytochorion phyto, Record record, int precision) {
        return phyto.coordsWithinBufferedPolygon(record.getCoords(), precision);
    }
}
