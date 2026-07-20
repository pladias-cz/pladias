import {Row} from "react-bootstrap";
import {usePageTitle} from "@/hooks/usePageTitle";

export default function General() {
    usePageTitle("General");
    return (
        <Row>
            <blockquote className="blockquote">

                <p><b>Biologické a ekologické vlastnosti české flóry</b></p>
                <p>
                    Databáze obsahuje biologické a ekologické vlastnosti druhů a dalších taxonů cévnatých rostlin české
                    flóry. Část z těchto vlastností je dostupná i na veřejné webové stránce <a
                    href="https://pladias.cz">pladias.cz</a>, část je dostupná pouze v této aplikaci. Aplikace umožňuje
                    validaci, import a export dat o vlastnostech taxonů. Při exportu lze různé vlastnosti spojovat do
                    jedné tabulky a přenášet hodnoty vlastností mezi jednotlivými úrovněmi taxonomické hierarchie. Tyto
                    operace mohou provádět osoby s oprávněním „traitadmin“ získané na základě souhlasu Řídící rady
                    databáze Pladias. Všichni držitelé tohoto oprávnění jsou povinni se řídit „Pravidly správy a použití
                    databáze Pladias“ uveřejněnými na <a
                    href="https://pladias.ibot.cas.cz/download/features">https://pladias.ibot.cas.cz/download/features</a> a
                    data používat výhradně pro účel, který uvedli v žádosti o oprávnění přístupu do databáze. V případě
                    použití dat o vlastnostech druhů v publikaci je autor publikace povinen předem informovat vlastníka
                    a administrátora dat a získat jejich souhlas s použitím těchto dat.
                </p>
            </blockquote>
            <p className="text-right">Milan Chytrý a Petr Pyšek</p>
        </Row>
    );
}