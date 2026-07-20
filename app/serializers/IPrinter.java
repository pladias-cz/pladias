package serializers;

import java.io.IOException;

public interface IPrinter {

    void printLine(Iterable<String> values) throws IOException;

}
