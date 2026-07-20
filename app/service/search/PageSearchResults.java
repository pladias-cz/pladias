package service.search;

import dto.atlas.RecordPladiasDto;

import java.util.List;

public class PageSearchResults {

    private final List<Row> rows;
    private final List<RecordPladiasDto> records;
    private final Integer totalCount;

    public PageSearchResults() {
        this(List.of(), List.of(), null);
    }

    public PageSearchResults(List<Row> rows) {
        this(rows, List.of(), null);
    }

    public PageSearchResults(List<Row> rows, Integer totalCount) {
        this(rows, List.of(), totalCount);
    }

    public PageSearchResults(List<Row> rows, List<RecordPladiasDto> records, Integer totalCount) {
        this.rows = List.copyOf(rows);
        this.records = List.copyOf(records);
        this.totalCount = totalCount;
    }

    public List<Row> getRows() {
        return rows;
    }

    public List<RecordPladiasDto> getRecords() {
        return records;
    }

    public Integer getTotalCount() {
        return totalCount;
    }

    public static class Row {
        private final long recordId;
        private final String taxonName;
        private final String taxonNameOriginal;
        private final String locality;
        private final String nearestTownName;
        private final String altitude;
        private final String districtName;
        private final double latitude;
        private final double longitude;
        private final String gpsCoordsSource;
        private final Integer gpsCoordsPrecision;
        private final String datum;
        private final String authors;
        private final String source;
        private final String herbaria;
        private final String quadrant;
        private final String phytochorion;
        private final String comment;
        private final String validationStatus;
        private final String originality;
        private final String project;
        private final String externalId;
        private final String license;
        private final String committer;

        public Row(
            long recordId,
            String taxonName,
            String taxonNameOriginal,
            String locality,
            String nearestTownName,
            String altitude,
            String districtName,
            double latitude,
            double longitude,
            String gpsCoordsSource,
            Integer gpsCoordsPrecision,
            String datum,
            String authors,
            String source,
            String herbaria,
            String quadrant,
            String phytochorion,
            String comment,
            String validationStatus,
            String originality,
            String project,
            String externalId,
            String license,
            String committer
        ) {
            this.recordId = recordId;
            this.taxonName = taxonName;
            this.taxonNameOriginal = taxonNameOriginal;
            this.locality = locality;
            this.nearestTownName = nearestTownName;
            this.altitude = altitude;
            this.districtName = districtName;
            this.latitude = latitude;
            this.longitude = longitude;
            this.gpsCoordsSource = gpsCoordsSource;
            this.gpsCoordsPrecision = gpsCoordsPrecision;
            this.datum = datum;
            this.authors = authors;
            this.source = source;
            this.herbaria = herbaria;
            this.quadrant = quadrant;
            this.phytochorion = phytochorion;
            this.comment = comment;
            this.validationStatus = validationStatus;
            this.originality = originality;
            this.project = project;
            this.externalId = externalId;
            this.license = license;
            this.committer = committer;
        }

        public long getRecordId() {
            return recordId;
        }

        public String getTaxonName() {
            return taxonName;
        }

        public String getTaxonNameOriginal() {
            return taxonNameOriginal;
        }

        public String getLocality() {
            return locality;
        }

        public String getNearestTownName() {
            return nearestTownName;
        }

        public String getAltitude() {
            return altitude;
        }

        public String getDistrictName() {
            return districtName;
        }

        public double getLatitude() {
            return latitude;
        }

        public double getLongitude() {
            return longitude;
        }

        public String getGpsCoordsSource() {
            return gpsCoordsSource;
        }

        public Integer getGpsCoordsPrecision() {
            return gpsCoordsPrecision;
        }

        public String getDatum() {
            return datum;
        }

        public String getAuthors() {
            return authors;
        }

        public String getSource() {
            return source;
        }

        public String getHerbaria() {
            return herbaria;
        }

        public String getQuadrant() {
            return quadrant;
        }

        public String getPhytochorion() {
            return phytochorion;
        }

        public String getComment() {
            return comment;
        }

        public String getValidationStatus() {
            return validationStatus;
        }

        public String getOriginality() {
            return originality;
        }

        public String getProject() {
            return project;
        }

        public String getExternalId() {
            return externalId;
        }

        public String getLicense() {
            return license;
        }

        public String getCommitter() {
            return committer;
        }
    }
}
