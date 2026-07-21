import React, {useCallback} from "react";
import {Link, NavLink, useLocation} from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'react-bootstrap-typeahead/css/Typeahead.css';
import {useTranslation} from "react-i18next";
import {useInstanceConfig} from "@/context/InstanceConfigContext";
import {useUser} from "@/context/UserContext.tsx";
import {useProjectName} from "@/context/ProjectNameContext";
import {Container, Form, FormControl, Nav, Navbar, NavDropdown} from "react-bootstrap";
import {Autocomplete} from "@/components/autocomplete/Autocomplete";
import {createTaxaImportableProvider} from "@/components/autocomplete/TaxaImportableProvider";
import {useNavigate} from "react-router-dom";
import type {TaxonId} from "@/models/TaxonId";

interface ActiveDropdownProps {
    title: string;
    prefixes: string | string[];
    children: React.ReactNode;
    align?: "start" | "end";
}

function useActivePrefix(prefix: string | string[]): boolean {
    const location = useLocation();
    const prefixes = Array.isArray(prefix) ? prefix : [prefix];
    return prefixes.some(p => location.pathname === p || location.pathname.startsWith(p + "/"));
}

function ActiveDropdown({title, prefixes, children, align = "start"}: ActiveDropdownProps) {
    const isActive = useActivePrefix(prefixes);
    return (
        <NavDropdown title={title} active={isActive} align={align}>
            {children}
        </NavDropdown>
    );
}

interface MainMenuProps {
    // No props currently needed
}

