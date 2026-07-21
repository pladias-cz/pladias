package controllers.common;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.ControllerBase;
import controllers.security.Authorized;
import controllers.security.AuthorizedAsSysAdmin;
import dto.UserMinimalDto;
import io.ebean.DB;
import mail.MailMessageBuilder;
import mail.MailService;
import models.*;
import play.i18n.Messages;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Security;
import service.config.IConfigService;
import service.password.IHashService;
import utils.JsonResult;
import utils.PasswordGenerator;
import utils.SessionUtils;

import javax.crypto.BadPaddingException;
import javax.crypto.IllegalBlockSizeException;
import javax.inject.Inject;
import javax.mail.MessagingException;
import java.io.UnsupportedEncodingException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Controller for user-related actions such as changing password and email.
 */

@Security.Authenticated(Authorized.class)
public class UserController extends ControllerBase {

    private static final String MapAdminKey = "MapAdmin";
    private static final String TraitAdminKey = "TraitAdmin";
    private static final String SysAdminKey = "SysAdmin";
    private static final String AddProjectKey = "AddProject";
    private static final String RemoveProjectKey = "RemoveProject";
    private static final String BiblioAdminKey = "BiblioAdmin";
    private static final String TaxonAdminKey = "TaxonAdmin";

    @Inject
    private IHashService _hashService;

    @Inject
    private MailService _mailService;

    @Inject
    private IConfigService _configService;

