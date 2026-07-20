package service.excel;

import java.util.Enumeration;
import java.util.List;

public interface IDocument extends Enumeration<IRow>, AutoCloseable {

    @Override
    boolean hasMoreElements();

    @Override
    IRow nextElement();

    List<String> getHeaders();

    @Override
    void close();
}
