import {lazy, Suspense, useEffect, useState} from "react";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Layout from "./Layout.jsx";
import {InstanceConfigProvider} from "./context/InstanceConfigContext";
import {UserProvider} from "./context/UserContext.tsx";
import {ProjectNameProvider} from "./context/ProjectNameContext";
import {changeLanguage} from "./i18n/i18n";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy-loaded pages
const Home = lazy(() => import("./pages/Home"));
const UnauthorizedPage = lazy(() => import("./pages/Unauthorized"));

// Atlas
const NewComments = lazy(() => import("./pages/atlas/NewComments.jsx"));
const AtlasSearch = lazy(() => import("./pages/atlas/Search.jsx"));
const ListOfControls = lazy(() => import("./pages/atlas/ListOfControls.jsx"));
const AtlasListOfImports = lazy(() => import("./pages/atlas/ListOfImports.jsx"));
const AtlasListOfTaxa = lazy(() => import("./pages/atlas/ListOfTaxa.jsx"));
const Import = lazy(() => import("./pages/atlas/Import.jsx"));
const ImportCSV = lazy(() => import("./pages/atlas/ImportCSV.jsx"));
const MapMain = lazy(() => import("./pages/atlas/./MapMain"));
const MapPreview = lazy(() => import("./pages/atlas/./MapPreview"));
const MapDetail = lazy(() => import("./pages/atlas/MapDetail.tsx"));
const Record = lazy(() => import("./pages/atlas/Record.tsx"));

// AtlasAdmin
const AtlasAdminListOfImports = lazy(() => import("./pages/atlasAdmin/ListOfImports.jsx"));
const ListOfUsers = lazy(() => import("./pages/atlasAdmin/ListOfUsers.jsx"));
const AtlasAdminListOfTaxa = lazy(() => import("./pages/atlasAdmin/ListOfTaxa.jsx"));

// Biblio
const Bibliography = lazy(() => import("./pages/biblio/Bibliography.tsx"));

// Measurements
const General = lazy(() => import("./pages/measurements/General.tsx"));
const Datatypes = lazy(() => import("./pages/measurements/Datatypes.tsx"));
const AggregationTypes = lazy(() => import("./pages/measurements/AggregationTypes.tsx"));
const Data = lazy(() => import("./pages/measurements/Data.tsx"));
const Export = lazy(() => import("./pages/measurements/Export.tsx"));
const Backup = lazy(() => import("./pages/measurements/Backup.tsx"));
const FeatureDetail = lazy(() => import("./pages/measurements/./FeatureDetail.tsx"));

// Downloads
const DownloadsIndex = lazy(() => import("./pages/downloads/Index.tsx"));

// User
const Logout = lazy(() => import("./pages/user/Logout.jsx"));
const ChangePassword = lazy(() => import("./pages/user/ChangePassword.jsx"));
const ChangeEmail = lazy(() => import("./pages/user/ChangeEmail.jsx"));
const Settings = lazy(() => import("./pages/user/Settings.jsx"));
const UsersAdministration = lazy(() => import("./pages/user/UsersAdministration.jsx"));
const TaxaAdministration = lazy(() => import("./pages/user/TaxaAdministration.jsx"));
const AddUser = lazy(() => import("./pages/user/AddUser.jsx"));
const Docs = lazy(() => import("./pages/user/Docs.jsx"));


interface AppConfig {
    id: number;
    isVascular: boolean;
    hasAtlasModule: boolean;
    hasBiblioModule: boolean;
    hasMeasurementsModule: boolean;
    isMapAdmin: boolean;
    isBulkEditor: boolean;
    isTraitAdmin: boolean;
    isSysAdmin: boolean;
    isTaxonAdmin: boolean;
    userEmail: string;
    language: string;
    supervisedTaxonIds: number[];
}