    public Result changePassword(Http.Request request) {
        try {
            Messages messages = getMessages(request);
            User user = SessionUtils.getCurrentUser(request.session());

            if (user == null) {

            }

            Map<String, Object> requestData = Json.fromJson(request.body().asJson(), Map.class);

            String originalPassword = (String) requestData.get("originalPassword");
            String newPassword = (String) requestData.get("newPassword");
            String confirmNewPassword = (String) requestData.get("confirmNewPassword");

            // Validate input
            if (originalPassword == null || originalPassword.isEmpty()) {
                return badRequest(Json.toJson(Map.of("error", messages.at("UserController.passwordRequired"))));
            }

            if (newPassword == null || newPassword.isEmpty()) {
                return badRequest(Json.toJson(Map.of("error", messages.at("UserController.newPasswordRequired"))));
            }

            if (confirmNewPassword == null || confirmNewPassword.isEmpty()) {
                return badRequest(Json.toJson(Map.of("error", messages.at("UserController.confirmNewPasswordRequired"))));
            }

            // Check if new passwords match
            if (!newPassword.equals(confirmNewPassword)) {
                return badRequest(Json.toJson(Map.of("error", messages.at("UserController.newPasswordsDoNotMatch"))));
            }

            // Verify original password
            if (!user.verifyPassword(originalPassword, _hashService)) {
                return badRequest(Json.toJson(Map.of("error", messages.at("UserController.passwordNotMatches"))));
            }

            // Check password length
            if (newPassword.length() < User.MinPasswordLength) {
                return badRequest(Json.toJson(Map.of("error", messages.at("UserController.passwordNotLongEnough", User.MinPasswordLength))));
            }

            // Update password
            user.setPlainPassword(newPassword, _hashService);
            DB.update(user);

            // Return success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", messages.at("UserController.passwordChanged"));

            return ok(Json.toJson(response));

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "An error occurred while changing password");
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    public Result changeEmail(Http.Request request) {
        try {
            Messages messages = getMessages(request);
            User user = SessionUtils.getCurrentUser(request.session());

            if (user == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "User not authenticated");
                return unauthorized(Json.toJson(errorResponse));
            }

            Map<String, Object> requestData = Json.fromJson(request.body().asJson(), Map.class);

            String password = (String) requestData.get("password");
            String newEmail = (String) requestData.get("newEmail");

            // Validate input
            if (password == null || password.isEmpty()) {
                return badRequest(Json.toJson(Map.of("error", messages.at("UserController.passwordRequired"))));
            }

            if (newEmail == null || newEmail.isEmpty()) {
                return badRequest(Json.toJson(Map.of("error", messages.at("UserController.emailRequired"))));
            }

            // Verify password
            if (!user.verifyPassword(password, _hashService)) {
                return badRequest(Json.toJson(Map.of("error", messages.at("UserController.passwordNotMatches"))));
            }

            // Update email
            user.setEmail(newEmail);
            DB.update(user);

            // Return success response
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", messages.at("UserController.emailChanged"));

            return ok(Json.toJson(response));

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "An error occurred while changing email");
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    /**
     * Get users data for React datatable with sorting and filtering capabilities
     */
    @Security.Authenticated(AuthorizedAsSysAdmin.class)
    public Result getUsers(Http.Request request) {
        try {
            // Check if current user is sysadmin
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null || !currentUser.isSysAdmin()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Unauthorized access");
                return unauthorized(Json.toJson(errorResponse));
            }

            // Get query parameters for sorting and filtering
            String sortBy = request.getQueryString("sortBy");
            String sortOrder = request.getQueryString("sortOrder"); // asc or desc
            String nameFilter = request.getQueryString("NameFilter");
            String surnameFilter = request.getQueryString("SurnameFilter");
            String emailFilter = request.getQueryString("EmailFilter");
            String mapAdminFilter = request.getQueryString("MapAdminFilter");
            String traitAdminFilter = request.getQueryString("TraitAdminFilter");
            String sysAdminFilter = request.getQueryString("SysAdminFilter");
            String biblioAdminFilter = request.getQueryString("BiblioAdminFilter");
            String taxonAdminFilter = request.getQueryString("TaxonAdminFilter");
            String deletedFilter = request.getQueryString("DeletedFilter");

            // Pagination parameters
            int page = request.getQueryString("page") != null ? Integer.parseInt(request.getQueryString("page")) : 1;
            int pageSize = request.getQueryString("pageSize") != null ? Integer.parseInt(request.getQueryString("pageSize")) : 20;

            // Build query
            io.ebean.Query<User> query = User.find().query();

            // Apply filtering if provided
            if (nameFilter != null && !nameFilter.isEmpty()) {
                query.where().icontains("name", nameFilter);
            }
            if (surnameFilter != null && !surnameFilter.isEmpty()) {
                query.where().icontains("surname", surnameFilter);
            }
            if (emailFilter != null && !emailFilter.isEmpty()) {
                query.where().icontains("email", emailFilter);
            }
            if (mapAdminFilter != null && !mapAdminFilter.isEmpty()) {
                query.where().eq("mapAdmin", Boolean.parseBoolean(mapAdminFilter));
            }
            if (traitAdminFilter != null && !traitAdminFilter.isEmpty()) {
                query.where().eq("traitAdmin", Boolean.parseBoolean(traitAdminFilter));
            }
            if (sysAdminFilter != null && !sysAdminFilter.isEmpty()) {
                query.where().eq("sysAdmin", Boolean.parseBoolean(sysAdminFilter));
            }
            if (biblioAdminFilter != null && !biblioAdminFilter.isEmpty()) {
                query.where().eq("biblioAdmin", Boolean.parseBoolean(biblioAdminFilter));
            }
            if (taxonAdminFilter != null && !taxonAdminFilter.isEmpty()) {
                query.where().eq("taxonAdmin", Boolean.parseBoolean(taxonAdminFilter));
            }
            if (deletedFilter != null && !deletedFilter.isEmpty()) {
                query.where().eq("deleted", Boolean.parseBoolean(deletedFilter));
            }

            // Apply sorting if provided
            if (sortBy != null && !sortBy.isEmpty()) {
                String sortExpression = sortBy;
                if ("desc".equalsIgnoreCase(sortOrder)) {
                    sortExpression = sortBy + " desc";
                } else {
                    sortExpression = sortBy + " asc";
                }
                query.orderBy(sortExpression);
            } else {
                // Default sorting by surname
                query.orderBy("surname asc");
            }

            // Apply pagination
            int offset = (page - 1) * pageSize;
            query.setFirstRow(offset).setMaxRows(pageSize);

            // Execute query
            List<User> users = query.findList();
            int filteredCount = query.findCount();

            // Get total count of all users (without filters)
            int totalCount = User.find().query().findCount();

            // Convert to JSON format suitable for React datatable
            ObjectMapper mapper = new ObjectMapper();
            ArrayNode usersArray = mapper.createArrayNode();

            for (User user : users) {
                ObjectNode userNode = mapper.createObjectNode();
                userNode.put("id", user.getId());
                userNode.put("email", user.getEmail() != null ? user.getEmail() : "");
                userNode.put("name", user.getName() != null ? user.getName() : "");
                userNode.put("surname", user.getSurname() != null ? user.getSurname() : "");
                userNode.put("mapAdmin", user.isMapAdmin());
                userNode.put("traitAdmin", user.isTraitAdmin());
                userNode.put("sysAdmin", user.isSysAdmin());
                userNode.put("biblioAdmin", user.isBiblioAdmin());
                userNode.put("taxonAdmin", user.isTaxonAdmin());
                userNode.put("deleted", user.isDeleted());

                // Add projects count
                int projectsCount = 0;
                if (user.getContributionProjects() != null) {
                    projectsCount = user.getContributionProjects().size();
                }
                userNode.put("projectsCount", projectsCount);

                usersArray.add(userNode);
            }

            ObjectNode response = mapper.createObjectNode();
            response.set("data", usersArray);
            response.put("filteredCount", filteredCount);
            response.put("totalCount", totalCount);
            response.put("page", page);
            response.put("pageSize", pageSize);
            response.put("success", true);

            return ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "An error occurred while retrieving users data: " + e.getMessage());
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    /**
     * Get users summary data for React dashboard
     */
    @Security.Authenticated(AuthorizedAsSysAdmin.class)
    public Result getUsersSummary(Http.Request request) {
        try {
            // Check if current user is sysadmin
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null || !currentUser.isSysAdmin()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Unauthorized access");
                return unauthorized(Json.toJson(errorResponse));
            }

            // Get counts for different user categories
            int totalUsers = User.find().query().findCount();
            int activeUsers = User.find().query().where().eq("deleted", false).findCount();
            int deletedUsers = User.find().query().where().eq("deleted", true).findCount();
            int mapAdmins = User.find().query().where().eq("mapAdmin", true).findCount();
            int traitAdmins = User.find().query().where().eq("traitAdmin", true).findCount();
            int sysAdmins = User.find().query().where().eq("sysAdmin", true).findCount();
            int biblioAdmins = User.find().query().where().eq("biblioAdmin", true).findCount();
            int taxonAdmins = User.find().query().where().eq("taxonAdmin", true).findCount();

            // Build response
            ObjectMapper mapper = new ObjectMapper();
            ObjectNode response = mapper.createObjectNode();

            ObjectNode counts = mapper.createObjectNode();
            counts.put("total", totalUsers);
            counts.put("active", activeUsers);
            counts.put("deleted", deletedUsers);
            counts.put("mapAdmins", mapAdmins);
            counts.put("traitAdmins", traitAdmins);
            counts.put("sysAdmins", sysAdmins);
            counts.put("biblioAdmins", biblioAdmins);
            counts.put("taxonAdmins", taxonAdmins);

            response.set("counts", counts);
            response.put("success", true);

            return ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "An error occurred while retrieving users summary: " + e.getMessage());
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    /**
     * Get a specific user by ID
     */
    @Security.Authenticated(AuthorizedAsSysAdmin.class)
    public Result getUser(Http.Request request, Long id) {
        try {
            // Check if current user is sysadmin
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null || !currentUser.isSysAdmin()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Unauthorized access");
                return unauthorized(Json.toJson(errorResponse));
            }

            // Find user by ID
            User user = User.find().byId(id);
            if (user == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "User not found");
                return notFound(Json.toJson(errorResponse));
            }

            // Convert to JSON format
            ObjectMapper mapper = new ObjectMapper();
            ObjectNode userNode = mapper.createObjectNode();
            userNode.put("id", user.getId());
            userNode.put("email", user.getEmail() != null ? user.getEmail() : "");
            userNode.put("name", user.getName() != null ? user.getName() : "");
            userNode.put("surname", user.getSurname() != null ? user.getSurname() : "");
            userNode.put("mapAdmin", user.isMapAdmin());
            userNode.put("traitAdmin", user.isTraitAdmin());
            userNode.put("sysAdmin", user.isSysAdmin());
            userNode.put("biblioAdmin", user.isBiblioAdmin());
            userNode.put("taxonAdmin", user.isTaxonAdmin());
            userNode.put("deleted", user.isDeleted());

            // Add projects
            ArrayNode projectsArray = mapper.createArrayNode();
            if (user.getContributionProjects() != null) {
                for (Project project : user.getContributionProjects()) {
                    ObjectNode projectNode = mapper.createObjectNode();
                    projectNode.put("id", project.getId());
                    projectNode.put("name", project.getName() != null ? project.getName() : "");
                    projectNode.put("abbrev", project.getAbbrev() != null ? project.getAbbrev() : "");
                    projectsArray.add(projectNode);
                }
            }
            userNode.set("projects", projectsArray);

            ObjectNode response = mapper.createObjectNode();
            response.set("user", userNode);
            response.put("success", true);

            return ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "An error occurred while retrieving user data: " + e.getMessage());
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    /**
     * Create a new user
     */
    @Security.Authenticated(AuthorizedAsSysAdmin.class)
    public Result createUser(Http.Request request) {
        try {
            // Check if current user is sysadmin
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null || !currentUser.isSysAdmin()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Unauthorized access");
                return unauthorized(Json.toJson(errorResponse));
            }

            // Parse request data
            JsonNode requestData = request.body().asJson();
            if (requestData == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Invalid request data");
                return badRequest(Json.toJson(errorResponse));
            }

            // Create new user
            User user = new User();
            user.setEmail(requestData.get("email").asText());
            user.setName(requestData.get("name").asText());
            user.setSurname(requestData.get("surname").asText());

            // Set default values
            user.setMapAdmin(false);
            user.setTraitAdmin(false);
            user.setSysAdmin(false);
            user.setBiblioAdmin(false);
            user.setTaxonAdmin(false);
            user.setDeleted(false);

            // Generate password
            String password = PasswordGenerator.Generate(User.MinPasswordLength);
            user.setPlainPassword(password, _hashService);

            // Save user
            user.save();

            // Send notification email
            try {
                notifyNewUser(user, password);
            } catch (Exception e) {
                // Log error but don't fail the request
                e.printStackTrace();
            }

            // Return created user
            ObjectMapper mapper = new ObjectMapper();
            ObjectNode userNode = mapper.createObjectNode();
            userNode.put("id", user.getId());
            userNode.put("email", user.getEmail() != null ? user.getEmail() : "");
            userNode.put("name", user.getName() != null ? user.getName() : "");
            userNode.put("surname", user.getSurname() != null ? user.getSurname() : "");
            userNode.put("mapAdmin", user.isMapAdmin());
            userNode.put("traitAdmin", user.isTraitAdmin());
            userNode.put("sysAdmin", user.isSysAdmin());
            userNode.put("biblioAdmin", user.isBiblioAdmin());
            userNode.put("taxonAdmin", user.isTaxonAdmin());
            userNode.put("deleted", user.isDeleted());

            ObjectNode response = mapper.createObjectNode();
            response.set("user", userNode);
            response.put("success", true);
            response.put("message", "User created successfully");

            return created(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "An error occurred while creating user: " + e.getMessage());
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    /**
     * Update a user
     */
    @Security.Authenticated(AuthorizedAsSysAdmin.class)
    public Result updateUser(Http.Request request, Long id) {
        try {
            // Check if current user is sysadmin
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null || !currentUser.isSysAdmin()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Unauthorized access");
                return unauthorized(Json.toJson(errorResponse));
            }

            // Find user by ID
            User user = User.find().byId(id);
            if (user == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "User not found");
                return notFound(Json.toJson(errorResponse));
            }

            // Parse request data
            JsonNode requestData = request.body().asJson();
            if (requestData == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Invalid request data");
                return badRequest(Json.toJson(errorResponse));
            }

            // Update user fields
            if (requestData.has("email")) {
                user.setEmail(requestData.get("email").asText());
            }
            if (requestData.has("name")) {
                user.setName(requestData.get("name").asText());
            }
            if (requestData.has("surname")) {
                user.setSurname(requestData.get("surname").asText());
            }
            if (requestData.has("mapAdmin")) {
                user.setMapAdmin(requestData.get("mapAdmin").asBoolean());
            }
            if (requestData.has("traitAdmin")) {
                user.setTraitAdmin(requestData.get("traitAdmin").asBoolean());
            }
            if (requestData.has("sysAdmin")) {
                user.setSysAdmin(requestData.get("sysAdmin").asBoolean());
            }
            if (requestData.has("biblioAdmin")) {
                user.setBiblioAdmin(requestData.get("biblioAdmin").asBoolean());
            }
            if (requestData.has("taxonAdmin")) {
                user.setTaxonAdmin(requestData.get("taxonAdmin").asBoolean());
            }
            if (requestData.has("deleted")) {
                user.setDeleted(requestData.get("deleted").asBoolean());
            }

            // Save user
            user.save();

            // Return updated user
            ObjectMapper mapper = new ObjectMapper();
            ObjectNode userNode = mapper.createObjectNode();
            userNode.put("id", user.getId());
            userNode.put("email", user.getEmail() != null ? user.getEmail() : "");
            userNode.put("name", user.getName() != null ? user.getName() : "");
            userNode.put("surname", user.getSurname() != null ? user.getSurname() : "");
            userNode.put("mapAdmin", user.isMapAdmin());
            userNode.put("traitAdmin", user.isTraitAdmin());
            userNode.put("sysAdmin", user.isSysAdmin());
            userNode.put("biblioAdmin", user.isBiblioAdmin());
            userNode.put("taxonAdmin", user.isTaxonAdmin());
            userNode.put("deleted", user.isDeleted());

            ObjectNode response = mapper.createObjectNode();
            response.set("user", userNode);
            response.put("success", true);
            response.put("message", "User updated successfully");

            return ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "An error occurred while updating user: " + e.getMessage());
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    /**
     * /**
     * Reset a user's password
     */
    @Security.Authenticated(AuthorizedAsSysAdmin.class)
    public Result resetUserPassword(Http.Request request, Long id) {
        try {
            // Check if current user is sysadmin
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null || !currentUser.isSysAdmin()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Unauthorized access");
                return unauthorized(Json.toJson(errorResponse));
            }

            // Find user by ID
            User user = User.find().byId(id);
            if (user == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "User not found");
                return notFound(Json.toJson(errorResponse));
            }

