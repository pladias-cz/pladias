package tasks;

import service.csv.CsvDocument;

import java.io.IOException;

public interface IDocProcessor<T> {

    T execute(CsvDocument doc) throws IOException;

}