export default function App() {
    const [config, setConfig] = useState<AppConfig | null>(null);

    useEffect(() => {
        fetch("/api/react/config")
            .then((res) => res.json())
            .then((data) => {
                setConfig(data);
                // Set the language from config
                if (data.language) {
                    changeLanguage(data.language);
                }
            })
            .catch((err) => console.error("Failed to load config", err));
    }, []);

    if (!config) return <div>Loading...</div>;

    // Separate instance config and user data
    const instanceConfig = {
        isVascular: config.isVascular,
        hasAtlasModule: config.hasAtlasModule,
        hasBiblioModule: config.hasBiblioModule,
        hasMeasurementsModule: config.hasMeasurementsModule
    };

    const userData = {
        id: config.id || 0,
        isMapAdmin: config.isMapAdmin,
        isBulkEditor: config.isBulkEditor,
        isTraitAdmin: config.isTraitAdmin,
        isSysAdmin: config.isSysAdmin,
        isTaxonAdmin: config.isTaxonAdmin,
        userEmail: config.userEmail,
        language: config.language,
        supervisedTaxonIds: config.supervisedTaxonIds || []
    };

    return (
        <ProjectNameProvider>
            <InstanceConfigProvider config={instanceConfig}>
                <UserProvider user={userData}>
                    <BrowserRouter basename="/">
                    <Suspense fallback={<div>Loading page…</div>}>
                        <Routes>
                            <Route path="/" element={<Layout/>}>
                                <Route index element={<Home/>}/>
                                <Route path="unauthorized" element={<UnauthorizedPage/>}/>

                                {/* Atlas routes - requires atlas module */}
                                <Route path="atlas">
                                    <Route path="newComments" element={
                                        <ProtectedRoute requiredModule="atlas">
                                            <NewComments/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="search" element={
                                        <ProtectedRoute requiredModule="atlas">
                                            <AtlasSearch/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="listOfControls" element={
                                        <ProtectedRoute requiredModule="atlas">
                                            <ListOfControls/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="listOfImports" element={
                                        <ProtectedRoute requiredModule="atlas">
                                            <AtlasListOfImports/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="listOfTaxa" element={
                                        <ProtectedRoute requiredModule="atlas">
                                            <AtlasListOfTaxa/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="import" element={
                                        <ProtectedRoute requiredModule="atlas">
                                            <Import/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="importCSV" element={
                                        <ProtectedRoute requiredModule="atlas">
                                            <ImportCSV/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="mapMain/:taxonId" element={
                                        <ProtectedRoute requiredModule="atlas">
                                            <MapMain/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="mapPreview/:taxonId/:type" element={
                                        <ProtectedRoute requiredModule="atlas">
                                            <MapPreview/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="mapDetail/:taxonId/:squareId" element={
                                        <ProtectedRoute requiredModule="atlas">
                                            <MapDetail/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="record/:recordId" element={
                                        <ProtectedRoute requiredModule="atlas">
                                            <Record/>
                                        </ProtectedRoute>
                                    }/>
                                </Route>

                                {/* AtlasAdmin routes - requires atlas module + map admin permission */}
                                <Route path="atlasAdmin">
                                    <Route path="listOfImports" element={
                                        <ProtectedRoute requiredModule="atlas" requiredPermission="isMapAdmin">
                                            <AtlasAdminListOfImports/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="listOfUsers" element={
                                        <ProtectedRoute requiredModule="atlas" requiredPermission="isMapAdmin">
                                            <ListOfUsers/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="listOfTaxa" element={
                                        <ProtectedRoute requiredModule="atlas" requiredPermission="isMapAdmin">
                                            <AtlasAdminListOfTaxa/>
                                        </ProtectedRoute>
                                    }/>
                                </Route>

                                {/* Biblio routes - requires biblio module */}
                                <Route path="biblio">
                                    <Route path="search" element={
                                        <ProtectedRoute requiredModule="biblio">
                                            <Bibliography/>
                                        </ProtectedRoute>
                                    }/>
                                </Route>

                                {/* Measurements routes - requires measurements module */}
                                <Route path="measurements">
                                    <Route path="general" element={
                                        <ProtectedRoute requiredModule="measurements">
                                            <General/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="datatypes" element={
                                        <ProtectedRoute requiredModule="measurements">
                                            <Datatypes/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="aggregationTypes" element={
                                        <ProtectedRoute requiredModule="measurements">
                                            <AggregationTypes/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="data" element={
                                        <ProtectedRoute requiredModule="measurements">
                                            <Data/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="export" element={
                                        <ProtectedRoute requiredModule="measurements">
                                            <Export/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="backup" element={
                                        <ProtectedRoute requiredModule="measurements">
                                            <Backup/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="features/:featureId" element={
                                        <ProtectedRoute requiredModule="measurements">
                                            <FeatureDetail/>
                                        </ProtectedRoute>
                                    }/>
                                </Route>

                                {/* Downloads routes - public */}
                                <Route path="downloads">
                                    <Route index element={<DownloadsIndex/>}/>
                                </Route>

                                {/* User routes - public (logged in users) */}
                                <Route path="user">
                                    <Route path="logout" element={<Logout/>}/>
                                    <Route path="changePassword" element={<ChangePassword/>}/>
                                    <Route path="changeEmail" element={<ChangeEmail/>}/>
                                    <Route path="settings" element={<Settings/>}/>

                                    <Route path="usersAdministration" element={
                                        <ProtectedRoute requiredPermission="isSysAdmin">
                                            <UsersAdministration/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="taxaAdministration/:taxonId?" element={
                                        <ProtectedRoute requiredPermission="isTaxonAdmin">
                                            <TaxaAdministration/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="addUser" element={
                                        <ProtectedRoute requiredPermissions={["isMapAdmin", "isTraitAdmin"]}>
                                            <AddUser/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="docs" element={<Docs/>}/>
                                </Route>
                            </Route>
                        </Routes>
                    </Suspense>
                </BrowserRouter>
            </UserProvider>
        </InstanceConfigProvider>
        </ProjectNameProvider>
    );
}
