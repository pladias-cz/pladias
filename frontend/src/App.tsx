import {lazy, Suspense, useEffect, useState} from "react";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Layout from "./Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import {InstanceConfigProvider} from "./context/InstanceConfigContext";
import {UserProvider} from "./context/UserContext";
import {ProjectNameProvider} from "./context/ProjectNameContext";
import {changeLanguage} from "./i18n/i18n";
import {loadReactConfig, type ReactConfig} from "./services/userApi";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy-loaded pages
const Home = lazy(() => import("./pages/Home"));
const UnauthorizedPage = lazy(() => import("./pages/Unauthorized"));

// Atlas
const NewComments = lazy(() => import("./pages/atlas/NewComments"));
const AtlasSearch = lazy(() => import("./pages/atlas/Search"));
const ListOfControls = lazy(() => import("./pages/atlas/ListOfControls"));
const AtlasListOfImports = lazy(() => import("./pages/atlas/ListOfImports"));
const AtlasListOfTaxa = lazy(() => import("./pages/atlas/ListOfTaxa"));
const Import = lazy(() => import("./pages/atlas/Import"));
const ImportCSV = lazy(() => import("./pages/atlas/ImportCSV"));
const MapMain = lazy(() => import("./pages/atlas/MapMain"));
const MapPreview = lazy(() => import("./pages/atlas/MapPreview"));
const MapDetail = lazy(() => import("./pages/atlas/MapDetail"));
const Record = lazy(() => import("./pages/atlas/Record"));

// AtlasAdmin
const AtlasAdminListOfImports = lazy(() => import("./pages/atlasAdmin/ListOfImports"));
const ListOfUsers = lazy(() => import("./pages/atlasAdmin/ListOfUsers"));
const AtlasAdminListOfTaxa = lazy(() => import("./pages/atlasAdmin/ListOfTaxa"));

// Biblio
const Bibliography = lazy(() => import("./pages/biblio/Bibliography"));

// Measurements
const General = lazy(() => import("./pages/measurements/General"));
const Datatypes = lazy(() => import("./pages/measurements/Datatypes"));
const AggregationTypes = lazy(() => import("./pages/measurements/AggregationTypes"));
const Data = lazy(() => import("./pages/measurements/Data"));
const Export = lazy(() => import("./pages/measurements/Export"));
const Backup = lazy(() => import("./pages/measurements/Backup"));
const FeatureDetail = lazy(() => import("./pages/measurements/FeatureDetail"));

// Downloads
const DownloadsIndex = lazy(() => import("./pages/downloads/Index"));

// User
const ChangePassword = lazy(() => import("./pages/user/ChangePassword"));
const ChangeEmail = lazy(() => import("./pages/user/ChangeEmail"));
const Settings = lazy(() => import("./pages/user/Settings"));
const UsersAdministration = lazy(() => import("./pages/user/UsersAdministration"));
const TaxaAdministration = lazy(() => import("./pages/user/TaxaAdministration"));
const AddUser = lazy(() => import("./pages/user/AddUser"));
const PlayMessages = lazy(() => import("./pages/user/PlayMessages"));
const Docs = lazy(() => import("./pages/user/Docs"));

export default function App() {
    const [config, setConfig] = useState<ReactConfig | null>(null);

    useEffect(() => {
        loadReactConfig()
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
        roles: config.roles || [],
        userEmail: config.userEmail,
        language: config.language,
        supervisedTaxonIds: config.supervisedTaxonIds || []
    };

    return (
        <ProjectNameProvider>
            <InstanceConfigProvider config={instanceConfig}>
                <UserProvider user={userData}>
                    <BrowserRouter basename="/">
                    {/* Rozbitý lazy chunk po deployi (404/syntax error) zobrazí fallback
                        s reloadem místo bílé stránky – sekce G. */}
                    <ErrorBoundary>
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
                                        <ProtectedRoute requiredModule="atlas" requiredRole="mapAdmin">
                                            <AtlasAdminListOfImports/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="listOfUsers" element={
                                        <ProtectedRoute requiredModule="atlas" requiredRole="mapAdmin">
                                            <ListOfUsers/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="listOfTaxa" element={
                                        <ProtectedRoute requiredModule="atlas" requiredRole="mapAdmin">
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
                                        <ProtectedRoute requiredModule="measurements" requiredRole="traitAdmin">
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
                                {/* Logout is intentionally NOT a SPA route – it is handled by the backend
                                    route GET /logout (controllers.Application.logout), which invalidates
                                    the session and redirects to /login. MainMenu links to it via href. */}
                                <Route path="user">
                                    <Route path="changePassword" element={<ChangePassword/>}/>
                                    <Route path="changeEmail" element={<ChangeEmail/>}/>
                                    <Route path="settings" element={<Settings/>}/>

                                    <Route path="usersAdministration" element={
                                        <ProtectedRoute requiredRole="sysAdmin">
                                            <UsersAdministration/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="taxaAdministration/:taxonId?" element={
                                        <ProtectedRoute requiredRole="taxonAdmin">
                                            <TaxaAdministration/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="addUser" element={
                                        <ProtectedRoute requiredRole="sysAdmin">
                                            <AddUser/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="playMessages" element={
                                        <ProtectedRoute requiredRole="sysAdmin">
                                            <PlayMessages/>
                                        </ProtectedRoute>
                                    }/>
                                    <Route path="docs" element={<Docs/>}/>
                                </Route>
                            </Route>
                        </Routes>
                        </Suspense>
                    </ErrorBoundary>
                </BrowserRouter>
            </UserProvider>
        </InstanceConfigProvider>
        </ProjectNameProvider>
    );
}