const MainMenu = React.forwardRef<HTMLDivElement, MainMenuProps>(function MainMenu(_props, ref) {
    const {t} = useTranslation();
    const navigate = useNavigate();

    const {hasAtlasModule, hasBiblioModule, hasMeasurementsModule} = useInstanceConfig();
    const {isMapAdmin, isTraitAdmin, isSysAdmin, isTaxonAdmin, isAsyncImporter, userEmail} = useUser();
    const {projectName} = useProjectName();

    const handleTaxonSelect = (taxon: TaxonId | null) => {
        if (taxon) {
            navigate(`/atlas/mapMain/${taxon.id}`);
        }
    };

    const handleRecordSubmit = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            const inputValue = event.currentTarget.value;
            const recordId = parseInt(inputValue, 10);
            if (!isNaN(recordId)) {
                navigate(`/atlas/record/${recordId}`);
                event.currentTarget.value = '';
            }
        }
    }, [navigate]);

    return (
        <Navbar bg="dark" variant="dark" expand="md" fixed="top" ref={ref}>
            <Container fluid>
                <Navbar.Brand as={Link} to="/">{projectName}</Navbar.Brand>
                <Navbar.Toggle aria-controls="main-navbar"/>
                <Navbar.Collapse id="main-navbar">
                    <Nav className="me-auto">
                        {hasAtlasModule && (
                            <>
                                <ActiveDropdown title={t("menu.atlas.dropdown")} prefixes={["/atlas"]}>
                                    <NavDropdown.Item as={NavLink}
                                                      to="/atlas/newComments">{t("menu.atlas.newComments")}</NavDropdown.Item>
                                    <NavDropdown.Item as={NavLink}
                                                      to="/atlas/search">{t("menu.atlas.search")}</NavDropdown.Item>
                                    <NavDropdown.Divider/>
                                    <NavDropdown.Item as={NavLink}
                                                      to="/atlas/listOfControls">{t("menu.atlas.listOfControls")}</NavDropdown.Item>
                                    <NavDropdown.Item as={NavLink}
                                                      to="/atlas/listOfImports">{t("menu.atlas.listOfImports")}</NavDropdown.Item>
                                    <NavDropdown.Item as={NavLink}
                                                      to="/atlas/listOfTaxa">{t("menu.atlas.listOfTaxa")}</NavDropdown.Item>
                                    <NavDropdown.Item as={NavLink}
                                                      to="/atlas/import">{t("menu.atlas.import")}</NavDropdown.Item>
                                    {(isAsyncImporter || isMapAdmin) && (
                                        <NavDropdown.Item as={NavLink}
                                                          to="/atlas/importCSV">{t("menu.atlas.importCSV")}</NavDropdown.Item>
                                    )}
                                </ActiveDropdown>
                                {isMapAdmin && (
                                    <ActiveDropdown title={t("menu.atlasAdmin.dropdown")} prefixes={["/atlasAdmin"]}>
                                        <NavDropdown.Item as={NavLink}
                                                          to="/atlasAdmin/listOfImports">{t("menu.atlasAdmin.listOfImports")}</NavDropdown.Item>
                                        <NavDropdown.Divider/>
                                        <NavDropdown.Item as={NavLink}
                                                          to="/atlasAdmin/listOfUsers">{t("menu.atlasAdmin.listOfUsers")}</NavDropdown.Item>
                                        <NavDropdown.Item as={NavLink}
                                                          to="/atlasAdmin/listOfTaxa">{t("menu.atlasAdmin.listOfTaxa")}</NavDropdown.Item>
                                    </ActiveDropdown>
                                )}
                            </>
                        )}
                        {hasBiblioModule && (
                            <Nav.Link as={NavLink} to="/biblio/search">{t("menu.biblio.dropdown")}</Nav.Link>
                        )}
                        {hasMeasurementsModule && (
                            <ActiveDropdown title={t("menu.trait.dropdown")} prefixes={["/measurements"]}>
                                <NavDropdown.Item as={NavLink}
                                                  to="/measurements/general">{t("menu.trait.general")}</NavDropdown.Item>
                                <NavDropdown.Item as={NavLink}
                                                  to="/measurements/datatypes">{t("menu.trait.datatypes")}</NavDropdown.Item>
                                <NavDropdown.Item as={NavLink}
                                                  to="/measurements/aggregationTypes">{t("menu.trait.aggregationTypes")}</NavDropdown.Item>
                                <NavDropdown.Divider/>
                                <NavDropdown.Item as={NavLink}
                                                  to="/measurements/data">{t("menu.trait.data")}</NavDropdown.Item>
                                <NavDropdown.Item as={NavLink}
                                                  to="/measurements/export">{t("menu.trait.export")}</NavDropdown.Item>
                                <NavDropdown.Item as={NavLink}
                                                  to="/measurements/backup">{t("menu.trait.backup")}</NavDropdown.Item>
                            </ActiveDropdown>
                        )}
                        <Nav.Link as={NavLink} to="/downloads">{t("menu.downloads.dropdown")}</Nav.Link>
                    </Nav>
                    {hasAtlasModule && (
                        <>
                            <Form className="me-auto">
                                <Autocomplete<TaxonId> provider={createTaxaImportableProvider(t("menu.forms.taxonPlaceholder"))} cacheKey={0} onSelect={handleTaxonSelect} />
                            </Form>
                            <Form className="me-auto">
                                <FormControl
                                    type="text"
                                    placeholder={t("menu.forms.recordPlaceholder")}
                                    className="me-2"
                                    onKeyDown={handleRecordSubmit}
                                />
                            </Form>
                        </>
                    )}
                </Navbar.Collapse>
                <Nav>
                    <ActiveDropdown title={userEmail} prefixes={["/user"]} align="end">
                        <NavDropdown.Item as="a" href="/logout">{t("menu.user.logout")}</NavDropdown.Item>
                        <NavDropdown.Item as={NavLink}
                                          to="/user/changePassword">{t("menu.user.changePassword")}</NavDropdown.Item>
                        <NavDropdown.Item as={NavLink}
                                          to="/user/changeEmail">{t("menu.user.changeEmail")}</NavDropdown.Item>
                        <NavDropdown.Item as={NavLink} to="/user/settings">{t("menu.user.settings")}</NavDropdown.Item>
                        {isTaxonAdmin && (
                            <>
                                <NavDropdown.Divider/>
                                <NavDropdown.Item as={NavLink}
                                                  to="/user/taxaAdministration">{t("menu.user.taxaAdministration")}</NavDropdown.Item>
                            </>
                        )}
                        {isSysAdmin && (
                            <>
                                <NavDropdown.Divider/>
                                <NavDropdown.Item as={NavLink}
                                                  to="/user/usersAdministration">{t("menu.user.usersAdministration")}</NavDropdown.Item>
                            </>
                        )}
                        {(isMapAdmin || isTraitAdmin) && (
                            <NavDropdown.Item as={NavLink}
                                              to="/user/addUser">{t("menu.user.addUser")}</NavDropdown.Item>
                        )}
                        <NavDropdown.Divider/>
                        <NavDropdown.Item
                            href="https://pladias-cz.github.io/documentation/">{t("menu.user.docs")}</NavDropdown.Item>
                    </ActiveDropdown>
                </Nav>

            </Container>
        </Navbar>
    );
});

export default MainMenu;