            // Generate a new random password
            String newPassword = PasswordGenerator.Generate(User.MinPasswordLength);

            // Update user's password
            user.setPlainPassword(newPassword, _hashService);
            user.save();

            // Return the new password in the response
            ObjectNode response = new ObjectMapper().createObjectNode();
            response.put("success", true);
            response.put("message", "Password reset successfully");
            response.put("newPassword", newPassword);

            return ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "An error occurred while resetting password: " + e.getMessage());
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    /**
     * Get users data for React datatable
     */
    @Security.Authenticated(AuthorizedAsSysAdmin.class)
    public Result getUsersData(Http.Request request) {
        try {
            // Check if current user is sysadmin
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null || !currentUser.isSysAdmin()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Unauthorized access");
                return unauthorized(Json.toJson(errorResponse));
            }

            // Get all users ordered by surname
            List<User> users = User.find().query().orderBy("surname asc").findList();

            // Convert to JSON format suitable for React datatable
            ObjectMapper mapper = new ObjectMapper();
            ArrayNode usersArray = mapper.createArrayNode();

            for (User user : users) {
                ObjectNode userNode = mapper.createObjectNode();
                userNode.put("id", user.getId());
                userNode.put("email", user.getEmail() != null ? user.getEmail() : "");
                userNode.put("name", user.getName() != null ? user.getName() : "");
                userNode.put("surname", user.getSurname() != null ? user.getSurname() : "");
                userNode.put("mapAdmin", user.isMapAdmin());
                userNode.put("traitAdmin", user.isTraitAdmin());
                userNode.put("sysAdmin", user.isSysAdmin());
                userNode.put("biblioAdmin", user.isBiblioAdmin());
                userNode.put("taxonAdmin", user.isTaxonAdmin());
                userNode.put("deleted", user.isDeleted());

                // Add projects
                ArrayNode projectsArray = mapper.createArrayNode();
                if (user.getContributionProjects() != null) {
                    for (Project project : user.getContributionProjects()) {
                        ObjectNode projectNode = mapper.createObjectNode();
                        projectNode.put("id", project.getId());
                        projectNode.put("name", project.getName() != null ? project.getName() : "");
                        projectNode.put("abbrev", project.getAbbrev() != null ? project.getAbbrev() : "");
                        projectsArray.add(projectNode);
                    }
                }
                userNode.set("projects", projectsArray);

                usersArray.add(userNode);
            }

            ObjectNode response = mapper.createObjectNode();
            response.set("users", usersArray);
            response.put("success", true);

            return ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "An error occurred while retrieving users data");
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    /**
     * Get projects data for access rights management
     */
    @Security.Authenticated(AuthorizedAsSysAdmin.class)
    public Result getProjectsData(Http.Request request) {
        try {
            // Check if current user is sysadmin
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null || !currentUser.isSysAdmin()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Unauthorized access");
                return unauthorized(Json.toJson(errorResponse));
            }

            // Get all projects ordered by id
            List<Project> projects = Project.find().query().orderBy("id asc").findList();

            // Convert to JSON format
            ObjectMapper mapper = new ObjectMapper();
            ArrayNode projectsArray = mapper.createArrayNode();

            for (Project project : projects) {
                ObjectNode projectNode = mapper.createObjectNode();
                projectNode.put("id", project.getId());
                projectNode.put("name", project.getName() != null ? project.getName() : "");
                projectNode.put("abbrev", project.getAbbrev() != null ? project.getAbbrev() : "");
                projectsArray.add(projectNode);
            }

            ObjectNode response = mapper.createObjectNode();
            response.set("projects", projectsArray);
            response.put("success", true);

            return ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "An error occurred while retrieving projects data");
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    public Result getProjectsForUser(Http.Request request) {
        try {
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Unauthorized access");
                return unauthorized(Json.toJson(errorResponse));
            }

            User user = User.find().query()
                .fetch("contributionProjects")
                .where().eq("id", currentUser.getId())
                .findOne();

            List<Project> projects = new ArrayList<>(user.getContributionProjects());

            // Convert to JSON format
            ObjectMapper mapper = new ObjectMapper();
            ArrayNode projectsArray = mapper.createArrayNode();

            for (Project project : projects) {
                ObjectNode projectNode = mapper.createObjectNode();
                projectNode.put("id", project.getId());
                projectNode.put("name", project.getName() != null ? project.getName() : "");
                projectNode.put("abbrev", project.getAbbrev() != null ? project.getAbbrev() : "");
                projectsArray.add(projectNode);
            }

            ObjectNode response = mapper.createObjectNode();
            response.set("projects", projectsArray);
            response.put("success", true);

            return ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "An error occurred while retrieving projects data");
            return internalServerError(Json.toJson(errorResponse));
        }
    }


    @Security.Authenticated(AuthorizedAsSysAdmin.class)
    public Result editUserRightsField(Http.Request request) {
        try {
            // Check if current user is sysadmin
            User currentUser = SessionUtils.getCurrentUser(request.session());
            if (currentUser == null || !currentUser.isSysAdmin()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Unauthorized access");
                return unauthorized(Json.toJson(errorResponse));
            }

            // Parse request data
            JsonNode requestData = request.body().asJson();
            if (requestData == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Invalid request data");
                return badRequest(Json.toJson(errorResponse));
            }

            long userId = requestData.get("userId").asLong();
            String key = requestData.get("key").asText();
            String value = requestData.get("value").asText();

            // Edit the field
            String returnedValue = doEditUserRightsField(userId, key, value);

            // Build success response
            ObjectMapper mapper = new ObjectMapper();
            ObjectNode response = mapper.createObjectNode();
            response.put("success", true);
            response.put("value", returnedValue);
            response.put("userId", userId);
            response.put("key", key);

            return ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "An error occurred while editing user rights: " + e.getMessage());
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    /**
     * Perform the actual field editing
     */
    private String doEditUserRightsField(long userId, String key, String value) throws Exception {
        String returnedValue = value;
        User user = User.find().byId(userId);

        if (user == null) {
            throw new Exception("User not found");
        }

        switch (key) {
            case MapAdminKey:
                user.setMapAdmin(Boolean.parseBoolean(value));
                break;
            case BiblioAdminKey:
                user.setBiblioAdmin(Boolean.parseBoolean(value));
                break;
            case TraitAdminKey:
                user.setTraitAdmin(Boolean.parseBoolean(value));
                break;
            case SysAdminKey:
                user.setSysAdmin(Boolean.parseBoolean(value));
                break;
            case AddProjectKey:
                /**
                 * TODO - when assigning project already assigned, should return error
                 */
                Project toAdd = Project.find().byId(Integer.parseInt(value));
                if (toAdd != null) {
                    // We need to handle the many-to-many relationship properly
                    // For now, we'll just add to the collection
                    if (user.getContributionProjects() == null) {
                        user.setContributionProjects(new java.util.HashSet<>());
                    }
                    user.getContributionProjects().add(toAdd);
                }
                returnedValue = toAdd != null ? toAdd.getName() : "";
                break;
            case RemoveProjectKey:
                Project toRemove = Project.find().byId(Integer.parseInt(value));
                if (toRemove != null) {
                    if (user.getContributionProjects() != null) {
                        user.getContributionProjects().remove(toRemove);
                    }
                }
                break;
            case TaxonAdminKey:
                user.setTaxonAdmin(Boolean.parseBoolean(value));
                break;
            default:
                throw new Exception("Unknown field key: " + key);
        }

        user.save();
        return returnedValue;
    }

    /**
     * TODO add option to get default value if not set - especially in user settings page
     */
    public Result getUserSetting(Http.Request request, String key) {
        try {
            Messages messages = getMessages(request);
            User user = SessionUtils.getCurrentUser(request.session());

            if (user == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "User not authenticated");
                return unauthorized(Json.toJson(errorResponse));
            }

            UserSettings settings = UserSettings.find().query().where()
                .eq("settings.userId", user.getId())
                .eq("settings.key", key).findOne();

            Map<String, Object> response = new HashMap<>();
            if (settings != null) {
                response.put("success", true);
                response.put("value", settings.getValue());
            } else {
                response.put("success", false);
                response.put("value", "");
                response.put("message", messages.at("UserSettingsController.ValueNotFound"));
            }

            return ok(Json.toJson(response));

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "An error occurred while retrieving user setting");
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    public Result saveUserSetting(Http.Request request, String key) {
        try {
            Messages messages = getMessages(request);
            User user = SessionUtils.getCurrentUser(request.session());

            if (user == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "User not authenticated");
                return unauthorized(Json.toJson(errorResponse));
            }

            Map<String, Object> requestData = Json.fromJson(request.body().asJson(), Map.class);
            String value = (String) requestData.get("value");

            if (value == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Value is required");
                return badRequest(Json.toJson(errorResponse));
            }

            UserSettings settings = UserSettings.find().query().where()
                .eq("settings.userId", user.getId())
                .eq("settings.key", key).findOne();

            if (settings != null) {
                // Update existing setting
                settings.setValue(value);
                settings.update();
            } else {
                // Create new setting
                settings = new UserSettings();
                UserSettingPK userSetting = new UserSettingPK();
                userSetting.setUserId(user.getId());
                userSetting.setKey(key);
                settings.setSettings(userSetting);
                settings.setValue(value);
                settings.save();
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("value", settings.getValue());
            response.put("message", messages.at("UserSettingsController.ValueSaved"));

            return ok(Json.toJson(response));

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "An error occurred while saving user setting");
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    /**
     * deleting mean reseting, since the default values are kept in the frontend code
     */
    public Result resetUserSettings(Http.Request request, String keyPrefix) {
        try {
            Messages messages = getMessages(request);
            User user = SessionUtils.getCurrentUser(request.session());

            if (user == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "User not authenticated");
                return unauthorized(Json.toJson(errorResponse));
            }

            List<UserSettings> settings = UserSettings.find().query()
                .where()
                .eq("settings.userId", user.getId())
                .istartsWith("settings.key", keyPrefix)
                .findList();

            try {
                DB.deleteAll(settings);

                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", messages.at("UserSettingsController.EntriesDeleted"));

                return ok(Json.toJson(response));
            } catch (Exception e) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", messages.at("UserSettingsController.DeletionFailed"));
                return internalServerError(Json.toJson(errorResponse));
            }

        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "An error occurred while resetting user settings");
            return internalServerError(Json.toJson(errorResponse));
        }
    }

    private void notifyNewUser(User user, String password) throws MessagingException, UnsupportedEncodingException, IllegalBlockSizeException, BadPaddingException {
        Messages messages = this.getMessages(user);
        MailMessageBuilder builder = new MailMessageBuilder();
        builder.setSubject(String.format("Vítejte v projektu %s", _configService.getDbMessage(PlayMessage.PROJECT_NAME_KEY)));
        builder.setContents(String.format(_configService.getDbMessage(PlayMessage.NEW_USER_MAIL_KEY), user.getEmail(), password));
        builder.addRecipient(user.getEmail());
        _mailService.sendMail(builder.build());
    }

    public Result getUsersMinimal() {
        List<UserMinimalDto> dtos = User.find().query()
            .where()
            .eq("deleted", false)
            .orderBy("surname")
            .findList()
            .stream()
            .map(t -> new UserMinimalDto(
                t.getId(),
                t.getFullname()
            ))
            //.toList(); //java 16+
            .collect(Collectors.toList());

        return ok(JsonResult.buildSuccess(dtos));

    }

}
