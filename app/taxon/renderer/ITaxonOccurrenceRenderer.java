package taxon.renderer;

import org.apache.commons.lang3.tuple.Pair;

import java.util.List;

public interface ITaxonOccurrenceRenderer {
    String Codepage = "CP1250";

    byte[] render(int squareId, List<Pair<String, String>> taxonOccurrences) throws Exception;

    boolean canRenderImage();

    void setImage(byte[] pngImageStream);
}
