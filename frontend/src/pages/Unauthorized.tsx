
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * Unauthorized - A page displayed when a user tries to access a route they don't have permission for.
 */
const Unauthorized = () => {
    const { t } = useTranslation();

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6 text-center">
                    <h1 className="display-1 text-danger">403</h1>
                    <h2 className="mb-4">{t("unauthorized.title") || "Unauthorized Access"}</h2>
                    <p className="lead mb-4">
                        {t("unauthorized.message") || "You don't have permission to access this page."}
                    </p>
                    <Link to="/" className="btn btn-primary">
                        {t("unauthorized.goBack") || "Go Home"}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Unauthorized;