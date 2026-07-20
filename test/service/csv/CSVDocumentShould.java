package service.csv;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;

import org.apache.commons.lang3.StringUtils;
import org.approvaltests.Approvals;
import org.junit.Assert;
import org.junit.Test;

import com.google.common.collect.Lists;

import service.excel.IDocument;
import service.excel.IRow;

public class CSVDocumentShould {

    private static final String SEPARATOR = ";";

    @Test
    public void stopOnFirstEmptyLine()
    {
        List<IRow> rows = new ArrayList<IRow>();
        try (InputStream is = getClass().getResourceAsStream("listera_empty_2nd_line.csv")){
            try (InputStreamReader reader = new InputStreamReader(is)) {
                try (IDocument document = new CsvDocument(reader)) {
                    while (document.hasMoreElements()) {
                        IRow row = document.nextElement();
                        rows.add(row);
                    }
                }
            }
            // use resource here
        } catch (IOException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }

        Assert.assertEquals(1, rows.size());
        Iterator<String> values = rows.get(0).getValues();
        Approvals.verifyAll("row", Lists.newArrayList(values));
    }

    @Test
    public void parseAllNonEmptyEntries()
    {
        List<IRow> rows = new ArrayList<IRow>();
        try (InputStream is = getClass().getResourceAsStream("listera_non_empty_3_lines.csv")){
            try (InputStreamReader reader = new InputStreamReader(is)) {
                try (IDocument document = new CsvDocument(reader)) {
                    while (document.hasMoreElements()) {
                        IRow row = document.nextElement();
                        rows.add(row);
                    }
                }
            }
            // use resource here
        } catch (IOException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }

        Assert.assertEquals(3, rows.size());
        List<String> serializedRows =new ArrayList<String>();
        for (IRow row : rows)
        {
            String serialized = StringUtils.join(row.getValues(), SEPARATOR);
            serializedRows.add(serialized);

        }
        Approvals.verifyAll("row", serializedRows);
    }

    @Test
    public void returnHeaderList()
    {
        List<String> expected = Arrays.asList("﻿Standardní jméno", "jméno orig.", "lokalita", "nejbližší obec", "okres",
                                              "nadmořská výška", "zeměp. souřadnice", "zdroj souřadnic",
                                              "přesnost souřadnic", "datum", "nálezce", "literarní zdroj", "herbář",
                                              "fytochorion", "kvadrant", "poznámka", "herbářové ID", "licence",
                                              "mapy.cz", "chyba", "info", "warning");

        try (InputStream is = getClass().getResourceAsStream("listera_empty_2nd_line.csv")){
            try (InputStreamReader reader = new InputStreamReader(is)) {
                try (CsvDocument document = new CsvDocument(reader)) {
                    List<String> headers = document.getHeaders();

                    Assert.assertEquals(expected, headers);
                    return;
                }
            }
            // use resource here
        } catch (IOException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }

        Assert.assertTrue("This line should not have been executed", false);
    }

    @Test
    public void serialize_records()
    {
        List<String> expected = Arrays.asList("Listera cordata", "Epipactis cordata",
                "Wächst auf dem Haindorfer Gebirge auf schattigen feuchten Örtern.", "Hejnice",
                "Liberec", "", "50°51'28.623\"N, 15°12'39.842\"E",
                "odečteny z mapy při excerpci nebo pozdějším zpracování dat",
                "2000", "s. d.", "s. coll.", "", "herbPR", "92a", "5157a", "" , "" , "",
                "mapy.cz", "Záznam již v databázi existuje pod ID \"14454561\".", "", "");

        try (InputStream is = getClass().getResourceAsStream("listera_empty_2nd_line.csv")){
            try (InputStreamReader reader = new InputStreamReader(is)) {
                try (CsvDocument document = new CsvDocument(reader)) {

                    IRow row = document.nextElement();
                    Iterator<String> iter = row.getValues();
                    List<String> resultList = new ArrayList<String>();
                    iter.forEachRemaining(resultList::add);

                    Assert.assertEquals(expected, resultList);
                    return;
                }
            }
            // use resource here
        } catch (IOException e) {
            Assert.assertTrue("This line should not have been executed", false);
        }

    }
}
